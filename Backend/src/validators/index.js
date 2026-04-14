const { body, param, query, validationResult } = require('express-validator');
const { 
    DISTRIBUTION_POLICY_TYPES, 
    DISTRIBUTION_MODES, 
    SOURCE_TYPES,
    PRODUCT_UNITS 
} = require('../constants/enums');

// Common validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// Auth Validators
const authValidators = {
    register: [
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email format')
            .normalizeEmail(),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('role')
            .optional()
            .isIn(['admin', 'staff', 'master_inventory_manager', 'location_inventory_manager'])
            .withMessage('Role must be admin, staff, master_inventory_manager, or location_inventory_manager'),
        validate
    ],
    login: [
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email format'),
        body('password')
            .notEmpty().withMessage('Password is required'),
        validate
    ]
};

// Beneficiary Validators
const beneficiaryValidators = {
    create: [
        body('basicInfo.headOfFamilyName')
            .trim()
            .notEmpty().withMessage('Head of family name is required'),
        body('basicInfo.cnic')
            .trim()
            .notEmpty().withMessage('CNIC is required')
            .matches(/^\d{5}-\d{7}-\d{1}$/).withMessage('CNIC must be in format: 12345-1234567-1'),
        body('basicInfo.mobile')
            .optional()
            .matches(/^03\d{9}$/).withMessage('Mobile must be in format: 03XXXXXXXXX'),
        body('locationId')
            .notEmpty().withMessage('Location is required')
            .isMongoId().withMessage('Invalid location ID'),
        body('family.totalMembers')
            .optional()
            .isInt({ min: 1 }).withMessage('Total members must be at least 1'),
        body('income.monthlyIncome')
            .optional()
            .isFloat({ min: 0 }).withMessage('Monthly income must be a positive number'),
        validate
    ],
    update: [
        param('id').isMongoId().withMessage('Invalid beneficiary ID'),
        body('basicInfo.cnic')
            .optional()
            .matches(/^\d{5}-\d{7}-\d{1}$/).withMessage('CNIC must be in format: 12345-1234567-1'),
        body('basicInfo.mobile')
            .optional()
            .matches(/^03\d{9}$/).withMessage('Mobile must be in format: 03XXXXXXXXX'),
        body('locationId')
            .optional()
            .isMongoId().withMessage('Invalid location ID'),
        validate
    ],
    getById: [
        param('id').isMongoId().withMessage('Invalid beneficiary ID'),
        validate
    ]
};

// Donor Validators
const donorValidators = {
    create: [
        body('name')
            .trim()
            .notEmpty().withMessage('Donor name is required'),
        body('type')
            .notEmpty().withMessage('Donor type is required')
            .isIn(['individual', 'company', 'organization', 'government', 'anonymous'])
            .withMessage('Invalid donor type'),
        body('contact.email')
            .optional()
            .isEmail().withMessage('Invalid email format'),
        body('contact.phone')
            .optional()
            .notEmpty().withMessage('Phone cannot be empty if provided'),
        body('donationType')
            .optional()
            .isIn(['once', 'monthly', 'yearly']).withMessage('Invalid donation type'),
        body('fundCategoryId')
            .optional()
            .isMongoId().withMessage('Invalid fund category ID'),
        body('fundSubcategoryId')
            .optional()
            .isMongoId().withMessage('Invalid fund subcategory ID'),
        body('stats.totalDonations')
            .optional()
            .isInt({ min: 0 }).withMessage('Total donations must be a valid number'),
        body('stats.latestDonation')
            .optional()
            .isInt({ min: 0 }).withMessage('Latest donation must be a valid number'),
        validate
    ],
    update: [
        param('id').isMongoId().withMessage('Invalid donor ID'),
        body('type')
            .optional()
            .isIn(['individual', 'company', 'organization', 'government', 'anonymous'])
            .withMessage('Invalid donor type'),
        body('contact.email')
            .optional()
            .isEmail().withMessage('Invalid email format'),
        body('donationType')
            .optional()
            .isIn(['once', 'monthly', 'yearly']).withMessage('Invalid donation type'),
        body('fundCategoryId')
            .optional()
            .isMongoId().withMessage('Invalid fund category ID'),
        body('fundSubcategoryId')
            .optional()
            .isMongoId().withMessage('Invalid fund subcategory ID'),
        body('stats.totalDonations')
            .optional()
            .isInt({ min: 0 }).withMessage('Total donations must be a valid number'),
        body('stats.latestDonation')
            .optional()
            .isInt({ min: 0 }).withMessage('Latest donation must be a valid number'),
        validate
    ],
    getById: [
        param('id').isMongoId().withMessage('Invalid donor ID'),
        validate
    ]
};

