const mongoose = require("mongoose");

const donorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Donor name is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['individual', 'company', 'organization', 'government', 'anonymous'],
        required: [true, 'Donor type is required']
    },
    contact: {
        email: {
            type: String,
            lowercase: true,
            trim: true
        },
        phone: String,
        address: String,
        city: String,
        country: String
    },
    contactPerson: {
        name: String,
        designation: String,
        phone: String,
        email: String
    },
    notes: String,
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    donationType: {
        type: String,
        enum: ['once', 'monthly', 'yearly'],
        default: 'once'
    },
    fundCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FundCategory'
    },
    fundSubcategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FundSubCategory'
    },
    // Track donation preferences
    preferences: {
        preferredDistribution: {
            type: String,
            enum: ['free_only', 'control_price', 'flexible'],
            default: 'flexible'
        },
        preferredCategories: [String],
        notificationPreference: {
            type: String,
            enum: ['email', 'phone', 'both', 'none'],
            default: 'email'
        }
    },
    // Donation statistics (updated via hooks)
    stats: {
        totalDonations: { type: Number, default: 0 },
        totalValue: { type: Number, default: 0 },
        latestDonation: { type: Number, default: 0 },
        lastDonationDate: Date
    },
    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Index for faster searches
donorSchema.index({ name: 'text', 'contact.email': 1 });

module.exports = mongoose.model("Donor", donorSchema);
