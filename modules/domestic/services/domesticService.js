import Partner from '../models/partnerModel.js';
import PartnerWalletLedger from '../models/partnerWalletLedgerModel.js';
import DomesticShipment from '../models/domesticShipmentModel.js';
import {
  createForwardShipment,
  createReverseShipment,
  trackShipment,
  cancelShipment,
} from './shadowfaxService.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Simple per-kg pricing. Replace with your actual rate card.
 * weight in kg → cost in ₹
 */
const calculateShipmentCost = (weight) => {
  const BASE_RATE = 50; // ₹ flat for first 0.5 kg
  const PER_KG = 40;    // ₹ per additional kg

  if (weight <= 0.5) return BASE_RATE;
  return BASE_RATE + Math.ceil((weight - 0.5) * 2) * (PER_KG / 2);
};

// ─────────────────────────────────────────────────────────────
// bookShipmentService
// ─────────────────────────────────────────────────────────────

/**
 * Main booking flow:
 * 1. Validate payload
 * 2. Check partner wallet
 * 3. Call Shadowfax
 * 4. Deduct wallet
 * 5. Create ledger entry
 * 6. Save shipment
 * 7. Return normalised response
 */
export const bookShipmentService = async (partner, payload) => {
  const { shipmentType, referenceNumber, pickup, delivery, weight } = payload;

  // ── 1. Basic validation ──────────────────────────────────────
  if (!shipmentType || !['FORWARD', 'REVERSE'].includes(shipmentType)) {
    throw new Error('shipmentType must be FORWARD or REVERSE');
  }
  if (!referenceNumber) throw new Error('referenceNumber is required');
  if (!pickup?.name || !pickup?.mobile || !pickup?.address || !pickup?.pincode) {
    throw new Error('pickup.name, pickup.mobile, pickup.address and pickup.pincode are required');
  }
  if (!delivery?.name || !delivery?.mobile || !delivery?.address || !delivery?.pincode) {
    throw new Error('delivery.name, delivery.mobile, delivery.address and delivery.pincode are required');
  }

  // ── 2. Wallet check ──────────────────────────────────────────
  const cost = calculateShipmentCost(weight || 0.5);

  // Re-fetch partner with latest balance (avoid stale data)
  const freshPartner = await Partner.findById(partner._id);

  if (freshPartner.walletBalance < cost) {
    throw new Error(
      `Insufficient wallet balance. Required: ₹${cost}, Available: ₹${freshPartner.walletBalance}`
    );
  }

  // ── 3. Call Shadowfax ────────────────────────────────────────
  const sfxData = {
    referenceNumber,
    pickup,
    delivery,
    weight: weight || 0.5,
    productName: payload.productName || 'Shipment',
    productValue: payload.productValue || 0,
    hsnCode: payload.hsnCode,
    gstin: payload.gstin,
  };

  let sfxResult;

  if (shipmentType === 'FORWARD') {
    sfxResult = await createForwardShipment(sfxData);
  } else {
    sfxResult = await createReverseShipment(sfxData);
  }

  // ── 4. Deduct wallet ─────────────────────────────────────────
  freshPartner.walletBalance -= cost;
  await freshPartner.save();

  // ── 5. Create ledger entry ───────────────────────────────────
  // (We create the shipment doc first so we have its _id for the ledger)
  const shipment = new DomesticShipment({
    partnerId: partner._id,
    referenceNumber,
    shipmentType,
    pickupAddress: pickup,
    deliveryAddress: delivery,
    weight: weight || 0.5,
    awb: sfxResult.awb,
    trackingNumber: sfxResult.trackingNumber,
    status: sfxResult.status,
    amountCharged: cost,
    shadowfaxOrderId: sfxResult.shadowfaxOrderId,
    shadowfaxResponse: sfxResult.shadowfaxResponse,
  });

  await shipment.save();

  await PartnerWalletLedger.create({
    partnerId: partner._id,
    type: 'DEBIT',
    amount: cost,
    balanceAfter: freshPartner.walletBalance,
    shipmentId: shipment._id,
    remarks: `Booking ${shipmentType} shipment — AWB: ${sfxResult.awb}`,
  });

  // ── 6. Return normalised response ────────────────────────────
  return {
    success: true,
    awb: sfxResult.awb,
    trackingNumber: sfxResult.trackingNumber,
    status: sfxResult.status,
    shipmentId: shipment._id,
    amountCharged: cost,
    walletBalance: freshPartner.walletBalance,
  };
};

// ─────────────────────────────────────────────────────────────
// trackShipmentService
// ─────────────────────────────────────────────────────────────

export const trackShipmentService = async (partner, awb) => {
  // Confirm this AWB belongs to this partner
  const shipment = await DomesticShipment.findOne({
    partnerId: partner._id,
    awb,
  });

  if (!shipment) {
    throw new Error('AWB not found for this partner');
  }

  const sfxTracking = await trackShipment(awb);

  // Update local status with whatever Shadowfax says
  const latestStatus = sfxTracking.order_details?.status || shipment.status;
  shipment.status = latestStatus;
  await shipment.save();

  return {
    success: true,
    awb,
    status: sfxTracking.order_details?.status_display || latestStatus,
    statusId: latestStatus,
    trackingDetails: sfxTracking.tracking_details || [],
    orderDetails: sfxTracking.order_details || {},
  };
};

// ─────────────────────────────────────────────────────────────
// cancelShipmentService
// ─────────────────────────────────────────────────────────────

export const cancelShipmentService = async (partner, awb, cancelReason) => {
  const shipment = await DomesticShipment.findOne({
    partnerId: partner._id,
    awb,
  });

  if (!shipment) {
    throw new Error('AWB not found for this partner');
  }

  if (shipment.status === 'cancelled') {
    throw new Error('Shipment is already cancelled');
  }

  const sfxResult = await cancelShipment(awb, cancelReason || 'Cancelled by client');

  // Refund if Shadowfax confirmed cancellation (not just queued)
  const refunded = sfxResult.responseCode === 200;

  if (refunded) {
    const freshPartner = await Partner.findById(partner._id);
    freshPartner.walletBalance += shipment.amountCharged;
    await freshPartner.save();

    await PartnerWalletLedger.create({
      partnerId: partner._id,
      type: 'REFUND',
      amount: shipment.amountCharged,
      balanceAfter: freshPartner.walletBalance,
      shipmentId: shipment._id,
      remarks: `Refund for cancelled AWB: ${awb}`,
    });

    shipment.status = 'cancelled';
    await shipment.save();
  }

  return {
    success: true,
    awb,
    message: sfxResult.responseMsg,
    refunded,
    refundAmount: refunded ? shipment.amountCharged : 0,
  };
};

// ─────────────────────────────────────────────────────────────
// getWalletService
// ─────────────────────────────────────────────────────────────

export const getWalletService = async (partner) => {
  const recentLedger = await PartnerWalletLedger.find({
    partnerId: partner._id,
  })
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    success: true,
    walletBalance: partner.walletBalance,
    recentTransactions: recentLedger,
  };
};

// ─────────────────────────────────────────────────────────────
// getShipmentsService
// ─────────────────────────────────────────────────────────────

export const getShipmentsService = async (partner, query = {}) => {
  const filter = { partnerId: partner._id };

  if (query.shipmentType) filter.shipmentType = query.shipmentType;
  if (query.status) filter.status = query.status;

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [shipments, total] = await Promise.all([
    DomesticShipment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    DomesticShipment.countDocuments(filter),
  ]);

  return {
    success: true,
    total,
    page,
    limit,
    shipments,
  };
};