import { StandardCheckoutClient, Env,StandardCheckoutPayRequest } from "pg-sdk-node";
import dotenv from 'dotenv'
import Transaction from "../models/transactionModel.js";
import User from "../models/userModel.js";
dotenv.config()


const clientId = process.env.PG_CLIENT_ID
const clientSecret = process.env.PG_CLIENT_SECRET
const clientVersion = 1
const env = Env.PRODUCTION

const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env)


// Helper function to generate a globally unique merchant order ID
const generateMerchantOrderId = () => {
  const timestamp = Date.now(); // milliseconds since epoch
  const randomPart = Math.floor(Math.random() * 1000); // 0-999
  // Format: TET + timestamp + 3-digit random number
  return `TET${timestamp}${String(randomPart).padStart(3, "0")}`;
};

// Example usage
const newOrderId = generateMerchantOrderId();
console.log(newOrderId); // TET1706139245678001


// Recharge wallet and create a transaction
const rechargeWallet = async (req, res) => {
  try {
    const { amount, userId } = req.body;

    // Validate input
    if (!amount || !userId) {
      return res.status(400).send('Amount and User ID are required');
    }

    // Convert amount to paise for PhonePe
    const amountInPaise = Math.round(amount * 100);


    // Generate a unique merchant order ID
    const merchantOrderId = await generateMerchantOrderId();

    const backendUrl = process.env.BACKEND_URL

    // Correct query string format
    const redirectUrl = `${backendUrl}/api/wallet/check-status?merchantOrderId=${merchantOrderId}&userId=${userId}&amount=${amount}`;

    console.log({ merchantOrderId, amountInPaise, redirectUrl });

    // Save initial transaction with PENDING status
    const transaction = new Transaction({
      user: userId,
      amount,
      merchantOrderId,
      status: 'PENDING',
    });
    await transaction.save();

    // Build the request for PhonePe
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amountInPaise) // <-- PhonePe expects amount in paise
      .redirectUrl(redirectUrl)
      .build();

    // Send payment request to PhonePe
    const response = await client.pay(request);

    return res.json({
      checkoutPageUrl: response.redirectUrl,
    });
  } catch (error) {
    console.error('Error recharging wallet:', error);
    res.status(500).send('Error Recharging Wallet');
  }
};

// Check payment status and update user balance
const checkStatus = async (req, res) => {
  try {
    const { merchantOrderId, userId, amount } = req.query;

    // Validate inputs
    if (!merchantOrderId || !userId || !amount) {
      return res
        .status(400)
        .send('MerchantOrder ID, User ID, and Amount are required');
    }

    // Get order status from PhonePe
    const response = await client.getOrderStatus(merchantOrderId);
    const status = response.state;

    const frontendUrl = process.env.FRONTEND_URL

    // If transaction completed successfully
    if (status === 'COMPLETED') {
      // Update transaction status
      const transaction = await Transaction.findOneAndUpdate(
        { merchantOrderId },
        { $set: { status: 'COMPLETED' } },
        { new: true }
      );

      if (!transaction) {
        console.log('Transaction not found');
      } else {
        console.log('Updated Transaction:', transaction);
      }

      // Increment user's wallet balance instead of replacing it
      const user = await User.findOneAndUpdate(
        { _id: userId },
        { $inc: { walletBalance: Number(amount) } }, // increment balance
        { new: true }
      );

      if (!user) {
        console.error('User not found');
      } else {
        console.log('Updated User Wallet Balance:', user.walletBalance);
      }

      return res.redirect(
        `${frontendUrl}/wallet/success?status=${status}`
      );
    } else {
      // If payment failed, update status as FAILED
      const transaction = await Transaction.findOneAndUpdate(
        { merchantOrderId },
        { $set: { status: 'FAILED' } },
        { new: true }
      );

      if (!transaction) {
        console.log('Transaction not found');
      } else {
        console.log('Updated Transaction:', transaction);
      }

      return res.redirect(
        `${frontendUrl}/wallet/failure?status=${status}`
      );
    }
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).send('Error checking status');
  }
};

export {rechargeWallet, checkStatus}