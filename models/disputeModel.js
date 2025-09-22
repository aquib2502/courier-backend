import { Schema, mongoose } from "mongoose";

const DisputeSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'weight_discrepancy',  // Declared vs actual weight mismatch
      'missing_parcel',      // Some orders missing in the manifest
      'damaged_parcel',      // Parcel received damaged
      'incorrect_order',     // Wrong item shipped
      'late_pickup',         // Courier did not pick up on time
      'other'                // For any custom issue
    ],
    required: true
  },

  customType: {
    type: String,
    required: function (  ) {
      return this.type === 'other';
    },
    trim: true
  },

  clientId: {
    type:mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
orderIds: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  }
],


  manifestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manifest',
    required: false // Required only for manifest-level disputes
  },

  description: {
    type: String,
    required: true
  },

  adminNotes: String,

  clientResponse: {
    type: String,
    default: 'pending'
  },

  status: {
    type: String,
    enum: ['open', 'resolved', 'escalated'],
    default: 'open'
  },

},
   { timestamps: true }
    
);


const Dispute = mongoose.model('Dispute', DisputeSchema);
export default Dispute;
