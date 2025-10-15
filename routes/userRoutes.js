import express from 'express';
import { registerUser, loginUser, getOrdersByUserId, getUserDetails, updateUserDetails, getPickupAddress , getOrderCountForUser, refreshToken, fetchUserTransaction, getFinalBillPDF} from '../controllers/userController.js';
import upload from '../middlewares/upload.js';
import authMiddleware from '../middlewares/authMiddleware.js';
const router = express.Router();

// Upload multiple files
router.post(
  "/registerUser",
  upload.fields([
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


router.get('/getuser/:userId', getUserDetails); // Route to fetch user details by userId

router.put('/updateuser/:userId', updateUserDetails)

export default router;