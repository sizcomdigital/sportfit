const Product = require("../models/productModel");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Brand = require("../models/brandModel")
const crypto = require("crypto");
const Category = require("../models/categoryModel")
const mongoose = require("mongoose");

const path = require("path");

module.exports = {
addProduct: async (req, res) => {
  const {
    productName,
    keyFeatures,
    description,
    additionalInfo,
    deliveryWarrantyInstallation,
    status,
    brand,
    price,
    category,          // main category id
    subcategory,       // subcategory name
    childSubcategory   // child subcategory name
  } = req.body;

  let images = [];

  try {
    // Validate required fields
    if (!productName?.trim() || !description?.trim() || !deliveryWarrantyInstallation?.trim() || !brand || !category || price == null) {
      return res.status(400).json({ message: "Please fill all required fields including category and price." });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({ message: "Price must be a valid positive number." });
    }

    // ✅ Ensure category exists
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(404).json({ message: "Category not found." });
    }

    // ✅ Validate Subcategory & Child Subcategory
    let validSubcategory = null;
    let validChildSubcategory = null;

    if (subcategory) {
      const sub = categoryDoc.subcategories.find(s => s.name === subcategory);
      if (!sub) {
        return res.status(400).json({ message: "Invalid subcategory selected." });
      }
      validSubcategory = sub.name;

      if (childSubcategory) {
        const child = sub.children.find(c => c.name === childSubcategory);
        if (!child) {
          return res.status(400).json({ message: "Invalid child subcategory selected." });
        }
        validChildSubcategory = child.name;
      }
    }

    // ✅ Validate images
    if (!req.files || !req.files.images || req.files.images.length === 0) {
      return res.status(400).json({ message: "Please upload at least one product image." });
    }

    // Upload images to Cloudinary
    for (const file of req.files.images) {
      const filePath = path.resolve(file.path);
      const uploadResult = await cloudinary.uploader.upload(filePath, { folder: "products" });
      images.push(uploadResult.secure_url);
    }

    // ✅ Create product
    const newProduct = new Product({
      productName: productName.trim(),
      keyFeatures: Array.isArray(keyFeatures) ? keyFeatures : keyFeatures.split(",").map(item => item.trim()),
      description: description.trim(),
      additionalInfo: Array.isArray(additionalInfo) ? additionalInfo : additionalInfo.split(",").map(item => item.trim()),
      deliveryWarrantyInstallation: deliveryWarrantyInstallation.trim(),
      status: status || "in stock",
      brand: new mongoose.Types.ObjectId(brand),
      price: Number(price),
      images,
      category: categoryDoc._id,
      subcategory: validSubcategory,
      childSubcategory: validChildSubcategory
    });

    await newProduct.save();

    res.status(201).json({ message: "Product added successfully", product: newProduct });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Error adding product", error: error.message });
  }
}




,

