import express from "express";
import { createPayment, handleWebhook } from "../controllers/walletController.js";

const router = express.Router();

// Route to get token
// router.get("/token", getPhonePeToken);

// Route to create payment
router.post("/pay", createPayment);

// Webhook route (PhonePe will POST here)
router.post("/webhook", express.json(), handleWebhook);

export default router;
