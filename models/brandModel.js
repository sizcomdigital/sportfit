const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true,
  },
  logo: {
    type: String, // URL of the logo (Cloudinary)
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
});

brandSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;
