import { Router } from "express";
import nodeCron from "node-cron";
const router = Router();    

import { loginAdmin, getUsersWithOrders, editUserKYCStatus, updateUserDetails   , getClubbingDetails, updateManifestStatus, addNote, adminRaiseDispute, getNote, giveCredit, resetMonthlyCredit } from "../controllers/adminController.js";

router.post("/login", loginAdmin);

router.get("/users", getUsersWithOrders);

router.get('/clubbing', getClubbingDetails)

router.post('/addnote', addNote)

router.get('/getNote', getNote)

router.post('/give-credit', giveCredit)

router.post('/reset-credit', async (req, res) => {
  try {
    await resetMonthlyCredit();
    res.status(200).json({ success: true, message: 'Credit reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error resetting credit' });
  }
});

router.post('/raise-dispute', adminRaiseDispute)

router.patch('/updateKYC/:userId', editUserKYCStatus) // Route to update KYC status

router.put('/updateuser/:userId', updateUserDetails)

router.put('/updatemanifest/:manifestId', updateManifestStatus) // Route to update user details

nodeCron.schedule('0 0 * * *', () => {
  console.log('Running scheduled monthly credit reset...');
  resetMonthlyCredit();
});

export default router;