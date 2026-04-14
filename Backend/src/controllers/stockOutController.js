
const StockOut = require("../models/StockOut");
const StockIn = require("../models/StockIn");
const Beneficiary = require("../models/Beneficiary");
const AuditLog = require("../models/AuditLog");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { VIOLATION_TYPES } = require("../constants/enums");

/**
 * Create a new stock out (distribution) record
 * @route POST /api/stock-out
 */
exports.create = asyncHandler(async (req, res) => {
    const { stockInId, beneficiaryId, locationId, quantity, distribution, notes } = req.body;

    // Stock validation is done by policy middleware
    const stockIn = req.stockIn;

    // Verify beneficiary
    const beneficiary = await Beneficiary.findById(beneficiaryId);
    if (!beneficiary) {
        throw new AppError('Beneficiary not found', 404);
    }

    if (beneficiary.status !== 'approved') {
        throw new AppError(`Beneficiary status is ${beneficiary.status}. Only approved beneficiaries can receive distributions.`, 400);
    }

    // Check eligibility
    const eligibilityCheck = await beneficiary.checkEligibility(stockIn);
    if (!eligibilityCheck.eligible && !req.body.adminOverride) {
        throw new AppError(`Beneficiary not eligible: ${eligibilityCheck.reason}`, 400);
    }

    // Check frequency eligibility
    if (stockIn.eligibilityRules?.frequency && stockIn.eligibilityRules.frequency !== 'unlimited') {
        const frequencyCheck = await checkFrequencyEligibility(
            beneficiaryId, 
            stockInId, 
            stockIn.eligibilityRules.frequency
        );
        if (!frequencyCheck.eligible && !req.body.adminOverride) {
            throw new AppError(frequencyCheck.reason, 400);
        }
    }

    // Calculate pricing
    let finalDistribution = { ...distribution };
    
    if (distribution.mode === 'control_price') {
        finalDistribution.price = stockIn.distributionPolicy.controlPrice || distribution.price;
        finalDistribution.originalPrice = finalDistribution.price;
    } else if (distribution.mode === 'discounted') {
        finalDistribution.originalPrice = distribution.originalPrice || stockIn.pricing?.retailPrice || 0;
        finalDistribution.discountPercent = distribution.discountPercent || 0;
        const discountAmount = (finalDistribution.originalPrice * finalDistribution.discountPercent) / 100;
        finalDistribution.price = finalDistribution.originalPrice - discountAmount;
        finalDistribution.discountAmount = discountAmount;
    } else {
        // Free
        finalDistribution.price = 0;
    }

    // Create stock out record
    const stockOut = await StockOut.create({
        stockInId,
        beneficiaryId,
        locationId,
        quantity,
        distribution: finalDistribution,
        revenue: finalDistribution.price * quantity,
        isViolation: req.isViolation,
        violationType: req.violationType || VIOLATION_TYPES.NONE,
        violationDetails: req.violationDetails,
        notes,
        createdBy: req.user._id
    });

    // Deduct stock
    stockIn.deductStock(quantity);
    await stockIn.save();

    // Update beneficiary distribution history
    beneficiary.distributionHistory.totalReceived += quantity;
    beneficiary.distributionHistory.totalValue += stockOut.revenue;
    beneficiary.distributionHistory.lastDistributionDate = new Date();
    beneficiary.distributionHistory.lastDistributionItems.push({
        productName: stockIn.product.name,
        quantity,
        date: new Date()
    });
    // Keep only last 10 items in history
    if (beneficiary.distributionHistory.lastDistributionItems.length > 10) {
        beneficiary.distributionHistory.lastDistributionItems.shift();
    }
    await beneficiary.save();

    // Populate response
    await stockOut.populate([
        { path: 'stockInId', select: 'product source distributionPolicy' },
        { path: 'beneficiaryId', select: 'basicInfo status' },
        { path: 'locationId', select: 'name type' },
        { path: 'createdBy', select: 'name' }
    ]);

    // Log the action
    await AuditLog.log({
        action: 'stock_out',
        module: 'stockOut',
        documentId: stockOut._id,
        performedBy: req.user._id,
        description: `Distributed ${quantity} ${stockIn.product.unit} of ${stockIn.product.name} to ${beneficiary.basicInfo.headOfFamilyName}`,
        newState: {
            product: stockIn.product.name,
            quantity,
            mode: distribution.mode,
            price: finalDistribution.price,
            beneficiary: beneficiary.basicInfo.headOfFamilyName
        },
        locationId,
        compliance: {
            isViolation: req.isViolation,
            violationType: req.violationType,
            details: req.violationDetails,
            severity: req.isViolation ? 'medium' : 'low'
        }
    });

    res.status(201).json({
        success: true,
        message: 'Distribution recorded successfully',
        data: stockOut,
        warning: req.isViolation ? {
            type: req.violationType,
            details: req.violationDetails
        } : null
    });
});

