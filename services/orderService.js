import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Transaction from "../models/transactionModel.js";
import { UnitedCallShipmentAPI } from "../utils/UnitedShipmentService.js";
import { ShipGlobalShipmentCallApi } from "../utils/SGSShipementService.js";
import axios from "axios";

const generateMerchantOrderId = () => {
  const timestamp = Date.now();
  const randomPart = Math.floor(Math.random() * 1000);

  return `TET${timestamp}${String(randomPart).padStart(3, "0")}`;
};

const generateSerialNumber = async () => {
  const totalCount = await Order.countDocuments({});
  const paddedCount = String(totalCount + 1).padStart(6, "0");

  return `TTE${paddedCount}`;
};

const updateTrackingInBackground = async (newOrder) => {
  try {
    const partnerName = newOrder.shippingPartner?.name || "";

    if (
      partnerName.includes("Self") ||
      partnerName.includes("QuickExpress")
    ) {
      console.log(`Skipping tracking update for ${partnerName}`);
      return;
    }

    console.log("⏳ Waiting 30s before tracking update...");

    await new Promise((resolve) => setTimeout(resolve, 30000));

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization:
        "Basic " +
        btoa(`${process.env.SG_USERNAME}:${process.env.SG_PASSWORD}`),
    };

    const trackingRes = await axios.post(
      "https://app.shipglobal.in/apiv1/tools/tracking",
      {
        tracking: newOrder.shipmentDetails.trackingNo2,
      },
      {
        headers,
        validateStatus: () => true,
      }
    );

    console.log("📦 Tracking recheck response:", trackingRes.data);

    const updatedAwb =
      trackingRes?.data?.data?.awbInfo?.partner_lastmile_awb;

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
      console.log("⚠️ partner_lastmile_awb still missing after 30s");
    }
  } catch (error) {
    console.error(
      "❌ Background tracking update failed:",
      error.message
    );
  }
};

export const createOrderService = async (payload) => {
  const { user, totalAmount, shippingPartner, ...orderData } = payload;

  if (!user) {
    throw new Error("User ID is required");
  }

  const userDoc = await User.findById(user);

  if (!userDoc) {
    throw new Error("User not found");
  }

  if (userDoc.kycStatus !== "approved") {
    throw new Error("User KYC is not approved");
  }

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
  // DRAFT ORDER FLOW (NEW)
  // =====================================================

  const isDraftOrder =
    orderData.orderStatus === "Drafts" &&
    orderData.paymentStatus === "Payment Pending";

  if (isDraftOrder) {
    await newOrder.save();

    return {
      success: true,
      statusCode: 201,
      message: "Draft order saved successfully",
      data: newOrder,
    };
  }

  // =====================================================
  // EXISTING LOGIC BELOW (UNCHANGED)
  // =====================================================

  const availableWallet = userDoc.walletBalance;
  const availableCredit = userDoc.hasCredit
    ? userDoc.creditLimit - userDoc.usedCredit
    : 0;

  const totalAvailable = availableWallet + availableCredit;

  if (totalAvailable < totalAmount) {
    throw new Error(
      "Insufficient wallet balance or credit limit"
    );
  }

  let remainingAmount = totalAmount;

  if (availableWallet >= remainingAmount) {
    userDoc.walletBalance -= remainingAmount;
    remainingAmount = 0;
  } else {
    remainingAmount -= availableWallet;
    userDoc.walletBalance = 0;
  }

  if (remainingAmount > 0) {
    userDoc.usedCredit =
      (userDoc.usedCredit || 0) + remainingAmount;
  }

  await userDoc.save();

  let shipmentDetails = {
    trackingNumber: null,
    awbNumber: null,
    pdf: null,
    weight: null,
    service: null,
    thirdPartyService: null,
  };

  if (shippingPartner.name.includes("QuickExpress")) {
    console.log(
      "QuickExpress detected — skipping shipment API call."
    );
  } else if (
    shippingPartner.name.includes("Self") ||
    shippingPartner.name.includes("Basic")
  ) {
    const shipmentData = await UnitedCallShipmentAPI(
      newOrder
    );

    console.log("United API Response:", shipmentData);

    if (shipmentData.status !== "success") {
      throw new Error(
        shipmentData.message || "Shipment failed"
      );
    }

    shipmentDetails = {
      trackingNumber: shipmentData.trackingNo,
      awbNumber: shipmentData.awb,
      pdf: shipmentData.labelPDF,
      weight: shipmentData.weight,
      service: shipmentData.service,
      thirdPartyService: shipmentData.thirdParty,
    };
  } else {
    shipmentDetails =
      await ShipGlobalShipmentCallApi(newOrder);

    if (shipmentDetails.status === "failed") {
      const errorsArray = Array.isArray(
        shipmentDetails.errors
      )
        ? shipmentDetails.errors
        : shipmentDetails.description &&
          Array.isArray(shipmentDetails.description)
        ? shipmentDetails.description
        : null;

      const error = new Error(
        errorsArray
          ? errorsArray.join(", ")
          : shipmentDetails.description ||
              "Shipment failed"
      );

      error.errors = errorsArray;

      throw error;
    }
  }

  newOrder.shipmentDetails = shipmentDetails;
  newOrder.lastMileAWB = shipmentDetails.awbNumber;

  await newOrder.save();

  const merchantOrderId =
    generateMerchantOrderId();

  const paymentMethod =
    availableWallet >= totalAmount
      ? "Wallet"
      : "Credit";

  const transaction = new Transaction({
    user: userDoc._id,
    amount: totalAmount,
    status: "COMPLETED",
    type: "order-booking",
    paymentMethod,
    merchantOrderId,
  });

  await transaction.save();

  updateTrackingInBackground(newOrder);

  return {
    success: true,
    statusCode: 201,
    message: "Order created successfully!",
    data: newOrder,
    walletBalance: userDoc.walletBalance,
    usedCredit: userDoc.usedCredit,
  };
};

