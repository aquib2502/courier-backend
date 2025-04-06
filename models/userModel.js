import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function (v) {
                return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(v);
            },
            message: 'Invalid email format'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    confirmPassword: { // Make sure it's named `confirmPassword`
        type: String,
        required: [true, 'Confirm password is required'],
        minlength: [6, 'Confirm password must be at least 6 characters long']
    }
});

// Pre-save hook to ensure password and confirmPassword match
userSchema.pre('save', function (next) {
    if (this.password !== this.confirmPassword) {
        return next(new Error('Password and Confirm Password do not match'));
    }

    // Hash password before saving to the database
    this.password = bcrypt.hashSync(this.password, 10);
    this.confirmPassword = undefined; // Remove confirmPassword before saving to DB
    next();
});



// Method to check if the entered password matches the stored password
userSchema.methods.isPasswordValid = function (password) {
  return bcrypt.compareSync(password, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
