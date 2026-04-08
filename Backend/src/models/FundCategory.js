const mongoose = require('mongoose');

const fundCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Fund category name is required'],
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

fundCategorySchema.index({ name: 1 }, { unique: true });
fundCategorySchema.index({ code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('FundCategory', fundCategorySchema);