export const bookDraftOrderService = async (orderId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.orderStatus !== "Drafts") {
    throw new Error("Only draft orders can be booked");
  }

  const userDoc = await User.findById(order.user);

  if (!userDoc) {
    throw new Error("User not found");
  }

  const totalAmount = order.totalAmount;

  const availableWallet = userDoc.walletBalance;
  const availableCredit = userDoc.hasCredit
    ? userDoc.creditLimit - userDoc.usedCredit
    : 0;

  const totalAvailable = availableWallet + availableCredit;

  if (totalAvailable < totalAmount) {
    throw new Error(
      "Insufficient wallet balance or credit limit"
    );
  }

  let remainingAmount = totalAmount;

  if (availableWallet >= remainingAmount) {
    userDoc.walletBalance -= remainingAmount;
    remainingAmount = 0;
  } else {
    remainingAmount -= availableWallet;
    userDoc.walletBalance = 0;
  }

  if (remainingAmount > 0) {
    userDoc.usedCredit =
      (userDoc.usedCredit || 0) + remainingAmount;
  }

  await userDoc.save();

  let shipmentDetails = {
    trackingNumber: null,
    awbNumber: null,
    pdf: null,
    weight: null,
    service: null,
    thirdPartyService: null,
  };

  const partnerName = order.shippingPartner?.name || "";

  if (partnerName.includes("QuickExpress")) {
    console.log(
      "QuickExpress detected — skipping shipment API call."
    );
  } else if (
    partnerName.includes("Self") ||
    partnerName.includes("Basic")
  ) {
    const shipmentData =
      await UnitedCallShipmentAPI(order);

    if (shipmentData.status !== "success") {
      throw new Error(
        shipmentData.message || "Shipment failed"
      );
    }

    shipmentDetails = {
      trackingNumber: shipmentData.trackingNo,
      awbNumber: shipmentData.awb,
      pdf: shipmentData.labelPDF,
      weight: shipmentData.weight,
      service: shipmentData.service,
      thirdPartyService: shipmentData.thirdParty,
    };
  } else {
    shipmentDetails =
      await ShipGlobalShipmentCallApi(order);

    if (shipmentDetails.status === "failed") {
      const errorsArray = Array.isArray(
        shipmentDetails.errors
      )
        ? shipmentDetails.errors
        : null;

      throw new Error(
        errorsArray?.join(", ") ||
          shipmentDetails.description ||
          "Shipment failed"
      );
    }
  }

  order.shipmentDetails = shipmentDetails;
  order.lastMileAWB = shipmentDetails.awbNumber;

  order.paymentStatus = "Payment Received";
  order.orderStatus = "Ready";

  await order.save();

  const merchantOrderId =
    generateMerchantOrderId();

  const paymentMethod =
    availableWallet >= totalAmount
      ? "Wallet"
      : "Credit";

  await Transaction.create({
    user: userDoc._id,
    amount: totalAmount,
    status: "COMPLETED",
    type: "order-booking",
    paymentMethod,
    merchantOrderId,
  });

  updateTrackingInBackground(order);

  return {
    success: true,
    message: "Order booked successfully",
    data: order,
  };
};