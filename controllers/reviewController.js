const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Review = require("../models/reviewsModel")
const crypto = require("crypto");

const mongoose = require("mongoose");

const path = require("path");
const { log } = require("console");

module.exports = {
    addReview : async (req, res) => {
        const { customerName, description, nationality, designation } = req.body;
        let image = "";
      
        try {
          if (!req.files || !req.files.image || req.files.image.length === 0) {
            return res.status(400).json({ message: "Please upload an image." });
          }
      
          const imagePath = path.resolve(req.files.image[0].path);
          const imageUpload = await cloudinary.uploader.upload(imagePath, {
            folder: "reviews",
          });
          image = imageUpload.secure_url;
      
          const newReview = new Review({
            customerName,
            description,
            nationality,
            designation,
            image,
          });
      
          await newReview.save();
          res.status(201).json({ message: "Review added successfully", review: newReview });
      
        } catch (error) {
          console.error("Error adding review:", error);
          res.status(500).json({ message: "Error adding review", error: error.message });
        }
      },

      editReview : async (req, res) => {
        const { id } = req.params;
      
        try {
          const existingReview = await Review.findById(id);
          if (!existingReview) {
            return res.status(404).json({ message: "Review not found" });
          }
      
          const updatedData = {
            ...req.body,
            updatedAt: Date.now(),
          };
      
          if (req.files && req.files.image && req.files.image.length > 0) {
            const imagePath = path.resolve(req.files.image[0].path);
            const imageUpload = await cloudinary.uploader.upload(imagePath, {
              folder: "reviews",
            });
            updatedData.image = imageUpload.secure_url;
          }
      
          const updatedReview = await Review.findByIdAndUpdate(id, updatedData, {
            new: true,
            runValidators: true,
          });
      
          res.status(200).json({ message: "Review updated successfully", review: updatedReview });
      
        } catch (error) {
          console.error("Error updating review:", error);
          res.status(400).json({ message: "Error updating review", error: error.message });
        }
      },
  
  
      deleteReview : async (req, res) => {
        const { id } = req.params;
      
        try {
          const deletedReview = await Review.findByIdAndDelete(id);
      
          if (!deletedReview) {
            return res.status(404).json({ message: "Review not found" });
          }
      
          res.status(200).json({ message: "Review deleted successfully", review: deletedReview });
        } catch (error) {
          res.status(400).json({ message: "Error deleting review", error: error.message });
        }
      }
,
getAllReviews: async (req, res) => {
    try {
      const reviews = await Review.find();
      res.status(200).json({ message: "Reviews fetched successfully", reviews });
    } catch (error) {
      res.status(400).json({ message: "Error fetching reviews", error: error.message });
    }
  },

  getEditReview: async (req, res) => {
    try {
      const { id: reviewId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).send("Invalid Review ID");
      }

      const review = await Review.findById(reviewId);
      console.log(review,"reviewreviewreviewreview");
      

      if (!review) {
        return res.status(404).send("Review not found");
      }

      res.render("admin/editReviews", { review }); // Assuming you have this EJS file
    } catch (error) {
      console.error("Error fetching review:", error);
      res.status(500).send("Internal Server Error");
    }
  },

  // deleteReviewImage: async (req, res) => {
  //   try {
  //     const reviewId = req.params.id;
  //     const imageUrlToDelete = req.body.imageUrl;

  //     const review = await Review.findById(reviewId);
  //     if (!review) {
  //       return res.status(404).json({ success: false, message: 'Review not found' });
  //     }

  //     if (review.image === imageUrlToDelete) {
  //       review.image = null;
  //       await review.save();
  //       return res.json({ success: true, message: 'Image deleted successfully', review });
  //     } else {
  //       return res.status(400).json({ success: false, message: 'Image does not match the current review image' });
  //     }
  //   } catch (error) {
  //     console.error('Error deleting image:', error);
  //     res.status(500).json({ success: false, message: 'Server error' });
  //   }
  // },

  deleteReviewImage: async (req, res) => {
    try {
      const reviewId = req.params.id;
      const imageUrlToDelete = req.body.imageUrl;
  
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ success: false, message: 'review not found' });
      }
  
      // Check if the current image matches the one to delete
      if (review.image === imageUrlToDelete) {
        review.image = null; // or '' if you prefer
        await review.save();
        return res.json({ success: true, message: 'Image deleted successfully', review });
      } else {
        return res.status(400).json({ success: false, message: 'Image does not match the current review image' });
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

};