import mongoose from 'mongoose';

const partnerWalletLedgerSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true,
    },

    // CREDIT → money added to wallet
    // DEBIT  → money deducted for booking
    // REFUND → money returned (e.g. cancelled shipment)
    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT', 'REFUND'],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceAfter: {
      type: Number,
      required: true,
    },

    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DomesticShipment',
      default: null,
    },

    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
  }
);

const PartnerWalletLedger = mongoose.model(
  'PartnerWalletLedger',
  partnerWalletLedgerSchema
);

export default PartnerWalletLedger;