import mongoose from 'mongoose';

const domesticRateSchema = new mongoose.Schema(
  {
    dest_country: {
      type: String,
      required: [true, 'Destination country is required'],
      default: 'India',
      trim: true,
    },
    package: {
      type: String,
      required: [true, 'Package is required'],
      trim: true,
    },
    provider: { type: String, trim: true },
    mode: { type: String, trim: true },
    minWeight: { type: Number },
    gst: { type: Number },
    ratePerKg: { type: Number },
    rates: { type: mongoose.Schema.Types.Mixed },
    air: { type: mongoose.Schema.Types.Mixed },
    surface: { type: mongoose.Schema.Types.Mixed },
    zoneMapping: { type: mongoose.Schema.Types.Mixed },
    note: { type: String }
  },
  { timestamps: true }
);

const DomesticRate = mongoose.model('DomesticRate', domesticRateSchema);
export default DomesticRate;
