
const Beneficiary = require("../models/Beneficiary");
const StockOut = require("../models/StockOut");
const AuditLog = require("../models/AuditLog");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const mongoose = require("mongoose");

/**
 * Create a new beneficiary
 * @route POST /api/beneficiaries
 */
exports.create = asyncHandler(async (req, res) => {
    console.log('Creating beneficiary with data:', req.body);   
    // Validate and sanitize input data
    const beneficiaryData = {
        ...req.body,
        createdBy: req.user._id
    };

 
    // Validate family counts
    if (beneficiaryData.family) {
        beneficiaryData.family.totalMembers = parseInt(beneficiaryData.family.totalMembers) || 1;
        beneficiaryData.family.schoolGoingChildren = parseInt(beneficiaryData.family.schoolGoingChildren) || 0;
        beneficiaryData.family.elderlyCount = parseInt(beneficiaryData.family.elderlyCount) || 0;
        beneficiaryData.family.disabledCount = parseInt(beneficiaryData.family.disabledCount) || 0;
        // Validate that family counts make sense
        const { totalMembers, schoolGoingChildren, elderlyCount, disabledCount } = beneficiaryData.family;

        if (schoolGoingChildren + elderlyCount + disabledCount > totalMembers) {
            throw new AppError('Sum of school children, elderly, and disabled cannot exceed total family members', 400);
        }
    }

    // Validate income
    if (beneficiaryData.income && beneficiaryData.income.monthlyIncome) {
        beneficiaryData.income.monthlyIncome = parseFloat(beneficiaryData.income.monthlyIncome);
        if (beneficiaryData.income.monthlyIncome < 0) {
            throw new AppError('Monthly income cannot be negative', 400);
        }
    }

    // Check for duplicate CNIC
    if (req.body.basicInfo?.cnic) {
        const existing = await Beneficiary.findOne({
            'basicInfo.cnic': req.body.basicInfo.cnic
        });
        if (existing) {
            throw new AppError('A beneficiary with this CNIC already exists', 400);
        }
    }

    const beneficiary = await Beneficiary.create(beneficiaryData);

    // Populate references
    await beneficiary.populate([
        { path: 'locationId', select: 'name type' },
        { path: 'createdBy', select: 'name email' }
    ]);

    // Log the action
    await AuditLog.log({
        action: 'create',
        module: 'beneficiary',
        documentId: beneficiary._id,
        performedBy: req.user._id,
        description: `Created beneficiary: ${beneficiary.basicInfo.headOfFamilyName}`,
        newState: {
            cnic: beneficiary.basicInfo.cnic,
            name: beneficiary.basicInfo.headOfFamilyName,
            status: beneficiary.status
        },
        locationId: beneficiary.locationId
    });

    res.status(201).json({
        success: true,
        message: 'Beneficiary created successfully',
        data: beneficiary
    });
});

/**
 * Get all beneficiaries with filtering and pagination
 * @route GET /api/beneficiaries
 */
