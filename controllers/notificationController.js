import Notification from "../models/notifictionModel.js";
import Dispute from "../models/disputeModel.js";
import { io, connectedClients } from "../utils/socket.js";
import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Manifest from "../models/manifestModel.js";
// ==========================================
// INTERNAL FUNCTION - Called when raising dispute
// ==========================================
export const raiseDispute = async ({ orderId, manifestId, type, description, clientId }) => {
  try {
    // 1. Create dispute record (optional)
    // If you have a Dispute model, you can create a record like this:
    // const dispute = await Dispute.create({
    //   orderId,
    //   manifestId,
    //   type,
    //   description,
    // });

    // 2. Create a notification for the client
    const notification = await Notification.create({
      userId: clientId,
      type: "dispute",
      title: "Dispute Raised",
      message: `A dispute has been raised for Manifest #${manifestId}`,
      link: `/client/disputes/${manifestId}`,
    });

 



  if (connectedClients[clientId]) {
  io.to(connectedClients[clientId]).emit("new-notification", notification);
} else {
  console.log("User not connected yet, will need polling or DB fetch");
}

    return notification;
  } catch (error) {
    console.error("Error raising dispute:", error);
    throw new Error("Failed to raise dispute");
  }
};

// ==========================================
// API ENDPOINT - Fetch notifications for logged-in user
// ==========================================

export const getNotifications = async (req, res) => {
  try {
    // req.user comes from authMiddleware
    const userId = req.user._id || req.user.userId;

    // Make sure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    // Fetch notifications for the logged-in user
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

// ==========================================
// API ENDPOINT - Mark notification as read
// ==========================================

export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId; // <-- get userId from your JWT

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ success: false, message: "Invalid notification ID" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
};