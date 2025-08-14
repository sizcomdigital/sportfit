const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    categoryname: {
        type: String,
        required: true,
        unique: true,
    },
    subcategories: [{
        type: String,
        required: false
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    status:{ type: Boolean, default: true }
});
const Category = mongoose.model('Category', categorySchema);
module.exports = Category;