
const StockIn = require("../models/StockIn");
const { DISTRIBUTION_MODES, DISTRIBUTION_POLICY_TYPES, VIOLATION_TYPES } = require("../constants/enums");

/**
 * Distribution Policy Validation Middleware
 * Validates stock out against stock in distribution policy
 */
const validateDistributionPolicy = async (req, res, next) => {
    try {
        const { stockInId, distribution, quantity } = req.body;
        
        // Find the stock in record
        const stockIn = await StockIn.findById(stockInId);
        
        if (!stockIn) {
            return res.status(404).json({
                success: false,
                message: 'Stock not found'
            });
        }

        // Check if stock is active
        if (stockIn.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: `Stock is ${stockIn.status} and cannot be distributed`
            });
        }

        // Check available quantity
        if (stockIn.remainingQuantity < quantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Available: ${stockIn.remainingQuantity}, Requested: ${quantity}`
            });
        }

        const policy = stockIn.distributionPolicy || {};
        const mode = distribution?.mode;

        // Initialize violation tracking
        let isViolation = false;
        let violationType = VIOLATION_TYPES.NONE;
        let violationDetails = null;

        // Validate distribution mode against allowed modes
        if (policy.allowedModes && policy.allowedModes.length > 0) {
            if (!policy.allowedModes.includes(mode)) {
                isViolation = true;
                violationType = VIOLATION_TYPES.POLICY_VIOLATION;
                violationDetails = `Distribution mode '${mode}' is not allowed. Allowed modes: ${policy.allowedModes.join(', ')}`;
            }
        }

        // Validate based on policy type
        switch (policy.type) {
            case DISTRIBUTION_POLICY_TYPES.FREE_ONLY:
                if (mode !== DISTRIBUTION_MODES.FREE) {
                    isViolation = true;
                    violationType = VIOLATION_TYPES.POLICY_VIOLATION;
                    violationDetails = `This stock can only be distributed for FREE. Donor specified 'free_only' policy.`;
                }
                if (distribution?.price > 0) {
                    isViolation = true;
                    violationType = VIOLATION_TYPES.PRICE_VIOLATION;
                    violationDetails = `Cannot charge for items with 'free_only' policy.`;
                }
                break;

            case DISTRIBUTION_POLICY_TYPES.CONTROL_PRICE:
                if (mode === DISTRIBUTION_MODES.CONTROL_PRICE) {
                    // Must use the exact control price
                    if (distribution?.price !== policy.controlPrice) {
                        isViolation = true;
                        violationType = VIOLATION_TYPES.PRICE_VIOLATION;
                        violationDetails = `Price must be exactly ${policy.controlPrice} for control price policy.`;
                    }
                }
                if (mode === DISTRIBUTION_MODES.FREE) {
                    isViolation = true;
                    violationType = VIOLATION_TYPES.POLICY_VIOLATION;
                    violationDetails = `Cannot distribute for free. Control price policy requires selling at ${policy.controlPrice}.`;
                }
                break;

            case DISTRIBUTION_POLICY_TYPES.FLEXIBLE:
                // Flexible policy allows all modes
                // But still validate discount limits
                if (mode === DISTRIBUTION_MODES.DISCOUNTED) {
                    const maxDiscount = policy.maxDiscountPercent || 100;
                    if (distribution?.discountPercent > maxDiscount) {
                        isViolation = true;
                        violationType = VIOLATION_TYPES.PRICE_VIOLATION;
                        violationDetails = `Discount cannot exceed ${maxDiscount}%.`;
                    }
                }
                break;
        }

        // Check eligibility rules for quantity
        const eligibilityRules = stockIn.eligibilityRules || {};
        if (eligibilityRules.maxQuantityPerBeneficiary) {
            if (quantity > eligibilityRules.maxQuantityPerBeneficiary) {
                isViolation = true;
                violationType = VIOLATION_TYPES.QUANTITY_VIOLATION;
                violationDetails = `Quantity exceeds maximum allowed per beneficiary (${eligibilityRules.maxQuantityPerBeneficiary})`;
            }
        }

        // Attach stock and violation info to request
        req.stockIn = stockIn;
        req.isViolation = isViolation;
        req.violationType = violationType;
        req.violationDetails = violationDetails;

        // If violation, log it but allow if admin overrides
        if (isViolation) {
            // Check if admin is forcing the transaction
            if (req.body.adminOverride && req.user.role === 'admin') {
                req.violationDetails = `[ADMIN OVERRIDE] ${violationDetails}`;
                console.warn(`Policy violation overridden by admin ${req.user._id}: ${violationDetails}`);
            } else if (!req.body.adminOverride) {
                // Return error for non-admin or when not overriding
                return res.status(400).json({
                    success: false,
                    message: 'Distribution policy violation',
                    violation: {
                        type: violationType,
                        details: violationDetails,
                        policy: {
                            type: policy.type,
                            allowedModes: policy.allowedModes,
                            controlPrice: policy.controlPrice
                        }
                    },
                    hint: req.user.role === 'admin' ? 
                        'Add adminOverride: true to force this transaction' : 
                        'Contact admin to override this policy'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Policy validation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error validating distribution policy',
            error: error.message
        });
    }
};

module.exports = validateDistributionPolicy;
