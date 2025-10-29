import axios from "axios";
import fs from "fs";
import path from "path";

// ✅ Hardcoded ISO2 → Country name mapping
const COUNTRY_MAP = {
  AF: "Afghanistan",
  AX: "Aland Islands",
  AL: "Albania",
  DZ: "Algeria",
  AS: "American Samoa",
  AD: "Andorra",
  AO: "Angola",
  AI: "Anguilla",
  AQ: "Antarctica",
  AG: "Antigua And Barbuda",
  AR: "Argentina",
  AM: "Armenia",
  AW: "Aruba",
  AU: "Australia",
  AT: "Austria",
  AZ: "Azerbaijan",
  BS: "Bahamas The",
  BH: "Bahrain",
  BD: "Bangladesh",
  BB: "Barbados",
  BY: "Belarus",
  BE: "Belgium",
  BZ: "Belize",
  BJ: "Benin",
  BM: "Bermuda",
  BT: "Bhutan",
  BO: "Bolivia",
  BA: "Bosnia and Herzegovina",
  BW: "Botswana",
  BV: "Bouvet Island",
  BR: "Brazil",
  IO: "British Indian Ocean Territory",
  BN: "Brunei",
  BG: "Bulgaria",
  BF: "Burkina Faso",
  BI: "Burundi",
  KH: "Cambodia",
  CM: "Cameroon",
  CA: "Canada",
  CV: "Cape Verde",
  KY: "Cayman Islands",
  CF: "Central African Republic",
  TD: "Chad",
  CL: "Chile",
  CN: "China",
  CX: "Christmas Island",
  CC: "Cocos (Keeling) Islands",
  CO: "Colombia",
  KM: "Comoros",
  CG: "Congo",
  CD: "Democratic Republic of the Congo",
  CK: "Cook Islands",
  CR: "Costa Rica",
  CI: "Cote D'Ivoire (Ivory Coast)",
  HR: "Croatia",
  CU: "Cuba",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DK: "Denmark",
  DJ: "Djibouti",
  DM: "Dominica",
  DO: "Dominican Republic",
  TL: "East Timor",
  EC: "Ecuador",
  EG: "Egypt",
  SV: "El Salvador",
  GQ: "Equatorial Guinea",
  ER: "Eritrea",
  EE: "Estonia",
  ET: "Ethiopia",
  FK: "Falkland Islands",
  FO: "Faroe Islands",
  FJ: "Fiji Islands",
  FI: "Finland",
  FR: "France",
  GF: "French Guiana",
  PF: "French Polynesia",
  TF: "French Southern Territories",
  GA: "Gabon",
  GM: "Gambia The",
  GE: "Georgia",
  DE: "Germany",
  GH: "Ghana",
  GI: "Gibraltar",
  GR: "Greece",
  GL: "Greenland",
  GD: "Grenada",
  GP: "Guadeloupe",
  GU: "Guam",
  GT: "Guatemala",
  GG: "Guernsey and Alderney",
  GN: "Guinea",
  GW: "Guinea-Bissau",
  GY: "Guyana",
  HT: "Haiti",
  HM: "Heard Island and McDonald Islands",
  HN: "Honduras",
  HK: "Hong Kong S.A.R.",
  HU: "Hungary",
  IS: "Iceland",
  IN: "India",
  ID: "Indonesia",
  IR: "Iran",
  IQ: "Iraq",
  IE: "Ireland",
  IL: "Israel",
  IT: "Italy",
  JM: "Jamaica",
  JP: "Japan",
  JE: "Jersey",
  JO: "Jordan",
  KZ: "Kazakhstan",
  KE: "Kenya",
  KI: "Kiribati",
  KP: "North Korea",
  KR: "South Korea",
  KW: "Kuwait",
  KG: "Kyrgyzstan",
  LA: "Laos",
  LV: "Latvia",
  LB: "Lebanon",
  LS: "Lesotho",
  LR: "Liberia",
  LY: "Libya",
  LI: "Liechtenstein",
  LT: "Lithuania",
  LU: "Luxembourg",
  MO: "Macau S.A.R.",
  MK: "Macedonia",
  MG: "Madagascar",
  MW: "Malawi",
  MY: "Malaysia",
  MV: "Maldives",
  ML: "Mali",
  MT: "Malta",
  IM: "Man (Isle of)",
  MH: "Marshall Islands",
  MQ: "Martinique",
  MR: "Mauritania",
  MU: "Mauritius",
  YT: "Mayotte",
  MX: "Mexico",
  FM: "Micronesia",
  MD: "Moldova",
  MC: "Monaco",
  MN: "Mongolia",
  ME: "Montenegro",
  MS: "Montserrat",
  MA: "Morocco",
  MZ: "Mozambique",
  MM: "Myanmar",
  NA: "Namibia",
  NR: "Nauru",
  NP: "Nepal",
  BQ: "Bonaire, Sint Eustatius and Saba",
  NL: "Netherlands",
  NC: "New Caledonia",
  NZ: "New Zealand",
  NI: "Nicaragua",
  NE: "Niger",
  NG: "Nigeria",
  NU: "Niue",
  NF: "Norfolk Island",
  MP: "Northern Mariana Islands",
  NO: "Norway",
  OM: "Oman",
  PK: "Pakistan",
  PW: "Palau",
  PS: "Palestinian Territory Occupied",
  PA: "Panama",
  PG: "Papua new Guinea",
  PY: "Paraguay",
  PE: "Peru",
  PH: "Philippines",
  PN: "Pitcairn Island",
  PL: "Poland",
  PT: "Portugal",
  PR: "Puerto Rico",
  QA: "Qatar",
  RE: "Reunion",
  RO: "Romania",
  RU: "Russia",
  RW: "Rwanda",
  SH: "Saint Helena",
  KN: "Saint Kitts And Nevis",
  LC: "Saint Lucia",
  PM: "Saint Pierre and Miquelon",
  VC: "Saint Vincent And The Grenadines",
  BL: "Saint-Barthelemy",
  MF: "Saint-Martin (French part)",
  WS: "Samoa",
  SM: "San Marino",
  ST: "Sao Tome and Principe",
  SA: "Saudi Arabia",
  SN: "Senegal",
  RS: "Serbia",
  SC: "Seychelles",
  SL: "Sierra Leone",
  SG: "Singapore",
  SK: "Slovakia",
  SI: "Slovenia",
  SB: "Solomon Islands",
  SO: "Somalia",
  ZA: "South Africa",
  GS: "South Georgia",
  SS: "South Sudan",
  ES: "Spain",
  LK: "Sri Lanka",
  SD: "Sudan",
  SR: "Suriname",
  SJ: "Svalbard And Jan Mayen Islands",
  SZ: "Swaziland",
  SE: "Sweden",
  CH: "Switzerland",
  SY: "Syria",
  TW: "Taiwan",
  TJ: "Tajikistan",
  TZ: "Tanzania",
  TH: "Thailand",
  TG: "Togo",
  TK: "Tokelau",
  TO: "Tonga",
  TT: "Trinidad And Tobago",
  TN: "Tunisia",
  TR: "Turkey",
  TM: "Turkmenistan",
  TC: "Turks And Caicos Islands",
  TV: "Tuvalu",
  UG: "Uganda",
  UA: "Ukraine",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  US: "United States",
  UM: "United States Minor Outlying Islands",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VU: "Vanuatu",
  VA: "Vatican City State (Holy See)",
  VE: "Venezuela",
  VN: "Vietnam",
  VG: "Virgin Islands (British)",
  VI: "Virgin Islands (US)",
  WF: "Wallis And Futuna Islands",
  EH: "Western Sahara",
  YE: "Yemen",
  ZM: "Zambia",
  ZW: "Zimbabwe",
  XK: "Kosovo",
  CW: "Curaçao",
  SX: "Sint Maarten (Dutch part)",
};

