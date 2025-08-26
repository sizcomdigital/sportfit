const Admin = require('../models/adminmodel');
const bcrypt = require('bcrypt');
const Brand = require("../models/brandModel")
const jwt = require('jsonwebtoken');
const  Product = require("../models/productModel")
const Category = require("../models/categoryModel")


const Transaction = require("../models/Transaction");

module.exports = {
    admingetlogin: async (req, res) => {
        res.render("admin/adminlogin");
    },
    adminlogin: async (req, res) => {
        try {
            const { username, password } = req.body;
            const admin = await Admin.findOne({ username });
            if (!admin) {
                return res.status(400).send({ message: "no admin in this username" });
            }
            // Compare the provided password with the stored hashed password
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                return res.status(400).send({ message: "Invalid username or password" });
            }
            const token = jwt.sign(
                { id: admin._id, role: "admin" },  // Payload data (like admin ID and role)
                process.env.JWT_SECRET,            // Secret key from your environment variables
                { expiresIn: "7d" }                // Token expiration time
            );
            // Send the token back to the client
            res.cookie("token", token, {
                httpOnly: true,
                secure: true, // Set to true if using HTTPS
                sameSite: "Strict",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
              });
              res.send({ message: "Login successful", token:token });
        } catch (error) {
            console.error("Error during login:", error);          
              return res.status(500).send({ message: "Internal Server Error" });
        }
    },
    logout: (req, res) => {
        res.clearCookie("token");
        res.redirect('/admin/login'); // Redirect to login page after logout
        res.status(200).send({ message: "User logged out successfully" });
    },
    register:  async (req, res) => {
        const { username, password} = req.body;
    
      
        try {
            const existingAdmin = await Admin.findOne({ username });
            if (existingAdmin) {
                return res.status(400).json({ message: 'Admin already exists with this username' });
            }
    
            // Create a new admin
            const newAdmin = new Admin({
                username,
                password, // The password will be hashed automatically due to the pre-save hook
                
            });
    
            // Save the new admin to the database
            await newAdmin.save();
            
            // Send a success response
            res.status(201).json({
                message: 'Admin registered successfully!',
                admin: {
                    username: newAdmin.username,
                    status: newAdmin.status,
                }
            });
    
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    },
    adminhome: async (req, res) => {
 
      const brandCount = await Brand.countDocuments({});
      const categoryCount = await Category.countDocuments({})
     
      // const reviewCount = await Review.countDocuments({})

        res.render("admin/dashboard",{
          
          
            brandCount,
            categoryCount,
    
            
           
        
        });
    },
        getcategory: async (req, res) => {
        res.render("admin/category");
    },


     getsubcategorytpage: async (req, res) => {
        try {
            // Fetch all categories
            const categories = await Category.find({}, { categoryname: 1, _id: 0 });

            // Render the view with categories
            res.render("admin/subcategory", { categories });
        } catch (error) {
            console.error("Error fetching categories:", error);
            res.status(500).send("An error occurred while fetching categories.");
        }
    },
  getallcategory: async (req, res) => {
    try {
        const perPage = 10;
        const page = parseInt(req.query.page) || 1;

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / perPage);

        const categories = await Category.find()
            .skip((page - 1) * perPage)
            .limit(perPage);
   
        res.render("admin/allCategory", {
            categories,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("An error occurred while fetching categories.");
    }
},


   postgetcategory: async (req, res) => {
    try {
        let { categoryname, subcategories } = req.body;

        if (!categoryname || !categoryname.trim()) {
            return res.status(400).json({ message: "Category name is required." });
        }

        categoryname = categoryname.trim();

        // Prevent duplicate category (case-insensitive)
        const existingCategory = await Category.findOne({
            categoryname: { $regex: new RegExp(`^${categoryname}$`, "i") }
        });
        if (existingCategory) {
            return res.status(400).json({ message: "Category already exists." });
        }

        // Ensure subcategories format
        let subcategoryList = [];
        if (Array.isArray(subcategories)) {
            subcategoryList = subcategories.map(sub => ({
                name: sub.name.trim(),
                children: Array.isArray(sub.children)
                    ? sub.children.map(c => ({ name: c.trim() })).filter(c => c.name)
                    : []
            }));
        }

        const category = new Category({
            categoryname,
            subcategories: subcategoryList
        });

        await category.save();

        res.status(201).json({ message: "Category saved successfully.", category });
    } catch (error) {
        console.error("Error saving category:", error);
        res.status(500).json({ message: "An error occurred while saving the category.", error: error.message });
    }
},
// controller/admincontroller.js
getSubcategories: async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId).lean();

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      subcategories: category.subcategories || []
    });
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
},




    getEditCategoryPage: async (req, res) => {
    const { id } = req.params;
    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).render("admin/404", { message: "Category not found" });
        }
        res.render("admin/editCategory", { category });
    } catch (error) {
        res.status(500).render("admin/500", { message: "Server error", error: error.message });
    }
},

    // Controller function to delete a category
    deleteCategory: async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "Category ID is required" });
        }

        const deletedCategory = await Category.findByIdAndDelete(id);

        if (!deletedCategory) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
            data: deletedCategory
        });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
},

editCategory: async (req, res) => {
    const { id } = req.params;
    const { categoryname, subcategories } = req.body;

    try {
        if (!categoryname || !categoryname.trim()) {
            return res.status(400).json({ message: "Category name is required" });
        }

        const updatedData = {
            categoryname: categoryname.trim(),
            updatedAt: Date.now()
        };

        if (Array.isArray(subcategories)) {
            // Expect subcategories like [{ name: "Mobiles", children: ["Android", "iPhone"] }]
            updatedData.subcategories = subcategories.map(sub => ({
                name: sub.name.trim(),
                children: Array.isArray(sub.children)
                    ? sub.children.map(c => ({ name: c.trim() })).filter(c => c.name)
                    : []
            }));
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            updatedData,
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.status(200).json({
            message: "Category updated successfully",
            category: updatedCategory
        });

    } catch (error) {
        console.error("Error updating category:", error);
        res.status(400).json({
            message: "Error updating category",
            error: error.message
        });
    }
},




 
  addProduct : async (req, res) => {
  try {
    const brands = await Brand.find().lean(); // Fetch brands for dropdown
    const categories = await Category.find({ status: true }).lean(); // fetch categories with subs & children
    console.log(categories,"categoriescategories");
    

    res.render("admin/addproduct", { brands, categories });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).send("Internal Server Error");
  }
},

   allProducts : async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  try {
    const [products, total] = await Promise.all([
      Product.find().populate('brand', 'name').skip(skip).limit(limit).lean(),
      Product.countDocuments()
    ]);

    const totalPages = Math.ceil(total / limit);

    res.render("admin/allProducts", {
      products,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
},

    allEditableProducts : async (req, res) => {
  try {
    const brands = await Brand.find().lean();
    const products = await Product.find().populate('brand', 'name').lean();

    res.render("admin/EditableProducts", {
      products,
      brands
    });
  } catch (error) {
    console.error("Error fetching editable products:", error);
    res.status(500).send("Error fetching products");
  }
},

  
  getAllTransactions: async (req, res) => {
    try {
      const transactions = await Transaction.find().sort({ createdAt: -1 });
      res.render("admin/alltransactions", { transactions });
    } catch (err) {
      console.error("Error fetching transactions:", err);
      res.status(500).send("Server Error");
    }
  }
  
}
    
    
    
   