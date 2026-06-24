/**
 * modules/domestic/routes/domesticAdminRoutes.js
 *
 * Internal-only admin endpoints.
 * Mount these behind your existing admin auth middleware,
 * or restrict them to internal network access only.
 *
 * In app.js / server.js add ONE line:
 *   import domesticAdminRoutes from './modules/domestic/routes/domesticAdminRoutes.js';
 *   app.use('/api/domestic/admin', domesticAdminRoutes);   // add your admin auth middleware here
 */

import express from 'express';
import Partner from '../models/partnerModel.js';
import PartnerWalletLedger from '../models/partnerWalletLedgerModel.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /api/domestic/admin/add-partner
// Body: { name, initialWalletBalance }
// ─────────────────────────────────────────────────────────────
router.post('/add-partner', async (req, res) => {
  try {
    const { name, initialWalletBalance = 0, email, password } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    let hashedPassword = undefined;
    if (email) {
      const existing = await Partner.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
    }

    const { apiKey, apiSecret } = Partner.generateCredentials();

    const partner = await Partner.create({
      name,
      email,
      password: hashedPassword,
      apiKey,
      apiSecret,
      walletBalance: initialWalletBalance,
      isActive: true,
    });

    // If starting balance > 0, record it in the ledger
    if (initialWalletBalance > 0) {
      await PartnerWalletLedger.create({
        partnerId: partner._id,
        type: 'CREDIT',
        amount: initialWalletBalance,
        balanceAfter: initialWalletBalance,
        remarks: 'Initial wallet credit on partner onboarding',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Partner created successfully',
      data: {
        _id: partner._id,
        name: partner.name,
        apiKey: partner.apiKey,
        apiSecret: partner.apiSecret,
        walletBalance: partner.walletBalance,
        isActive: partner.isActive,
      },
    });
  } catch (error) {
    console.error('[admin] add-partner error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/domestic/admin/credit-wallet
// Body: { partnerId, amount, remarks }
// ─────────────────────────────────────────────────────────────
router.post('/credit-wallet', async (req, res) => {
  try {
    const { partnerId, amount, remarks = 'Manual credit' } = req.body;

    if (!partnerId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'partnerId and a positive amount are required',
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    partner.walletBalance += amount;
    await partner.save();

    await PartnerWalletLedger.create({
      partnerId: partner._id,
      type: 'CREDIT',
      amount,
      balanceAfter: partner.walletBalance,
      remarks,
    });

    return res.status(200).json({
      success: true,
      message: `₹${amount} credited to ${partner.name}`,
      walletBalance: partner.walletBalance,
    });
  } catch (error) {
    console.error('[admin] credit-wallet error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/domestic/admin/partners
// List all partners (for admin dashboard)
// ─────────────────────────────────────────────────────────────
router.get('/partners', async (req, res) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: partners });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/domestic/admin/toggle-partner/:id
// Activate or deactivate a partner
// ─────────────────────────────────────────────────────────────
router.patch('/toggle-partner/:id', async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    partner.isActive = !partner.isActive;
    await partner.save();

    return res.status(200).json({
      success: true,
      message: `Partner is now ${partner.isActive ? 'active' : 'inactive'}`,
      isActive: partner.isActive,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;