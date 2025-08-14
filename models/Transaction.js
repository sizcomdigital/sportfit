const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  sessionId: String,
  customerEmail: String,
  name: String,        // From metadata
  age: Number,         // From metadata
  phone: String,       // From metadata
  planType: String,    // From metadata
  sectionType: String, // From metadata
  amountTotal: Number,
  currency: String,
  paymentStatus: String,
  paymentMethod: String,
  last4: String,
  lineItems: [
    {
      name: String,
      quantity: Number,
      amountSubtotal: Number,
      amountTotal: Number,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Transaction", transactionSchema);