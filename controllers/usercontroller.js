
 const Review = require('../models/reviewsModel')
const User = require('../models/userModel');
const Otp = require('../models/otpModel');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const Product = require('../models/productModel'); 
const Cart = require("../models/cartModel");
const Address = require("../models/addressModel")
const Category = require("../models/categoryModel")
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);      
const Transaction = require("../models/Transaction");

const signupValidationSchema = Joi.object({
    fullname: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    password: Joi.string().min(6).required(),
});
module.exports = {
    userhome: async (req, res) => {
        try {
         
            res.render("user/userHome"); // ✅ only rendering feeStructure with fee array
        } catch (err) {
            console.error(err);
            res.status(500).send("Server Error");
        }
    },

     userregister: async (req, res) => {
        res.render("user/register");
    },

   usersignup : async (req, res) => {
    try {
        const { error } = signupValidationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { fullname, email, phone, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({ message: 'Phone number is already registered' });
        }

        // Create the user with verified: false initially
        const user = new User({
            fullname,
            email,
            phone,
            password,
            verified: false,
        });
        await user.save();

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Save OTP to DB (Upsert if exists)
        await Otp.updateOne(
            { email },
            { $set: { otp, expiration: expiresAt } },
            { upsert: true }
        );

        // Send OTP email
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_ADDRESS,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_ADDRESS,
            to: email,
            subject: 'Email Verification - OTP Code',
            text: `Welcome to our platform!\n\nYour OTP code is: ${otp}\n\nIt will expire in 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully. OTP sent to your email.',
            email: user.email
        });

    } catch (error) {
        console.error('Signup Error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
},
verifyOtp : async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const otpRecord = await Otp.findOne({ email });

        if (!otpRecord) {
            return res.status(400).json({ message: 'OTP not found. Please request a new one.' });
        }

        if (otpRecord.otp !== Number(otp)) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (otpRecord.expiration < new Date()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        // Mark user as verified
        await User.updateOne({ email }, { $set: { verified: true } });

        // Optionally delete OTP record
        await Otp.deleteOne({ email });

        return res.status(200).json({ message: 'Email verified successfully' });

    } catch (error) {
        console.error('OTP Verification Error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
},


userlogin: async (req, res) => {
    console.log("Incoming login request:", req.body); 
    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        console.log("User found in DB:", user); 

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // ✅ Check if user is verified
        if (!user.verified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email before logging in.',
            });
        }

        // ✅ Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // ✅ Generate JWT token
        const token = user.generateAuthToken();

        // ✅ Set cookie (optional - only if you're using cookies for auth)
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 3600000, // 1 hour
        });

        // ✅ Respond with token and user info
        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            token: token,
            user: {
                id: user._id,
                fullname: user.fullname,
                email: user.email
            },
            redirect: '/'
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
},

changePassword : async (req, res) => {
    try {
        const userId = req.user._id; // from JWT
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long and contain a letter and a number."
            });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Compare old password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error changing password:", error);
        return res.status(500).json({ message: "Server error" });
    }
},

forgotPassword : async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "No account with that email found" });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString("hex");

        // Store token and expiry
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send email with reset link
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_ADDRESS,
                pass: process.env.EMAIL_PASS,
            },
        });

        const resetURL = `http://${req.headers.host}/reset/${resetToken}`;

        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_ADDRESS,
            subject: "Password Reset Request",
            text: `Hello ${user.fullname},\n\nYou requested a password reset.\n\n
                   Please click the link below to reset your password:\n
                   ${resetURL}\n\n
                   This link will expire in 1 hour.\n
                   If you didn't request this, ignore this email.\n`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ message: "Reset email sent successfully" });
    } catch (error) {
        console.error("Error in forgotPassword:", error);
        return res.status(500).json({ message: "Server error" });
    }
},

