const mongoose = require('mongoose');

const childCategorySchema = new mongoose.Schema({
    childCategoryName: {
        type: String,
        required: true,
        trim: true
    },
    parentSubCategory: {   // Link to sub category
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
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

const ChildCategory = mongoose.model('ChildCategory', childCategorySchema);
module.exports = ChildCategory;
