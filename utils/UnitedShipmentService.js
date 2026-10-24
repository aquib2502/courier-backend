import axios from 'axios';
import fs from 'fs';
import path from 'path';
import moment from 'moment';

// Configuration
const getUWCConfig = () => ({
  baseUrl: (process.env.UWC_BASE_URL || 'https://unitedcouriers.biz').replace(/\/+$/, ''),
  apiKey: process.env.UWC_API_KEY || 'uwc_tqvl4v1dshyvxanzs372nnwklawg',
  apiSecret: process.env.UWC_API_SECRET || 'Vwa47jjyiZkYZW2KW4oiUdNN8Gj3S7ZvnYqY11nitcXLzcHN',
  customerCode: process.env.UWC_CUSTOMER_CODE || 'ASE09',
  backendUrl: (process.env.BACKEND_URL || 'https://api.thetraceexpress.com').replace(/\/+$/, '')
});

// In-memory cache for auth token and active services
let tokenCache = {
  token: null,
  expiresAt: null,
  customerCode: null
};

let servicesCache = {
  services: null,
  expiresAt: null
};

/**
 * Obtain a valid Bearer token from UWC API (cached in-memory for ~24 hours)
 */
export const getUWCAccessToken = async () => {
  const config = getUWCConfig();
  const now = Date.now();

  // Reuse cached token if valid for at least 5 more minutes
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    return { token: tokenCache.token, customerCode: tokenCache.customerCode || config.customerCode };
  }

  const credentials = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

  try {
    const response = await axios.post(
      `${config.baseUrl}/api/v1/auth/token`,
      {},
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${credentials}`
        },
        timeout: 15000
      }
    );

    const data = response.data;
    if (!data?.token) {
      throw new Error('Failed to retrieve bearer token from UWC API');
    }

    const expiresInMs = (data.expires_in || 86400) * 1000;
    tokenCache = {
      token: data.token,
      expiresAt: now + expiresInMs,
      customerCode: data.customer_code || config.customerCode
    };

    console.log(`[UWC] New auth token acquired. Expires in ${Math.round((expiresInMs / 1000) / 60)} minutes.`);
    return { token: tokenCache.token, customerCode: tokenCache.customerCode };
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error('[UWC Auth Error]:', errorMsg);
    throw new Error(`UWC Authentication failed: ${errorMsg}`);
  }
};

/**
 * Fetch available services for the account (cached for 1 hour)
 */
export const getUWCAvailableServices = async () => {
  const now = Date.now();
  if (servicesCache.services && servicesCache.expiresAt && servicesCache.expiresAt > now) {
    return servicesCache.services;
  }

  const { token, customerCode } = await getUWCAccessToken();
  const config = getUWCConfig();

  try {
    const response = await axios.get(
      `${config.baseUrl}/api/v1/services/${customerCode}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        timeout: 15000
      }
    );

    const services = response.data?.services || [];
    servicesCache = {
      services,
      expiresAt: now + 60 * 60 * 1000 // 1 hour cache
    };
    return services;
  } catch (error) {
    console.warn('[UWC Services Error]:', error.response?.data?.message || error.message);
    // If services check fails, return null so caller can proceed with fallback/defaults
    return null;
  }
};

/**
 * State code helpers
 */
const INDIAN_STATES = {
  maharashtra: 'MH', delhi: 'DL', karnataka: 'KA', 'tamil nadu': 'TN',
  gujarat: 'GJ', 'uttar pradesh': 'UP', haryana: 'HR', 'west bengal': 'WB',
  rajasthan: 'RJ', kerala: 'KL', telangana: 'TS', 'andhra pradesh': 'AP',
  punjab: 'PB', 'madhya pradesh': 'MP', bihar: 'BR', odisha: 'OD',
  assam: 'AS', jharkhand: 'JH', chhattisgarh: 'CG', uttarakhand: 'UK',
  goa: 'GA', 'himachal pradesh': 'HP', 'jammu and kashmir': 'JK', chandigarh: 'CH'
};

const US_STATES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC'
};

const normalizeIndianState = (state) => {
  if (!state) return 'MH';
  const clean = state.trim();
  if (clean.length === 2) return clean.toUpperCase();
  return INDIAN_STATES[clean.toLowerCase()] || 'MH';
};

const normalizeUSState = (state) => {
  if (!state) return 'CA';
  const clean = state.trim();
  if (clean.length === 2) return clean.toUpperCase();
  return US_STATES[clean.toLowerCase()] || clean;
};

/**
 * Resolve destination country code (e.g. "United States" -> "US")
 */
const resolveCountryCode = (country) => {
  if (!country) return 'US';
  const c = country.trim().toLowerCase();
  if (c === 'united states' || c === 'usa' || c === 'us' || c.includes('united states')) return 'US';
  if (c === 'united kingdom' || c === 'uk' || c === 'gb') return 'GB';
  if (c === 'germany' || c === 'de') return 'DE';
  if (c === 'france' || c === 'fr') return 'FR';
  if (c === 'canada' || c === 'ca') return 'CA';
  if (c === 'australia' || c === 'au') return 'AU';
  if (c.length === 2) return c.toUpperCase();
  return 'US';
};

