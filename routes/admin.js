const express = require("express");
const router = express.Router();
const admincontroller = require('../controllers/admincontroller')
const productControler = require('../controllers/ProductController')
const reviewController = require ('../controllers/reviewController')
const brandController = require("../controllers/brandController")
const upload = require('../config/multer')
const verifyToken = require('../middleware/authmiddleware')



// login route
router.get("/login",admincontroller.admingetlogin);
router.get("/",verifyToken,admincontroller.adminhome);
router.post("/login",admincontroller.adminlogin);
router.post("/register",admincontroller.register);
router.post('/logout',verifyToken, admincontroller.logout)

// Program Routes
router.post('/products',verifyToken,upload.fields([{ name: 'images', maxCount: 5 }]), productControler.addProduct);

// Get program details for editing
router.get('/products/:id', verifyToken, productControler.getEditProduct);
// Edit a program
router.put('/products/:id',verifyToken,upload.fields([{ name: 'images', maxCount: 10 }]), productControler.editProduct);
// Delete a program
router.delete('/products/:id',verifyToken,productControler.deleteProduct);
// Get all Program
router.get('/products', verifyToken, productControler.getAllProducts);
router.get("/allproducts", verifyToken, admincontroller.allProducts);
router.get("/addproduct", verifyToken, admincontroller.addProduct);
// Delete an image from a program
router.delete('/products/img/:id', verifyToken, productControler.deleteProductImage);
// Delete a video from a program

router.get("/editproducts", verifyToken, admincontroller.allEditableProducts);
// --------------------------------------------------------------


router.get("/categories/:id/subcategories", admincontroller.getSubcategories);

router.get("/category", verifyToken, admincontroller.getcategory);
router.post("/category", verifyToken, admincontroller.postgetcategory);
router.get("/allcategory", verifyToken, admincontroller.getallcategory);
router.delete("/deletecategory/:id", verifyToken, admincontroller.deleteCategory);
router.put("/categories/:id", verifyToken, admincontroller.editCategory);
router.get("/categories/edit/:id", verifyToken, admincontroller.getEditCategoryPage);





router.get("/brand", verifyToken, brandController.getAddBrandPage);

// Handle brand form submission
router.post("/brand", verifyToken, upload.single("logo"), brandController.addBrand);

// Show all brands
router.get("/allbrand", verifyToken, brandController.getAllBrand);

// Edit brand
router.post("/editbrand/:id", verifyToken, upload.single("logo"), brandController.editBrand);
router.get("/editbrand/:id", verifyToken, brandController.getEditBrandPage);

// Delete brand
router.delete("/deletebrand/:id", verifyToken, brandController.deleteBrand);












//tranasation------------------------------------

router.get("/transactions", verifyToken, admincontroller.getAllTransactions);



module.exports= router