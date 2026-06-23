import Partner from '../models/partnerModel.js';

/**
 * partnerAuthMiddleware
 *
 * Reads x-api-key and x-api-secret from request headers,
 * validates them against the Partner collection,
 * and attaches the partner document to req.partner.
 *
 * Returns 401 if credentials are missing or invalid,
 * or if the partner is inactive.
 */
const partnerAuthMiddleware = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];

    if (!apiKey || !apiSecret) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: x-api-key and x-api-secret headers are required.',
      });
    }

    const partner = await Partner.findOne({ apiKey, apiSecret });

    if (!partner) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid API credentials.',
      });
    }

    if (!partner.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Partner account is inactive.',
      });
    }

    // Attach partner to request so downstream handlers can use it
    req.partner = partner;

    next();
  } catch (error) {
    console.error('partnerAuthMiddleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

export default partnerAuthMiddleware;