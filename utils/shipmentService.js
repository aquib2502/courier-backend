import axios from 'axios';

export const callShipmentAPI = async (orderData) => {
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
        ConsignorAddressLine2:' ',
        ConsignorAddressLine3: '',
        ConsignorCity: 'Mumbai',
        ConsignorPostCode: '400059',
        ConsignorState: 'Maharashtra',
        ConsignorPhoneNo: orderData.mobile,
        GSTType: "GSTIN (Normal)",
        GSTIN: "27GWAPS7865D1Z1",
        ConsigneeName: orderData.firstName,
        ConsigneeContactPerson: orderData.invoiceName ,
        ConsigneeAddressLine1: orderData.address1,
        ConsigneeAddressLine2: orderData.address2 || '',
        ConsigneeAddressLine3: '',
        ConsigneeCity: orderData.city,
        ConsigneeZipCode: orderData.pincode,
        ConsigneeState: orderData.state,
        ConsigneePhoneNo: orderData.mobile,
        ServiceTypeCode: "E",
        ServiceType: "ECONOMY",
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
        CustomsValue: orderData.productItems.reduce((sum, p) => sum + (p.productPrice * p.productQuantity), 0),
        CustomsCurrencyCode: orderData.invoiceCurrency || 'USD',
        ShipmentContent: orderData.productItems.map(p => p.productName).join(', '),
        ItemDetails: orderData.productItems.map((p, idx) => ({
          BoxNo: idx + 1,
          Description: p.productName,
          HSNCode: orderData.HSNCode,
          Qty: p.productQuantity.toString(),
          Rate: p.productPrice.toFixed(2),
          Amount: p.productPrice * p.productQuantity,
          Unit: "PCS",
          ShipPieceIGST: "0",
          PieceWt: parseFloat(orderData.weight || 0.5)
        })),
        CSB_Type: "CSB 4",
        TermsOfSale: "CIF",
        ShipPurpose: "SAMPLE",
        EComm: "No",
        ExporterType: "NA",
        ExporterInvDate: orderData.invoiceDate ? new Date(orderData.invoiceDate).toLocaleDateString('en-GB') : "22/10/2020",
        ExporterInvNo: orderData.invoiceNo,
        IGSTPayment: "NA",
        IGSTAmount: "0",
        FreightCharge: "0",
        InsuranceCharge: "0",
        PackageType: " ",
        MEIS: "No",
        DutyTaxPaid: "",
        DutiesAccountNo: "",
        ForwarderService: "ECONOMY-USPS",
        InsuredValue: "0"
      }
    ]
  };

  try {
    const response = await axios.post('http://198.38.81.111:9002/api/Shipping/AddShipment', shipmentPayload);
    return response.data[0]; // shipmentResponses & shipmentDetails
  } catch (error) {
    console.error('Shipment API Error:', error.response?.data || error.message);
    throw new Error('Shipment API call failed');
  }
};
