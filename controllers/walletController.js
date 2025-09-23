import axios from "axios";
import User from "../models/userModel.js";
import Transaction from "../models/transactionModel.js";

// Generate unique merchant order ID
export const generateMerchantOrderId = async () => {
  const count = await Transaction.countDocuments();
  return `TET${String(count + 1).padStart(6, "0")}`;
};

// Get PhonePe Access Token
const getPhonePeAccessToken = async () => {
  const body = new URLSearchParams({
    client_version: 1,
    grant_type: "client_credentials",
    client_id: process.env.PG_CLIENT_ID,
    client_secret: process.env.PG_CLIENT_SECRET
  }).toString();

  const response = await axios.post(
    "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    body,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (!response.data?.access_token) throw new Error("Failed to get access token");
  return response.data.access_token;
};

// Create Payment
export const createPayment = async (req, res) => {
  try {
    const { userId, amount, redirectUrl, metaInfo } = req.body;

    if (!userId || !amount || !redirectUrl) {
      return res.status(400).json({ error: "userId, amount, and redirectUrl are required" });
    }

    const merchantOrderId = await generateMerchantOrderId();

    const transaction = await Transaction.create({
      user: userId,
      merchantOrderId,
      amount,
      metaInfo,
      status: "PENDING"
    });

    const accessToken = await getPhonePeAccessToken();

    const requestBody = {
      merchantOrderId,
      amount,
      expireAfter: 1200, // optional
      metaInfo: metaInfo || {},
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Wallet recharge",
        merchantUrls: { redirectUrl }
      }
    };

    const response = await axios.post(
      "https://api.phonepe.com/apis/pg/checkout/v2/pay",
      requestBody,
      { headers: { "Content-Type": "application/json", "Authorization": `O-Bearer ${accessToken}` } }
    );

    // Return redirectUrl properly
    const redirect = response.data?.data?.redirectUrl;
    res.json({ redirectUrl: redirect, transaction });
  } catch (error) {
    console.error("Payment Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create payment" });
  }
};

// Webhook Handler
export const handleWebhook = async (req, res) => {
  try {
    const { event, payload } = req.body;

    // Only process relevant events
    if (!["checkout.order.completed", "checkout.order.failed"].includes(event)) {
      return res.status(200).send("Event ignored");
    }

    const merchantOrderId = payload.merchantOrderId;
    const transaction = await Transaction.findOne({ merchantOrderId });
    if (!transaction) return res.status(404).send("Transaction not found");

    transaction.status = payload.state === "SUCCESS" ? "SUCCESS" : "FAILED";
    await transaction.save();

    if (transaction.status === "SUCCESS") {
      await User.findByIdAndUpdate(transaction.user, { $inc: { walletBalance: transaction.amount } });
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error:", error.message);
    res.status(500).send("Error processing webhook");
  }
};
