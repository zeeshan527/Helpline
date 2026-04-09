
const Donor = require("../models/Donor");
const StockIn = require("../models/StockIn");
const AuditLog = require("../models/AuditLog");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

/**
 * Create a new donor
 * @route POST /api/donors
 */
exports.create = asyncHandler(async (req, res) => {
    const donorData = {
        ...req.body,
        createdBy: req.user._id
    };

    const donor = await Donor.create(donorData);

    // Log the action
    await AuditLog.log({
        action: 'create',
        module: 'donor',
        documentId: donor._id,
        performedBy: req.user._id,
        description: `Created donor: ${donor.name}`,
        newState: { name: donor.name, type: donor.type }
    });

    res.status(201).json({
        success: true,
        message: 'Donor created successfully',
        data: donor
    });
});

/**
 * Get all donors with filtering and pagination
 * @route GET /api/donors
 */
exports.get = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        type,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    // Search by name or contact
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { 'contact.email': { $regex: search, $options: 'i' } },
            { 'contact.phone': { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [donors, total] = await Promise.all([
        Donor.find(query)
            .populate('createdBy', 'name')
            .populate('fundCategoryId', 'name')
            .populate('fundSubcategoryId', 'name')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit)),
        Donor.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: donors,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single donor by ID
 * @route GET /api/donors/:id
 */
exports.getById = asyncHandler(async (req, res) => {
    const donor = await Donor.findById(req.params.id)
        .populate('createdBy', 'name email')
        .populate('fundCategoryId', 'name')
        .populate('fundSubcategoryId', 'name');

    if (!donor) {
        throw new AppError('Donor not found', 404);
    }

    res.json({
        success: true,
        data: donor
    });
});

/**
 * Update donor
 * @route PUT /api/donors/:id
 */
exports.update = asyncHandler(async (req, res) => {
    const donor = await Donor.findById(req.params.id);

    if (!donor) {
        throw new AppError('Donor not found', 404);
    }

    const previousState = {
        name: donor.name,
        type: donor.type,
        status: donor.status
    };

    // Update fields
    Object.assign(donor, req.body);
    await donor.save();

    // Log the action
    await AuditLog.log({
        action: 'update',
        module: 'donor',
        documentId: donor._id,
        performedBy: req.user._id,
        description: `Updated donor: ${donor.name}`,
        previousState,
        newState: {
            name: donor.name,
            type: donor.type,
            status: donor.status
        }
    });

    res.json({
        success: true,
        message: 'Donor updated successfully',
        data: donor
    });
});

/**
 * Delete donor
 * @route DELETE /api/donors/:id
 */
exports.delete = asyncHandler(async (req, res) => {
    const donor = await Donor.findById(req.params.id);

    if (!donor) {
        throw new AppError('Donor not found', 404);
    }

    // Check if donor has any stock in records
    const stockCount = await StockIn.countDocuments({
        'source.type': 'donor',
        'source.referenceId': req.params.id
    });

    if (stockCount > 0) {
        throw new AppError(
            `Cannot delete donor with ${stockCount} donation records. Consider marking as inactive instead.`,
            400
        );
    }

    await Donor.findByIdAndDelete(req.params.id);

    // Log the action
    await AuditLog.log({
        action: 'delete',
        module: 'donor',
        documentId: donor._id,
        performedBy: req.user._id,
        description: `Deleted donor: ${donor.name}`,
        previousState: { name: donor.name, type: donor.type }
    });

    res.json({
        success: true,
        message: 'Donor deleted successfully'
    });
});

/**
 * Get donor donation history
 * @route GET /api/donors/:id/donations
 */
exports.getDonationHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [donations, total] = await Promise.all([
        StockIn.find({
            'source.type': 'donor',
            'source.referenceId': req.params.id
        })
            .populate('locationId', 'name type')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        StockIn.countDocuments({
            'source.type': 'donor',
            'source.referenceId': req.params.id
        })
    ]);

    res.json({
        success: true,
        data: donations,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get donor statistics
 * @route GET /api/donors/stats
 */
exports.getStats = asyncHandler(async (req, res) => {
    const [donorStats] = await Donor.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
                byType: {
                    $push: '$type'
                }
            }
        },
        {
            $project: {
                total: 1,
                active: 1,
                inactive: 1,
                typeBreakdown: {
                    individual: {
                        $size: {
                            $filter: {
                                input: '$byType',
                                cond: { $eq: ['$$this', 'individual'] }
                            }
                        }
                    },
                    company: {
                        $size: {
                            $filter: {
                                input: '$byType',
                                cond: { $eq: ['$$this', 'company'] }
                            }
                        }
                    },
                    organization: {
                        $size: {
                            $filter: {
                                input: '$byType',
                                cond: { $eq: ['$$this', 'organization'] }
                            }
                        }
                    },
                    government: {
                        $size: {
                            $filter: {
                                input: '$byType',
                                cond: { $eq: ['$$this', 'government'] }
                            }
                        }
                    },
                    anonymous: {
                        $size: {
                            $filter: {
                                input: '$byType',
                                cond: { $eq: ['$$this', 'anonymous'] }
                            }
                        }
                    }
                }
            }
        }
    ]);

    // Get total donation value
    const [donationStats] = await StockIn.aggregate([
        { $match: { 'source.type': 'donor' } },
        {
            $group: {
                _id: null,
                totalDonations: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$pricing.costPrice', 0] }] } }
            }
        }
    ]);

    res.json({
        success: true,
        data: {
            donors: donorStats || { total: 0, active: 0, inactive: 0, typeBreakdown: {} },
            donations: donationStats || { totalDonations: 0, totalQuantity: 0, totalValue: 0 }
        }
    });
});
