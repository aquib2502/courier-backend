import Order from '../models/orderModel.js'; // Import the Order model
import User from '../models/userModel.js';
import Clubbing from '../models/clubbingModel.js';
import Dispute from '../models/disputeModel.js';
import mongoose from 'mongoose';
import { callShipmentAPI } from '../utils/shipmentService.js';


// Controller function to handle order creation
const createOrder = async (req, res) => {
  try {
    console.log('Request Body:', req.body);

    const { user, totalAmount, ...orderData } = req.body;

    if (!user) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Fetch user
    const userDoc = await User.findById(user);

    if (!userDoc) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check KYC
    if (userDoc.kycStatus !== 'approved') {
      return res.status(400).json({ success: false, message: 'User KYC is not approved' });
    }

    // Calculate available funds
    const availableWallet = userDoc.walletBalance;
    const availableCredit = userDoc.hasCredit ? (userDoc.creditLimit - userDoc.usedCredit) : 0;
    const totalAvailable = availableWallet + availableCredit;

    if (totalAvailable < totalAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient funds or credit' });
    }

    // Deduct wallet first, then credit if needed
    let remainingAmount = totalAmount;

    if (availableWallet >= remainingAmount) {
      userDoc.walletBalance -= remainingAmount;
      remainingAmount = 0;
    } else {
      remainingAmount -= availableWallet;
      userDoc.walletBalance = 0;
    }

    if (remainingAmount > 0) {
      userDoc.usedCredit = (userDoc.usedCredit || 0) + remainingAmount;
    }

    await userDoc.save();

    // Generate serial number
    const serialNumber = await generateSerialNumber();

    // Create new order
    const newOrder = new Order({
      ...orderData,
      user: user,
      totalAmount: totalAmount,
      invoiceNo: serialNumber
    });

    await newOrder.save();

    // Call shipment API
    const shipmentData = await callShipmentAPI(newOrder);

    newOrder.shipmentResponses = shipmentData.ShipmentResponses;
    newOrder.shipmentDetails = shipmentData.shipmentDetails;
    if (shipmentData.shipmentDetails && shipmentData.shipmentDetails.length > 0) {
      newOrder.lastMileAWB = shipmentData.shipmentDetails[0].AwbNo;
    }

    await newOrder.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully!',
      data: newOrder,
      walletBalance: userDoc.walletBalance,
      usedCredit: userDoc.usedCredit
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Something went wrong, please try again later.' });
  }
};



const updateOrderStatus = async (req, res) => {
try {
  const { orderId } = req.params;
  const { orderStatus, manifestStatus, receivedAt } = req.body;

  const updatedOrder = await Order.findByIdAndUpdate(
    orderId, 
    { orderStatus, manifestStatus, receivedAt }, 
    { new: true }
  );

  if (!updatedOrder) {
    return res.status(404).json({ 
      success: false, 
      message: 'Order not found' 
    });
  }

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: updatedOrder
  });
} catch (error) {
  console.error('Error updating order status:', error);
  res.status(500).json({
    success: false,
    message: 'Something went wrong, please try again later.'
  });

}
}


const getTotalOrderCount = async (req, res) => {
  try {
    // Count all orders in the database (not user-specific)
    const totalCount = await Order.countDocuments({});
    
    res.status(200).json({
      success: true,
      data: {
        totalCount: totalCount
      }
    });
  } catch (error) {
    console.error('Error getting total order count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order count'
    });
  }
};

// Generate serial number automatically
const generateSerialNumber = async () => {
  // Count existing orders
  const totalCount = await Order.countDocuments({});

  // Format the new serial number
  const paddedCount = String(totalCount + 1).padStart(6, '0');
  return `TTE${paddedCount}`;
};


const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'fullname mobile')          // Populate user details
      .populate('manifest', 'manifestId status');   // Populate manifest details

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error retrieving orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    });
  }
};


const clubOrders = async (req, res) => {
  try {
    const { userIds, orderIds, clubName } = req.body;

    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
    }
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'orderIds must be a non-empty array' });
    }

    // Fetch users with fullname and email
    const users = await User.find({ _id: { $in: userIds } }, 'fullname email');
    if (users.length !== userIds.length) {
      return res.status(404).json({ success: false, message: 'One or more users not found' });
    }

    // Verify orders exist
    const orders = await Order.find({ _id: { $in: orderIds } });
    if (orders.length !== orderIds.length) {
      return res.status(404).json({ success: false, message: 'One or more orders not found' });
    }

    // Create clubbing entry
    const clubbing = new Clubbing({
      clubName,
      userIds, // keep IDs for reference
      usernames: users.map(u => u.fullname).join(', '), // Concatenate names
      useremails: users.map(u => u.email).join(', '), // Concatenate emails
      clubbedOrders: orderIds,
    });

    await clubbing.save();

    res.status(201).json({
      success: true,
      message: 'Orders clubbed successfully',
      data: {
        id: clubbing._id,
        users, // Array of user objects with fullname and email
        clubbedOrders: clubbing.clubbedOrders,
        clubbedAt: clubbing.clubbedAt
      }
    });
  } catch (error) {
    console.error('Error clubbing orders:', error.message);
    res.status(500).json({ success: false, message: 'Failed to club orders' });
  }
};

const getDisputedOrders = async (req, res) => {
  try {
    // Extract userId from auth middleware
    const userId = req.user?._id || req.user?.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Fetch disputes where the logged-in user is the client
    const disputes = await Dispute.find({ clientId: userId }).populate('orderIds', 'firstName lastName invoiceNo' );

    if (!disputes.length) {
      return res.status(200).json({
        success: true,
        message: "No disputes found for this user",
        disputes: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Disputes fetched successfully",
      disputes,
    });
  } catch (error) {
    console.error("Error fetching disputes:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};



const updateDisputeStatus = async (req, res) => {
  try {
    const { id } = req.params; // disputeId from URL
    const { action, reason } = req.body; 
    // `action` can be "approve" or "reject"

    // Validate disputeId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dispute ID format",
      });
    }

    // Validate action
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'approve' or 'reject'",
      });
    }

    // Find dispute and populate orderIds
    const dispute = await Dispute.findById(id).populate("orderIds");
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found",
      });
    }

    // Ensure associated orders exist
    const orders = await Order.find({ _id: { $in: dispute.orderIds } });
    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Associated orders not found",
      });
    }

    if (action === "approve") {
      // Update all orders in the dispute
      await Order.updateMany(
        { _id: { $in: dispute.orderIds } },
        { 
          $set: { 
            orderStatus: "Shipped",
            manifestStatus: "dispatched"
          } 
        }
      );

      // Update dispute
      dispute.status = "resolved";
      dispute.clientResponse = "accepted";
      dispute.adminNotes = "Dispute approved by admin";
      await dispute.save();

      return res.status(200).json({
        success: true,
        message: "Dispute approved and orders updated successfully",
      });
    }

    if (action === "reject") {
      if (!reason || reason.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Rejection reason required",
        });
      }

      // Update orders as needed (keeping them in disputed status)
      await Order.updateMany(
        { _id: { $in: dispute.orderIds } },
        { $set: { orderStatus: "Disputed" } } 
      );

      // Update dispute
      dispute.status = "escalated";
      dispute.clientResponse = "rejected";
      dispute.adminNotes = reason;
      await dispute.save();

      return res.status(200).json({
        success: true,
        message: "Dispute rejected and orders updated successfully",
      });
    }
  } catch (error) {
    console.error("Error updating dispute status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export { createOrder, updateOrderStatus,updateDisputeStatus, getTotalOrderCount, getAllOrders, clubOrders, getDisputedOrders };