import {
  bookShipmentService,
  trackShipmentService,
  cancelShipmentService,
  getWalletService,
  getShipmentsService,
} from '../services/domesticService.js';

// ─────────────────────────────────────────────────────────────
// POST /api/domestic/book
// ─────────────────────────────────────────────────────────────

export const bookShipment = async (req, res) => {
  try {
    const result = await bookShipmentService(req.partner, req.body);

    return res.status(201).json(result);
  } catch (error) {
    console.error('[domesticController] bookShipment error:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message || 'Booking failed',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/domestic/track/:awb
// ─────────────────────────────────────────────────────────────

export const trackShipment = async (req, res) => {
  try {
    const { awb } = req.params;

    if (!awb) {
      return res.status(400).json({ success: false, message: 'AWB is required' });
    }

    const result = await trackShipmentService(req.partner, awb);

    return res.status(200).json(result);
  } catch (error) {
    console.error('[domesticController] trackShipment error:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message || 'Tracking failed',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/domestic/cancel
// ─────────────────────────────────────────────────────────────

export const cancelShipment = async (req, res) => {
  try {
    const { awb, cancelReason } = req.body;

    if (!awb) {
      return res.status(400).json({ success: false, message: 'awb is required' });
    }

    const result = await cancelShipmentService(req.partner, awb, cancelReason);

    return res.status(200).json(result);
  } catch (error) {
    console.error('[domesticController] cancelShipment error:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message || 'Cancellation failed',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/domestic/wallet
// ─────────────────────────────────────────────────────────────

export const getWallet = async (req, res) => {
  try {
    const result = await getWalletService(req.partner);

    return res.status(200).json(result);
  } catch (error) {
    console.error('[domesticController] getWallet error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Could not retrieve wallet',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/domestic/shipments
// ─────────────────────────────────────────────────────────────

export const getShipments = async (req, res) => {
  try {
    const result = await getShipmentsService(req.partner, req.query);

    return res.status(200).json(result);
  } catch (error) {
    console.error('[domesticController] getShipments error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Could not retrieve shipments',
    });
  }
};