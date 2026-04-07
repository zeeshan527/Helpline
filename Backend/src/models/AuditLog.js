const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    // Action type
    action: {
        type: String,
        enum: ['create', 'update', 'delete', 'stock_in', 'stock_out', 'transfer', 'login', 'logout', 'violation'],
        required: true
    },
    
    // Module/Entity affected
    module: {
        type: String,
        enum: ['user', 'beneficiary', 'donor', 'location', 'stockIn', 'stockOut', 'auth'],
        required: true
    },
    
    // Reference to the affected document
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    
    // User who performed the action
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Description of the action
    description: {
        type: String,
        required: true
    },
    
    // Previous state (for updates)
    previousState: {
        type: mongoose.Schema.Types.Mixed
    },
    
    // New state (for creates/updates)
    newState: {
        type: mongoose.Schema.Types.Mixed
    },
    
    // Changes made (for updates)
    changes: [{
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed
    }],
    
    // Location context
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    },
    
    // IP address and user agent
    metadata: {
        ipAddress: String,
        userAgent: String,
        sessionId: String
    },
    
    // Compliance/Violation details
    compliance: {
        isViolation: { type: Boolean, default: false },
        violationType: String,
        details: String,
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        }
    }
}, { timestamps: true });

// Indexes for efficient querying
auditLogSchema.index({ action: 1, module: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ documentId: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ 'compliance.isViolation': 1 });

// Static method to log an action
auditLogSchema.statics.log = async function(data) {
    return await this.create(data);
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = async function(userId, limit = 50) {
    return await this.find({ performedBy: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('performedBy', 'name email');
};

// Static method to get violations
auditLogSchema.statics.getViolations = async function(options = {}) {
    const query = { 'compliance.isViolation': true };
    
    if (options.startDate) {
        query.createdAt = { $gte: options.startDate };
    }
    if (options.endDate) {
        query.createdAt = { ...query.createdAt, $lte: options.endDate };
    }
    if (options.severity) {
        query['compliance.severity'] = options.severity;
    }
    
    return await this.find(query)
        .sort({ createdAt: -1 })
        .populate('performedBy', 'name email')
        .populate('locationId', 'name type');
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