/**
 * Check frequency eligibility for beneficiary
 */
async function checkFrequencyEligibility(beneficiaryId, stockInId, frequency) {
    let dateFilter;
    const now = new Date();

    switch (frequency) {
        case 'once':
            // Check if beneficiary ever received from this stock
            const existingOnce = await StockOut.findOne({
                beneficiaryId,
                stockInId,
                status: 'completed'
            });
            if (existingOnce) {
                return { 
                    eligible: false, 
                    reason: 'Beneficiary has already received from this stock (once-only policy)' 
                };
            }
            break;

        case 'daily':
            dateFilter = new Date(now.setHours(0, 0, 0, 0));
            break;

        case 'weekly':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            dateFilter = weekStart;
            break;

        case 'monthly':
            dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
            break;

        case 'quarterly':
            const quarter = Math.floor(now.getMonth() / 3);
            dateFilter = new Date(now.getFullYear(), quarter * 3, 1);
            break;

        case 'yearly':
            dateFilter = new Date(now.getFullYear(), 0, 1);
            break;

        default:
            return { eligible: true };
    }

    if (dateFilter) {
        const existing = await StockOut.findOne({
            beneficiaryId,
            stockInId,
            status: 'completed',
            distributionDate: { $gte: dateFilter }
        });

        if (existing) {
            return {
                eligible: false,
                reason: `Beneficiary has already received within this ${frequency} period`
            };
        }
    }

    return { eligible: true };
}

/**
 * Get all stock out records with filtering
 * @route GET /api/stock-out
 */
