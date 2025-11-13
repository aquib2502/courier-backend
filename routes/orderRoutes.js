import express from 'express';
import { createOrder, updateOrderStatus, getTotalOrderCount, getAllOrders, clubOrders, getDisputedOrders, updateDisputeStatus, getOrderDetails } from '../controllers/orderController.js'; // Import the createOrder function
import authMiddleware from '../middlewares/authMiddleware.js';
const router = express.Router();

// Route to create a new order
router.post('/create', createOrder);

router.get('/getdispute', authMiddleware, getDisputedOrders)



// Route to get total order count for serial number generation
router.get('/count/total', getTotalOrderCount);

router.get('/total', getAllOrders);

router.post('/club', clubOrders)

router.put('/:orderId/status', updateOrderStatus)
router.get('/getOrderDetails/:orderId', getOrderDetails)
router.put('/updatedispute/:id', updateDisputeStatus )

export default router;
    