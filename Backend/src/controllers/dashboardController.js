const StockIn = require("../models/StockIn");
const StockOut = require("../models/StockOut");
const Beneficiary = require("../models/Beneficiary");
const Donor = require("../models/Donor");
const Location = require("../models/Location");
const AuditLog = require("../models/AuditLog");
const { asyncHandler } = require("../middleware/errorHandler");
const mongoose = require("mongoose");

/**
 * Get dashboard overview statistics
 * @route GET /api/dashboard
 */
exports.getOverview = asyncHandler(async (req, res) => {
    const locationFilter = req.locationFilter || {};
    
    // Run all queries in parallel for performance
    const [
        beneficiaryStats,
        donorStats,
        locationStats,
        stockInStats,
        stockOutStats,
        recentActivity,
        lowStockAlerts,
        monthlyTrend
    ] = await Promise.all([
        // Beneficiary stats
        Beneficiary.aggregate([
            { $match: locationFilter },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
                }
            }
        ]),

        // Donor stats
        Donor.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }
                }
            }
        ]),

        // Location stats
        Location.aggregate([
            { $match: req.user.role === 'admin' ? {} : { _id: { $in: req.user.assignedLocations || [] } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }
                }
            }
        ]),

        // Stock In stats
        StockIn.aggregate([
            { $match: locationFilter },
            {
                $group: {
                    _id: null,
                    totalRecords: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                    totalRemaining: { $sum: '$remainingQuantity' },
                    totalValue: {
                        $sum: { $multiply: ['$quantity', { $ifNull: ['$pricing.costPrice', 0] }] }
                    }
                }
            }
        ]),

        // Stock Out stats (this month)
        StockOut.aggregate([
            {
                $match: {
                    ...locationFilter,
                    distributionDate: { $gte: new Date(new Date().setDate(1)) }
                }
            },
            {
                $group: {
                    _id: null,
                    totalDistributions: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                    totalRevenue: { $sum: '$revenue' },
                    uniqueBeneficiaries: { $addToSet: '$beneficiaryId' }
                }
            }
        ]),

        // Recent activity
        AuditLog.find(
            req.user.role === 'admin' ? {} : { locationId: { $in: req.user.assignedLocations || [] } }
        )
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('performedBy', 'name')
            .populate('locationId', 'name'),

        // Low stock alerts
        StockIn.find({
            ...locationFilter,
            status: 'active',
            $expr: { $lte: ['$remainingQuantity', { $multiply: ['$quantity', 0.2] }] }
        })
            .select('product remainingQuantity quantity locationId')
            .populate('locationId', 'name')
            .limit(5),

        // Monthly distribution trend (last 6 months)
        StockOut.aggregate([
            {
                $match: {
                    ...locationFilter,
                    distributionDate: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
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
        ])
    ]);

    // Process stock out stats for unique beneficiaries count
    const stockOutProcessed = stockOutStats[0] || {
        totalDistributions: 0,
        totalQuantity: 0,
        totalRevenue: 0,
        uniqueBeneficiaries: []
    };

    res.json({
        success: true,
        data: {
            beneficiaries: beneficiaryStats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 },
            donors: donorStats[0] || { total: 0, active: 0 },
            locations: locationStats[0] || { total: 0, active: 0 },
            inventory: {
                ...stockInStats[0] || { totalRecords: 0, totalQuantity: 0, totalRemaining: 0, totalValue: 0 },
                utilizationPercent: stockInStats[0] 
                    ? ((stockInStats[0].totalQuantity - stockInStats[0].totalRemaining) / stockInStats[0].totalQuantity * 100).toFixed(1)
                    : 0
            },
            distributionsThisMonth: {
                total: stockOutProcessed.totalDistributions,
                quantity: stockOutProcessed.totalQuantity,
                revenue: stockOutProcessed.totalRevenue,
                beneficiariesServed: stockOutProcessed.uniqueBeneficiaries?.length || 0
            },
            recentActivity: recentActivity.map(a => ({
                action: a.action,
                module: a.module,
                description: a.description,
                performedBy: a.performedBy?.name,
                location: a.locationId?.name,
                createdAt: a.createdAt
            })),
            lowStockAlerts: lowStockAlerts.map(item => ({
                product: item.product.name,
                category: item.product.category,
                remaining: item.remainingQuantity,
                total: item.quantity,
                percentRemaining: ((item.remainingQuantity / item.quantity) * 100).toFixed(1),
                location: item.locationId?.name
            })),
            monthlyTrend
        }
    });
});

/**
 * Get quick stats for dashboard cards
 * @route GET /api/dashboard/quick-stats
 */
exports.getQuickStats = asyncHandler(async (req, res) => {
    const locationFilter = req.locationFilter || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayDistributions, pendingBeneficiaries, violationsThisMonth] = await Promise.all([
        StockOut.countDocuments({
            ...locationFilter,
            distributionDate: { $gte: today }
        }),
        Beneficiary.countDocuments({
            ...locationFilter,
            status: 'pending'
        }),
        StockOut.countDocuments({
            ...locationFilter,
            isViolation: true,
            distributionDate: { $gte: new Date(new Date().setDate(1)) }
        })
    ]);

    res.json({
        success: true,
        data: {
            todayDistributions,
            pendingBeneficiaries,
            violationsThisMonth
        }
    });
});

/**
 * Get distribution chart data
 * @route GET /api/dashboard/distribution-chart
 */
exports.getDistributionChart = asyncHandler(async (req, res) => {
    const { period = '7d' } = req.query;
    const locationFilter = req.locationFilter || {};

    let startDate = new Date();
    let groupFormat = '%Y-%m-%d';

    switch (period) {
        case '7d':
            startDate.setDate(startDate.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(startDate.getDate() - 30);
            break;
        case '90d':
            startDate.setDate(startDate.getDate() - 90);
            groupFormat = '%Y-%W'; // Week
            break;
        case '1y':
            startDate.setFullYear(startDate.getFullYear() - 1);
            groupFormat = '%Y-%m'; // Month
            break;
    }

    const data = await StockOut.aggregate([
        {
            $match: {
                ...locationFilter,
                distributionDate: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: groupFormat, date: '$distributionDate' } },
                distributions: { $sum: 1 },
                quantity: { $sum: '$quantity' },
                revenue: { $sum: '$revenue' },
                freeCount: { $sum: { $cond: [{ $eq: ['$distribution.mode', 'free'] }, 1, 0] } },
                paidCount: { $sum: { $cond: [{ $ne: ['$distribution.mode', 'free'] }, 1, 0] } }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.json({
        success: true,
        data
    });
});

/**
 * Get top items distributed
 * @route GET /api/dashboard/top-items
 */
exports.getTopItems = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const locationFilter = req.locationFilter || {};

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topItems = await StockOut.aggregate([
        {
            $match: {
                ...locationFilter,
                distributionDate: { $gte: thirtyDaysAgo }
            }
        },
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
                _id: '$stockIn.product.name',
                category: { $first: '$stockIn.product.category' },
                totalQuantity: { $sum: '$quantity' },
                distributionCount: { $sum: 1 }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: parseInt(limit) }
    ]);

    res.json({
        success: true,
        data: topItems
    });
});
