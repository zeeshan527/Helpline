const mongoose = require("mongoose");

const externalStockInSchema = new mongoose.Schema({
    packageName: {
        type: String,
        required: [true, 'Package name is required'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    remainingQuantity: {
        type: Number,
        min: 0,
        default: undefined
    },
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
        required: [true, 'Donor is required']
    },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: [true, 'Location is required']
    },
    notes: String,
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

externalStockInSchema.index({ packageName: 'text' });
externalStockInSchema.index({ locationId: 1, donorId: 1, createdAt: -1 });

externalStockInSchema.pre('save', function(next) {
    if (this.isNew && (this.remainingQuantity === undefined || this.remainingQuantity === null || this.remainingQuantity === 0)) {
        this.remainingQuantity = this.quantity;
    }

    if (this.remainingQuantity < 0) {
        this.remainingQuantity = 0;
    }

    if (this.remainingQuantity > this.quantity) {
        this.remainingQuantity = this.quantity;
    }

    next();
});

module.exports = mongoose.model("ExternalStockIn", externalStockInSchema);
