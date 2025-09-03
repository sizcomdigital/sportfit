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
},

// ✅ Get all orders
getAllOrders: async (req, res) => {
    try {
        const perPage = 10; // how many orders per page
        const page = parseInt(req.query.page) || 1;

        const ordersCount = await Order.countDocuments();

        const orders = await Order.find()
            .skip((page - 1) * perPage)
            .limit(perPage)
            .populate("userId", "fullname email") // Fetch basic user info
            .populate("shippingAddress") // Populate shipping address
            .populate("products.productId", "productName images"); // Basic product snapshot

        if (!orders.length) {
            return res.render("admin/allorder", { 
                orders: [], 
                message: "No orders found", 
                ordersCount: 0,
                currentPage: page,
                totalPages: Math.ceil(ordersCount / perPage)
            });
        }

        // 🔹 Transform orders for frontend
        const formattedOrders = [];
        orders.forEach(order => {
            order.products.forEach(product => {
                if (!product.productId) return; // Prevent crashes if product is deleted
                formattedOrders.push({
                    orderId: order._id,
                    user: order.userId, // { fullname, email }
                    shippingAddress: order.shippingAddress,
                    product: {
                        name: product.productName,
                        brand: product.brand,
                        status: product.status,
                        price: product.finalPrice,
                        images: product.images || [],
                    },
                    quantity: product.quantity,
                    orderStatus: order.orderStatus,
                    paymentMethod: order.paymentMethod,
                    paymentStatus: order.paymentStatus,
                    createdAt: order.createdAt,
                });
            });
        });

        res.render("admin/allorder", { 
            orders: formattedOrders, 
            message: null, 
            ordersCount,
            currentPage: page,
            totalPages: Math.ceil(ordersCount / perPage)
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.render("admin/allorder", { 
            orders: [], 
            message: "Internal server error", 
            ordersCount: 0,
            currentPage: 1,
            totalPages: 1
        });
    }
},
   

// ✅ Update order status
updateOrderStatus: async (req, res) => {
    try {
        const { orderId } = req.params;
        const { orderStatus, productId } = req.body;

        // Allowed statuses
        const allowedStatuses = [
            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled",
            "Return Requested",
            "Returned"
        ];

        if (!orderStatus || !allowedStatuses.includes(orderStatus)) {
            return res.status(400).json({ success: false, message: "Invalid or missing order status" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Handle specific product cancel
        if (orderStatus === "Cancelled" && productId) {
            const product = order.products.find(p => p.productId.toString() === productId);
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found in order" });
            }
            if (product.status === "Cancelled") {
                return res.status(400).json({ success: false, message: "Product already cancelled" });
            }

            product.status = "Cancelled";

            // if all cancelled, mark whole order as cancelled
            const allCancelled = order.products.every(p => p.status === "Cancelled");
            if (allCancelled) order.orderStatus = "Cancelled";
        }
        // Handle Delivered
        else if (orderStatus === "Delivered") {
            order.orderStatus = "Delivered";
            order.products.forEach(p => (p.status = "Delivered"));
            order.deliveryDate = new Date();
        }
        // Handle Returned
        else if (orderStatus === "Returned" && productId) {
            const product = order.products.find(p => p.productId.toString() === productId);
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found in order" });
            }
            if (product.status !== "Return Requested") {
                return res.status(400).json({ success: false, message: "Product must be 'Return Requested' before returning" });
            }

            product.status = "Returned";
            if (product.returnRequest) {
                product.returnRequest.returnStatus = "Returned";
                product.returnRequest.returnDate = new Date();
            }

            const allReturned = order.products.every(p => p.status === "Returned");
            if (allReturned) order.orderStatus = "Returned";
        }
        // General update
        else {
            order.orderStatus = orderStatus;
        }

        order.updatedAt = new Date();
        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            data: order,
        });
    } catch (error) {
        console.error("Error updating order status:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
},
    deleteOrder: async (req, res) => {
        try {
            const { orderId } = req.params;

            // Check if order exists and delete
            const deletedOrder = await Order.findByIdAndDelete(orderId);

            if (!deletedOrder) {
                return res.status(404).json({ success: false, message: "Order not found" });
            }

            return res.status(200).json({ success: true, message: "Order deleted successfully" });
        } catch (error) {
            console.error("Error deleting order:", error);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }


};
