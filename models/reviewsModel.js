const mongoose = require('mongoose');

// Define the Review schema
const reviewSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  nationality: {
    type: String,
    required: [true, 'Nationality is required'],
    trim: true,
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    trim: true,
  },
  image: {
    type: String, // Image URL
    
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
});

// Pre-save middleware to update the updatedAt field
reviewSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create the Review model
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;