import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    confirmPassword: { type: String, minlength: 6 },
    walletBalance: { type: Number, default: 0 }, // <-- wallet balance
    mobile: { type: String, trim: true },
    kycStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    kycRejectReason: {type:String, required:false},
    // Multiple pickup addresses as an array of objects
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
            contactNumber: { type: String }
        }
    ],

    // ✅ New fields
    aadharNumber: { type: String, required: true },
    panNumber: { type: String, required: true },
    gstNumber: { type: String, required: true },
    iecNumber: { type: String, required: true },

    // File upload paths
    aadharProof: { type: String },
    panProof: { type: String },
    gstProof: { type: String },
    iecProof: { type: String },

      // Credit fields
  hasCredit: { type: Boolean, default: false },   // Is user allowed credit
  creditLimit: { type: Number, default: 0 },     // Maximum credit allowed
  usedCredit: { type: Number, default: 0 },      // Credit used so far
  creditResetDate: { type: Date } ,

    packageDiscounts: {
  type: Map,
  of: Number,
  default: {}
},
    // Approval flow
    isApproved: { type: Boolean, default: false },
}, { timestamps: true });

// // ✅ Pre-save hook
// userSchema.pre('save', function (next) {
//     if (this.password !== this.confirmPassword) {
//         return next(new Error('Password and Confirm Password do not match'));
//     }
//     this.password = bcrypt.hashSync(this.password, 10);
//     this.confirmPassword = undefined;
//     next();
// });

// Method to check if the entered password matches the stored password
userSchema.methods.isPasswordValid = function (password) {
  return bcrypt.compareSync(password, this.password);
};


const User = mongoose.model('User', userSchema);
export default User;
