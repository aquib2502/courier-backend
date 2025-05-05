import express from 'express';
import { registerUser, loginUser, getOrdersByUserId, getUserDetails } from '../controllers/userController.js';

const router = express.Router();

router.post('/registerUser', registerUser);
router.post('/loginUser', loginUser);

// Route to fetch orders by userId
router.get('/orders/:user', getOrdersByUserId);

router.get('/getuser/:userId', getUserDetails); // Route to fetch user details by userId

export default router;