const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the User model
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
});

// Middleware to update the `updatedAt` field automatically
AddressSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Address = mongoose.model('Address', AddressSchema);
module.exports = Address;
