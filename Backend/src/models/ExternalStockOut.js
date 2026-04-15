const mongoose = require("mongoose");

const externalStockOutSchema = new mongoose.Schema({
    externalStockInId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExternalStockIn',
        required: [true, 'External stock in reference is required']
    },
    packageName: {
        type: String,
        required: [true, 'Package name is required'],
        trim: true
    },
    beneficiaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Beneficiary',
        required: [true, 'Beneficiary is required']
    },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: [true, 'Location is required']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    notes: String,
    status: {
        type: String,
        enum: ['completed', 'cancelled'],
        default: 'completed'
    },
    distributionDate: {
        type: Date,
        default: Date.now
    },
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

externalStockOutSchema.index({ externalStockInId: 1 });
externalStockOutSchema.index({ beneficiaryId: 1 });
externalStockOutSchema.index({ locationId: 1 });
externalStockOutSchema.index({ distributionDate: -1 });

module.exports = mongoose.model("ExternalStockOut", externalStockOutSchema);
