import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
  },
  { _id: false }
);

const domesticShipmentSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true,
    },

    referenceNumber: {
      type: String,
      required: true,
    },

    // FORWARD or REVERSE
    shipmentType: {
      type: String,
      enum: ['FORWARD', 'REVERSE'],
      required: true,
    },

    pickupAddress: addressSchema,
    deliveryAddress: addressSchema,

    weight: {
      type: Number, // in grams
      default: 0,
    },

    courier: {
      type: String,
      default: 'Shadowfax',
    },

    // Shadowfax-issued AWB (forward: SF…, reverse: R…)
    awb: {
      type: String,
      default: null,
    },

    trackingNumber: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      default: 'created',
    },

    amountCharged: {
      type: Number,
      default: 0,
    },

    // Shadowfax internal order id (numeric id in their response)
    shadowfaxOrderId: {
      type: String,
      default: null,
    },

    // Full raw response stored for debugging / reconciliation
    shadowfaxResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

const DomesticShipment = mongoose.model(
  'DomesticShipment',
  domesticShipmentSchema
);

export default DomesticShipment;