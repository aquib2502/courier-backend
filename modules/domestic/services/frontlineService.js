import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// Frontline does not have an API integration.
// Orders are saved to DB and fulfilled manually by the admin.
//
// AWB format: FL-<date>-<6 random hex chars>
// e.g. FL-20260627-3a9f1c
// ─────────────────────────────────────────────────────────────

const generateAWB = () => {
  const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex');
  return `FL-${date}-${random}`;
};

// ─────────────────────────────────────────────────────────────
// Normalised response — same shape as shadowfaxService
// ─────────────────────────────────────────────────────────────
const normalise = (awb, rawResponse) => ({
  success:           true,
  awb,
  trackingNumber:    awb,
  shadowfaxOrderId:  awb,       // reused field — stores our internal AWB
  status:            'created',
  shadowfaxResponse: rawResponse,
});

// ─────────────────────────────────────────────────────────────
// Public methods  (same 4-method contract as every carrier)
// ─────────────────────────────────────────────────────────────

/**
 * createForwardShipment
 * No API call — generates AWB, returns normalised response.
 * Full shipment details are saved by domesticService into DomesticShipment.
 */
export const createForwardShipment = async (shipmentData) => {
  const awb = generateAWB();

  console.log('[FRONTLINE] createForwardShipment — order saved for manual fulfillment. AWB:', awb);

  const rawResponse = {
    provider:        'frontline',
    mode:            shipmentData.mode || 'surface',
    type:            'FORWARD',
    referenceNumber: shipmentData.referenceNumber,
    awb,
    pickup:          shipmentData.pickup,
    delivery:        shipmentData.delivery,
    weight:          shipmentData.weight,
    productName:     shipmentData.productName,
    productValue:    shipmentData.productValue,
    note:            'Pending manual fulfillment by admin',
    createdAt:       new Date().toISOString(),
  };

  return normalise(awb, rawResponse);
};

/**
 * createReverseShipment
 * Same as forward — no API call, manual fulfillment.
 */
export const createReverseShipment = async (shipmentData) => {
  const awb = generateAWB();

  console.log('[FRONTLINE] createReverseShipment — order saved for manual fulfillment. AWB:', awb);

  const rawResponse = {
    provider:        'frontline',
    mode:            shipmentData.mode || 'surface',
    type:            'REVERSE',
    referenceNumber: shipmentData.referenceNumber,
    awb,
    pickup:          shipmentData.pickup,   // customer address (returning item)
    delivery:        shipmentData.delivery, // warehouse address
    weight:          shipmentData.weight,
    productName:     shipmentData.productName,
    productValue:    shipmentData.productValue,
    note:            'Pending manual fulfillment by admin',
    createdAt:       new Date().toISOString(),
  };

  return normalise(awb, rawResponse);
};

/**
 * trackShipment
 * Returns the status stored in DomesticShipment (updated manually by admin).
 * domesticService already reads from DB before calling this —
 * we just return the current saved status in the normalised shape.
 */
export const trackShipment = async (awb) => {
  console.log('[FRONTLINE] trackShipment — returning DB status for AWB:', awb);

  // domesticService updates shipment.status from trackingResult.order_details.status
  // We return the awb as status so the existing record is preserved unchanged.
  return {
    message: 'Success',
    order_details: {
      awb_number:     awb,
      status:         null,   // null = domesticService keeps the existing DB status
      status_display: 'Check with admin for latest update',
    },
    tracking_details: [],
  };
};

/**
 * cancelShipment
 * Marks for manual cancellation — no API call.
 * domesticService will issue a refund if responseCode === 200.
 * We return 200 here so the refund is processed immediately
 * since there is no external carrier state to worry about.
 */
export const cancelShipment = async (awb, reason = 'Cancelled by client') => {
  console.log('[FRONTLINE] cancelShipment — AWB:', awb, '| reason:', reason);

  return {
    responseCode: 200,
    responseMsg:  'Frontline order cancelled. Refund processed.',
  };
};