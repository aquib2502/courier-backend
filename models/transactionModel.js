import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  merchantOrderId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], default: "PENDING" },
  paymentMethod: { type: String, default: "PhonePe" },
  metaInfo: { type: Object }, // store extra info if needed
}, { timestamps: true });

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
