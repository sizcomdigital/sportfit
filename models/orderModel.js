const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 

    products: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },

            // 📌 Snapshot of product details (keeps order history consistent)
            productName: { type: String, required: true },
            brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
            images: { type: [String], required: true },
            category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
            subcategory: { type: String },
            childSubcategory: { type: String },

            price: { type: Number, required: true },   // Original product price
            finalPrice: { type: Number, required: true }, // Price after discount (if any)
            quantity: { type: Number, required: true, min: 1 },

            status: { 
                type: String, 
                enum: ["Active", "Cancelled", "Delivered", "Return Requested", "Returned"], 
                default: "Active" 
            }, 

            returnRequest: {
                isRequested: { type: Boolean, default: false },
                reason: { type: String, default: "" },
                returnDate: { type: Date },
                returnStatus: { 
                    type: String, 
                    enum: ["Not Returned", "Pending", "Returned"], 
                    default: "Not Returned" 
                }
            }
        }
    ],

    totalAmount: { type: Number, required: true }, 
    discountApplied: { type: Number, default: 0 }, 

    // ✅ Only KNET is supported
    paymentMethod: { 
        type: String, 
        enum: [ 'KNET' ], 
        default: 'KNET',
        required: true 
    }, 

    paymentStatus: { 
        type: String, 
        enum: ['Pending', 'Completed', 'Failed', 'Refunded'], 
        default: 'Pending' 
    }, 

    orderStatus: { 
        type: String, 
        enum: ["Pending", "Processing", "Shipped", "Delivered", "Return Requested", "Returned", "Cancelled"], 
        default: "Pending" 
    },

    shippingAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true }, 

    // ✅ KNET Gateway fields
    knetPaymentId: { type: String },    // Transaction ID from KNET
    knetTrackId: { type: String },      // Track ID from KNET

    deliveryDate: { type: Date }, 

}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
   