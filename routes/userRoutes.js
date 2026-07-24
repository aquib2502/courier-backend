import express from 'express';
import { registerUser, loginUser, getOrdersByUserId, getUserDetails, updateUserDetails, getPickupAddress , getOrderCountForUser, refreshToken, fetchUserTransaction, getFinalBillPDF} from '../controllers/userController.js';
import upload from '../middlewares/upload.js';
import multer from 'multer';
import authMiddleware from '../middlewares/authMiddleware.js';
import Clubbing from '../models/clubbingModel.js';
const router = express.Router();

// Middleware to handle Multer upload errors gracefully
const handleUserUpload = (fields) => {
  return (req, res, next) => {
    upload.fields(fields)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size limit exceeded. Each file must be under 5MB.' });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ message: `Unexpected upload field: ${err.field}` });
          }
          return res.status(400).json({ message: err.message });
        }
        return res.status(400).json({ message: err.message || 'File upload error' });
      }
      next();
    });
  };
};

// Upload multiple files for registration
router.post(
  "/registerUser",
  handleUserUpload([
    { name: "aadharProof", maxCount: 1 },
    { name: "panProof", maxCount: 1 },
    { name: "gstProof", maxCount: 1 },
    { name: "iecProof", maxCount: 1 },
  ]),
  registerUser
);



router.post('/loginUser', loginUser);

router.get('/transactions',authMiddleware, fetchUserTransaction)

router.post('/refreshToken', refreshToken)

router.get('/orderCount', authMiddleware, getOrderCountForUser )

router.get('/finalBill', authMiddleware, getFinalBillPDF )

router.get('/pickupadresses/:userId', getPickupAddress); // Route to fetch pickup addresses by userId

// Route to fetch orders by userId
router.get('/orders/:user', getOrdersByUserId);

// GET /api/orders/clubbings/:userId
router.get('/orders/clubbings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const clubbings = await Clubbing.find({ userIds: userId })
      .populate({
        path: 'clubbedOrders',
        populate: { path: 'user', select: 'fullname email' }
      })
      .sort({ clubbedAt: -1 });

    res.status(200).json({ success: true, data: clubbings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch clubbings' });
  }
});

router.get('/getuser/:userId', getUserDetails); // Route to fetch user details by userId

router.put('/updateuser/:userId', updateUserDetails)

export default router;