/**
 * Builds the draft request payload for UWC
 */
const buildDraftPayload = (orderData, serviceCode, destCountryCode) => {
  const getFullName = () => `${orderData.firstName || ''} ${orderData.lastName || ''}`.trim() || orderData.firstName || 'Customer';

  const productItems = Array.isArray(orderData.productItems) && orderData.productItems.length > 0
    ? orderData.productItems
    : [{ productName: 'Package Item', productQuantity: 1, productPrice: 500 }];

  // Calculate total invoice amount in INR
  const totalInvoiceAmount = productItems.reduce(
    (sum, p) => sum + (parseFloat(p.productPrice) || 0) * (parseInt(p.productQuantity, 10) || 1),
    0
  );

  const formattedDate = orderData.invoiceDate
    ? moment(orderData.invoiceDate).format('YYYY-MM-DD')
    : moment().format('YYYY-MM-DD');

  const refNumber = orderData.invoiceNo
    ? `${orderData.invoiceNo}`
    : `REF-${Date.now()}`;

  const weight = parseFloat(orderData.weight || 0.5);

  return {
    service_code: serviceCode,
    delivery_destination: destCountryCode,
    origin_type: 'CSB IV',
    reason_for_export: 'commercial',
    business_type: 'customer',
    ref_number: refNumber,
    shipper: {
      company_name: 'AS ENTERPRICES',
      contact_person: 'AS ENTERPRICES',
      address_line1: '9TH FLOORM1818 MTR RNO B, SAGBAUG SNEHSAGAR',
      address_line2: 'MUMBAI',
      pincode: '400059',
      city: 'Mumbai',
      state: normalizeIndianState(orderData.pickupAddressState || 'MH'),
      phone_number: (orderData.mobile || '9876543210').replace(/\D/g, '').slice(-10),
      email: 'shipping@asenterprises.com',
      kyc_type: 'GST (Normal)',
      kyc_number: '27GWAPS7865D1Z1'
    },
    consignee: {
      name: getFullName(),
      contact_person: getFullName(),
      address_line1: orderData.address1 || '',
      address_line2: orderData.address2 || '',
      zip_code: String(orderData.pincode || '').replace(/[^a-zA-Z0-9]/g, '').trim(),
      city: orderData.city || '',
      state: destCountryCode === 'US' ? normalizeUSState(orderData.state) : (orderData.state || ''),
      phone_number: orderData.mobile || '',
      email: orderData.email || 'customer@example.com'
    },
    packages: [
      {
        actual_weight_kg: weight > 0 ? weight : 0.5,
        length_cm: parseFloat(orderData.length || 10) || 10,
        width_cm: parseFloat(orderData.width || 10) || 10,
        height_cm: parseFloat(orderData.height || 10) || 10
      }
    ],
    invoice: {
      invoice_number: orderData.invoiceNo || `INV-${Date.now()}`,
      invoice_date: formattedDate,
      invoice_amount: totalInvoiceAmount > 0 ? totalInvoiceAmount : 1000,
      incoterms: 'CIF',
      invoice_currency: orderData.invoiceCurrency || 'INR'
    },
    items: productItems.map((p, idx) => {
      const qty = parseInt(p.productQuantity, 10) || 1;
      const rate = parseFloat(p.productPrice) || 500;
      return {
        box_no: 1,
        description: p.productName || `Item ${idx + 1}`,
        hs_code: orderData.HSNCode || '62052000',
        unit_type: 'PCS',
        qty,
        unit_rate: rate,
        amount: qty * rate
      };
    })
  };
};

/**
 * Downloads the label PDF using Bearer token and saves it to uploads/labels/
 */
const downloadAndSaveLabel = async (awbNumber, token) => {
  const config = getUWCConfig();
  const labelUrl = `${config.baseUrl}/api/v1/manifests/${awbNumber}/label?box=1`;

  const labelsDir = path.join(process.cwd(), 'uploads', 'labels');
  if (!fs.existsSync(labelsDir)) {
    fs.mkdirSync(labelsDir, { recursive: true });
  }

  const fileName = `${awbNumber}.pdf`;
  const filePath = path.join(labelsDir, fileName);

  try {
    const response = await axios.get(labelUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      },
      responseType: 'arraybuffer',
      timeout: 20000
    });

    fs.writeFileSync(filePath, Buffer.from(response.data));
    console.log(`[UWC] Label PDF saved locally: ${filePath}`);
    return `${config.backendUrl}/label/${fileName}`;
  } catch (error) {
    console.error(`[UWC] Error downloading label for ${awbNumber}:`, error.message);
    // Return direct route fallback if download encounters an issue
    return `${config.backendUrl}/label/${fileName}`;
  }
};

/**
 * Main United Worldwide Shipment Booking Service
 * Implements intelligent carrier selection and fallback:
 * For USA + Premium Self:
 *   1. Check if United Post (POST-US) is available and weight <= 5.0 kg
 *   2. If yes, book with POST-US
 *   3. If unavailable, rejected, or weight > 5.0 kg, automatically fallback to Prior Post (PRIORITY-POST-US)
 */
