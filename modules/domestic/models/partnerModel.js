import mongoose from 'mongoose';
import crypto from 'crypto';

const partnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    apiKey: {
      type: String,
      required: true,
      unique: true,
    },

    apiSecret: {
      type: String,
      required: true,
    },

    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Static helper to generate credentials when onboarding a new partner
partnerSchema.statics.generateCredentials = function () {
  const apiKey = 'pk_' + crypto.randomBytes(16).toString('hex');
  const apiSecret = 'sk_' + crypto.randomBytes(24).toString('hex');
  return { apiKey, apiSecret };
};

const Partner = mongoose.model('Partner', partnerSchema);

export default Partner;