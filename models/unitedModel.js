import mongoose from 'mongoose';
const { Schema } = mongoose;

// Shipment Item Details Sub-schema for United (first JSON)
const unitedItemDetailSchema = new Schema({
  BoxNo: { type: String, required: true },
  Description: { type: String, required: true },
  HSNCode: { type: String, required: true },
  Qty: { type: Number, required: true },
  Rate: { type: Number, required: true },
  Amount: { type: Number, required: true },
  Unit: { type: String, required: true },
  ShipPieceIGST: { type: String, default: '0' },
  PieceWt: { type: Number, required: true },
});

// VolWeight Sub-schema for United (first JSON)
const unitedVolWeightSchema = new Schema({
  ActWeight: { type: Number, required: true },
  Length: { type: Number, required: true },
  Width: { type: Number, required: true },
  Height: { type: Number, required: true },
  Pcs: { type: Number, required: true },
});

// Shipment Schema for United (first JSON)
const unitedShipmentSchema = new Schema({
  CustomerCode: { type: String, required: true },
  CustomerName: { type: String, required: true },
  DestinationCode: { type: String, required: true },
  ThirdPartyLabel: { type: Boolean, required: true },
  ConsignorName: { type: String, required: true },
  ConsignorContactPerson: { type: String, required: true },
  ConsignorAddressLine1: { type: String, required: true },
  ConsignorAddressLine2: { type: String, required: true },
  ConsignorAddressLine3: { type: String, default: '' },
  ConsignorCity: { type: String, required: true },
  ConsignorPostCode: { type: String, required: true },
  ConsignorState: { type: String, required: true },
  ConsignorPhoneNo: { type: String, default: '' },
  GSTType: { type: String, required: true },
  GSTIN: { type: String, required: true },
  ConsigneeName: { type: String, required: true },
  ConsigneeContactPerson: { type: String, required: true },
  ConsigneeAddressLine1: { type: String, required: true },
  ConsigneeAddressLine2: { type: String, required: true },
  ConsigneeAddressLine3: { type: String, default: '' },
  ConsigneeCity: { type: String, required: true },
  ConsigneeZipCode: { type: String, required: true },
  ConsigneeState: { type: String, required: true },
  ConsigneePhoneNo: { type: String, required: true },
  ServiceTypeCode: { type: String, required: true },
  ServiceType: { type: String, required: true },
  NetworkCode: { type: String, required: true },
  GoodsDesc: { type: String, required: true },
  NumofItems: { type: Number, required: true },
  ActWeight: { type: Number, required: true },
  VolWeights: [unitedVolWeightSchema],
  CustomsValue: { type: Number, required: true },
  CustomsCurrencyCode: { type: String, required: true },
  ShipmentContent: { type: String, required: true },
  ItemDetails: [unitedItemDetailSchema],
  CSB_Type: { type: String, required: true },
  TermsOfSale: { type: String, required: true },
  ShipPurpose: { type: String, required: true },
  EComm: { type: String, required: true },
  ExporterType: { type: String, required: true },
  ExporterInvDate: { type: String, required: true },
  ExporterInvNo: { type: String, required: true },
  IGSTPayment: { type: String, required: true },
  IGSTAmount: { type: Number, required: true },
  FreightCharge: { type: Number, required: true },
  InsuranceCharge: { type: Number, required: true },
  ReferenceNumber: { type: String, required: true },
  PackageType: { type: String, default: '' },
  MEIS: { type: String, required: true },
  DutyTaxPaid: { type: String, default: '' },
  DutiesAccountNo: { type: String, default: '' },
  ForwarderService: { type: String, required: true },
  InsuredValue: { type: Number, required: true },
});

// Export United Shipment Schema as UnitedSchema
const UnitedSchema = mongoose.model('UnitedShipment', unitedShipmentSchema);
export { UnitedSchema };
