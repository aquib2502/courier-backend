import { mongoose, Schema } from "mongoose";

const clubbingSchema = new Schema(
  {
    clubName: { type: String, required: true },
    userIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }], // multiple users
    usernames: { type: String, required: true }, // concatenated names
    useremails: { type: String, required: true }, // concatenated emails
    clubbedOrders: [{ type: Schema.Types.ObjectId, ref: 'Order', required: true }], // multiple orders
    clubbedAt: { type: Date, default: Date.now }

  },
  { timestamps: true }
);

// Add indexes for faster queries
clubbingSchema.index({ userIds: 1 });
clubbingSchema.index({ clubbedOrders: 1 });

const Clubbing = mongoose.model('Clubbing', clubbingSchema);
export default Clubbing;
