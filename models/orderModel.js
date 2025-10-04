import mongoose from 'mongoose';

const { Schema } = mongoose;

// Product Schema
const productSchema = new mongoose.Schema({
  productName: { type: String },
  productQuantity: { type: Number },
  productPrice: { type: Number }
});

const ShipmentDetailSchema = new mongoose.Schema({
  // Response data (common fields for both)
  status: { type: String },             // e.g., "success", "failed"
  code: { type: String },               // Response code
  description: { type: String },        // Description of the status

  // Common fields for both ShipGlobal and United
  trackingNumber: { type: String },         // Unified tracking number
  awbNumber: { type: String },              // Unified AWB number
  weight: { type: Number },                 // Weight in KG
  service: { type: String },                // Service type (e.g., "Express")
  pdf: { type: String },                    // PDF URL (if available)
  thirdPartyService: { type: String },      // Third party service used (if any)
  
  // Additional fields that may be needed
  forwarder: { type: String },              // Forwarder name (e.g., "ShipGlobal")
  mpsFedex: { type: String },               // FedEx tracking number (if available)
  trackingNo2: { type: String },            // Another tracking number if available
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
  totalAmount: { type: Number, required: true },

  // Shipment information
  shipmentType: { type: String },
  shippingPartner: {
    name: { type: String, required: true },
    type: { type: String, required: true }
  },
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
    enum: ['Payment Pending', 'Payment Received', 'Packed', 'Manifested'],
    default: 'Payment Pending'
  },

  orderStatus: {
    type: String,
    enum: ['Drafts', 'Ready', 'Packed', 'Manifested', 'Shipped', 'Delivered', 'Cancelled', 'Refunded', 'disputed'],
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

  product: { type: String },

  // Store unified shipment response and details in one object
  shipmentDetails: ShipmentDetailSchema,

  receivedAt: { type: Date, default: null }

}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

export default Order;
