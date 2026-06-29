import Partner from '../models/partnerModel.js';
import PartnerWalletLedger from '../models/partnerWalletLedgerModel.js';
import DomesticShipment from '../models/domesticShipmentModel.js';
import DomesticRate from '../../../models/domesticRateModel.js';
import { calculateDomesticRate } from '../../../utils/domesticRateCalculator.js';
import { CARRIERS } from '../config/carrierConfig.js';
import { getCarrier } from './carrierFactory.js';
import User from '../../../models/userModel.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Look up the rate for this shipment from the DomesticRates collection.
 * Uses domesticRateCalculator helper to compute dynamic pricing.
 */
const getRateFromDB = async (courierKey, weight, pickup = {}, delivery = {}) => {
  const domesticRates = await DomesticRate.find({});
  try {
    const cost = calculateDomesticRate(courierKey, weight, pickup, delivery)(domesticRates);
    return cost;
  } catch (error) {
    throw new Error(
      `No rate found for courier "${courierKey}" at weight ${weight} kg. Reason: ${error.message}. ` +
      `Please contact TraceExpress to update the rate card.`
    );
  }
};

// ─────────────────────────────────────────────────────────────
// bookShipmentService
// ─────────────────────────────────────────────────────────────

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

  // ── NEW: Resolve carrier ─────────────────────────────────────
  const courierKey = payload.courier || 'TTE_BASIC_SURFACE';
  const carrierConfig = CARRIERS[courierKey];
  if (!carrierConfig) {
    throw new Error(`Unknown courier: "${courierKey}". Valid options: ${Object.keys(CARRIERS).join(', ')}`);
  }
  const carrier = getCarrier(carrierConfig.provider);

  // ── 2. Wallet check ──────────────────────────────────────────
  const cost = await getRateFromDB(courierKey, weight || 0.5, pickup, delivery);

  const freshPartner = await Partner.findById(partner._id);

  if (freshPartner.walletBalance < cost) {
    throw new Error(
      `Insufficient wallet balance. Required: ₹${cost}, Available: ₹${freshPartner.walletBalance}`
    );
  }

  // ── 3. Call carrier ──────────────────────────────────────────
  const shipmentData = {
    referenceNumber,
    pickup,
    delivery,
    weight: weight || 0.5,
    productName: payload.productName || 'Shipment',
    productValue: payload.productValue || 0,
    hsnCode: payload.hsnCode,
    gstin: payload.gstin,
  };

  // CHANGED: was hardcoded createForwardShipment/createReverseShipment
  const carrierResult = shipmentType === 'FORWARD'
    ? await carrier.createForwardShipment(shipmentData)
    : await carrier.createReverseShipment(shipmentData);

  // ── 4. Deduct wallet ─────────────────────────────────────────
  freshPartner.walletBalance -= cost;
  await freshPartner.save();

  if (freshPartner.userId) {
    await User.findByIdAndUpdate(freshPartner.userId, { $inc: { walletBalance: -cost } });
  }

  // ── 5. Save shipment + ledger ────────────────────────────────
  const shipment = new DomesticShipment({
    partnerId: partner._id,
    referenceNumber,
    shipmentType,
    pickupAddress: pickup,
    deliveryAddress: delivery,
    weight: weight || 0.5,
    courier: carrierConfig.label,                             // CHANGED: was hardcoded 'Shadowfax'
    awb: carrierResult.awb,
    trackingNumber: carrierResult.trackingNumber,
    status: carrierResult.status,
    amountCharged: cost,
    shadowfaxOrderId: carrierResult.shadowfaxOrderId,
    shadowfaxResponse: carrierResult.shadowfaxResponse,
  });

  await shipment.save();

  await PartnerWalletLedger.create({
    partnerId: partner._id,
    type: 'DEBIT',
    amount: cost,
    balanceAfter: freshPartner.walletBalance,
    shipmentId: shipment._id,
    remarks: `Booking ${shipmentType} shipment — AWB: ${carrierResult.awb}`,
  });

  return {
    success: true,
    awb: carrierResult.awb,
    trackingNumber: carrierResult.trackingNumber,
    status: carrierResult.status,
    shipmentId: shipment._id,
    amountCharged: cost,
    walletBalance: freshPartner.walletBalance,
  };
};

// ─────────────────────────────────────────────────────────────
// trackShipmentService
// ─────────────────────────────────────────────────────────────

export const trackShipmentService = async (partner, awb) => {
  const shipment = await DomesticShipment.findOne({ partnerId: partner._id, awb });

  if (!shipment) throw new Error('AWB not found for this partner');

  // NEW: route tracking through the correct carrier based on what was saved
  const carrierConfig = Object.values(CARRIERS).find(c => c.label === shipment.courier);
  const carrier = carrierConfig
    ? getCarrier(carrierConfig.provider)
    : getCarrier('shadowfax');                               // safe fallback for old records

  const trackingResult = await carrier.trackShipment(awb);

  const latestStatus = trackingResult.order_details?.status || shipment.status;
  shipment.status = latestStatus;
  await shipment.save();

  return {
    success: true,
    awb,
    status: trackingResult.order_details?.status_display || latestStatus,
    statusId: latestStatus,
    trackingDetails: trackingResult.tracking_details || [],
    orderDetails: trackingResult.order_details || {},
  };
};

// ─────────────────────────────────────────────────────────────
// cancelShipmentService
// ─────────────────────────────────────────────────────────────

export const cancelShipmentService = async (partner, awb, cancelReason) => {
  const shipment = await DomesticShipment.findOne({ partnerId: partner._id, awb });

  if (!shipment) throw new Error('AWB not found for this partner');
  if (shipment.status === 'cancelled') throw new Error('Shipment is already cancelled');

  // NEW: route cancel through the correct carrier
  const carrierConfig = Object.values(CARRIERS).find(c => c.label === shipment.courier);
  const carrier = carrierConfig
    ? getCarrier(carrierConfig.provider)
    : getCarrier('shadowfax');                               // safe fallback for old records

  const cancelResult = await carrier.cancelShipment(awb, cancelReason || 'Cancelled by client');

  const refunded = cancelResult.responseCode === 200;

  if (refunded) {
    const freshPartner = await Partner.findById(partner._id);
    freshPartner.walletBalance += shipment.amountCharged;
    await freshPartner.save();

    if (freshPartner.userId) {
      await User.findByIdAndUpdate(freshPartner.userId, { $inc: { walletBalance: shipment.amountCharged } });
    }

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
    message: cancelResult.responseMsg,
    refunded,
    refundAmount: refunded ? shipment.amountCharged : 0,
  };
};

// ─────────────────────────────────────────────────────────────
// getWalletService — UNCHANGED
// ─────────────────────────────────────────────────────────────

export const getWalletService = async (partner) => {
  const recentLedger = await PartnerWalletLedger.find({ partnerId: partner._id })
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    success: true,
    walletBalance: partner.walletBalance,
    recentTransactions: recentLedger,
  };
};

// ─────────────────────────────────────────────────────────────
// getShipmentsService — UNCHANGED
// ─────────────────────────────────────────────────────────────

export const getShipmentsService = async (partner, query = {}) => {
  const filter = { partnerId: partner._id };

  if (query.shipmentType) filter.shipmentType = query.shipmentType;
  if (query.status) filter.status = query.status;

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [shipments, total] = await Promise.all([
    DomesticShipment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    DomesticShipment.countDocuments(filter),
  ]);

  return { success: true, total, page, limit, shipments };
};