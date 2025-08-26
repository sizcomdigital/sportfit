const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
    subcategoryname: {
        type: String,
        required: true,
        trim: true
    },
    parentCategory: {   // Link to main category
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: { 
        type: Boolean, 
        default: true 
    }
});

const SubCategory = mongoose.model('SubCategory', subCategorySchema);
module.exports = SubCategory;
