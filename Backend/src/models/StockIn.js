const mongoose = require("mongoose");

const stockInSchema = new mongoose.Schema({
    // Product Information
    product: {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true
        },
        category: {
            type: String,
            required: [true, 'Product category is required']
        },
        unit: {
            type: String,
            required: [true, 'Unit is required'],
            enum: ['piece', 'kg', 'g', 'liter', 'ml', 'boxe', 'packet', 'bag', 'carton']
        },
        description: String,
        sku: String,
        barcode: String
    },
    
    // Quantity
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    remainingQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Source Information
    source: {
        type: {
            type: String,
            enum: ['donor', 'company', 'purchase'],
            required: [true, 'Source type is required']
        },
        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'source.refModel'
        },
        refModel: {
            type: String,
            enum: ['Donor', 'Company']
        },
        companyName: String, // For company/purchase sources
        invoiceNumber: String,
        purchasePrice: Number,
        purchaseDate: Date
    },
    
    // Location
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: [true, 'Location is required']
    },
    
    // Distribution Policy - CRITICAL for compliance
    distributionPolicy: {
        type: {
            type: String,
            enum: ['free_only', 'control_price', 'flexible'],
            required: [true, 'Distribution policy type is required']
        },
        allowedModes: [{
            type: String,
            enum: ['free', 'control_price', 'discounted']
        }],
        controlPrice: {
            type: Number,
            min: 0
        },
        maxDiscountPercent: {
            type: Number,
            min: 0,
            max: 100
        }
    },
    
    // Eligibility Rules for Beneficiaries
    eligibilityRules: {
        frequency: {
            type: String,
            enum: ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'unlimited'],
            default: 'unlimited'
        },
        maxQuantityPerBeneficiary: Number,
        requiredStatus: [{
            type: String,
            enum: ['pending', 'approved', 'rejected']
        }],
        minFamilySize: Number,
        maxFamilySize: Number,
        incomeThreshold: Number
    },
    
    // Pricing
    pricing: {
        costPrice: Number,
        retailPrice: Number,
        controlPrice: Number
    },
    
    // Dates
    receivedDate: {
        type: Date,
        default: Date.now
    },
    expiryDate: Date,
    
    // Status
    status: {
        type: String,
        enum: ['active', 'depleted', 'expired', 'returned'],
        default: 'active'
    },
    
    // Batch/Lot tracking
    batchNumber: String,
    lotNumber: String,
    
    // Notes and custom fields
    notes: String,
    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    
    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Pre-save hook to set remainingQuantity and validate policy
stockInSchema.pre('save', function(next) {
    if (this.isNew) {
        this.remainingQuantity = this.quantity;
    }
    
    // Validate distribution policy
    const policy = this.distributionPolicy;
    if (policy.type === 'free_only') {
        policy.allowedModes = ['free'];
    } else if (policy.type === 'control_price') {
        if (!policy.controlPrice || policy.controlPrice <= 0) {
            return next(new Error('Control price is required for control_price policy'));
        }
        policy.allowedModes = ['control_price'];
    } else if (policy.type === 'flexible') {
        if (!policy.allowedModes || policy.allowedModes.length === 0) {
            policy.allowedModes = ['free', 'control_price', 'discounted'];
        }
    }
    
    // Update status if depleted
    if (this.remainingQuantity === 0) {
        this.status = 'depleted';
    }
    
    next();
});

// Method to check if stock is available
stockInSchema.methods.isAvailable = function(quantity = 1) {
    return this.status === 'active' && this.remainingQuantity >= quantity;
};

// Method to deduct stock
stockInSchema.methods.deductStock = function(quantity) {
    if (!this.isAvailable(quantity)) {
        throw new Error('Insufficient stock');
    }
    this.remainingQuantity -= quantity;
    if (this.remainingQuantity === 0) {
        this.status = 'depleted';
    }
    return this;
};

// Indexes
stockInSchema.index({ 'source.type': 1, 'source.referenceId': 1 });
stockInSchema.index({ locationId: 1, status: 1 });
stockInSchema.index({ 'product.category': 1 });
stockInSchema.index({ remainingQuantity: 1 });

module.exports = mongoose.model("StockIn", stockInSchema);
