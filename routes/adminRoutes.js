import { Router } from "express";
import nodeCron from "node-cron";
const router = Router();    

import { loginAdmin, getUsersWithOrders, editUserKYCStatus,updateOrderStatus, updateUserDetails   , getClubbingDetails, updateManifestStatus, addNote, adminRaiseDispute, getNote, giveCredit, resetMonthlyCredit, updateCredit, getAllTransactions, inwardScan } from "../controllers/adminController.js";
import Order from "../models/orderModel.js";

router.post("/login", loginAdmin);

router.get("/users", getUsersWithOrders);

router.get('/clubbing', getClubbingDetails)

router.post('/addnote', addNote)

router.get('/getNote', getNote)

router.post('/inward-scan', inwardScan)

router.post('/give-credit', giveCredit)

router.put('/update-credit', updateCredit)

router.post('/reset-credit', async (req, res) => {
  try {
    await resetMonthlyCredit();
    res.status(200).json({ success: true, message: 'Credit reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error resetting credit' });
  }
});

router.put('/updateorderstatus/:orderId', updateOrderStatus )

router.get('/getAllTransactions', getAllTransactions)

router.post('/raise-dispute', adminRaiseDispute)

router.patch('/updateKYC/:userId', editUserKYCStatus) // Route to update KYC status

router.put('/updateuser/:userId', updateUserDetails)

router.put('/updatemanifest/:manifestId', updateManifestStatus) // Route to update user details

nodeCron.schedule('0 0 * * *', () => {
  console.log('Running scheduled monthly credit reset...');
  resetMonthlyCredit();
});

// /api/orders/invoices
router.get("/invoices", async (req, res) => {
  try {
    const orders = await Order.find({}, { invoiceNo: 1, user: 1, manifest: 1 }).populate("user", "_id fullname");
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching invoice list:", error);
    res.status(500).json({ success: false, message: "Server error fetching invoices" });
  }
});


export default router;