import express from 'express';
import partnerAuthMiddleware from '../middlewares/partnerAuthMiddleware.js';
import {
  bookShipment,
  trackShipment,
  cancelShipment,
  getWallet,
  getShipments,
} from '../controllers/domesticController.js';

const router = express.Router();

// All domestic routes require valid partner credentials
router.use(partnerAuthMiddleware);

// POST /api/domestic/book          → create FORWARD or REVERSE shipment
router.post('/book', bookShipment);

// GET  /api/domestic/track/:awb    → track a shipment by AWB
router.get('/track/:awb', trackShipment);

// POST /api/domestic/cancel        → cancel a shipment
router.post('/cancel', cancelShipment);

// GET  /api/domestic/wallet        → partner wallet balance + recent ledger
router.get('/wallet', getWallet);

// GET  /api/domestic/shipments     → paginated list of partner's shipments
router.get('/shipments', getShipments);

export default router;