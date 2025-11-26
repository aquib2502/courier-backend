import axios from 'axios';

export const UnitedCallShipmentAPI = async (orderData) => {

  const getFullName = () => {
    return `${orderData.firstName} ${orderData.lastName}`.trim();


  }

  const USD_RATE = 89; // 1 USD = 89 INR

// sum of (only unit price converted to USD)
const customsValueUSD = orderData.productItems.reduce(
  (sum, p) => sum + (p.productPrice / USD_RATE),
  0
);

  // Map your orderData to shipment payload
  const shipmentPayload = {
    ValidateAccount: [
      {
        AccountCode: "ASE09",
        Username: "ASE09",
        Password: "123",
        AccessKey: "F0EB1A9F"
      }
    ],
    Shipment: [
      {
        CustomerCode: "ASE09",
        CustomerName: "AS ENTERPRISES",
        DestinationCode: "USA",
        ThirdPartyLabel: true,

        ConsignorName: 'AS ENTERPRICES',
        ConsignorContactPerson: 'AS ENTERPRICES',
        ConsignorAddressLine1: '9TH FLOORM1818 MTR RNO B, SAGBAUG SNEHSAGAR',
        ConsignorAddressLine2: ' ',
        ConsignorAddressLine3: '',
        ConsignorCity: 'Mumbai',
        ConsignorPostCode: '400059',
        ConsignorState: 'Maharashtra',
        ConsignorPhoneNo: orderData.mobile,

        GSTType: "GSTIN (Normal)",
        GSTIN: "27GWAPS7865D1Z1",
        ConsigneeName: getFullName() || orderData.firstName,
        ConsigneeContactPerson: ' ',
        ConsigneeAddressLine1: orderData.address1,
        ConsigneeAddressLine2: orderData.address2 || '',
        ConsigneeAddressLine3: '',
        ConsigneeCity: orderData.city,
        ConsigneeZipCode: orderData.pincode.replace(/[^a-zA-Z0-9]/g, '').trim(),
        ConsigneeState: orderData.state,
        ConsigneePhoneNo: orderData.mobile,

        ServiceTypeCode: "ST01",
        ServiceType: "STDNE",
        NetworkCode: "USPS",

        GoodsDesc: 'NDox',
        NumofItems: orderData.productItems.length.toString(),
        ActWeight: parseFloat(orderData.weight || 0.5),

        VolWeights: [
          {
            ActWeight: parseFloat(orderData.weight || 0.5),
            Length: orderData.length || '10',
            Width: orderData.width || '10',
            Height: orderData.height || '10',
            Pcs: orderData.productItems.length.toString()
          }
        ],

       CustomsValue: Number(customsValueUSD.toFixed(2)),
        CustomsCurrencyCode: orderData.invoiceCurrency || 'USD',
        ShipmentContent: orderData.productItems.map(p => p.productName).join(', '),

        ItemDetails: orderData.productItems.map((p, idx) => ({
          BoxNo: idx + 1,
          Description: p.productName,
          HSNCode: orderData.HSNCode,
          Qty: p.productQuantity.toString(),
          Rate: p.productPrice.toFixed(2),
          Amount: Number((p.productPrice / USD_RATE).toFixed(2)), // NOT multiplied by qty
          Unit: "PCS",
          ShipPieceIGST: "0",
          PieceWt: parseFloat(orderData.weight || 0.5)
        })),

        CSB_Type: "CSB 4",
        TermsOfSale: "CIF",
        ShipPurpose: "SAMPLE",
        EComm: "Yes",
        ExporterType: "NA",
        ExporterInvDate: orderData.invoiceDate ? new Date(orderData.invoiceDate).toLocaleDateString('en-GB') : "22/10/2020",
        ExporterInvNo: orderData.invoiceNo,
        IGSTPayment: "NA",
        IGSTAmount: "0",
        FreightCharge: "0",
        InsuranceCharge: "0",
        ReferenceNumber: orderData.invoiceNo,

        PackageType: " ",
        MEIS: "No",
        DutyTaxPaid: "",
        DutiesAccountNo: "",
        ForwarderService: "ECONOMY-USPS",
        InsuredValue: "0"
      }
    ]
  };
  
  async function attemptApiCall(attempt = 1) {
  try {
    const response = await axios.post(
      "http://198.38.81.111:9002/api/Shipping/AddShipment",
      shipmentPayload
    );

    console.log("Shipment Payload", shipmentPayload)

    const data = response.data?.[0];
    if (!data) throw new Error("❌ Invalid API response format");

    const shipmentResp = data.ShipmentResponses?.[0];
    if (!shipmentResp) throw new Error("❌ Missing ShipmentResponses from courier API");

    // Extract fields returned by the API
    const status = shipmentResp.Status?.toString().trim();
    const code = shipmentResp.Code?.toString().trim();

    // SUCCESS MATCH BASED ON YOUR JSON:  Status === "Success" AND Code === "100"
    const isSuccess =
      (status === "Success" || status?.toLowerCase() === "success") &&
      (code === "100" || code === 100);

    if (!isSuccess) {
      throw new Error(
        `❌ Shipment failed — Status: ${shipmentResp.Status} | Code: ${shipmentResp.Code} | Description: ${shipmentResp.Description}`
      );
    }

    const shipmentDetails = data.shipmentDetails?.[0];
    if (!shipmentDetails) throw new Error("❌ shipmentDetails missing in response");

    // 🎉 SUCCESS → STOP RETRIES AND RETURN
    return {
      status: "success",
      awb: shipmentDetails.AwbNo,
      trackingNo: shipmentDetails.TrackingNo,
      trackingAlt: shipmentDetails.TrackingNo2,
      labelPDF: shipmentDetails.PDF,
      service: shipmentDetails.Service,
      weight: shipmentDetails.Weight,
      courier: shipmentDetails.Forwarder,
      thirdParty: shipmentDetails.ThirdPartyService,
      raw: data
    };

  } catch (error) {
    console.error(`Attempt ${attempt} failed →`, error.message);

    if (attempt >= 3) {
         throw new Error(error.message);
    }

    // Exponential backoff wait
    const delay = 500 * Math.pow(2, attempt);
    await new Promise((res) => setTimeout(res, delay));

    return attemptApiCall(attempt + 1);
  }
}

// Execute with retry
return await attemptApiCall();
};

