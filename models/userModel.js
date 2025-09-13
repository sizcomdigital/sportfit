const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Userschema = new mongoose.Schema({
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String }, // Not required for Google users
    googleId: { type: String }, // For Google login users
    status: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Wishlist' }],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
});

// Pre-save hook to hash password (only for normal signup)
Userschema.pre('save', async function (next) {
    if (this.isModified('password') && this.password && !this.password.startsWith('$2b$')) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

// Generate JWT Token
Userschema.methods.generateAuthToken = function () {
    return jwt.sign(
        { _id: this._id, email: this.email },
        process.env.JWT_ACCESS_KEY,
        { expiresIn: '7d' }
    );
};

const User = mongoose.model('User', Userschema);
module.exports = User;
