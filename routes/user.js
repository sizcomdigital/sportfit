const express = require("express");
const router = express.Router();
const usercontroller = require('../controllers/usercontroller')
const  authenticateToken = require ("../middleware/usermiddleware")
router.get("/",usercontroller.userhome);
router.get("/contactus",usercontroller.contactpage);
router.get("/partner",usercontroller.partnerpage);
router.get("/about",usercontroller.userabout)
router.get("/shop",usercontroller.usershop);
router.get("/shop-detalis",usercontroller.usershopdetalis);
router.post("/checkout", usercontroller.createCheckoutSession);
router.get("/complete", usercontroller.handleCheckoutCompletion);
router.post('/addToCart', usercontroller.addToCart)
router.post("/signup", usercontroller.usersignup);
router.post("/verify-otp", usercontroller.verifyOtp);  
 router.post("/login", usercontroller.userlogin);

module.exports = router