import express from 'express';
import { createOrder, updateOrderStatus } from '../controllers/orderController.js'; // Import the createOrder function

const router = express.Router();

// Route to create a new order
router.post('/create', createOrder);

router.put('/:orderId/status', updateOrderStatus)

export default router;
