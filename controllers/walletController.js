import axios from "axios";
import User from "../models/userModel.js";
import Transaction from "../models/transactionModel.js";


export const generateMerchantOrderId = async () => {
  // Count existing transactions
  const count = await Transaction.countDocuments();

  // Increment count for the new transaction
  const newNumber = count + 1;

  // Format: TET + 6-digit zero-padded number
  const merchantOrderId = `TET${String(newNumber).padStart(6, "0")}`;

  return merchantOrderId;
};

// Helper to get PhonePe token programmatically
const getPhonePeAccessToken = async () => {
  const requestBodyJson = {
    client_version: 1,
    grant_type: "client_credentials",
    client_id: process.env.PG_CLIENT_ID,
    client_secret: process.env.PG_CLIENT_SECRET
  };

  const requestBody = new URLSearchParams(requestBodyJson).toString();

  const response = await axios.post(
    "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    requestBody,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  // Extract access token from response
  const accessToken = response.data?.access_token;
  if (!accessToken) throw new Error("Failed to get access token");

  return accessToken;
};

export const createPayment = async (req, res) => {
  try {
    const { userId, amount, redirectUrl, metaInfo } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: "userId and amount are required" });
    }

    // Generate merchantOrderId
    const merchantOrderId = await generateMerchantOrderId();

    // Save transaction as PENDING
    const transaction = await Transaction.create({
      user: userId,
      merchantOrderId,
      amount,
      metaInfo,
      status: "PENDING"
    });

    // Get access token
    const accessToken = await getPhonePeAccessToken();

    // Prepare PhonePe payment request
    const requestBody = {
      merchantOrderId,
      amount,
      expireAfter: 1200,
      metaInfo: metaInfo || {},
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Payment message used for collect requests",
        merchantUrls: { redirectUrl: redirectUrl || "" }
      }
    };

    // Call PhonePe API with Authorization O-Bearer
    const response = await axios.post(
      "https://api.phonepe.com/apis/pg/checkout/v2/pay",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `O-Bearer ${accessToken}` // <-- important!
        }
      }
    );

    res.json({ phonepeResponse: response.data, transaction });
  } catch (error) {
    console.error("Payment Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create payment" });
  }
};

export const handleWebhook = async (req, res) => {
  try {
    const { merchantOrderId, status } = req.body;

    // Find transaction
    const transaction = await Transaction.findOne({ merchantOrderId });
    if (!transaction) return res.status(404).send("Transaction not found");

    // Update transaction status
    transaction.status = status === "SUCCESS" ? "SUCCESS" : "FAILED";
    await transaction.save();

    // If successful, update user's wallet
    if (status === "SUCCESS") {
      await User.findByIdAndUpdate(transaction.user, {
        $inc: { walletBalance: transaction.amount }
      });
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error:", error.message);
    res.status(500).send("Error processing webhook");
  }
};
