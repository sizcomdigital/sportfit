const express = require("express");
const router = express.Router();
const usercontroller = require('../controllers/usercontroller')
const OrderController = require('../controllers/orderController')
const  authenticateToken = require ("../middleware/usermiddleware")





//-----------------GET-------------------------- 
router.get("/",usercontroller.userhome);
router.get("/contactus",usercontroller.contactpage);
router.get("/about",usercontroller.userabout)
router.get("/shop",usercontroller.usershop);
router.get("/shop-detalis",usercontroller.usershopdetalis);
router.get("/complete", usercontroller.handleCheckoutCompletion);
router.get("/checkout", usercontroller.usercheckout);
router.get("/addresses", authenticateToken, usercontroller.getUserAddresses)



// ---------------------------POST-------------------------


router.post("/signup", usercontroller.usersignup);
router.post("/verify-otp", usercontroller.verifyOtp);  
router.post("/login", usercontroller.userlogin);
router.post("/checkout", usercontroller.createCheckoutSession);
router.post("/add-address", authenticateToken, usercontroller.addAddress);
router.post('/addToCart',authenticateToken,usercontroller.addToCart)
router.post('/order/create', OrderController.createOrder);
router.post('/order/verify-payment',OrderController.verifyPayment);
router.post("/forgotpassword", usercontroller.forgotPassword);
router.post("/changepassword", authenticateToken, usercontroller.changePassword);
router.post("/reset/:token", usercontroller.resetPassword); 



// -------------------PUT & DELETE---------------------------------------------------

router.put("/edit-address/:addressId", authenticateToken, usercontroller.editAddress);
router.put("/updateCartQuantity,",authenticateToken,usercontroller.updateCartQuantity);
router.delete("/removeFromCart", authenticateToken,usercontroller.removeFromCart);
router.delete("/delete-address/:addressId", authenticateToken, usercontroller.deleteAddress);







   










module.exports = router