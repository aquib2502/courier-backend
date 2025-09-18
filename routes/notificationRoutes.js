import express from "express";
import { getNotifications, markAsRead, raiseDispute } from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Fetch all notifications for logged-in user
router.get("/", authMiddleware, getNotifications);

// Route to raise a dispute
router.post('/raise-dispute', async (req, res) => {
  try {
    const { orderId, manifestId, type, description, clientId } = req.body;
    // const raisedBy = req.user.id; // assuming you have authentication middleware

    const notification = await raiseDispute({
      orderId,
      manifestId,
      type,
      description,
      clientId,
    });

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark a specific notification as read
router.put("/:notificationId/read", authMiddleware, markAsRead);

export default router;