export const UnitedCallShipmentAPI = async (orderData) => {
  const config = getUWCConfig();
  const destCountry = resolveCountryCode(orderData.country);
  const weight = parseFloat(orderData.weight || 0.5);

  const partnerName = (orderData.shippingPartner?.name || '').toLowerCase();
  const isPremiumSelf = partnerName.includes('self') || partnerName.includes('basic');

  console.log(`[UWC] Processing shipment for ${destCountry} | Weight: ${weight}kg | Partner: ${orderData.shippingPartner?.name || 'N/A'}`);

  const { token } = await getUWCAccessToken();

  // Determine candidate service codes
  let candidateServices = [];

  if (destCountry === 'US') {
    if (isPremiumSelf) {
      // User's specific rule:
      // First check whether United Post (POST-US, GOFO, max 5kg) is available.
      // If yes, book from that.
      // If no, book from Prior Post (PRIORITY-POST-US, EC01/USPS, max 6kg).
      const availableServices = await getUWCAvailableServices();
      const isUnitedPostEnabled = !availableServices || availableServices.some(s => s.service_code === 'POST-US');

      if (isUnitedPostEnabled && weight <= 5.0) {
        candidateServices = [
          {
            code: 'POST-US',
            name: 'UNITED POST',
            courier: 'GOFO',
            network: 'GOFO ONLY'
          },
          {
            code: 'PRIORITY-POST-US',
            name: 'UNITED PRIOR POST',
            courier: 'EC01',
            network: 'USPS ONLY'
          }
        ];
      } else {
        console.log(`[UWC] United Post not candidate (enabled=${isUnitedPostEnabled}, weight=${weight}kg). Using Prior Post directly.`);
        candidateServices = [
          {
            code: 'PRIORITY-POST-US',
            name: 'UNITED PRIOR POST',
            courier: 'EC01',
            network: 'USPS ONLY'
          }
        ];
      }
    } else {
      // Default USA mapping (e.g. Ground or Express)
      candidateServices = [
        {
          code: 'GROUND-PREMIUM-US',
          name: 'UNITED GROUND PREMIUM',
          courier: 'UPS',
          network: 'UPS Ground'
        },
        {
          code: 'PRIORITY-POST-US',
          name: 'UNITED PRIOR POST',
          courier: 'EC01',
          network: 'USPS ONLY'
        }
      ];
    }
  } else {
    // Non-US destinations: map to PRIORITY-POST-{country} or AIR-PREMIUM-{country}
    candidateServices = [
      {
        code: `PRIORITY-POST-${destCountry}`,
        name: 'UNITED PRIOR POST',
        courier: 'UNITED',
        network: 'DIRECT'
      },
      {
        code: `AIR-PREMIUM-${destCountry}`,
        name: 'UNITED AIR PREMIUM',
        courier: 'DPD',
        network: 'DPD'
      }
    ];
  }

  let lastError = null;

  for (const candidate of candidateServices) {
    try {
      console.log(`[UWC] Attempting booking with service: ${candidate.code} (${candidate.name})...`);

      // 1. Create Draft
      const draftPayload = buildDraftPayload(orderData, candidate.code, destCountry);
      const draftResponse = await axios.post(
        `${config.baseUrl}/api/v1/manifests`,
        draftPayload,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          timeout: 20000
        }
      );

      const draftData = draftResponse.data;
      if (!draftData?.success || !draftData?.awb_number) {
        throw new Error(draftData?.message || 'Failed to create shipment draft');
      }

      const awbNumber = draftData.awb_number;
      console.log(`[UWC] Draft created successfully with AWB: ${awbNumber}. Proceeding to book draft...`);

      // 2. Book Draft
      const bookResponse = await axios.post(
        `${config.baseUrl}/api/v1/manifests/from-draft`,
        { awb_number: awbNumber },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          timeout: 25000
        }
      );

      const bookData = bookResponse.data;
      if (!bookData?.success) {
        throw new Error(bookData?.message || 'Failed to book draft with carrier');
      }

      console.log(`[UWC] Successfully booked shipment ${awbNumber} with ${candidate.name}! Tracking: ${bookData.carrier_tracking_number || awbNumber}`);

      // 3. Download and store label locally
      const localPdfUrl = await downloadAndSaveLabel(awbNumber, token);

      return {
        status: 'success',
        awb: awbNumber,
        trackingNo: bookData.carrier_tracking_number || awbNumber,
        trackingAlt: bookData.manifest_number || null,
        labelPDF: localPdfUrl,
        service: candidate.name,
        weight: weight,
        courier: candidate.courier,
        thirdParty: candidate.network,
        raw: bookData
      };

    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.errors
        ? JSON.stringify(err.response?.data?.errors)
        : err.message;

      console.warn(`[UWC] Service ${candidate.code} failed: ${errMsg}`);
      lastError = new Error(`UWC (${candidate.code}): ${errMsg}`);

      // If there are more candidate services (e.g. fallback from POST-US to PRIORITY-POST-US), loop continues
    }
  }

  // If all candidate services failed, throw last error
  throw lastError || new Error('All candidate United Worldwide services failed for this shipment');
};