exports.get = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        locationId,
        beneficiaryId,
        stockInId,
        recordType,
        status,
        mode,
        isViolation,
        startDate,
        endDate,
        sortBy = 'distributionDate',
        sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    // Apply location filter only for location_inventory_manager
    if (req.user.role === 'location_inventory_manager' && req.locationFilter) {
        Object.assign(query, req.locationFilter)
    }

    if (locationId) query.locationId = locationId;
    if (beneficiaryId) query.beneficiaryId = beneficiaryId;
    if (stockInId) query.stockInId = stockInId;
    if (status) query.status = status;
    if (mode) query['distribution.mode'] = mode;
    if (isViolation === 'true') query.isViolation = true;
    if (isViolation === 'false') query.isViolation = false;

    if (recordType === 'stock' || recordType === 'package') {
        const stockInTypeQuery = recordType === 'stock'
            ? { $or: [{ recordType: 'stock' }, { recordType: { $exists: false } }] }
            : { recordType: 'package' };

        const matchingStockIds = await StockIn.find(stockInTypeQuery).distinct('_id');

        if (query.stockInId) {
            query.stockInId = matchingStockIds
                .map((id) => id.toString())
                .includes(query.stockInId.toString())
                ? query.stockInId
                : null;
        } else {
            query.stockInId = { $in: matchingStockIds };
        }
    }

    // Date range filter
    if (startDate || endDate) {
        query.distributionDate = {};
        if (startDate) query.distributionDate.$gte = new Date(startDate);
        if (endDate) query.distributionDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [distributions, total] = await Promise.all([
        StockOut.find(query)
            .populate({
                path: 'stockInId',
                select: 'product source distributionPolicy recordType'
            })
            .populate('beneficiaryId', 'basicInfo status')
            .populate('locationId', 'name type')
            .populate('createdBy', 'name')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit)),
        StockOut.countDocuments(query)
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
 * Get single stock out record
 * @route GET /api/stock-out/:id
 */
exports.getById = asyncHandler(async (req, res) => {
    const stockOut = await StockOut.findById(req.params.id)
        .populate({
            path: 'stockInId',
            select: 'product source distributionPolicy pricing recordType',
            populate: { path: 'source.referenceId', select: 'name type' }
        })
        .populate('beneficiaryId', 'basicInfo family income status locationId')
        .populate('locationId', 'name type address')
        .populate('createdBy', 'name email')
        .populate('verification.verifiedBy', 'name');

    if (!stockOut) {
        throw new AppError('Distribution record not found', 404);
    }

    res.json({
        success: true,
        data: stockOut
    });
});

/**
 * Cancel/Return a distribution
 * @route PUT /api/stock-out/:id/cancel
 */
exports.cancel = asyncHandler(async (req, res) => {
    const { reason, returnQuantity } = req.body;

    const stockOut = await StockOut.findById(req.params.id);
    if (!stockOut) {
        throw new AppError('Distribution record not found', 404);
    }

    if (stockOut.status !== 'completed') {
        throw new AppError(`Cannot cancel distribution with status: ${stockOut.status}`, 400);
    }

    // Return stock to inventory
    const stockIn = await StockIn.findById(stockOut.stockInId);
    if (stockIn) {
        const qtyToReturn = returnQuantity || stockOut.quantity;
        stockIn.remainingQuantity += qtyToReturn;
        if (stockIn.status === 'depleted') {
            stockIn.status = 'active';
        }
        await stockIn.save();
    }

    // Update stock out record
    stockOut.status = returnQuantity ? 'returned' : 'cancelled';
    stockOut.returnInfo = {
        returnDate: new Date(),
        returnQuantity: returnQuantity || stockOut.quantity,
        returnReason: reason,
        returnedBy: req.user._id
    };
    await stockOut.save();

    // Update beneficiary history
    const beneficiary = await Beneficiary.findById(stockOut.beneficiaryId);
    if (beneficiary) {
        beneficiary.distributionHistory.totalReceived -= (returnQuantity || stockOut.quantity);
        beneficiary.distributionHistory.totalValue -= stockOut.revenue;
        await beneficiary.save();
    }

    // Log the action
    await AuditLog.log({
        action: 'update',
        module: 'stockOut',
        documentId: stockOut._id,
        performedBy: req.user._id,
        description: `${returnQuantity ? 'Returned' : 'Cancelled'} distribution: ${reason}`,
        previousState: { status: 'completed' },
        newState: { status: stockOut.status, returnReason: reason },
        locationId: stockOut.locationId
    });

    res.json({
        success: true,
        message: `Distribution ${returnQuantity ? 'returned' : 'cancelled'} successfully`,
        data: stockOut
    });
});

/**
 * Get distribution statistics
 * @route GET /api/stock-out/stats
 */
exports.getStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const locationFilter = req.locationFilter || {};

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = { ...locationFilter };
    if (Object.keys(dateFilter).length > 0) {
        matchStage.distributionDate = dateFilter;
    }

    const [stats] = await StockOut.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalDistributions: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalRevenue: { $sum: '$revenue' },
                completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                violationCount: { $sum: { $cond: ['$isViolation', 1, 0] } },
                freeCount: { $sum: { $cond: [{ $eq: ['$distribution.mode', 'free'] }, 1, 0] } },
                controlPriceCount: { $sum: { $cond: [{ $eq: ['$distribution.mode', 'control_price'] }, 1, 0] } },
                discountedCount: { $sum: { $cond: [{ $eq: ['$distribution.mode', 'discounted'] }, 1, 0] } }
            }
        }
    ]);

    // Get unique beneficiaries served
    const uniqueBeneficiaries = await StockOut.distinct('beneficiaryId', matchStage);

    // Daily distribution trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTrend = await StockOut.aggregate([
        {
            $match: {
                ...locationFilter,
                distributionDate: { $gte: thirtyDaysAgo }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$distributionDate' } },
                count: { $sum: 1 },
                quantity: { $sum: '$quantity' },
                revenue: { $sum: '$revenue' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.json({
        success: true,
        data: {
            overview: stats || {
                totalDistributions: 0,
                totalQuantity: 0,
                totalRevenue: 0,
                completedCount: 0,
                cancelledCount: 0,
                violationCount: 0,
                freeCount: 0,
                controlPriceCount: 0,
                discountedCount: 0
            },
            uniqueBeneficiariesServed: uniqueBeneficiaries.length,
            dailyTrend
        }
    });
});
