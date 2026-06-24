import Partner from '../models/partnerModel.js';
import User from '../../../models/userModel.js';
import jwt from 'jsonwebtoken';

/**
 * partnerAuthMiddleware
 *
 * Reads x-api-key and x-api-secret from request headers,
 * OR reads JWT token from Authorization Bearer header,
 * validates them, and attaches the partner document to req.partner.
 *
 * For standard users, it resolves/creates a shadow Partner document
 * and synchronizes their wallet balance.
 */
const partnerAuthMiddleware = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];
    const authHeader = req.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role === 'partner') {
        const partner = await Partner.findById(decoded.userId);
        if (!partner) {
          return res.status(401).json({
            success: false,
            message: 'Unauthorized: Partner not found.',
          });
        }
        if (!partner.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Unauthorized: Partner account is inactive.',
          });
        }
        req.partner = partner;
        return next();
      } else {
        // Standard user - resolve or create shadow partner
        let partner = await Partner.findOne({ userId: decoded.userId });
        if (!partner) {
          partner = await Partner.findOne({ email: decoded.email });
        }

        // Get user details
        const user = await User.findById(decoded.userId);
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Unauthorized: User not found.',
          });
        }

        if (!partner) {
          const { apiKey: newApiKey, apiSecret: newApiSecret } = Partner.generateCredentials();
          partner = await Partner.create({
            name: user.fullname,
            email: user.email,
            userId: user._id,
            apiKey: newApiKey,
            apiSecret: newApiSecret,
            walletBalance: user.walletBalance,
            isActive: true,
          });
        } else {
          // Sync wallet balance
          partner.walletBalance = user.walletBalance;
          if (!partner.userId) {
            partner.userId = user._id;
          }
          await partner.save();
        }

        req.partner = partner;
        req.user = decoded;
        return next();
      }
    }

    // Fallback to API keys
    if (!apiKey || !apiSecret) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: API credentials or Bearer token is required.',
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

    req.partner = partner;
    next();
  } catch (error) {
    console.error('partnerAuthMiddleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token.',
    });
  }
};

export default partnerAuthMiddleware;