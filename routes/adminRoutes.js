import { Router } from "express";

const router = Router();    

import { loginAdmin, getUsersWithOrders, editUserKYCStatus, updateUserDetails } from "../controllers/adminController.js";

router.post("/login", loginAdmin);

router.get("/users", getUsersWithOrders);


router.patch('/updateKYC/:userId', editUserKYCStatus) // Route to update KYC status

router.put('/updateuser/:userId', updateUserDetails)

export default router;