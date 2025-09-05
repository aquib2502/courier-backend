import { getMenuByRole, togglePermission, seedRoles } from "../controllers/roleController.js";
import Router from "express";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.get('/menu', authMiddleware, getMenuByRole);       // Fetch menu for current user
router.post('/toggle', authMiddleware, togglePermission); // Toggle Operator/PickupStaff permission
router.post('/seed', seedRoles);                          // Seed initial roles


export default router;