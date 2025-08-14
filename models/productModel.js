const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: [true, 'Product Name is required'],
    trim: true
  },
  keyFeatures: {
    type: [String], // Bullet points
    required: true
  },
  description: {
    type: String,
    required: true
  },
  additionalInfo: {
    type: [String], // Bullet points
    required: true
  },
  deliveryWarrantyInstallation: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['in stock', 'out of stock'],
    default: 'in stock'
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  images: {
    type: [String], 
    required: true
  },
  price: {  // ✅ Added price field
    type: Number,
    required: [true, 'Product price is required'],
    min: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
