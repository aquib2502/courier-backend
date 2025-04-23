import express from 'express';
import { registerUser, loginUser, getOrdersByUserId } from '../controllers/userController.js';

const router = express.Router();

router.post('/registerUser', registerUser);
router.post('/loginUser', loginUser);

// Route to fetch orders by userId
router.get('/orders/:user', getOrdersByUserId);

export default router;