resetPassword : async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ message: "New password is required" });
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long and contain a letter and a number."
            });
        }

        // Find user with token
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired password reset token" });
        }

        // Hash and update password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        return res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
        console.error("Error in resetPassword:", error);
        return res.status(500).json({ message: "Server error" });
    }
},



    contactpage: async(req,res)=>{
        res.render("user/contactpage")
    },
  
    createCheckoutSession : async (req, res) => {
        try {
          const { name, email, age, phone, planType, feeAmount, sectionType } = req.body;
      
         const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [
    {
      price_data: {
        currency: 'aed', // try 'usd' to test
        product_data: {
          name: `${sectionType} - ${planType} plan`,
        },
        unit_amount: parseInt(feeAmount) * 100,
      },
      quantity: 1,
    },
  ],
  mode: 'payment',
  customer_email: email,
  metadata: {
    name,
    age,
    phone,
    planType,
    sectionType,
    feeAmount,
  },
  success_url: `${process.env.BASE_URL}/complete?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.BASE_URL}/cancel`,
});

      
          res.json({ url: session.url });
        } catch (error) {
          console.error("Checkout error:", error);
          res.status(500).json({ error: "Internal Server Error" });
        }
    },
    handleCheckoutCompletion: async (req, res) => {
        try {
          const sessionId = req.query.session_id;
      
          const [session, lineItems] = await Promise.all([
            stripe.checkout.sessions.retrieve(sessionId, {
              expand: ['payment_intent.payment_method'],
            }),
            stripe.checkout.sessions.listLineItems(sessionId),
          ]);
      
          const transactionData = {
            sessionId: session.id,
            customerEmail: session.customer_details?.email,
            name: session.metadata?.name || "",
            age: Number(session.metadata?.age) || 0,
            phone: session.metadata?.phone || "",
            planType: session.metadata?.planType || "",
            sectionType: session.metadata?.sectionType || "",
            amountTotal: Number(session.metadata?.feeAmount) || 0,
            currency: session.currency,
            paymentStatus: session.payment_status,
            paymentMethod: session.payment_intent?.payment_method?.card?.brand || "Unknown",
            last4: session.payment_intent?.payment_method?.card?.last4 || "----",
            createdAt: new Date(),
            lineItems: lineItems.data.map((item) => ({
              name: item.description,
              quantity: item.quantity,
              amountSubtotal: item.amount_subtotal,
              amountTotal: item.amount_total,
            })),
          };
      
          // Save to DB
          await Transaction.create(transactionData);
      
          // Render success page with order details
          res.render("user/success", { transaction: transactionData });
        } catch (error) {
          console.error("❌ Error completing checkout:", error.message);
          res.status(500).send("Something went wrong while completing the transaction.");
        }
    },
    userregister: async (req, res) => {
        res.render("user/register");
    },
    userabout: async (req, res) => {
      
        
        res.render("user/about");
    },
    usershop: async (req, res) => {
        
        
        res.render("user/shope");
    },
     usershopdetalis: async (req, res) => {
        
        
        res.render("user/productdetalis");
    },
       usercontact: async (req, res) => {
      
        res.render("user/contact");
    },

 
addToCart : async (req, res) => {
  try {
    let { userId, productId, quantity } = req.body; // For Thunder Client, pass userId in body

    // Validate required fields
    if (!userId || !productId) {
      return res.status(400).json({ message: "userId and productId are required" });
    }

    // Validate quantity
    const parsedQuantity = Number(quantity) || 1;
    if (parsedQuantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (typeof product.price !== "number" || product.price < 0) {
      return res.status(400).json({ message: "Invalid product price" });
    }

    // Check if cart exists
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // Create new cart
      cart = new Cart({
        user: userId,
        products: [
          {
            product: productId,
            quantity: parsedQuantity,
            price: product.price
          }
        ],
        totalPrice: product.price * parsedQuantity
      });
    } else {
      // Check if product already in cart
      const productIndex = cart.products.findIndex(
        p => p.product.toString() === productId
      );

      if (productIndex > -1) {
        // Update quantity
        cart.products[productIndex].quantity += parsedQuantity;
      } else {
        // Add new product
        cart.products.push({
          product: productId,
          quantity: parsedQuantity,
          price: product.price
        });
      }

      // Update total price
      cart.totalPrice = cart.products.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );
    }

    await cart.save();

    res.status(200).json({
      message: "Product added to cart successfully",
      cart
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
},
updateCartQuantity: async (req, res) => {
    try {
      const { userId, productId, quantity } = req.body;

      if (!userId || !productId) {
        return res.status(400).json({ message: "userId and productId are required" });
      }

      const parsedQuantity = Number(quantity);
      if (parsedQuantity < 1) {
        return res.status(400).json({ message: "Quantity must be at least 1" });
      }

      let cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ message: "Cart not found" });

      const productIndex = cart.products.findIndex(
        p => p.product.toString() === productId
      );

      if (productIndex === -1) {
        return res.status(404).json({ message: "Product not in cart" });
      }

      cart.products[productIndex].quantity = parsedQuantity;

      cart.totalPrice = cart.products.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );

      await cart.save();

      res.status(200).json({
        message: "Cart quantity updated successfully",
        cart
      });
    } catch (error) {
      console.error("Error updating quantity:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  },

  // ✅ Remove Product from Cart
  removeFromCart: async (req, res) => {
    try {
      const { userId, productId } = req.body;

      if (!userId || !productId) {
        return res.status(400).json({ message: "userId and productId are required" });
      }

      let cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ message: "Cart not found" });

      cart.products = cart.products.filter(
        p => p.product.toString() !== productId
      );

      cart.totalPrice = cart.products.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );

      await cart.save();

      res.status(200).json({
        message: "Product removed from cart successfully",
        cart
      });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  },
