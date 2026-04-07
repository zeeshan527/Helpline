
const StockOut = require("../models/StockOut");
const StockIn = require("../models/StockIn");
const Beneficiary = require("../models/Beneficiary");
const Donor = require("../models/Donor");
const Location = require("../models/Location");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const mongoose = require("mongoose");

/**
 * Get comprehensive beneficiary report
 * @route GET /api/reports/beneficiary/:id
 */
exports.beneficiary = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Get beneficiary details
    const beneficiary = await Beneficiary.findById(req.params.id)
        .populate('locationId', 'name type')
        .populate('createdBy', 'name');

    if (!beneficiary) {
        throw new AppError('Beneficiary not found', 404);
    }

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = { beneficiaryId: new mongoose.Types.ObjectId(req.params.id) };
    if (Object.keys(dateFilter).length > 0) {
        matchStage.distributionDate = dateFilter;
    }

    // Get distribution history with details
    const distributions = await StockOut.find(matchStage)
        .populate({
            path: 'stockInId',
            select: 'product source distributionPolicy',
            populate: { path: 'source.referenceId', select: 'name type' }
        })
        .populate('locationId', 'name type')
        .sort({ distributionDate: -1 });

    // Calculate summary
    const summary = await StockOut.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalDistributions: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalValue: { $sum: '$revenue' },
                freeValue: {
                    $sum: {
                        $cond: [{ $eq: ['$distribution.mode', 'free'] }, '$quantity', 0]
                    }
                },
                paidValue: {
                    $sum: {
                        $cond: [{ $ne: ['$distribution.mode', 'free'] }, '$revenue', 0]
                    }
                }
            }
        }
    ]);

    // Distribution by mode
    const byMode = await StockOut.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$distribution.mode',
                count: { $sum: 1 },
                quantity: { $sum: '$quantity' },
                revenue: { $sum: '$revenue' }
            }
        }
    ]);

    // Distribution by product category
    const byCategory = await StockOut.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: 'stockins',
                localField: 'stockInId',
                foreignField: '_id',
                as: 'stockIn'
            }
        },
        { $unwind: '$stockIn' },
        {
            $group: {
                _id: '$stockIn.product.category',
                count: { $sum: 1 },
                quantity: { $sum: '$quantity' }
            }
        },
        { $sort: { quantity: -1 } }
    ]);

    res.json({
        success: true,
        data: {
            beneficiary,
            summary: summary[0] || {
                totalDistributions: 0,
                totalQuantity: 0,
                totalValue: 0,
                freeValue: 0,
                paidValue: 0
            },
            byMode,
            byCategory,
            distributions
        }
    });
});

/**
 * Get donor compliance report
 * @route GET /api/reports/donor/:id
 */