// Location Validators
const locationValidators = {
    create: [
        body('name')
            .trim()
            .notEmpty().withMessage('Location name is required'),
        body('type')
            .notEmpty().withMessage('Location type is required')
            .isIn(['shop', 'warehouse', 'office', 'depot', 'distribution_center'])
            .withMessage('Invalid location type'),
        body('parentLocationId')
            .optional()
            .isMongoId().withMessage('Invalid parent location ID'),
        body('lowStockThreshold')
            .optional()
            .isInt({ min: 0 }).withMessage('Low stock threshold must be a positive number'),
        validate
    ],
    update: [
        param('id').isMongoId().withMessage('Invalid location ID'),
        body('type')
            .optional()
            .isIn(['shop', 'warehouse', 'office', 'depot', 'distribution_center'])
            .withMessage('Invalid location type'),
        body('parentLocationId')
            .optional()
            .isMongoId().withMessage('Invalid parent location ID'),
        validate
    ],
    getById: [
        param('id').isMongoId().withMessage('Invalid location ID'),
        validate
    ]
};

// Stock In Validators
const stockInValidators = {
    create: [
        body('recordType')
            .optional()
            .isIn(['stock', 'package']).withMessage('Invalid record type'),
        body('package.name')
            .if(body('recordType').equals('package'))
            .trim()
            .notEmpty().withMessage('Package name is required'),
        body('package.items')
            .if(body('recordType').equals('package'))
            .isArray({ min: 1 }).withMessage('At least one product is required in a package'),
        body('package.items.*.stockInId')
            .if(body('recordType').equals('package'))
            .isMongoId().withMessage('Invalid stock item ID in package'),
        body('package.items.*.quantity')
            .if(body('recordType').equals('package'))
            .isInt({ min: 1 }).withMessage('Package item quantity must be at least 1'),
        body('product.name')
            .if(body('recordType').not().equals('package'))
            .trim()
            .notEmpty().withMessage('Product name is required'),
        body('product.category')
            .if(body('recordType').not().equals('package'))
            .trim()
            .notEmpty().withMessage('Product category is required'),
        body('product.unit')
            .if(body('recordType').not().equals('package'))
            .notEmpty().withMessage('Product unit is required')
            .isIn(Object.values(PRODUCT_UNITS)).withMessage('Invalid product unit'),
        body('quantity')
            .if(body('recordType').not().equals('package'))
            .notEmpty().withMessage('Quantity is required')
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('source.type')
            .if(body('recordType').not().equals('package'))
            .notEmpty().withMessage('Source type is required')
            .isIn(Object.values(SOURCE_TYPES)).withMessage('Invalid source type'),
        body('source.referenceId')
            .optional()
            .isMongoId().withMessage('Invalid source reference ID'),
        body('locationId')
            .notEmpty().withMessage('Location is required')
            .isMongoId().withMessage('Invalid location ID'),
        body('distributionPolicy.type')
            .notEmpty().withMessage('Distribution policy type is required')
            .isIn(Object.values(DISTRIBUTION_POLICY_TYPES)).withMessage('Invalid distribution policy type'),
        body('distributionPolicy.controlPrice')
            .optional()
            .isFloat({ min: 0 }).withMessage('Control price must be a positive number'),
        body('distributionPolicy.maxDiscountPercent')
            .optional()
            .isFloat({ min: 0, max: 100 }).withMessage('Max discount percent must be between 0 and 100'),
        validate
    ],
    update: [
        param('id').isMongoId().withMessage('Invalid stock in ID'),
        body('quantity')
            .optional()
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('locationId')
            .optional()
            .isMongoId().withMessage('Invalid location ID'),
        validate
    ],
    getById: [
        param('id').isMongoId().withMessage('Invalid stock in ID'),
        validate
    ],
    transfer: [
        body('stockInId')
            .notEmpty().withMessage('Stock In ID is required')
            .isMongoId().withMessage('Invalid stock in ID'),
        body('fromLocationId')
            .notEmpty().withMessage('From location is required')
            .isMongoId().withMessage('Invalid from location ID'),
        body('toLocationId')
            .notEmpty().withMessage('To location is required')
            .isMongoId().withMessage('Invalid to location ID'),
        body('quantity')
            .notEmpty().withMessage('Quantity is required')
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        validate
    ]
};

