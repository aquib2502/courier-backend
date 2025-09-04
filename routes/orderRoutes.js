import express from 'express';
import { createOrder, updateOrderStatus, getTotalOrderCount, getAllOrders } from '../controllers/orderController.js'; // Import the createOrder function

const router = express.Router();

// Route to create a new order
router.post('/create', createOrder);

router.put('/:orderId/status', updateOrderStatus)

// Route to get total order count for serial number generation
router.get('/count/total', getTotalOrderCount);

router.get('/total', getAllOrders);

export default router;
    