exports.donor = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Get donor details
    const donor = await Donor.findById(req.params.id);
    if (!donor) {
        throw new AppError('Donor not found', 404);
    }

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Get all donations from this donor
    const donationMatchStage = {
        'source.type': 'donor',
        'source.referenceId': new mongoose.Types.ObjectId(req.params.id)
    };
    if (Object.keys(dateFilter).length > 0) {
        donationMatchStage.createdAt = dateFilter;
    }

    const donations = await StockIn.find(donationMatchStage)
        .populate('locationId', 'name type')
        .sort({ createdAt: -1 });

    // Get donation IDs
    const donationIds = donations.map(d => d._id);

    // Get distributions from these donations
    const distributionMatchStage = { stockInId: { $in: donationIds } };

    const distributions = await StockOut.find(distributionMatchStage)
        .populate('beneficiaryId', 'basicInfo')
        .populate('locationId', 'name type')
        .populate({
            path: 'stockInId',
            select: 'product distributionPolicy'
        });

    // Calculate donation summary
    const donationSummary = await StockIn.aggregate([
        { $match: donationMatchStage },
        {
            $group: {
                _id: null,
                totalDonations: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalDistributed: { $sum: { $subtract: ['$quantity', '$remainingQuantity'] } },
                totalRemaining: { $sum: '$remainingQuantity' },
                totalValue: {
                    $sum: { $multiply: ['$quantity', { $ifNull: ['$pricing.costPrice', 0] }] }
                }
            }
        }
    ]);

    // Calculate distribution summary
    const distributionSummary = await StockOut.aggregate([
        { $match: distributionMatchStage },
        {
            $group: {
                _id: null,
                totalDistributions: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalRevenue: { $sum: '$revenue' },
                violationCount: { $sum: { $cond: ['$isViolation', 1, 0] } }
            }
        }
    ]);

    // Get violations
    const violations = await StockOut.find({
        stockInId: { $in: donationIds },
        isViolation: true
    })
        .populate('beneficiaryId', 'basicInfo')
        .populate('locationId', 'name')
        .populate({
            path: 'stockInId',
            select: 'product distributionPolicy'
        });

    // Distribution by mode
    const distributionByMode = await StockOut.aggregate([
        { $match: distributionMatchStage },
        {
            $group: {
                _id: '$distribution.mode',
                count: { $sum: 1 },
                quantity: { $sum: '$quantity' },
                revenue: { $sum: '$revenue' }
            }
        }
    ]);

    // Unique beneficiaries served
    const uniqueBeneficiaries = await StockOut.distinct('beneficiaryId', distributionMatchStage);

    // Locations used
    const locationsUsed = await StockOut.aggregate([
        { $match: distributionMatchStage },
        {
            $group: {
                _id: '$locationId',
                distributionCount: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' }
            }
        },
        {
            $lookup: {
                from: 'locations',
                localField: '_id',
                foreignField: '_id',
                as: 'location'
            }
        },
        { $unwind: '$location' },
        {
            $project: {
                name: '$location.name',
                type: '$location.type',
                distributionCount: 1,
                totalQuantity: 1
            }
        }
    ]);

    // Compliance status
    const complianceStatus = {
        isCompliant: violations.length === 0,
        totalViolations: violations.length,
        violationDetails: violations.map(v => ({
            date: v.distributionDate,
            product: v.stockInId?.product?.name,
            mode: v.distribution?.mode,
            expectedMode: v.stockInId?.distributionPolicy?.type === 'free_only' ? 'free' : 'any',
            violationType: v.violationType,
            details: v.violationDetails
        }))
    };

    res.json({
        success: true,
        data: {
            donor,
            donationSummary: donationSummary[0] || {
                totalDonations: 0,
                totalQuantity: 0,
                totalDistributed: 0,
                totalRemaining: 0,
                totalValue: 0
            },
            distributionSummary: distributionSummary[0] || {
                totalDistributions: 0,
                totalQuantity: 0,
                totalRevenue: 0,
                violationCount: 0
            },
            distributionByMode,
            beneficiariesServed: uniqueBeneficiaries.length,
            locationsUsed,
            complianceStatus,
            donations,
            recentDistributions: distributions.slice(0, 50)
        }
    });
});

/**
 * Get location report
 * @route GET /api/reports/location/:id
 */
