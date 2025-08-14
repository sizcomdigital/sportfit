const Brand = require('../models/brandModel');
const cloudinary = require('cloudinary').v2;

module.exports = {
  // GET: Render add brand form
  getAddBrandPage: (req, res) => {
    res.render("admin/brand");
  },

  // POST: Add new brand
  addBrand: async (req, res) => {
    try {
      const { name } = req.body;

      if (!name || !req.file) {
        return res.status(400).json({ message: "Brand name and logo are required." });
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "brands",
      });

      const newBrand = new Brand({
        name: name.trim(),
        logo: result.secure_url,
      });

      await newBrand.save();
      res.redirect('/admin/allbrand');
    } catch (error) {
      console.error("Error adding brand:", error);
      res.status(500).json({ message: "Failed to add brand." });
    }
  },

  // GET: Get all brands
  getAllBrand: async (req, res) => {
    try {
      const brands = await Brand.find().sort({ createdAt: -1 });
      res.render('admin/allbrand', { brands });
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ message: "Failed to load brands." });
    }
  },
  // GET edit brand page
getEditBrandPage: async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).send("Brand not found");
    }

    res.render("admin/editBrand", { brand });
  } catch (error) {
    console.error("Error fetching brand for edit:", error);
    res.status(500).send("Internal Server Error");
  }
},


  // PUT/POST: Edit brand
  editBrand: async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const updateData = {
        name: name.trim(),
      };

      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "brands",
        });
        updateData.logo = result.secure_url;
      }

      await Brand.findByIdAndUpdate(id, updateData);
      res.redirect('/admin/allbrand');
    } catch (error) {
      console.error("Error editing brand:", error);
      res.status(500).json({ message: "Failed to update brand." });
    }
  },

  // DELETE: Remove brand
 deleteBrand: async (req, res) => {
  try {
    const { id } = req.params;
    await Brand.findByIdAndDelete(id);
    res.json({ success: true, message: "Brand deleted successfully." });
  } catch (error) {
    console.error("Error deleting brand:", error);
    res.status(500).json({ success: false, message: "Failed to delete brand." });
  }
}

};
