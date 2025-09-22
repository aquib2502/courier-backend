import { Router } from "express";

const router = Router();    

import { loginAdmin, getUsersWithOrders, editUserKYCStatus, updateUserDetails   , getClubbingDetails, updateManifestStatus, addNote, adminRaiseDispute, getNote } from "../controllers/adminController.js";

router.post("/login", loginAdmin);

router.get("/users", getUsersWithOrders);

router.get('/clubbing', getClubbingDetails)

router.post('/addnote', addNote)

router.get('/getNote', getNote)

router.post('/raise-dispute', adminRaiseDispute)

router.patch('/updateKYC/:userId', editUserKYCStatus) // Route to update KYC status

router.put('/updateuser/:userId', updateUserDetails)

router.put('/updatemanifest/:manifestId', updateManifestStatus) // Route to update user details


export default router;