exports.location = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Get location details
    const location = await Location.findById(req.params.id)
        .populate('parentLocationId', 'name type')
        .populate('manager', 'name email');

    if (!location) {
        throw new AppError('Location not found', 404);
    }

    const locationId = new mongoose.Types.ObjectId(req.params.id);

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Stock In summary
    const stockInMatchStage = { locationId };
    if (Object.keys(dateFilter).length > 0) {
        stockInMatchStage.createdAt = dateFilter;
    }

    const stockInSummary = await StockIn.aggregate([
        { $match: stockInMatchStage },
        {
            $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalRemaining: { $sum: '$remainingQuantity' },
                totalDistributed: { $sum: { $subtract: ['$quantity', '$remainingQuantity'] } },
                activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                depletedCount: { $sum: { $cond: [{ $eq: ['$status', 'depleted'] }, 1, 0] } },
                totalValue: {
                    $sum: { $multiply: ['$quantity', { $ifNull: ['$pricing.costPrice', 0] }] }
                }
            }
        }
    ]);

    // Stock Out summary
    const stockOutMatchStage = { locationId };
    if (Object.keys(dateFilter).length > 0) {
        stockOutMatchStage.distributionDate = dateFilter;
    }

    const stockOutSummary = await StockOut.aggregate([
        { $match: stockOutMatchStage },
        {
            $group: {
                _id: null,
                totalDistributions: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalRevenue: { $sum: '$revenue' },
                violationCount: { $sum: { $cond: ['$isViolation', 1, 0] } }
            }
        }
    ]);

    // Unique beneficiaries served
    const beneficiariesServed = await StockOut.distinct('beneficiaryId', stockOutMatchStage);

    // Distribution by mode
    const distributionByMode = await StockOut.aggregate([
        { $match: stockOutMatchStage },
        {
            $group: {
                _id: '$distribution.mode',
                count: { $sum: 1 },
                quantity: { $sum: '$quantity' },
                revenue: { $sum: '$revenue' }
            }
        }
    ]);

    // Inventory by category
    const inventoryByCategory = await StockIn.aggregate([
        { $match: { locationId, status: 'active' } },
        {
            $group: {
                _id: '$product.category',
                totalQuantity: { $sum: '$quantity' },
                remainingQuantity: { $sum: '$remainingQuantity' },
                itemCount: { $sum: 1 }
            }
        },
        { $sort: { remainingQuantity: -1 } }
    ]);

    // Low stock items
    const lowStockItems = await StockIn.find({
        locationId,
        status: 'active',
        $expr: { $lte: ['$remainingQuantity', { $multiply: ['$quantity', 0.2] }] }
    }).select('product remainingQuantity quantity');

    // Monthly trend
    const monthlyTrend = await StockOut.aggregate([
        {
            $match: {
                locationId,
                distributionDate: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$distributionDate' } },
                distributions: { $sum: 1 },
                quantity: { $sum: '$quantity' },
                revenue: { $sum: '$revenue' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.json({
        success: true,
        data: {
            location,
            stockIn: stockInSummary[0] || {
                totalRecords: 0,
                totalQuantity: 0,
                totalRemaining: 0,
                totalDistributed: 0,
                activeCount: 0,
                depletedCount: 0,
                totalValue: 0
            },
            stockOut: stockOutSummary[0] || {
                totalDistributions: 0,
                totalQuantity: 0,
                totalRevenue: 0,
                violationCount: 0
            },
            beneficiariesServed: beneficiariesServed.length,
            distributionByMode,
            inventoryByCategory,
            lowStockItems,
            monthlyTrend
        }
    });
});

/**
 * Get stock in report
 * @route GET /api/reports/stock-in
 */
exports.stockIn = asyncHandler(async (req, res) => {
    const { startDate, endDate, locationId, sourceType, status } = req.query;
    const locationFilter = req.locationFilter || {};

    const matchStage = { ...locationFilter };
    if (locationId) matchStage.locationId = new mongoose.Types.ObjectId(locationId);
    if (sourceType) matchStage['source.type'] = sourceType;
    if (status) matchStage.status = status;

    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    // Summary
    const summary = await StockIn.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalRemaining: { $sum: '$remainingQuantity' },
                totalDistributed: { $sum: { $subtract: ['$quantity', '$remainingQuantity'] } },
                totalValue: {
                    $sum: { $multiply: ['$quantity', { $ifNull: ['$pricing.costPrice', 0] }] }
                }
            }
        }
    ]);

    // By source type
    const bySourceType = await StockIn.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$source.type',
                count: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                remainingQuantity: { $sum: '$remainingQuantity' }
            }
        }
    ]);

    // By category
    const byCategory = await StockIn.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$product.category',
                count: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                remainingQuantity: { $sum: '$remainingQuantity' }
            }
        },
        { $sort: { totalQuantity: -1 } }
    ]);

    // By location
    const byLocation = await StockIn.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$locationId',
                count: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                remainingQuantity: { $sum: '$remainingQuantity' }
            }
        },
        {
            $lookup: {
                from: 'locations',
                localField: '_id',
                foreignField: '_id',
                as: 'location'
            }
        },
        { $unwind: '$location' },
        {
            $project: {
                name: '$location.name',
                type: '$location.type',
                count: 1,
                totalQuantity: 1,
                remainingQuantity: 1
            }
        }
    ]);

    // By policy type
    const byPolicy = await StockIn.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$distributionPolicy.type',
                count: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' }
            }
        }
    ]);

    res.json({
        success: true,
        data: {
            summary: summary[0] || {
                totalRecords: 0,
                totalQuantity: 0,
                totalRemaining: 0,
                totalDistributed: 0,
                totalValue: 0
            },
            bySourceType,
            byCategory,
            byLocation,
            byPolicy
        }
    });
});

/**
 * Get stock out report
 * @route GET /api/reports/stock-out
 */
