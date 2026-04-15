const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map((err) => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

const externalStockOutValidators = {
    create: [
        body('externalStockInId')
            .notEmpty().withMessage('Package is required')
            .isMongoId().withMessage('Invalid package ID'),
        body('beneficiaryId')
            .notEmpty().withMessage('Beneficiary is required')
            .isMongoId().withMessage('Invalid beneficiary ID'),
        body('quantity')
            .notEmpty().withMessage('Quantity is required')
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('notes')
            .optional()
            .isString().withMessage('Notes must be a string'),
        validate
    ],
    update: [
        param('id').isMongoId().withMessage('Invalid external stock out ID'),
        body('externalStockInId')
            .optional()
            .isMongoId().withMessage('Invalid package ID'),
        body('beneficiaryId')
            .optional()
            .isMongoId().withMessage('Invalid beneficiary ID'),
        body('quantity')
            .optional()
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('notes')
            .optional()
            .isString().withMessage('Notes must be a string'),
        validate
    ],
    getById: [
        param('id').isMongoId().withMessage('Invalid external stock out ID'),
        validate
    ]
};

module.exports = { externalStockOutValidators };
