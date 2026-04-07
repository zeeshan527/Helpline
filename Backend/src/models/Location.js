const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Location name is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['shop', 'warehouse', 'office', 'depot', 'distribution_center'],
        required: [true, 'Location type is required']
    },
    code: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true
    },
    parentLocationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        default: null
    },
    address: {
        street: String,
        city: String,
        state: String,
        country: { type: String, default: 'Pakistan' },
        postalCode: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    contact: {
        phone: String,
        email: String
    },
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    operatingHours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
    },
    capacity: {
        maxItems: Number,
        currentUtilization: { type: Number, default: 0 }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active'
    },
    // Low stock threshold for alerts
    lowStockThreshold: {
        type: Number,
        default: 10
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

// Get child locations
locationSchema.methods.getChildren = async function() {
    return await this.constructor.find({ parentLocationId: this._id });
};

// Get full path (breadcrumb)
locationSchema.methods.getPath = async function() {
    const path = [this];
    let current = this;
    
    while (current.parentLocationId) {
        current = await this.constructor.findById(current.parentLocationId);
        if (current) path.unshift(current);
    }
    
    return path;
};

// Index for faster queries
locationSchema.index({ parentLocationId: 1 });
locationSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model("Location", locationSchema);