exports.stockOut = asyncHandler(async (req, res) => {
    const { startDate, endDate, locationId, mode } = req.query;
    const locationFilter = req.locationFilter || {};

    const matchStage = { ...locationFilter };
    if (locationId) matchStage.locationId = new mongoose.Types.ObjectId(locationId);
    if (mode) matchStage['distribution.mode'] = mode;

    if (startDate || endDate) {
        matchStage.distributionDate = {};
        if (startDate) matchStage.distributionDate.$gte = new Date(startDate);
        if (endDate) matchStage.distributionDate.$lte = new Date(endDate);
    }

    // Summary
    const summary = await StockOut.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalDistributions: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                totalRevenue: { $sum: '$revenue' },
                violationCount: { $sum: { $cond: ['$isViolation', 1, 0] } }
            }
        }
    ]);

    // By mode
    const byMode = await StockOut.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$distribution.mode',
                count: { $sum: 1 },
                quantity: { $sum: '$quantity' },
                revenue: { $sum: '$revenue' }
            }
        }
    ]);

    // By location
    const byLocation = await StockOut.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$locationId',
                count: { $sum: 1 },
                quantity: { $sum: '$quantity' },
                revenue: { $sum: '$revenue' }
            }
        },
        {
            $lookup: {
                from: 'locations',
                localField: '_id',
                foreignField: '_id',
                as: 'location'
            }
        },
        { $unwind: '$location' },
        {
            $project: {
                name: '$location.name',
                type: '$location.type',
                count: 1,
                quantity: 1,
                revenue: 1
            }
        }
    ]);

    // Unique beneficiaries
    const uniqueBeneficiaries = await StockOut.distinct('beneficiaryId', matchStage);

    // Daily trend
    const dailyTrend = await StockOut.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$distributionDate' } },
                count: { $sum: 1 },
                quantity: { $sum: '$quantity' },
                revenue: { $sum: '$revenue' }
            }
        },
        { $sort: { _id: 1 } },
        { $limit: 90 }
    ]);

    res.json({
        success: true,
        data: {
            summary: summary[0] || {
                totalDistributions: 0,
                totalQuantity: 0,
                totalRevenue: 0,
                violationCount: 0
            },
            byMode,
            byLocation,
            beneficiariesServed: uniqueBeneficiaries.length,
            dailyTrend
        }
    });
});

/**
 * Get financial report
 * @route GET /api/reports/financial
 */
exports.financial = asyncHandler(async (req, res) => {
    const { startDate, endDate, locationId } = req.query;
    const locationFilter = req.locationFilter || {};

    const matchStage = { ...locationFilter, status: 'completed' };
    if (locationId) matchStage.locationId = new mongoose.Types.ObjectId(locationId);

    if (startDate || endDate) {
        matchStage.distributionDate = {};
        if (startDate) matchStage.distributionDate.$gte = new Date(startDate);
        if (endDate) matchStage.distributionDate.$lte = new Date(endDate);
    }

    // Revenue summary
    const revenueSummary = await StockOut.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$revenue' },
                controlPriceRevenue: {
                    $sum: {
                        $cond: [{ $eq: ['$distribution.mode', 'control_price'] }, '$revenue', 0]
                    }
                },
                discountedRevenue: {
                    $sum: {
                        $cond: [{ $eq: ['$distribution.mode', 'discounted'] }, '$revenue', 0]
                    }
                },
                totalDiscountGiven: { $sum: { $ifNull: ['$distribution.discountAmount', 0] } }
            }
        }
    ]);

    // Calculate free distribution value
    const freeDistributionValue = await StockOut.aggregate([
        { $match: { ...matchStage, 'distribution.mode': 'free' } },
        {
            $lookup: {
                from: 'stockins',
                localField: 'stockInId',
                foreignField: '_id',
                as: 'stockIn'
            }
        },
        { $unwind: '$stockIn' },
        {
            $group: {
                _id: null,
                totalValue: {
                    $sum: {
                        $multiply: ['$quantity', { $ifNull: ['$stockIn.pricing.retailPrice', '$stockIn.pricing.costPrice', 0] }]
                    }
                },
                totalQuantity: { $sum: '$quantity' }
            }
        }
    ]);

    // Revenue by month
    const revenueByMonth = await StockOut.aggregate([
        {
            $match: {
                ...locationFilter,
                status: 'completed',
                distributionDate: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$distributionDate' } },
                revenue: { $sum: '$revenue' },
                distributions: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Revenue by location
    const revenueByLocation = await StockOut.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$locationId',
                revenue: { $sum: '$revenue' },
                distributions: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: 'locations',
                localField: '_id',
                foreignField: '_id',
                as: 'location'
            }
        },
        { $unwind: '$location' },
        {
            $project: {
                name: '$location.name',
                type: '$location.type',
                revenue: 1,
                distributions: 1
            }
        },
        { $sort: { revenue: -1 } }
    ]);

    res.json({
        success: true,
        data: {
            revenue: revenueSummary[0] || {
                totalRevenue: 0,
                controlPriceRevenue: 0,
                discountedRevenue: 0,
                totalDiscountGiven: 0
            },
            freeDistribution: freeDistributionValue[0] || {
                totalValue: 0,
                totalQuantity: 0
            },
            revenueByMonth,
            revenueByLocation
        }
    });
});