usercheckout: async (req, res) => {
    if (!req.user) {
        return res.redirect("/register");
    }

    try {
        const categories = await Category.find(); 
        const cart = await Cart.findOne({ user: req.user._id }).populate("products.product");
        const addresses = await Address.find({ userId: req.user._id });

        if (!cart || cart.products.length === 0) {
            return res.render("user/checkout", { 
                categories, 
                cart: null, 
                totalPrice: 0, 
                addresses, 
                success: req.query.success || null
            });
        }

        let totalPrice = 0;
        cart.products.forEach(item => {
            totalPrice += item.price * item.quantity;
        });

        res.render("user/checkout", { 
            categories, 
            cart, 
            totalPrice, 
            addresses, 
            success: req.query.success || null 
        });
    } catch (error) {
        console.error("Error fetching cart:", error.message);
        res.status(500).send("Internal Server Error");
    }
},
addAddress: async (req, res) => {
        try {
            const userId = req.user._id;
            const { fullName, phone, addressLine1, addressLine2, city, state, postalCode, country } = req.body;

            if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode || !country) {
                return res.status(400).json({ success: false, message: "All required fields must be filled!" });
            }

            const newAddress = new Address({
                userId,
                fullName,
                phone,
                addressLine1,
                addressLine2,
                city,
                state,
                postalCode,
                country
            });

            await newAddress.save();

            // ✅ Success response
            return res.status(201).json({ success: true, message: "Address added successfully!", address: newAddress });
        } catch (error) {
            console.error("Error adding address:", error);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    },

    // ✏️ Edit Address
    editAddress: async (req, res) => {
        try {
            const userId = req.user._id;
            const { addressId } = req.params;
            const { fullName, phone, addressLine1, addressLine2, city, state, postalCode, country } = req.body;

            if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode || !country) {
                return res.status(400).json({ success: false, message: "All required fields must be filled!" });
            }

            const updatedAddress = await Address.findOneAndUpdate(
                { _id: addressId, userId },
                { fullName, phone, addressLine1, addressLine2, city, state, postalCode, country, updatedAt: Date.now() },
                { new: true }
            );

            if (!updatedAddress) {
                return res.status(404).json({ success: false, message: "Address not found!" });
            }

            return res.status(200).json({ success: true, message: "Address updated successfully!", address: updatedAddress });
        } catch (error) {
            console.error("Error updating address:", error);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    },

    // 🗑️ Delete Address
    deleteAddress: async (req, res) => {
        try {
            const userId = req.user._id;
            const { addressId } = req.params;

            const address = await Address.findOne({ _id: addressId, userId });
            if (!address) {
                return res.status(404).json({ success: false, message: "Address not found" });
            }

            await Address.deleteOne({ _id: addressId });

            return res.status(200).json({ success: true, message: "Address deleted successfully" });
        } catch (error) {
            console.error("Error deleting address:", error);
            return res.status(500).json({ success: false, message: "Error deleting address", error: error.message });
        }
    },

    // 📋 Get All Addresses of a User
    getUserAddresses: async (req, res) => {
        try {
            const userId = req.user._id;
            const addresses = await Address.find({ userId }).sort({ createdAt: -1 });

            return res.status(200).json({ success: true, addresses });
        } catch (error) {
            console.error("Error fetching addresses:", error);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    },


  
 stripeWebhookHandler: async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log("✅ Webhook received:", event.type);
  } catch (err) {
    console.error("⚠️ Invalid webhook signature:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      const [lineItems, paymentIntent] = await Promise.all([
        stripe.checkout.sessions.listLineItems(session.id),
        stripe.paymentIntents.retrieve(session.payment_intent),
      ]);

      const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);

      const updated = await CourtTransaction.findOneAndUpdate(
        { sessionId: session.id },
        {
          $set: {
            paymentStatus: session.payment_status,
            paymentMethod: paymentMethod.card?.brand || "Unknown",
            last4: paymentMethod.card?.last4 || "----",
            lineItems: lineItems.data.map(item => ({
              name: item.description,
              quantity: item.quantity,
              amountSubtotal: item.amount_subtotal / 100,
              amountTotal: item.amount_total / 100,
            })),
          }
        },
        { new: true }
      );

      if (updated) {
        console.log("✅ Transaction updated via webhook:", session.id);
      } else {
        console.log("❌ No matching pending transaction found.");
      }

    } catch (err) {
      console.error("❌ Webhook processing error:", err.message);
    }
  }

  res.status(200).send("Webhook received");
}
}
