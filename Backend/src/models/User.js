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
        enum: ['admin', 'staff'],
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
        reports: {
            view: { type: Boolean, default: false },
            export: { type: Boolean, default: false }
        },
        users: {
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
            const modules = ['beneficiaries', 'donors', 'locations', 'stockIn', 'stockOut', 'users'];
            modules.forEach(module => {
                this.permissions[module] = {
                    create: true,
                    read: true,
                    update: true,
                    delete: true
                };
            });
            this.permissions.reports = { view: true, export: true };
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
