// models/manifestModel.js
import mongoose from 'mongoose';

const manifestSchema = new mongoose.Schema({
  manifestId: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
 pickupAddresses: [
        {
            addressLine1: { type: String, required: true },
            addressLine2: { type: String },
            addressLine3: { type: String },
            city: { type: String, required: true },
            state: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, required: true },
            contactPerson: { type: String },
            contactNumber: { type: String },
           
        }
    ],
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  courierPartner: {
    type: String,
    default: 'ShipGlobal Express'
  },
  status: {
    type: String,
    enum: ['open', 'pickup_requested', 'closed', 'picked_up'],
    default: 'open'
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalWeight: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    default: 0
  },
  pickupAWB: {
    type: String
  },
  estimatedPickup: {
    type: Date
  },
  pickupDate: {
    type: Date
  },
  pickupTime: { 
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
manifestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Manifest = mongoose.model('Manifest', manifestSchema);

export default Manifest;