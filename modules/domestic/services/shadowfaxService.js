import axios from 'axios';

// ─────────────────────────────────────────────────────────────
// Axios client — single reusable instance for all Shadowfax calls
// ─────────────────────────────────────────────────────────────
const sfxClient = axios.create({
  baseURL: process.env.SHADOWFAX_BASE_URL || 'https://dale.shadowfax.in/api',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Token ${process.env.SHADOWFAX_API_TOKEN}`,
  },
  timeout: 30000,
});

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

/**
 * Build the standard forward-order payload for Shadowfax.
 * Uses the "marketplace" order_type so Shadowfax picks up
 * from the seller (our pickup address) and delivers to customer.
 */
const buildForwardPayload = (shipmentData) => {
  const { referenceNumber, pickup, delivery, weight } = shipmentData;

  return {
    order_type: 'marketplace',
    order_details: {
      client_order_id: referenceNumber,
      actual_weight: Math.round((weight || 0.5) * 1000), // kg → grams
      volumetric_weight: 0,
      product_value: shipmentData.productValue || 0,
      payment_mode: 'Prepaid',
      cod_amount: '0',
      order_service: 'regular',
    },
    customer_details: {
      name: delivery.name,
      contact: delivery.mobile,
      address_line_1: delivery.address,
      address_line_2: '',
      city: delivery.city || '',
      state: delivery.state || '',
      pincode: parseInt(delivery.pincode, 10),
    },
    pickup_details: {
      name: pickup.name,
      contact: pickup.mobile,
      address_line_1: pickup.address,
      address_line_2: '',
      city: pickup.city || '',
      state: pickup.state || '',
      pincode: parseInt(pickup.pincode, 10),
    },
    // Return-to-seller mirrors the pickup address
    rts_details: {
      name: pickup.name,
      contact: pickup.mobile,
      address_line_1: pickup.address,
      address_line_2: '',
      city: pickup.city || '',
      state: pickup.state || '',
      pincode: parseInt(pickup.pincode, 10),
    },
    product_details: [
      {
        sku_name: shipmentData.productName || 'Shipment',
        price: shipmentData.productValue || 0,
        additional_details: {
          quantity: 1,
        },
      },
    ],
  };
};

/**
 * Build the reverse-pickup payload for Shadowfax.
 * Uses the dedicated /v3/clients/requests endpoint.
 * "pickup" = the customer who is returning the item.
 * "delivery/destination" = the seller/warehouse where it should land.
 */
const buildReversePayload = (shipmentData) => {
  const { referenceNumber, pickup, delivery, weight } = shipmentData;

  return {
    client_order_number: referenceNumber,
    warehouse_address: delivery.address,
    destination_pincode: parseInt(delivery.pincode, 10),
    pickup_type: 'regular',
    price: shipmentData.productValue || 0,
    total_amount: shipmentData.productValue || 0,
    address_attributes: {
      address_line: pickup.address,
      city: pickup.city || '',
      country: 'India',
      pincode: parseInt(pickup.pincode, 10),
      name: pickup.name,
      phone_number: pickup.mobile,
    },
    weight_details: {
      actual_weight: Math.round((weight || 0.5) * 1000), // kg → grams
      volumetric_weight: 0,
    },
    skus_attributes: [
      {
        name: shipmentData.productName || 'Shipment',
        price: shipmentData.productValue || 0,
        seller_details: {
          regd_name: delivery.name,
          regd_address: delivery.address,
          state: delivery.state || '',
          gstin: shipmentData.gstin || '27AAAAA0000A1Z5', // placeholder if not provided
        },
        taxes: {
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
          total_tax_amount: 0,
        },
        hsn_code: shipmentData.hsnCode || '00000000',
        invoice_id: referenceNumber,
      },
    ],
  };
};

// ─────────────────────────────────────────────────────────────
// Normalised response shape returned by every method below.
// Controllers / domesticService only ever see this shape.
// ─────────────────────────────────────────────────────────────
const normalise = (awb, shadowfaxOrderId, rawResponse) => ({
  success: true,
  awb,
  trackingNumber: awb,
  shadowfaxOrderId: String(shadowfaxOrderId ?? ''),
  status: 'created',
  shadowfaxResponse: rawResponse,
});

// ─────────────────────────────────────────────────────────────
// Public methods
// ─────────────────────────────────────────────────────────────

/**
 * createForwardShipment
 *
 * POST /v3/clients/orders/
 * Creates a marketplace (seller-pickup) forward order in Shadowfax.
 *
 * @param {object} shipmentData
 *   referenceNumber, pickup{name,mobile,address,city,state,pincode},
 *   delivery{…}, weight (kg), productValue, productName
 * @returns {object} normalised response with awb, trackingNumber, etc.
 */
export const createForwardShipment = async (shipmentData) => {
  const payload = buildForwardPayload(shipmentData);

  console.log('[SFX] createForwardShipment payload:', JSON.stringify(payload, null, 2));

  const response = await sfxClient.post('/v3/clients/orders/', payload);
  const data = response.data;

  console.log('[SFX] createForwardShipment response:', JSON.stringify(data, null, 2));

  if (data.message !== 'Success' || !data.data?.awb_number) {
    const errMsg =
      typeof data.errors === 'string'
        ? data.errors
        : Array.isArray(data.errors)
        ? data.errors.join(', ')
        : JSON.stringify(data.errors || data.message || 'Forward shipment creation failed');

    throw new Error(errMsg);
  }

  return normalise(data.data.awb_number, data.data.id, data);
};

/**
 * createReverseShipment
 *
 * POST /v3/clients/requests
 * Creates a reverse (customer-pickup) order in Shadowfax.
 *
 * @param {object} shipmentData — same shape as createForwardShipment
 * @returns {object} normalised response
 */
export const createReverseShipment = async (shipmentData) => {
  const payload = buildReversePayload(shipmentData);

  console.log('[SFX] createReverseShipment payload:', JSON.stringify(payload, null, 2));

  const response = await sfxClient.post('/v3/clients/requests', payload);
  const data = response.data;

  console.log('[SFX] createReverseShipment response:', JSON.stringify(data, null, 2));

  if (data.message !== 'Success' || !data.client_request_id) {
    const errMsg = data.message || 'Reverse shipment creation failed';
    throw new Error(errMsg);
  }

  return normalise(data.client_request_id, null, data);
};

/**
 * trackShipment
 *
 * GET /v4/clients/orders/{awb}/track/
 *
 * @param {string} awb
 * @returns {object} Shadowfax tracking response
 */
export const trackShipment = async (awb) => {
  console.log('[SFX] trackShipment awb:', awb);

  const response = await sfxClient.get(`/v4/clients/orders/${awb}/track/`);
  const data = response.data;

  console.log('[SFX] trackShipment response:', JSON.stringify(data, null, 2));

  if (data.message !== 'Success') {
    throw new Error(data.message || 'Tracking failed');
  }

  return data;
};

/**
 * cancelShipment
 *
 * POST /v3/clients/orders/cancel/
 *
 * @param {string} awb  AWB number or client_order_id
 * @param {string} reason  Cancellation reason text
 * @returns {object} Shadowfax cancel response
 */
export const cancelShipment = async (awb, reason = 'Cancelled by client') => {
  console.log('[SFX] cancelShipment awb:', awb);

  const response = await sfxClient.post('/v3/clients/orders/cancel/', {
    request_id: awb,
    cancel_remarks: reason,
  });

  const data = response.data;

  console.log('[SFX] cancelShipment response:', JSON.stringify(data, null, 2));

  // Shadowfax returns responseCode inside the body even on HTTP 200
  if (data.responseCode === 400) {
    throw new Error(data.responseMsg || 'Cancellation failed');
  }

  return data;
};

/**
 * getServiceability
 *
 * GET /v1/clients/serviceability/
 * Checks if a pincode is serviceable for a given service type.
 *
 * @param {string} pincode
 * @param {string} service  One of: seller_pickup | customer_delivery | customer_pickup | warehouse_pickup
 * @returns {object} serviceability data
 */
export const getServiceability = async (
  pincode,
  service = 'customer_delivery'
) => {
  const response = await sfxClient.get('/v1/clients/serviceability/', {
    params: {
      service,
      pincodes: pincode,
      count: 1,
      page: 1,
    },
  });

  return response.data;
};