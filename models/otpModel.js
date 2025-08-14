const mongoose = require('mongoose');

// Define the OTP schema
const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true, // Ensure only one OTP per email
        index: true
    },
    otp: {
        type: Number,
        required: true
    },
    expiration: {
        type: Date,
        required: true
    }
}, { timestamps: true });

// Create and export the OTP model
const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