// ===========================
// ShipGlobal service codes
// ===========================
const SHIPGLOBAL_SERVICE_CODES = {
  US: {
    "super saver": "sgdirectubiusps",
    "direct": "sgdirectparclluspsuniuni",
    "usps special": "sgdirectparcll",
    "first class": "Shipglobal First Class",
    "premium": "sgpremparcll",
    "express": "sgexpubiupsairjfk",
  },
  GB: {
    "direct": "sgdirectroyalmailgb",
    "first class": "sgfcroyalmailgb",
    "premium": "sgpremuwcgb",
  },
  CA: {
    "direct": "sgdirectcauniuni",
    "first class": "sgfcuniunica",
    "premium": "sgdirectcaups",
    "special": "sgcaecomspecialuniuni",
  },
  AU: {
    "direct": "sgdirectAUams",
  },
  EU: {
    "direct": "sgdirecteudhl",
    "direct yun": "sgdirecteuyun",
    "premium dpd": "sgpremeudpd",
    "worldwide": "sgworldwideeudhl",
  },
};

// ===========================
// Helper functions
// ===========================
function getAlpha2CountryCode(countryName) {
  if (!countryName) return null;
  const normalized = countryName.trim().toLowerCase();
  const found = Object.entries(COUNTRY_MAP).find(
    ([, value]) => value.toLowerCase() === normalized
  );
  return found ? found[0] : null;
}

