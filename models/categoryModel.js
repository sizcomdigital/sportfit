const mongoose = require("mongoose");

const childSubCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }
});

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  children: [childSubCategorySchema]  // nested child subcategories
});

const categorySchema = new mongoose.Schema({
  categoryname: { type: String, required: true, unique: true, trim: true },
  subcategories: [subCategorySchema],
  createdAt: { type: Date, default: Date.now },
  status: { type: Boolean, default: true }
});

module.exports = mongoose.model("Category", categorySchema);
