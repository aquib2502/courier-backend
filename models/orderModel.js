import mongoose from 'mongoose';

const { Schema } = mongoose;

const productSchema = new mongoose.Schema({
  productName: { type: String },
  productQuantity: { type: Number },
  productPrice: { type: Number }
});

// Shipment response schema
const shipmentResponseSchema = new mongoose.Schema({
  Status: { type: String },
  Code: { type: String },
  Description: { type: String }
}, { _id: false });

// Shipment details schema
const shipmentDetailSchema = new mongoose.Schema({
  AwbNo: { type: String },
  Weight: { type: Number },
  Service: { type: String },
  ThirdPartyService: { type: String },
  Amount: { type: String },
  TrackingNo: { type: String },
  TrackingNo2: { type: String },
  Forwarder: { type: String },
  PDF: { type: String },
  MPSFedex: { type: String }
}, { _id: false });

const orderSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Shipping information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  mobile: { type: String, required: true },
  pickupAddress: { type: String, required: true },
  address1: { type: String, required: true },
  address2: { type: String, required: false },
  pincode: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },
  HSNCode: { type: String, required: true },
  invoiceName: { type: String, required: false },

  // Shipment information
  shipmentType: { type: String },
  weight: { type: String },
  length: { type: String },
  width: { type: String },
  height: { type: String },

  // Order information
  invoiceNo: { type: String },
  invoiceCurrency: { type: String },
  invoiceDate: { type: Date },

  // Item information
  productItems: [productSchema],

  paymentStatus: {
    type: String,
    enum: ['Payment Pending','Payment Received','Packed','Manifested'],
    default: 'Payment Pending'
  },

  orderStatus: {
    type: String,
    enum: ['Drafts','Ready','Packed','Manifested','Shipped','Delivered','Cancelled','Refunded','disputed'],
    default: 'Drafts'
  },

  // Link disputes to this order
  disputes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute"
    }
  ],

  // Manifest-related fields
  manifestStatus: {
    type: String,
    enum: ['open', 'manifested', 'dispatched', 'disputed'],
    default: 'open'
  },

  manifest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manifest'
  },

  lastMileAWB: { type: String },

  product:{type:String},

  // Store API response
  shipmentResponses: [shipmentResponseSchema],
  shipmentDetails: [shipmentDetailSchema],

  receivedAt: { type: Date, default: null }

}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

export default Order;
