const mongoose = require("mongoose");

const familyMemberSchema = new mongoose.Schema({
    name: String,
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    relationship: String,
    age: Number,
    education: String,
    occupation: String,
    isDependent: { type: Boolean, default: true }
}, { _id: false });

const beneficiarySchema = new mongoose.Schema({

    // 🔹 1. Basic Information
    basicInfo: {
        headOfFamilyName: {
            type: String,
            required: [true, 'Head of family name is required'],
            trim: true
        },
        cnic: {
            type: String,
            required: [true, 'CNIC is required'],
            unique: true,
            index: true,
            match: [/^\d{5}-\d{7}-\d{1}$/, 'CNIC must be in format: 12345-1234567-1']
        },
        mobile: {
            type: String,
            match: [/^03\d{9}$/, 'Mobile must be in format: 03XXXXXXXXX']
        },
        address: String,
        area: String,
        city: String
    },

    // 🔹 2. Family Composition
    family: {
        members: [familyMemberSchema],
        totalMembers: {
            type: Number,
            min: 1
        },
        schoolGoingChildren: {
            type: Number,
            min: 0
        },
        elderlyCount: {
            type: Number,
            min: 0
        },
        disabledCount: {
            type: Number,
            min: 0
        }
    },

    // 🔹 3. Income & Employment
    income: {
        mainSource: String,
        monthlyIncome: {
            type: Number,
            min: 0
        },
        otherSources: String,
        employmentStatus: {
            type: String,
            enum: [
                "employed",
                "daily_wages",
                "unemployed",
                "widow_led",
                "orphan_family",
                "disabled_breadwinner"
            ]
        }
    },

    // 🔹 4. Housing Condition
    housing: {
        type: {
            type: String,
            enum: ["owned", "rented", "temporary"]
        },
        rooms: {
            type: Number,
            min: 0
        },
        electricity: Boolean,
        gas: Boolean,
        water: Boolean
    },

    // 🔹 5. Current Assistance
    assistance: {
        govtSupport: Boolean,
        zakatSupport: Boolean,
        assistanceType: String
    },

    // 🔹 6. Needs Assessment
    needs: {
        foodRation: Boolean,
        medical: Boolean,
        education: Boolean,
        utilityBills: Boolean,
        vocationalTraining: Boolean,
        emergencyRelief: Boolean
    },

    remarks: String,

    // 🔹 7. Verification
    verification: {
        cnicCopy: Boolean,
        housePhoto: Boolean,
        housePicture: Boolean,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verificationDate: Date,
        gps: {
            latitude: Number,
            longitude: Number,
            mapLink: String
        }
    },

    // 🔹 8. Declaration
    declaration: {
        applicantSignature: String,
        surveyor: {
            name: String,
            designation: String,
            signature: String
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        approvalDate: Date
    },

    // 🔹 System Fields
    status: {
        type: String,
        default: "pending",
        enum: ["pending", "approved", "rejected", "suspended"]
    },

    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location",
        required: [true, 'Location is required']
    },

    documents: {
        cnicFront: String,
        cnicBack: String,
        houseImage: String,
        additionalDocs: [String]
    },

    // 🔹 Distribution History Summary
    distributionHistory: {
        totalReceived: { type: Number, default: 0 },
        totalValue: { type: Number, default: 0 },
        lastDistributionDate: Date,
        lastDistributionItems: [{
            productName: String,
            quantity: Number,
            date: Date
        }]
    },

    // 🔹 Eligibility Tracking
    eligibility: {
        isEligible: { type: Boolean, default: true },
        eligibilityScore: Number,
        lastEligibilityCheck: Date,
        restrictions: [String]
    },

    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }

}, { timestamps: true });

// Calculate family total members
beneficiarySchema.pre('save', function(next) {
    if (this.family && Array.isArray(this.family.members) && this.family.members.length > 0) {
        this.family.totalMembers = this.family.members.length + 1; // +1 for head of family
    }
    next();
});

// Method to check eligibility for a specific stock item
beneficiarySchema.methods.checkEligibility = async function(stockIn) {
    if (this.status !== 'approved') {
        return { eligible: false, reason: 'Beneficiary is not approved' };
    }
    
    if (!this.eligibility.isEligible) {
        return { eligible: false, reason: 'Beneficiary is marked as ineligible' };
    }
    
    const rules = stockIn.eligibilityRules;
    if (!rules) {
        return { eligible: true };
    }
    
    // Check family size
    if (rules.minFamilySize && this.family.totalMembers < rules.minFamilySize) {
        return { eligible: false, reason: `Family size must be at least ${rules.minFamilySize}` };
    }
    if (rules.maxFamilySize && this.family.totalMembers > rules.maxFamilySize) {
        return { eligible: false, reason: `Family size must be at most ${rules.maxFamilySize}` };
    }
    
    // Check income
    if (rules.incomeThreshold && this.income.monthlyIncome > rules.incomeThreshold) {
        return { eligible: false, reason: `Income exceeds threshold of ${rules.incomeThreshold}` };
    }
    
    return { eligible: true };
};

// Indexes
beneficiarySchema.index({ 'basicInfo.headOfFamilyName': 'text', 'basicInfo.cnic': 1 });
beneficiarySchema.index({ status: 1, locationId: 1 });
beneficiarySchema.index({ 'income.monthlyIncome': 1 });

module.exports = mongoose.model("Beneficiary", beneficiarySchema);