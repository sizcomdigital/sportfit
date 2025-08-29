const express = require("express");
const router = express.Router();
const usercontroller = require('../controllers/usercontroller')
const OrderController = require('../controllers/orderController')
const  authenticateToken = require ("../middleware/usermiddleware")
router.get("/",usercontroller.userhome);
router.get("/contactus",usercontroller.contactpage);
router.get("/about",usercontroller.userabout)
router.get("/shop",usercontroller.usershop);
router.get("/shop-detalis",usercontroller.usershopdetalis);
router.post("/checkout", usercontroller.createCheckoutSession);
router.get("/complete", usercontroller.handleCheckoutCompletion);
router.post('/addToCart',authenticateToken,usercontroller.addToCart)
router.put("/updateCartQuantity",authenticateToken,usercontroller.updateCartQuantity);
router.delete("/removeFromCart", authenticateToken,usercontroller.removeFromCart);
router.post("/signup", usercontroller.usersignup);
router.post("/verify-otp", usercontroller.verifyOtp);  
 router.post("/login", usercontroller.userlogin);
router.get("/checkout", usercontroller.usercheckout);

// ➕ Add address
router.post("/add-address", authenticateToken, usercontroller.addAddress);

// ✏️ Edit address
router.put("/edit-address/:addressId", authenticateToken, usercontroller.editAddress);

// 🗑️ Delete address
router.delete("/delete-address/:addressId", authenticateToken, usercontroller.deleteAddress);

// 📋 Get all user addresses
router.get("/my-addresses", authenticateToken, usercontroller.getUserAddresses)



router.post('/order/create', OrderController.createOrder);
// user remove product from cart
router.post('/order/verify-payment',OrderController.verifyPayment);

module.exports = router