exports.get = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        status,
        locationId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        minIncome,
        maxIncome
    } = req.query;

    // Build query
    const query = {};

    // Apply location filter for staff
    if (req.locationFilter) {
        Object.assign(query, req.locationFilter);
    }

    if (status) query.status = status;
    if (locationId) query.locationId = locationId;
    if (minIncome) query['income.monthlyIncome'] = { $gte: parseFloat(minIncome) };
    if (maxIncome) {
        query['income.monthlyIncome'] = {
            ...query['income.monthlyIncome'],
            $lte: parseFloat(maxIncome)
        };
    }

    // Search by name or CNIC
    if (search) {
        query.$or = [
            { 'basicInfo.headOfFamilyName': { $regex: search, $options: 'i' } },
            { 'basicInfo.cnic': { $regex: search, $options: 'i' } },
            { 'basicInfo.mobile': { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [beneficiaries, total] = await Promise.all([
        Beneficiary.find(query)
            .populate('locationId', 'name type')
            .populate('createdBy', 'name')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit)),
        Beneficiary.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: beneficiaries,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single beneficiary by ID
 * @route GET /api/beneficiaries/:id
 */
exports.getById = asyncHandler(async (req, res) => {
    const beneficiary = await Beneficiary.findById(req.params.id)
        .populate('locationId', 'name type address')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email')
        .populate('declaration.approvedBy', 'name email')
        .populate('verification.verifiedBy', 'name email');

    if (!beneficiary) {
        throw new AppError('Beneficiary not found', 404);
    }

    // Check location access for staff
    if (req.user.role !== 'admin') {
        const hasAccess = req.user.assignedLocations.some(
            loc => loc.toString() === beneficiary.locationId?._id.toString()
        );
        if (!hasAccess) {
            throw new AppError('Not authorized to view this beneficiary', 403);
        }
    }

    res.json({
        success: true,
        data: beneficiary
    });
});

/**
 * Update beneficiary
 * @route PUT /api/beneficiaries/:id
 */
exports.update = asyncHandler(async (req, res) => {
    const beneficiary = await Beneficiary.findById(req.params.id);

    if (!beneficiary) {
        throw new AppError('Beneficiary not found', 404);
    }

    // Check location access for staff
    if (req.user.role !== 'admin') {
        const hasAccess = req.user.assignedLocations.some(
            loc => loc.toString() === beneficiary.locationId?.toString()
        );
        if (!hasAccess) {
            throw new AppError('Not authorized to update this beneficiary', 403);
        }
    }

    // Check for duplicate CNIC if updating
    if (req.body.basicInfo?.cnic && req.body.basicInfo.cnic !== beneficiary.basicInfo.cnic) {
        const existing = await Beneficiary.findOne({
            'basicInfo.cnic': req.body.basicInfo.cnic,
            _id: { $ne: req.params.id }
        });
        if (existing) {
            throw new AppError('A beneficiary with this CNIC already exists', 400);
        }
    }

    // Validate and sanitize input data
    const updateData = { ...req.body };

    // Validate family counts
    if (updateData.family) {
        updateData.family.totalMembers = parseInt(updateData.family.totalMembers) || 1;
        updateData.family.schoolGoingChildren = parseInt(updateData.family.schoolGoingChildren) || 0;
        updateData.family.elderlyCount = parseInt(updateData.family.elderlyCount) || 0;
        updateData.family.disabledCount = parseInt(updateData.family.disabledCount) || 0;

        // Validate that family counts make sense
        const { totalMembers, schoolGoingChildren, elderlyCount, disabledCount } = updateData.family;
        if (schoolGoingChildren + elderlyCount + disabledCount > totalMembers) {
            throw new AppError('Sum of school children, elderly, and disabled cannot exceed total family members', 400);
        }
    }

    // Validate income
    if (updateData.income && updateData.income.monthlyIncome !== undefined) {
        updateData.income.monthlyIncome = parseFloat(updateData.income.monthlyIncome);
        if (updateData.income.monthlyIncome < 0) {
            throw new AppError('Monthly income cannot be negative', 400);
        }
    }

    const previousState = {
        status: beneficiary.status,
        name: beneficiary.basicInfo.headOfFamilyName
    };

    // Update fields
    Object.assign(beneficiary, updateData);
    beneficiary.lastModifiedBy = req.user._id;

    await beneficiary.save();

    // Populate for response
    await beneficiary.populate([
        { path: 'locationId', select: 'name type' },
        { path: 'createdBy', select: 'name email' },
        { path: 'lastModifiedBy', select: 'name email' }
    ]);

    // Log the action
    await AuditLog.log({
        action: 'update',
        module: 'beneficiary',
        documentId: beneficiary._id,
        performedBy: req.user._id,
        description: `Updated beneficiary: ${beneficiary.basicInfo.headOfFamilyName}`,
        previousState,
        newState: {
            status: beneficiary.status,
            name: beneficiary.basicInfo.headOfFamilyName
        },
        locationId: beneficiary.locationId
    });

    res.json({
        success: true,
        message: 'Beneficiary updated successfully',
        data: beneficiary
    });
});

/**
 * Delete beneficiary
 * @route DELETE /api/beneficiaries/:id
 */
exports.delete = asyncHandler(async (req, res) => {
    const beneficiary = await Beneficiary.findById(req.params.id);

    if (!beneficiary) {
        throw new AppError('Beneficiary not found', 404);
    }

    // Check if beneficiary has received any distributions
    const distributionCount = await StockOut.countDocuments({
        beneficiaryId: req.params.id
    });

    if (distributionCount > 0) {
        throw new AppError(
            `Cannot delete beneficiary with ${distributionCount} distribution records. Consider marking as inactive instead.`,
            400
        );
    }

    await Beneficiary.findByIdAndDelete(req.params.id);

    // Log the action
    await AuditLog.log({
        action: 'delete',
        module: 'beneficiary',
        documentId: beneficiary._id,
        performedBy: req.user._id,
        description: `Deleted beneficiary: ${beneficiary.basicInfo.headOfFamilyName}`,
        previousState: {
            cnic: beneficiary.basicInfo.cnic,
            name: beneficiary.basicInfo.headOfFamilyName
        },
        locationId: beneficiary.locationId
    });

    res.json({
        success: true,
        message: 'Beneficiary deleted successfully'
    });
});

/**
 * Update beneficiary status (approve/reject)
 * @route PUT /api/beneficiaries/:id/status
 */
exports.updateStatus = asyncHandler(async (req, res) => {
    const { status, remarks } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected', 'suspended'];

    if (!validStatuses.includes(status)) {
        throw new AppError('Invalid status', 400);
    }

    const beneficiary = await Beneficiary.findById(req.params.id);

    if (!beneficiary) {
        throw new AppError('Beneficiary not found', 404);
    }

    const previousStatus = beneficiary.status;
    beneficiary.status = status;

    if (status === 'approved') {
        beneficiary.declaration.approvedBy = req.user._id;
        beneficiary.declaration.approvalDate = new Date();
    }

    if (remarks) {
        beneficiary.remarks = remarks;
    }

    beneficiary.lastModifiedBy = req.user._id;
    await beneficiary.save();

    // Log the action
    await AuditLog.log({
        action: 'update',
        module: 'beneficiary',
        documentId: beneficiary._id,
        performedBy: req.user._id,
        description: `Changed beneficiary status from ${previousStatus} to ${status}`,
        previousState: { status: previousStatus },
        newState: { status },
        locationId: beneficiary.locationId
    });

    res.json({
        success: true,
        message: `Beneficiary ${status} successfully`,
        data: beneficiary
    });
});

/**
 * Get beneficiary distribution history
 * @route GET /api/beneficiaries/:id/history
 */
exports.getHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [distributions, total] = await Promise.all([
        StockOut.find({ beneficiaryId: req.params.id })
            .populate({
                path: 'stockInId',
                select: 'product source distributionPolicy'
            })
            .populate('locationId', 'name type')
            .sort({ distributionDate: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        StockOut.countDocuments({ beneficiaryId: req.params.id })
    ]);

    res.json({
        success: true,
        data: distributions,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get beneficiary statistics
 * @route GET /api/beneficiaries/stats
 */
exports.getStats = asyncHandler(async (req, res) => {
    const locationFilter = req.locationFilter || {};

    const [stats] = await Beneficiary.aggregate([
        { $match: locationFilter },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
                avgIncome: { $avg: '$income.monthlyIncome' },
                avgFamilySize: { $avg: '$family.totalMembers' }
            }
        }
    ]);

    res.json({
        success: true,
        data: stats || {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            suspended: 0,
            avgIncome: 0,
            avgFamilySize: 0
        }
    });
});
