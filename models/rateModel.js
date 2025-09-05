import mongoose from 'mongoose';

const rateSchema = new mongoose.Schema(
  {
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
    },
    dest_country: {
      type: String,
      required: [true, 'Destination country is required'],
      trim: true,
    },
    package: {
      type: String,
      required: [true, 'Package type is required'],
      trim: true,
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
    },
  },
  { timestamps: true }
);

const Rate = mongoose.model('Rate', rateSchema);
export default Rate;
