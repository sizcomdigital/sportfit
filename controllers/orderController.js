const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const Address = require('../models/addressModel');
const User = require('../models/userModel');
const mongoose = require("mongoose");
const axios = require("axios"); 

// 📌 Your Tap Secret Key (from dashboard)
const TAP_SECRET_KEY = process.env.TAP_SECRET_KEY;  

module.exports = {
    createOrder: async (req, res) => {
        const userId = req.user._id;
        const userEmail = req.user.email;
        const { paymentMethod, addressId } = req.body;

        try {
            // ✅ Get user cart
            const cart = await Cart.findOne({ user: userId }).populate("products.productId");
            if (!cart || cart.products.length === 0) {
                return res.status(400).json({ message: "Your cart is empty" });
            }

            // ✅ Validate shipping address
            const address = await Address.findOne({ _id: addressId, userId });
            if (!address) {
                return res.status(404).json({ message: "Invalid address selected" });
            }

            // ✅ Calculate total
            let totalAmount = 0;
            const orderProducts = [];

            for (const item of cart.products) {
                const itemPrice = item.productId.finalPrice || item.productId.price;
                const itemTotal = itemPrice * item.quantity;
                totalAmount += itemTotal;

                orderProducts.push({
                    productId: item.productId._id,
                    productName: item.productId.productName,
                    brand: item.productId.brand,
                    images: item.productId.images,
                    category: item.productId.category,
                    subcategory: item.productId.subcategory || null,
                    childSubcategory: item.productId.childSubcategory || null,
                    price: item.productId.price,
                    finalPrice: item.productId.finalPrice || item.productId.price,
                    quantity: item.quantity,
                });
            }

            // ✅ Create Tap Payment if needed
            let tapChargeId = null;
            let tapTransactionId = null;
            let tapReceiptUrl = null;

            if (paymentMethod !== "COD") {
                const tapResponse = await axios.post(
                    "https://api.tap.company/v2/charges",
                    {
                        amount: totalAmount,
                        currency: "KWD", // ✅ Change to your Tap currency
                        threeDSecure: true,
                        save_card: false,
                        description: `Order for user ${userId}`,
                        statement_descriptor: "Ecommerce Order",
                        customer: {
                            first_name: req.user.name || "Customer",
                            email: userEmail,
                        },
                        source: {
                            id: "src_all" // ✅ Tap will show all available payment methods
                        },
                        redirect: {
                            url: `${process.env.BASE_URL}/payment/callback` // ✅ Redirect after payment
                        }
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${TAP_SECRET_KEY}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                const paymentData = tapResponse.data;
                tapChargeId = paymentData.id;
                tapTransactionId = paymentData.transaction?.id || null;
                tapReceiptUrl = paymentData.transaction?.url || null;
            }

            // ✅ Save order in DB
            const newOrder = new Order({
                userId,
                products: orderProducts,
                totalAmount,
                paymentMethod,
                paymentStatus: paymentMethod === "COD" ? "Pending" : "Pending", // Tap updates later via webhook
                orderStatus: "Pending",
                shippingAddress: address._id,
                tapChargeId,
                tapTransactionId,
                tapReceiptUrl,
            });

            await newOrder.save();

            // ✅ Clear Cart after placing order
            await Cart.findOneAndDelete({ user: userId });

            return res.status(201).json({
                message: "Order created successfully",
                orderId: newOrder._id,
                paymentMethod,
                paymentStatus: newOrder.paymentStatus,
                tapChargeId,
                tapTransactionId,
                tapReceiptUrl, // Redirect user to this if online payment
            });
        } catch (error) {
            console.error("Error placing order:", error?.response?.data || error.message);
            return res.status(500).json({
                message: "Error placing order",
                error: error?.response?.data || error.message,
            });
        }
    },
    verifyPayment: async (req, res) => {
    try {
        const { tapChargeId } = req.body; // You get this after redirect or callback

        if (!tapChargeId) {
            return res.status(400).json({ message: "Missing Tap Charge ID" });
        }

        // 🔍 Verify payment status with Tap
        const tapResponse = await axios.get(
            `https://api.tap.company/v2/charges/${tapChargeId}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.TAP_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const paymentData = tapResponse.data;

        if (!paymentData || !paymentData.status) {
            return res.status(400).json({ message: "Invalid Tap response" });
        }

        // 🔎 Find order with this chargeId
        const order = await Order.findOne({ tapChargeId });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // ✅ Update order based on payment status
        if (paymentData.status === "CAPTURED") {
            order.paymentStatus = "Completed";
            order.orderStatus = "Processing";
        } else if (paymentData.status === "FAILED" || paymentData.status === "DECLINED") {
            order.paymentStatus = "Failed";
            order.orderStatus = "Cancelled";
        } else {
            order.paymentStatus = "Pending";
        }

        // Save Tap transaction details
        order.tapTransactionId = paymentData.transaction?.id || order.tapTransactionId;
        order.tapReceiptUrl = paymentData.receipt?.url || order.tapReceiptUrl;

        await order.save();

        // ✅ Clear cart once payment succeeds
        if (order.paymentStatus === "Completed") {
            await Cart.findOneAndDelete({ user: order.userId });
        }

        return res.status(200).json({
            message: "Payment verification completed",
            order,
        });
    } catch (error) {
        console.error("Error verifying Tap payment:", error?.response?.data || error.message);
        return res.status(500).json({
            message: "Payment verification failed",
            error: error?.response?.data || error.message,
        });
    }
}

};