editProduct: async (req, res) => {
  const { id } = req.params;

  try {
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const {
      productName,
      keyFeatures,
      description,
      additionalInfo,
      deliveryWarrantyInstallation,
      status,
      brand,
      price,
      category,        // main category id
      subcategory,     // subcategory name
      childSubcategory // child subcategory name
    } = req.body;

    // ✅ Validate price
    if (price != null && (isNaN(price) || price < 0)) {
      return res.status(400).json({ message: "Price must be a valid positive number." });
    }

    // ✅ Ensure category exists
    let categoryDoc = null;
    if (category) {
      categoryDoc = await Category.findById(category);
      if (!categoryDoc) {
        return res.status(404).json({ message: "Category not found." });
      }
    } else {
      // fallback to product’s existing category
      categoryDoc = await Category.findById(existingProduct.category);
    }

    // ✅ Validate Subcategory & Child Subcategory
    let validSubcategory = existingProduct.subcategory;
    let validChildSubcategory = existingProduct.childSubcategory;

    if (subcategory) {
      const sub = categoryDoc.subcategories.find(s => s.name === subcategory);
      if (!sub) {
        return res.status(400).json({ message: "Invalid subcategory selected." });
      }
      validSubcategory = sub.name;

      if (childSubcategory) {
        const child = sub.children.find(c => c.name === childSubcategory);
        if (!child) {
          return res.status(400).json({ message: "Invalid child subcategory selected." });
        }
        validChildSubcategory = child.name;
      } else {
        validChildSubcategory = null; // reset if not provided
      }
    }

    // ✅ Prepare updated data
    const updatedData = {
      productName: productName?.trim() || existingProduct.productName,
      keyFeatures: keyFeatures
        ? Array.isArray(keyFeatures)
          ? keyFeatures
          : keyFeatures.split(",").map(f => f.trim())
        : existingProduct.keyFeatures,
      description: description?.trim() || existingProduct.description,
      additionalInfo: additionalInfo
        ? Array.isArray(additionalInfo)
          ? additionalInfo
          : additionalInfo.split(",").map(i => i.trim())
        : existingProduct.additionalInfo,
      deliveryWarrantyInstallation: deliveryWarrantyInstallation?.trim() || existingProduct.deliveryWarrantyInstallation,
      status: status || existingProduct.status,
      brand: brand ? new mongoose.Types.ObjectId(brand) : existingProduct.brand,
      price: price != null ? Number(price) : existingProduct.price,
      category: categoryDoc._id,
      subcategory: validSubcategory,
      childSubcategory: validChildSubcategory,
      updatedAt: Date.now()
    };

    // ✅ Handle image update
    if (req.files && req.files.images && req.files.images.length > 0) {
      const uploadedImages = [];
      for (const file of req.files.images) {
        const imagePath = path.resolve(file.path);
        const uploadResult = await cloudinary.uploader.upload(imagePath, { folder: "products" });
        uploadedImages.push(uploadResult.secure_url);
      }
      updatedData.images = uploadedImages;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true
    });

    return res.status(200).json({ message: "Product updated successfully", product: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ message: "Error updating product", error: error.message });
  }
},




  
  deleteProduct: async (req, res) => {
  const { id } = req.params;

  try {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ message: 'Product deleted successfully', product: deletedProduct });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting product', error: error.message });
  }
},

getAllProducts : async (req, res) => {
  try {
    const products = await Product.find().populate('brand', 'name');
    res.status(200).json({ message: 'Products fetched successfully', products });
  } catch (error) {
    res.status(400).json({ message: 'Error fetching products', error: error.message });
  }
},

getEditProduct: async (req, res) => {
  try {
    const { id: productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send("Invalid Product ID");
    }

    // ✅ Fetch product
    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // ✅ Fetch brands
    const brands = await Brand.find().lean();
    if (!brands || brands.length === 0) {
      return res.status(404).send("Brands not found");
    }

    // ✅ Fetch categories
    const categories = await Category.find().lean();
    if (!categories || categories.length === 0) {
      return res.status(404).send("Categories not found");
    }

    // ✅ Find the selected category for this product
    const selectedCategory = categories.find(
      cat => String(cat._id) === String(product.category)
    );

    // ✅ Find the selected subcategory (inside selectedCategory)
    let selectedSubcategory = null;
    if (selectedCategory && product.subcategory) {
      selectedSubcategory = selectedCategory.subcategories.find(
        sub => sub.name === product.subcategory
      );
    }

    // ✅ Render view with all required data
    res.render("admin/editproduct", {
      product,
      brands,
      categories,
      selectedCategory: selectedCategory || null,
      selectedSubcategory: selectedSubcategory || null
    });

  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).send("Internal Server Error");
  }
}
,


deleteProductImage : async (req, res) => {
  try {
    const productId = req.params.id;
    const { imageUrl } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Filter out the image URL from the images array
    product.images = product.images.filter(img => img !== imageUrl);
    await product.save();

    res.json({ success: true, message: 'Image deleted successfully', product });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
},
};