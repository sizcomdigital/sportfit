const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const Wishlist = require('./WishlistModel');

const Userschema = new mongoose.Schema({
    fullname: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    status: { type: Boolean, default: true },
    verified: {
        type: Boolean,
        default: false
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Wishlist' }], // Reference to Wishlist model
   
    resetPasswordToken: { type: String, required:false},
    resetPasswordExpires: { type: Date , required:false },
  

});

// Pre-save hook to hash password before saving
Userschema.pre('save', async function (next) {
    if (this.isModified('password') && !this.password.startsWith('$2b$')) {
        // Only hash the password if it's not already hashed
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


// Method to generate JWT token
Userschema.methods.generateAuthToken = function () {
    const token = jwt.sign(
        { _id: this._id, email: this.email },
        process.env.JWT_ACCESS_KEY,
        { expiresIn: '7d' }
    );
    return token;
};

// Create and export the User model
const User = mongoose.model('User', Userschema);
module.exports = User;
