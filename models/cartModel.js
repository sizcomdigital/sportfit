const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  products: [{
    product: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
 
    quantity: { 
      type: Number, 
      required: true, 
      default: 1, 
      min: 1 
    }, 
    price: { 
      type: Number, 
      required: true,
      min: 0
    }
  }],
  totalPrice: { 
    type: Number, 
    required: true, 
    default: 0 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Cart', CartSchema);
