const mongoose = require('mongoose');

const fundSubCategorySchema = new mongoose.Schema({
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FundCategory',
        required: [true, 'Parent category is required']
    },
    name: {
        type: String,
        required: [true, 'Fund subcategory name is required'],
        trim: true
    },
    code: {
        type: String,
        trim: true,
        uppercase: true
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

fundSubCategorySchema.index({ categoryId: 1, name: 1 }, { unique: true });
fundSubCategorySchema.index({ code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('FundSubCategory', fundSubCategorySchema);