// Stock Out Validators
const stockOutValidators = {
    create: [
        body('stockInId')
            .notEmpty().withMessage('Stock In ID is required')
            .isMongoId().withMessage('Invalid stock in ID'),
        body('beneficiaryId')
            .notEmpty().withMessage('Beneficiary ID is required')
            .isMongoId().withMessage('Invalid beneficiary ID'),
        body('locationId')
            .notEmpty().withMessage('Location is required')
            .isMongoId().withMessage('Invalid location ID'),
        body('quantity')
            .notEmpty().withMessage('Quantity is required')
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('distribution.mode')
            .notEmpty().withMessage('Distribution mode is required')
            .isIn(Object.values(DISTRIBUTION_MODES)).withMessage('Invalid distribution mode'),
        body('distribution.price')
            .optional()
            .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
        body('distribution.discountPercent')
            .optional()
            .isFloat({ min: 0, max: 100 }).withMessage('Discount percent must be between 0 and 100'),
        validate
    ],
    getById: [
        param('id').isMongoId().withMessage('Invalid stock out ID'),
        validate
    ]
};

// Report Validators
const reportValidators = {
    beneficiary: [
        param('id').isMongoId().withMessage('Invalid beneficiary ID'),
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date'),
        validate
    ],
    donor: [
        param('id').isMongoId().withMessage('Invalid donor ID'),
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date'),
        validate
    ],
    location: [
        param('id').isMongoId().withMessage('Invalid location ID'),
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date'),
        validate
    ],
    dateRange: [
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date'),
        validate
    ]
};

// Common Query Validators
const queryValidators = {
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('sortBy')
            .optional()
            .isString().withMessage('Sort by must be a string'),
        query('sortOrder')
            .optional()
            .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
        validate
    ]
};

// User Validators
const userValidators = {
    create: [
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email format'),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('role')
            .notEmpty().withMessage('Role is required')
            .isIn(['admin', 'staff', 'master_inventory_manager', 'location_inventory_manager'])
            .withMessage('Role must be admin, staff, master_inventory_manager, or location_inventory_manager'),
        body('assignedLocations')
            .optional()
            .isArray().withMessage('Assigned locations must be an array'),
        body('assignedLocations.*')
            .optional()
            .isMongoId().withMessage('Invalid location ID in assigned locations'),
        validate
    ],
    update: [
        param('id').isMongoId().withMessage('Invalid user ID'),
        body('email')
            .optional()
            .isEmail().withMessage('Invalid email format'),
        body('role')
            .optional()
            .isIn(['admin', 'staff', 'master_inventory_manager', 'location_inventory_manager'])
            .withMessage('Role must be admin, staff, master_inventory_manager, or location_inventory_manager'),
        body('status')
            .optional()
            .isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
        body('assignedLocations')
            .optional()
            .isArray().withMessage('Assigned locations must be an array'),
        validate
    ],
    getById: [
        param('id').isMongoId().withMessage('Invalid user ID'),
        validate
    ]
};

// Fund Category Validators
const fundCategoryValidators = {
    createCategory: [
        body('name')
            .trim()
            .notEmpty().withMessage('Category name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Category name must be 2-100 characters'),
        body('code')
            .optional()
            .trim()
            .isLength({ min: 2, max: 30 }).withMessage('Code must be 2-30 characters'),
        body('status')
            .optional()
            .isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
        validate
    ],
    updateCategory: [
        param('id').isMongoId().withMessage('Invalid category ID'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 }).withMessage('Category name must be 2-100 characters'),
        body('code')
            .optional()
            .trim()
            .isLength({ min: 2, max: 30 }).withMessage('Code must be 2-30 characters'),
        body('status')
            .optional()
            .isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
        validate
    ],
    getCategoryById: [
        param('id').isMongoId().withMessage('Invalid category ID'),
        validate
    ],
    getSubcategories: [
        param('categoryId').isMongoId().withMessage('Invalid category ID'),
        validate
    ],
    createSubcategory: [
        param('categoryId').isMongoId().withMessage('Invalid category ID'),
        body('name')
            .trim()
            .notEmpty().withMessage('Subcategory name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Subcategory name must be 2-100 characters'),
        body('code')
            .optional()
            .trim()
            .isLength({ min: 2, max: 30 }).withMessage('Code must be 2-30 characters'),
        body('status')
            .optional()
            .isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
        validate
    ],
    updateSubcategory: [
        param('id').isMongoId().withMessage('Invalid subcategory ID'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 }).withMessage('Subcategory name must be 2-100 characters'),
        body('code')
            .optional()
            .trim()
            .isLength({ min: 2, max: 30 }).withMessage('Code must be 2-30 characters'),
        body('status')
            .optional()
            .isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
        validate
    ]
};

module.exports = {
    validate,
    authValidators,
    beneficiaryValidators,
    donorValidators,
    locationValidators,
    stockInValidators,
    stockOutValidators,
    reportValidators,
    queryValidators,
    userValidators,
    fundCategoryValidators
};
