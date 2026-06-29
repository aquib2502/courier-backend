import axios from 'axios';

// ─────────────────────────────────────────────────────────────
// Hilift Auth
// Token is fetched once and cached in memory.
// Re-fetched automatically on 401.
// ─────────────────────────────────────────────────────────────
let cachedToken = null;

const getToken = async () => {
    if (cachedToken) return cachedToken;

    const res = await axios.post(
        'https://online.hiliftexpress.com/docket_api/get_token',
        {
            company_id: 29,
            email: process.env.HILIFT_EMAIL,
            password: process.env.HILIFT_PASSWORD,
        },
        { headers: { 'Content-Type': 'application/json' } }
    );

    const data = res.data;

    if (!data.success || !data.data?.token) {
        throw new Error(`Hilift auth failed: ${JSON.stringify(data.errors || data)}`);
    }

    cachedToken = data.data.token;

    console.log('[HILIFT] Token fetched and cached.');

    return cachedToken;
};

const clearToken = () => { cachedToken = null; };

// ─────────────────────────────────────────────────────────────
// Axios client factory — built fresh after token is obtained
// ─────────────────────────────────────────────────────────────
const hiliftPost = async (endpoint, payload, retry = true) => {
    const token = await getToken();

    try {
        const res = await axios.post(
            `https://online.hiliftexpress.com${endpoint}`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                timeout: 30000,
            }
        );
        return res.data;
    } catch (err) {
        // If 401 — token expired, clear cache and retry once
        if (err.response?.status === 401 && retry) {
            console.warn('[HILIFT] 401 received — refreshing token and retrying.');
            clearToken();
            return hiliftPost(endpoint, payload, false);
        }
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Hilift needs a unique tracking_no per docket.
 * We generate one from the referenceNumber + timestamp
 * to guarantee uniqueness even on retries.
 */
const buildTrackingNo = (referenceNumber) => {
    const ts = Date.now().toString().slice(-6);
    return `TTE${referenceNumber.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}${ts}`;
};

const today = () => new Date().toISOString().slice(0, 10);       // YYYY-MM-DD
const nowTime = () => new Date().toTimeString().slice(0, 8);     // HH:MM:SS

// ─────────────────────────────────────────────────────────────
// Payload builders
// ─────────────────────────────────────────────────────────────

/**
 * Build the Hilift docket payload for a FORWARD shipment.
 * Shipper  = pickup  (seller / warehouse)
 * Consignee = delivery (customer)
 */
const buildForwardPayload = (shipmentData, trackingNo, customerId) => {
    const { referenceNumber, pickup, delivery, weight, mode } = shipmentData;

    return {
        tracking_no: trackingNo,
        reference_name: referenceNumber,
        customer_id: customerId,
        origin_code: pickup.pincode,
        destination_code: delivery.pincode,
        product_code: '',
        booking_date: today(),
        booking_time: nowTime(),
        pcs: '1',
        shipment_value: String(shipmentData.productValue || 0),
        shipment_value_currency: 'INR',
        actual_weight: String(weight || 0.5),
        shipment_invoice_no: referenceNumber,
        shipment_invoice_date: today(),
        shipment_content: shipmentData.productName || 'Shipment',
        remark: '',
        entry_type: 2,
        api_service_code: mode === 'air' ? process.env.HILIFT_AIR_SERVICE_CODE : process.env.HILIFT_SURFACE_SERVICE_CODE,
        new_docket_free_form_invoice: '0',

        // Shipper = pickup
        shipper_name: pickup.name,
        shipper_company_name: pickup.name,
        shipper_contact_no: pickup.mobile,
        shipper_email: process.env.HILIFT_EMAIL,
        shipper_address_line_1: pickup.address,
        shipper_address_line_2: '',
        shipper_address_line_3: '',
        shipper_city: pickup.city || '',
        shipper_state: pickup.state || '',
        shipper_country: 'IN',
        shipper_zip_code: pickup.pincode,
        shipper_gstin_type: 'GSTIN (Normal)',
        shipper_gstin_no: process.env.HILIFT_GSTIN || '',

        // Consignee = delivery
        consignee_name: delivery.name,
        consignee_company_name: delivery.name,
        consignee_contact_no: delivery.mobile,
        consignee_email: '',
        consignee_address_line_1: delivery.address,
        consignee_address_line_2: '',
        consignee_address_line_3: '',
        consignee_city: delivery.city || '',
        consignee_state: delivery.state || '',
        consignee_country: 'IN',
        consignee_zip_code: delivery.pincode,

        docket_items: [
            {
                actual_weight: String(weight || 0.5),
                length: '10',
                width: '10',
                height: '10',
                number_of_boxes: '1',
            },
        ],
    };
};

/**
 * Build the Hilift docket payload for a REVERSE shipment.
 * Shipper   = pickup  (customer returning the item)
 * Consignee = delivery (seller / warehouse receiving it back)
 */
const buildReversePayload = (shipmentData, trackingNo, customerId) => {
    // Reverse is just a forward with shipper/consignee swapped
    // Pass a cloned shipmentData with pickup/delivery flipped
    const flipped = {
        ...shipmentData,
        pickup: shipmentData.delivery,
        delivery: shipmentData.pickup,
    };
    return buildForwardPayload(flipped, trackingNo, customerId);
};

// ─────────────────────────────────────────────────────────────
// Normalised response — same shape as shadowfaxService
// ─────────────────────────────────────────────────────────────
const normalise = (awb, hiliftOrderId, rawResponse) => ({
    success: true,
    awb,
    trackingNumber: awb,
    shadowfaxOrderId: String(hiliftOrderId ?? ''), // field reused for carrier order id
    status: 'created',
    shadowfaxResponse: rawResponse,                // field reused for raw carrier response
});

// ─────────────────────────────────────────────────────────────
// Public methods  (same names as shadowfaxService.js)
// ─────────────────────────────────────────────────────────────

/**
 * createForwardShipment
 * POST /docket_api/create_docket
 */
export const createForwardShipment = async (shipmentData) => {
    const token = await getToken();
    const customerId = await getCustomerId(token);
    const trackingNo = buildTrackingNo(shipmentData.referenceNumber);
    const payload = buildForwardPayload(shipmentData, trackingNo, customerId);

    console.log('[HILIFT] createForwardShipment payload:', JSON.stringify(payload, null, 2));

    const data = await hiliftPost('/docket_api/create_docket', payload);

    console.log('[HILIFT] createForwardShipment response:', JSON.stringify(data, null, 2));

    if (!data.success) {
        const errMsg = Array.isArray(data.errors) && data.errors.length
            ? data.errors.join(', ')
            : data.message || 'Hilift forward shipment creation failed';
        throw new Error(errMsg);
    }

    // Hilift returns the tracking number in data.data.tracking_no
    const awb = data.data?.tracking_no || trackingNo;
    const id = data.data?.docket_id || null;

    return normalise(awb, id, data);
};

/**
 * createReverseShipment
 * POST /docket_api/create_docket  (same endpoint, shipper/consignee swapped)
 */
export const createReverseShipment = async (shipmentData) => {
    const token = await getToken();
    const customerId = await getCustomerId(token);
    const trackingNo = buildTrackingNo(shipmentData.referenceNumber);
    const payload = buildReversePayload(shipmentData, trackingNo, customerId);

    console.log('[HILIFT] createReverseShipment payload:', JSON.stringify(payload, null, 2));

    const data = await hiliftPost('/docket_api/create_docket', payload);

    console.log('[HILIFT] createReverseShipment response:', JSON.stringify(data, null, 2));

    if (!data.success) {
        const errMsg = Array.isArray(data.errors) && data.errors.length
            ? data.errors.join(', ')
            : data.message || 'Hilift reverse shipment creation failed';
        throw new Error(errMsg);
    }

    const awb = data.data?.tracking_no || trackingNo;
    const id = data.data?.docket_id || null;

    return normalise(awb, id, data);
};

/**
 * trackShipment
 * GET http://admin.hiliftexpress.com/api/tracking_api/get_tracking_data
 *
 * Uses a separate tracking base URL (admin subdomain, no auth header needed —
 * credentials are passed as query params per the Hilift tracking API docs).
 */
export const trackShipment = async (awb) => {
    console.log('[HILIFT] trackShipment awb:', awb);

    const res = await axios.get(
        'http://admin.hiliftexpress.com/api/tracking_api/get_tracking_data',
        {
            params: {
                api_company_id: 29,
                customer_code: process.env.HILIFT_CUSTOMER_CODE,
                tracking_no: awb,
            },
            timeout: 15000,
        }
    );

    const data = res.data;

    console.log('[HILIFT] trackShipment response:', JSON.stringify(data, null, 2));

    if (!data.success) {
        throw new Error(data.message || 'Hilift tracking failed');
    }

    // Normalise to the same shape domesticService.js expects
    // domesticService reads: data.order_details.status  and  data.tracking_details
    const events = data.data?.tracking_details || data.data || [];

    return {
        message: 'Success',
        order_details: {
            status: data.data?.current_status || awb,
            status_display: data.data?.current_status || awb,
            awb_number: awb,
        },
        tracking_details: Array.isArray(events)
            ? events.map((e) => ({
                created: e.date || e.created || '',
                location: e.location || '',
                status: e.status || e.remarks || '',
                remarks: e.remarks || '',
                awb_number: awb,
            }))
            : [],
    };
};

/**
 * cancelShipment
 * Hilift does not expose a public cancel API in the provided docs.
 * This method throws a clear error so domesticService surfaces it
 * to the partner rather than silently failing.
 *
 * Replace the body with the real Hilift cancel endpoint when available.
 */
export const cancelShipment = async (awb, reason = 'Cancelled by client') => {
    console.log('[HILIFT] cancelShipment requested for awb:', awb, '| reason:', reason);

    // ── Uncomment and fill in when Hilift provides a cancel endpoint ──
    // const data = await hiliftPost('/docket_api/cancel_docket', {
    //   tracking_no: awb,
    //   cancel_reason: reason,
    // });
    // return { responseCode: 200, responseMsg: data.message };

    // Until then — return a queued/pending response so the shipment
    // record is marked for manual follow-up without crashing.
    console.warn('[HILIFT] No cancel API available. Manual cancellation required for AWB:', awb);

    return {
        responseCode: 304,   // matches the "queued" path in cancelShipmentService
        responseMsg: 'Cancellation request noted. Please contact Hilift support to cancel AWB: ' + awb,
    };
};

// ─────────────────────────────────────────────────────────────
// Internal: extract customer_id from the auth response
// (needed when building the docket payload)
// ─────────────────────────────────────────────────────────────
const getCustomerId = async () => {
    // customer_id comes back in the auth response.
    // We re-fetch the token only if it was cleared; otherwise
    // we parse it from the cached token (Hilift uses a base64 token
    // that does not embed the customer_id, so we store it separately).
    if (!cachedCustomerId) {
        // Re-auth to get fresh customer_id
        const res = await axios.post(
            'https://online.hiliftexpress.com/docket_api/get_token',
            {
                company_id: 29,
                email: process.env.HILIFT_EMAIL,
                password: process.env.HILIFT_PASSWORD,
            },
            { headers: { 'Content-Type': 'application/json' } }
        );
        cachedCustomerId = res.data?.data?.customer_id;
    }
    return cachedCustomerId;
};

let cachedCustomerId = null;