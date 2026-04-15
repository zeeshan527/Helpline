const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
        type: String,
        enum: ['admin', 'staff', 'master_inventory_manager', 'location_inventory_manager'],
        default: 'staff'
    },
    assignedLocations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    }],
    permissions: {
        beneficiaries: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        donors: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        locations: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        stockIn: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        stockOut: {
            create: { type: Boolean, default: true },
            read: { type: Boolean, default: true },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        externalStockIn: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: false },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        externalStockOut: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: false },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        reports: {
            view: { type: Boolean, default: false },
            export: { type: Boolean, default: false }
        },
        users: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: false },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        },
        fundCategories: {
            create: { type: Boolean, default: false },
            read: { type: Boolean, default: false },
            update: { type: Boolean, default: false },
            delete: { type: Boolean, default: false }
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    lastLogin: Date,
    phone: String,
    avatar: String
}, { timestamps: true });

// Set default permissions based on role
userSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('role')) {
        if (this.role === 'admin') {
            // Admin gets all permissions
            const modules = ['beneficiaries', 'donors', 'locations', 'stockIn', 'stockOut', 'externalStockIn', 'externalStockOut', 'users', 'fundCategories'];
            modules.forEach(module => {
                this.permissions[module] = {
                    create: true,
                    read: true,
                    update: true,
                    delete: true
                };
            });
            this.permissions.reports = { view: true, export: true, compliance: true };
        } else if (this.role === 'master_inventory_manager') {
            // Full inventory access
            this.permissions.stockIn = { create: true, read: true, update: true, delete: true, transfer: true };
            this.permissions.stockOut = { create: true, read: true, update: true, delete: true };
            this.permissions.externalStockIn = { create: true, read: true, update: true, delete: true };
            this.permissions.externalStockOut = { create: true, read: true, update: true, delete: true };
            this.permissions.locations = { create: true, read: true, update: true, delete: true};
            this.permissions.reports = { view: true, export: true };
        } else if (this.role === 'location_inventory_manager') {
            // Only assigned location
            this.permissions.stockIn = { create: true, read: true, update: true, delete: false };
            this.permissions.stockOut = { create: true, read: true, update: true, delete: false };
            this.permissions.externalStockIn = { create: true, read: true, update: true, delete: true };
            this.permissions.externalStockOut = { create: true, read: true, update: true, delete: true };
            this.permissions.locations = { create: true, read: true, update: true, delete: true };
            this.permissions.reports = { view: true };
        } else if (this.role === 'staff') {
            // Staff default permissions
            this.permissions.beneficiaries = { create: true, read: true, update: true, delete: true };
            this.permissions.donors = {create: true, read: true, update: true, delete: true };
            this.permissions.locations = { read: true };
            this.permissions.stockIn = { create: true, read: true };
            this.permissions.stockOut = { create: true, read: true };
            this.permissions.externalStockIn = { create: true, read: true, update: true, delete: true };
            this.permissions.externalStockOut = { create: true, read: true, update: true, delete: true };
            this.permissions.fundCategories = { create: true, read: true, update: true, delete: true };
            this.permissions.reports = { view: true };
        }
    }
    next();
});

// Don't return password in JSON
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model("User", userSchema);
