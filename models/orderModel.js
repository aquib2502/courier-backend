import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderSchema = new Schema({
  // Shipping information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  mobile: { type: String, required: true },
  pickupAddress: { type: String, required: true },
  address1: { type: String, required: true },
  pincode: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },

  // Shipment information
  shipmentType: { type: String },
  shipmentDetails: {
    weight: { type: String },
    length: { type: String },
    width: { type: String },
    height: { type: String }
  },

  // Order information
  invoiceNo: { type: String },
  invoiceCurrency: { type: String },
  orderDate: { type: Date },
  etnNumber: { type: String },

  // Item information
  items: [
    {
      productName: { type: String },
      sku: { type: String },
      quantity: { type: Number },
      price: { type: Number }
    }
  ]
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
