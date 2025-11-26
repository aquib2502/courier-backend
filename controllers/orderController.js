import Order from '../models/orderModel.js'; // Import the Order model
import User from '../models/userModel.js';
import Clubbing from '../models/clubbingModel.js';
import Dispute from '../models/disputeModel.js';
import mongoose from 'mongoose';
import { UnitedCallShipmentAPI } from '../utils/UnitedShipmentService.js';
import Transaction from '../models/transactionModel.js';
import { ShipGlobalShipmentCallApi } from '../utils/SGSShipementService.js';
import axios from 'axios';


const generateMerchantOrderId = () => {
  const timestamp = Date.now(); // milliseconds since epoch
  const randomPart = Math.floor(Math.random() * 1000); // 0-999
  // Format: TET + timestamp + 3-digit random number
  return `TET${timestamp}${String(randomPart).padStart(3, "0")}`;
};



const createOrder = async (req, res) => {
//#region - createOrder
  try {
    console.log("Request Body:", req.body);

    const { user, totalAmount, shippingPartner, ...orderData } = req.body;

    if (!user) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const userDoc = await User.findById(user);
    if (!userDoc) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (userDoc.kycStatus !== "approved") {
      return res.status(400).json({ success: false, message: "User KYC is not approved" });
    }

    // =====================================================
    // 1️⃣ VALIDATE WALLET & CREDIT BEFORE ANY ORDER CREATION
    // =====================================================
    const availableWallet = userDoc.walletBalance;
    const availableCredit = userDoc.hasCredit ? userDoc.creditLimit - userDoc.usedCredit : 0;
    const totalAvailable = availableWallet + availableCredit;

    if (totalAvailable < totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance or credit limit",
      });
    }

    // Deduct wallet first → then credit
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

    await userDoc.save(); // Save deducted balance FIRST

    // =====================================================
    // 2️⃣ CREATE ORDER
    // =====================================================
    const serialNumber = await generateSerialNumber();

    const newOrder = new Order({
      ...orderData,
      user,
      totalAmount,
      invoiceNo: serialNumber,
      shippingPartner: {
        name: shippingPartner.name,
        type: shippingPartner.type,
      },
    });

    // =====================================================
    // 3️⃣ PREPARE SHIPMENT DETAILS STRUCTURE
    // =====================================================
    let shipmentDetails = {
      trackingNumber: null,
      awbNumber: null,
      pdf: null,
      weight: null,
      service: null,
      thirdPartyService: null,
    };

    // =====================================================
    // 4️⃣ DETERMINE SHIPPING PARTNER
    // =====================================================

    if (shippingPartner.name.includes("QuickExpress")) {
      // No API call
      console.log("QuickExpress detected — skipping shipment API call.");
    } 
    else if (shippingPartner.name.includes("Self")) {
      // UNITED API
      const shipmentData = await UnitedCallShipmentAPI(newOrder);
      console.log("United API Response:", shipmentData);

   if (shipmentData.status !== "success") {
  throw new Error(shipmentData.message || "Shipment failed");
}

shipmentDetails = {
  trackingNumber: shipmentData.trackingNo,
  awbNumber: shipmentData.awb,
  pdf: shipmentData.labelPDF,
  weight: shipmentData.weight,
  service: shipmentData.service,
  thirdPartyService: shipmentData.thirdParty,
};

    } 
    else {
      // SHIPGLOBAL API
      shipmentDetails = await ShipGlobalShipmentCallApi(newOrder);

      if (shipmentDetails.status === "failed") {
        const errorsArray = Array.isArray(shipmentDetails.errors)
          ? shipmentDetails.errors
          : shipmentDetails.description && Array.isArray(shipmentDetails.description)
          ? shipmentDetails.description
          : null;

        return res.status(400).json({
          success: false,
          message: errorsArray
            ? errorsArray.join(", ")
            : shipmentDetails.description || "Shipment failed",
          errors: errorsArray,
        });
      }
    }

    // =====================================================
    // 5️⃣ SAVE ORDER WITH SHIPMENT DETAILS
    // =====================================================
    newOrder.shipmentDetails = shipmentDetails;
    newOrder.lastMileAWB = shipmentDetails.awbNumber;

    await newOrder.save();

    // =====================================================
    // 6️⃣ CREATE TRANSACTION RECORD
    // =====================================================
    const merchantOrderId = await generateMerchantOrderId();

    const paymentMethod =
      availableWallet >= totalAmount ? "Wallet" : "Credit";

    const transaction = new Transaction({
      user: userDoc._id,
      amount: totalAmount,
      status: "COMPLETED",
      type: "order-booking",
      paymentMethod,
      merchantOrderId,
    });

    await transaction.save();

    // =====================================================
    // 7️⃣ SEND RESPONSE TO USER
    // =====================================================
    res.status(201).json({
      success: true,
      message: "Order created successfully!",
      data: newOrder,
      walletBalance: userDoc.walletBalance,
      usedCredit: userDoc.usedCredit,
    });

    // =====================================================
    // 8️⃣ BACKGROUND TASK — TRACKING UPDATE
    // =====================================================
    (async () => {
      try {
        const partnerName = newOrder.shippingPartner?.name || "";

        if (partnerName.includes("Self") || partnerName.includes("QuickExpress")) {
          console.log(`Skipping tracking update for ${partnerName}`);
          return;
        }

        console.log(`⏳ Waiting 30s before tracking update...`);

        await new Promise((resolve) => setTimeout(resolve, 30000));

        const headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "Basic " + btoa(`${process.env.SG_USERNAME}:${process.env.SG_PASSWORD}`),
        };

        const trackingRes = await axios.post(
          "https://app.shipglobal.in/apiv1/tools/tracking",
          { tracking: newOrder.shipmentDetails.trackingNo2 },
          { headers, validateStatus: () => true }
        );

        console.log("📦 Tracking recheck response:", trackingRes.data);

        const updatedAwb = trackingRes?.data?.data?.awbInfo?.partner_lastmile_awb;

        if (updatedAwb) {
          await Order.findByIdAndUpdate(
            newOrder._id,
            {
              $set: {
                "shipmentDetails.trackingNumber": updatedAwb,
              },
            },
            { new: true }
          );

          console.log(`✅ Updated trackingNumber to ${updatedAwb}`);
        } else {
          console.log(`⚠️ partner_lastmile_awb still missing after 30s`);
        }
      } catch (err) {
        console.error("❌ Background tracking update failed:", err.message);
      }
    })();

  } catch (error) {
   console.error("Error creating order:", error.message);

return res.status(400).json({
  success: false,
  message: error.message || "Shipment failed",
});

  }
};


//#endregion




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
      .populate('manifest', 'manifestId status')
      .sort({ createdAt: -1 }); // latest first

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

const getOrderDetails = async (req, res) => {
  const { orderId } = req.params;

  try {
    // Fetch only selected fields from the Order collection
    const order = await Order.findById(orderId).select(
      'firstName lastName pickupAddress address1 address2 state country pincode invoiceName totalAmount shipmentType shippingPartner weight length width height invoiceNo invoiceCurrency invoiceDate productItems'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Return only the selected order fields
    return res.status(200).json({
      success: true,
      data: order,
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching order details',
      error: error.message,
    });
  }
};


export { createOrder, updateOrderStatus,updateDisputeStatus, getTotalOrderCount, getAllOrders, clubOrders, getDisputedOrders, getOrderDetails };