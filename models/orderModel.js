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
  shipmentType: { type: String, required: true },
  shipmentDetails: {
    weight: { type: String },
    length: { type: String },
    width: { type: String },
    height: { type: String }
  },

  // Order information
  invoiceNo: { type: String, required: true },
  invoiceCurrency: { type: String, required: true },
  orderDate: { type: Date, required: true },
  etnNumber: { type: String, required: true },

  // Item information
  items: [
    {
      productName: { type: String, required: true },
      sku: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ]
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
