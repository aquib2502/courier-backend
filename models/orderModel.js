import mongoose from 'mongoose';


const { Schema } = mongoose;

const productSchema = new mongoose.Schema({
  productName: { type: String },
  productQuantity: { type: Number },
  productPrice: { type: Number }
});

const orderSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // This references the User model
    required: true
  },
  // Shipping information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  mobile: { type: String, required: true },
  pickupAddress: { type: String, required: true },
  address1: { type: String, required: true },
  address2: { type: String, required: true },
  pincode: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },


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
    enum: [
      'Payment Pending',
      'Payment Received',
      'Packed',
      'Manifested'
    ],
    default: 'Payment Pending'
  },
  orderStatus: {
    type: String,
    enum: [
        'Drafts',
        'Ready',
        'Packed',
       'Manifested',
        'Shipped',
        'Delivered',
        'Cancelled',
        'Refunded'
    ],
    default: 'Drafts'
},
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
