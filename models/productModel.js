const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: { type: String, required: [true, 'Product Name is required'], trim: true },
  keyFeatures: { type: [String], required: true },
  description: { type: String, required: true },
  additionalInfo: { type: [String], required: true },
  deliveryWarrantyInstallation: { type: String, required: true },
  status: { type: String, enum: ['in stock', 'out of stock'], default: 'in stock' },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  images: { type: [String], required: true },
  price: { type: Number, required: [true, 'Product price is required'], min: 0 },

  // ✅ Category hierarchy
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }, // Main Category
  subcategory: { type: String }, // e.g. "Mobiles"
  childSubcategory: { type: String }, // e.g. "Android Phones"

}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
