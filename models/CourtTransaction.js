const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
  amountSubtotal: Number,
  amountTotal: Number,
});

const transactionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
  },
  customerEmail: {
    type: String,
    required: true,
  },
  name: String,
  phone: String,
  courtType: String,
  duration: String,
  price: String,
  amountTotal: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'aed',
  },
  paymentStatus: String,
  paymentMethod: String,
  last4: String,
  lineItems: [lineItemSchema], // optional item breakdown
}, {
  timestamps: true // adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('CourtTransaction', transactionSchema);