/**
 * Get low stock alerts
 * @route GET /api/reports/low-stock
 */
exports.lowStock = asyncHandler(async (req, res) => {
    const { threshold = 20 } = req.query; // Default 20% threshold
    const locationFilter = req.locationFilter || {};

    const lowStockItems = await StockIn.aggregate([
        {
            $match: {
                ...locationFilter,
                status: 'active',
                $expr: {
                    $lte: ['$remainingQuantity', { $multiply: ['$quantity', parseInt(threshold) / 100] }]
                }
            }
        },
        {
            $lookup: {
                from: 'locations',
                localField: 'locationId',
                foreignField: '_id',
                as: 'location'
            }
        },
        { $unwind: '$location' },
        {
            $project: {
                product: 1,
                quantity: 1,
                remainingQuantity: 1,
                percentRemaining: {
                    $multiply: [{ $divide: ['$remainingQuantity', '$quantity'] }, 100]
                },
                location: { name: '$location.name', type: '$location.type' },
                source: 1,
                receivedDate: 1
            }
        },
        { $sort: { percentRemaining: 1 } }
    ]);

    // Group by location for summary
    const byLocation = await StockIn.aggregate([
        {
            $match: {
                ...locationFilter,
                status: 'active',
                $expr: {
                    $lte: ['$remainingQuantity', { $multiply: ['$quantity', parseInt(threshold) / 100] }]
                }
            }
        },
        {
            $group: {
                _id: '$locationId',
                count: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: 'locations',
                localField: '_id',
                foreignField: '_id',
                as: 'location'
            }
        },
        { $unwind: '$location' },
        {
            $project: {
                name: '$location.name',
                count: 1
            }
        }
    ]);

    res.json({
        success: true,
        data: {
            totalLowStockItems: lowStockItems.length,
            items: lowStockItems,
            byLocation
        }
    });
});

/**
 * Get compliance report (violations)
 * @route GET /api/reports/compliance
 */
exports.compliance = asyncHandler(async (req, res) => {
    const { startDate, endDate, locationId, severity } = req.query;
    const locationFilter = req.locationFilter || {};

    const matchStage = { ...locationFilter, isViolation: true };
    if (locationId) matchStage.locationId = new mongoose.Types.ObjectId(locationId);

    if (startDate || endDate) {
        matchStage.distributionDate = {};
        if (startDate) matchStage.distributionDate.$gte = new Date(startDate);
        if (endDate) matchStage.distributionDate.$lte = new Date(endDate);
    }

    // Get violations
    const violations = await StockOut.find(matchStage)
        .populate({
            path: 'stockInId',
            select: 'product source distributionPolicy',
            populate: { path: 'source.referenceId', select: 'name type' }
        })
        .populate('beneficiaryId', 'basicInfo')
        .populate('locationId', 'name type')
        .populate('createdBy', 'name')
        .sort({ distributionDate: -1 })
        .limit(100);

    // Summary
    const summary = await StockOut.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$violationType',
                count: { $sum: 1 },
                quantity: { $sum: '$quantity' }
            }
        }
    ]);

    // By location
    const byLocation = await StockOut.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$locationId',
                count: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: 'locations',
                localField: '_id',
                foreignField: '_id',
                as: 'location'
            }
        },
        { $unwind: '$location' },
        {
            $project: {
                name: '$location.name',
                count: 1
            }
        },
        { $sort: { count: -1 } }
    ]);

    res.json({
        success: true,
        data: {
            totalViolations: violations.length,
            byType: summary,
            byLocation,
            violations
        }
    });
});
