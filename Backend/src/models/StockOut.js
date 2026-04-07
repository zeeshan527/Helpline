
const mongoose = require("mongoose");

const stockOutSchema = new mongoose.Schema({
    // Reference to Stock In
    stockInId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StockIn',
        required: [true, 'Stock In reference is required']
    },
    
    // Beneficiary
    beneficiaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Beneficiary',
        required: [true, 'Beneficiary is required']
    },
    
    // Location where distribution happened
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: [true, 'Location is required']
    },
    
    // Quantity distributed
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    
    // Distribution details
    distribution: {
        mode: {
            type: String,
            enum: ['free', 'control_price', 'discounted'],
            required: [true, 'Distribution mode is required']
        },
        price: {
            type: Number,
            default: 0,
            min: 0
        },
        originalPrice: Number,
        discountPercent: {
            type: Number,
            min: 0,
            max: 100
        },
        discountAmount: Number
    },
    
    // Financial tracking
    revenue: {
        type: Number,
        default: 0
    },
    
    // Compliance tracking
    isViolation: {
        type: Boolean,
        default: false
    },
    violationType: {
        type: String,
        enum: ['none', 'policy_violation', 'price_violation', 'quantity_violation', 'eligibility_violation'],
        default: 'none'
    },
    violationDetails: String,
    
    // Distribution date/time
    distributionDate: {
        type: Date,
        default: Date.now
    },
    
    // Receipt/Reference
    receiptNumber: String,
    
    // Notes
    notes: String,
    
    // Verification
    verification: {
        beneficiarySignature: Boolean,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verificationDate: Date
    },
    
    // Status
    status: {
        type: String,
        enum: ['completed', 'cancelled', 'returned'],
        default: 'completed'
    },
    
    // For returns
    returnInfo: {
        returnDate: Date,
        returnQuantity: Number,
        returnReason: String,
        returnedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    
    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

// Pre-save hook to calculate revenue and validate
stockOutSchema.pre('save', async function(next) {
    if (this.isNew) {
        // Calculate revenue
        if (this.distribution.mode === 'free') {
            this.revenue = 0;
            this.distribution.price = 0;
        } else if (this.distribution.mode === 'control_price') {
            this.revenue = this.distribution.price * this.quantity;
        } else if (this.distribution.mode === 'discounted') {
            const discountAmount = (this.distribution.originalPrice * this.distribution.discountPercent) / 100;
            this.distribution.discountAmount = discountAmount;
            this.distribution.price = this.distribution.originalPrice - discountAmount;
            this.revenue = this.distribution.price * this.quantity;
        }
        
        // Generate receipt number
        const count = await this.constructor.countDocuments();
        this.receiptNumber = `SO-${Date.now()}-${count + 1}`;
    }
    next();
});

// Indexes
stockOutSchema.index({ stockInId: 1 });
stockOutSchema.index({ beneficiaryId: 1 });
stockOutSchema.index({ locationId: 1 });
stockOutSchema.index({ distributionDate: -1 });
stockOutSchema.index({ isViolation: 1 });
stockOutSchema.index({ 'distribution.mode': 1 });

module.exports = mongoose.model("StockOut", stockOutSchema);