function getShipGlobalServiceCode(countryCode, selectedService) {
  const serviceList = SHIPGLOBAL_SERVICE_CODES[countryCode];
  if (!serviceList) return null;

  const lowerService = selectedService.toLowerCase();
  const matchedKey = Object.keys(serviceList).find((key) =>
    lowerService.includes(key)
  );
  return matchedKey ? serviceList[matchedKey] : null;
}

// ===========================
// Main ShipGlobal API Flow
// ===========================
export const ShipGlobalShipmentCallApi = async (orderData) => {
  if (!orderData) throw new Error("Order data is required");

  // STEP 1️⃣ - Basic info and validation
  const countryCode = getAlpha2CountryCode(orderData.country);
  if (!countryCode) throw new Error(`Country code not found for "${orderData.country}"`);

  const serviceCode = getShipGlobalServiceCode(
    countryCode,
    orderData.shippingPartner?.name || orderData.selectedService
  );
  if (!serviceCode) {
    throw new Error(
      `No matching ShipGlobal service for "${orderData.shippingPartner?.name || orderData.selectedService}" in ${orderData.country}`
    );
  }

  const cleanedPincode = orderData.pincode
    ? orderData.pincode.replace(/[^a-zA-Z0-9]/g, "").trim()
    : "";

    const formatInvoiceDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0"); // months 0-11
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

 
   // ===========================
  // Build Payload
  // ===========================
  const shipmentPayload = {
    invoice_no: orderData.invoiceName,
    invoice_date: formatInvoiceDate(orderData.invoiceDate),
    order_reference: orderData.invoiceNo,
    service: serviceCode,
    package_weight: parseFloat(orderData.weight),
    package_length: orderData.length || "10",
    package_breadth: orderData.width || "10",
    package_height: orderData.height || "10",
    currency_code: orderData.invoiceCurrency || "USD",
    csb5_status: 0,

    // Customer details
    customer_shipping_firstname: orderData.firstName,
    customer_shipping_lastname: orderData.lastName,
    customer_shipping_mobile: orderData.mobile,
    customer_shipping_email: orderData.email,
    customer_shipping_address: orderData.address1,
    customer_shipping_address_2: orderData.address2 || "",
    customer_shipping_city: orderData.city,
    customer_shipping_postcode: cleanedPincode,
    customer_shipping_country_code: countryCode,
    customer_shipping_state: orderData.state,
    ioss_number: "",

    // Line items
    vendor_order_items: orderData.productItems.map((p) => ({
      vendor_order_item_name: p.productName,
      vendor_order_item_sku: "",
      vendor_order_item_quantity: p.productQuantity.toString(),
      vendor_order_item_unit_price: (
        parseFloat(p.productPrice) / 83
      ).toFixed(2), // ✅ Convert INR → USD
      vendor_order_item_hsn: orderData.HSNCode || "",
      vendor_order_item_tax_rate: "0",
    })),
  };

  // ===== LOGGING =====
  console.log("==== ShipGlobal Payload ====");
  console.log(JSON.stringify(shipmentPayload, null, 2));

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization:
      "Basic " + btoa(`${process.env.SG_USERNAME}:${process.env.SG_PASSWORD}`),
  };

  // ===========================
  // STEP 3️⃣ - Add Order
  // ===========================
  try {
    const addOrderResponse = await axios.post(
      "https://app.shipglobal.in/apiv1/order/add",
      shipmentPayload,
      { headers, validateStatus: () => true }
    );

    console.log("==== AddOrder Response ====");
    console.log(addOrderResponse.data);

    const data = addOrderResponse.data || {};
    const success = data.success === true || data.success === "true";
    const trackingNo = data.order?.tracking || null;

    if (!success || !trackingNo) {
      const errorsArray =
        data.error || ["AddOrder failed. Please try again later."];
      return {
        status: "failed",
        code: data.code || null,
        description: "ShipGlobal AddOrder API failed",
        errors: errorsArray,
        forwarder: "ShipGlobal",
      };
    }

    // ===========================
    // STEP 4️⃣ - Tracking API
    // ===========================
    console.log("==== Tracking API Payload ====");
    console.log({ tracking: trackingNo });

    const trackingResponse = await axios.post(
      "https://app.shipglobal.in/apiv1/tools/tracking",
      { tracking: trackingNo },
      { headers, validateStatus: () => true }
    );

    console.log("==== Tracking Response ====");
    console.log(trackingResponse.data);

    const awbInfo = trackingResponse?.data?.data?.awbInfo || {};

    // ===========================
    // STEP 5️⃣ - Label API
    // ===========================
    console.log("==== GetLabel API Payload ====");
    console.log({ tracking: trackingNo, label: true });

    const labelResponse = await axios.post(
      "https://app.shipglobal.in/apiv1/order/getLabel",
      { tracking: trackingNo, label: true },
      { headers, validateStatus: () => true }
    );

    console.log("==== Label Response ====");
    console.log(labelResponse.data);

  const labelData = labelResponse?.data?.label || null;

let labelUrl = null;

if (labelData) {
  // Decode and save the PDF to the labels folder
  const buffer = Buffer.from(labelData, "base64");
  const fileName = `${trackingNo}.pdf`;
  const filePath = path.join(process.cwd(), "public", "labels", fileName);

  fs.writeFileSync(filePath, buffer);

  // Create the URL that points to the static route
  labelUrl = `/label/${fileName}`;
}




    // ===========================
    // STEP 6️⃣ - Final Shipment Object
    // ===========================
    const shipmentDetails = {
      status: success ? "success" : "failed",
      code: data.code || null,
      description: data.description || null,

      // ✅ Prefer partner last-mile tracking (941… etc.)
      trackingNumber:
        awbInfo.partner_lastmile_awb ||
        awbInfo.awb_number ||
        trackingNo ||
        null,
      awbNumber:
        awbInfo.partner_lastmile_awb ||
        awbInfo.awb_number ||
        trackingNo ||
        null,
      trackingNo2:
        awbInfo.partner_lastmile_awb ||
        awbInfo.awb_number ||
        trackingNo ||
        null,

      weight: shipmentPayload.package_weight || null,
      service: serviceCode,
      pdf: `https://api.thetraceexpress.com/label/${trackingNo}.pdf`, // ✅ URL for frontend
      thirdPartyService: awbInfo.partner_lastmile_display || null,
      forwarder: "ShipGlobal",
      mpsFedex: awbInfo.partner_lastmile_tracking_url || null,
    };

    console.log("==== Final Shipment Details ====");
    console.log(shipmentDetails);

    return shipmentDetails;
  } catch (error) {
    const apiData = error.response?.data;
    console.error("ShipGlobal API Error:", apiData || error.message);

    return {
      status: "failed",
      code: apiData?.code || null,
      description: apiData?.message || apiData?.error || error.message,
      forwarder: "ShipGlobal",
    };
  }
};