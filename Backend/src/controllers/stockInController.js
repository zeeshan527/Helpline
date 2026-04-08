
const StockIn = require("../models/StockIn");
const Donor = require("../models/Donor");
const Location = require("../models/Location");
const AuditLog = require("../models/AuditLog");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const mongoose = require("mongoose");

/**
 * Create a new stock in record
 * @route POST /api/stock-in
 */
exports.create = asyncHandler(async (req, res) => {
    const stockData = {
        ...req.body,
        createdBy: req.user._id
    };

    // Verify location exists
    const location = await Location.findById(req.body.locationId);
    if (!location) {
        throw new AppError('Location not found', 404);
    }

    if (location.status !== 'active') {
        throw new AppError('Cannot add stock to inactive location', 400);
    }

    // If source is donor, verify donor exists and update stats
    if (req.body.source?.type === 'donor' && req.body.source?.referenceId) {
        const donor = await Donor.findById(req.body.source.referenceId);
        if (!donor) {
            throw new AppError('Donor not found', 404);
        }

        // Set source reference model
        stockData.source.refModel = 'Donor';

        // Update donor stats
        donor.stats.totalDonations += 1;
        donor.stats.lastDonationDate = new Date();
        if (req.body.pricing?.costPrice) {
            donor.stats.totalValue += req.body.quantity * req.body.pricing.costPrice;
        }
        await donor.save();
    }

    // Set remaining quantity
    stockData.remainingQuantity = stockData.quantity;

    const stockIn = await StockIn.create(stockData);

    // Populate references
    await stockIn.populate([
        { path: 'locationId', select: 'name type' },
        { path: 'source.referenceId' },
        { path: 'createdBy', select: 'name email' }
    ]);

    // Log the action
    await AuditLog.log({
        action: 'stock_in',
        module: 'stockIn',
        documentId: stockIn._id,
        performedBy: req.user._id,
        description: `Stock In: ${stockIn.quantity} ${stockIn.product.unit} of ${stockIn.product.name}`,
        newState: {
            product: stockIn.product.name,
            quantity: stockIn.quantity,
            source: stockIn.source.type,
            policy: stockIn.distributionPolicy.type
        },
        locationId: stockIn.locationId
    });

    res.status(201).json({
        success: true,
        message: 'Stock added successfully',
        data: stockIn
    });
});

/**
 * Get all stock in records with filtering
 * @route GET /api/stock-in
 */
exports.get = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        locationId,
        status,
        sourceType,
        category,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        lowStock
    } = req.query;

    // Build query
    const query = {};

    // Apply location filter only for location_inventory_manager
    if (req.user.role === 'location_inventory_manager' && req.locationFilter) {
        Object.assign(query, req.locationFilter)
    }

    if (locationId) query.locationId = locationId;
    if (status) query.status = status;
    if (sourceType) query['source.type'] = sourceType;
    if (category) query['product.category'] = category;

    // Filter low stock items
    if (lowStock === 'true') {
        query.status = 'active';
        query.$expr = {
            $lte: ['$remainingQuantity', { $multiply: ['$quantity', 0.2] }]
        };
    }

    // Search
    if (search) {
        query.$or = [
            { 'product.name': { $regex: search, $options: 'i' } },
            { 'product.category': { $regex: search, $options: 'i' } },
            { batchNumber: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [stockItems, total] = await Promise.all([
        StockIn.find(query)
            .populate('locationId', 'name type')
            .populate('source.referenceId', 'name type')
            .populate('createdBy', 'name')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit)),
        StockIn.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: stockItems,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single stock in record
 * @route GET /api/stock-in/:id
 */
exports.getById = asyncHandler(async (req, res) => {
    const stockIn = await StockIn.findById(req.params.id)
        .populate('locationId', 'name type address')
        .populate('source.referenceId')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

    if (!stockIn) {
        throw new AppError('Stock record not found', 404);
    }

    // Check location access for staff
    if (req.user.role !== 'admin') {
        const hasAccess = req.user.assignedLocations?.some(
            loc => loc.toString() === stockIn.locationId._id.toString()
        );
        if (!hasAccess) {
            throw new AppError('Not authorized to view this stock record', 403);
        }
    }

    res.json({
        success: true,
        data: stockIn
    });
});

/**
 * Update stock in record
 * @route PUT /api/stock-in/:id
 */
exports.update = asyncHandler(async (req, res) => {
    const stockIn = await StockIn.findById(req.params.id);

    if (!stockIn) {
        throw new AppError('Stock record not found', 404);
    }

    // Cannot update if stock has been partially distributed
    const distributed = stockIn.quantity - stockIn.remainingQuantity;
    if (distributed > 0 && req.body.quantity && req.body.quantity < distributed) {
        throw new AppError(
            `Cannot reduce quantity below already distributed amount (${distributed})`,
            400
        );
    }

    const previousState = {
        quantity: stockIn.quantity,
        status: stockIn.status,
        policy: stockIn.distributionPolicy?.type
    };

    // If quantity changes, adjust remaining
    if (req.body.quantity && req.body.quantity !== stockIn.quantity) {
        const diff = req.body.quantity - stockIn.quantity;
        stockIn.remainingQuantity += diff;
    }

    // Update fields
    const allowedUpdates = ['product', 'pricing', 'distributionPolicy', 'eligibilityRules', 'notes', 'status'];
    allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
            stockIn[field] = req.body[field];
        }
    });

    if (req.body.quantity) stockIn.quantity = req.body.quantity;
    stockIn.lastModifiedBy = req.user._id;

    await stockIn.save();

    // Log the action
    await AuditLog.log({
        action: 'update',
        module: 'stockIn',
        documentId: stockIn._id,
        performedBy: req.user._id,
        description: `Updated stock: ${stockIn.product.name}`,
        previousState,
        newState: {
            quantity: stockIn.quantity,
            status: stockIn.status,
            policy: stockIn.distributionPolicy?.type
        },
        locationId: stockIn.locationId
    });

    res.json({
        success: true,
        message: 'Stock updated successfully',
        data: stockIn
    });
});

/**
 * Transfer stock between locations
 * @route POST /api/stock-in/transfer
 */
exports.transfer = asyncHandler(async (req, res) => {
    const { stockInId, fromLocationId, toLocationId, quantity, notes } = req.body;

    // Verify source stock
    const sourceStock = await StockIn.findById(stockInId);
    if (!sourceStock) {
        throw new AppError('Source stock not found', 404);
    }

    if (sourceStock.locationId.toString() !== fromLocationId) {
        throw new AppError('Stock is not at the specified source location', 400);
    }

    if (sourceStock.remainingQuantity < quantity) {
        throw new AppError(
            `Insufficient stock. Available: ${sourceStock.remainingQuantity}`,
            400
        );
    }

    // Verify destination location
    const destLocation = await Location.findById(toLocationId);
    if (!destLocation) {
        throw new AppError('Destination location not found', 404);
    }

    if (destLocation.status !== 'active') {
        throw new AppError('Cannot transfer to inactive location', 400);
    }

    // Deduct from source
    sourceStock.remainingQuantity -= quantity;
    if (sourceStock.remainingQuantity === 0) {
        sourceStock.status = 'depleted';
    }
    await sourceStock.save();

    // Create new stock at destination
    const transferredStock = await StockIn.create({
        product: sourceStock.product,
        quantity: quantity,
        remainingQuantity: quantity,
        source: {
            type: 'purchase', // Mark as internal transfer
            companyName: `Transfer from ${fromLocationId}`
        },
        locationId: toLocationId,
        distributionPolicy: sourceStock.distributionPolicy,
        eligibilityRules: sourceStock.eligibilityRules,
        pricing: sourceStock.pricing,
        notes: notes || `Transferred from stock ${stockInId}`,
        createdBy: req.user._id
    });

    // Log the transfer
    await AuditLog.log({
        action: 'transfer',
        module: 'stockIn',
        documentId: stockInId,
        performedBy: req.user._id,
        description: `Transferred ${quantity} ${sourceStock.product.unit} of ${sourceStock.product.name}`,
        previousState: { locationId: fromLocationId, quantity: sourceStock.quantity + quantity },
        newState: { 
            sourceLocationId: fromLocationId, 
            destLocationId: toLocationId, 
            transferredQuantity: quantity 
        },
        locationId: toLocationId
    });

    res.json({
        success: true,
        message: 'Stock transferred successfully',
        data: {
            sourceStock,
            transferredStock
        }
    });
});

/**
 * Get stock statistics
 * @route GET /api/stock-in/stats
 */
exports.getStats = asyncHandler(async (req, res) => {
    const locationFilter = req.locationFilter || {};

    const [stats] = await StockIn.aggregate([
        { $match: locationFilter },
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
                    $sum: {
                        $multiply: ['$quantity', { $ifNull: ['$pricing.costPrice', 0] }]
                    }
                }
            }
        }
    ]);

    // Get category breakdown
    const categoryBreakdown = await StockIn.aggregate([
        { $match: { ...locationFilter, status: 'active' } },
        {
            $group: {
                _id: '$product.category',
                count: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' },
                remainingQuantity: { $sum: '$remainingQuantity' }
            }
        },
        { $sort: { remainingQuantity: -1 } }
    ]);

    // Get source breakdown
    const sourceBreakdown = await StockIn.aggregate([
        { $match: locationFilter },
        {
            $group: {
                _id: '$source.type',
                count: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' }
            }
        }
    ]);

    // Get low stock items
    const lowStockItems = await StockIn.find({
        ...locationFilter,
        status: 'active',
        $expr: { $lte: ['$remainingQuantity', { $multiply: ['$quantity', 0.2] }] }
    })
        .select('product remainingQuantity quantity locationId')
        .populate('locationId', 'name')
        .limit(10);

    res.json({
        success: true,
        data: {
            overview: stats || {
                totalRecords: 0,
                totalQuantity: 0,
                totalRemaining: 0,
                totalDistributed: 0,
                activeCount: 0,
                depletedCount: 0,
                totalValue: 0
            },
            categoryBreakdown,
            sourceBreakdown,
            lowStockItems
        }
    });
});

/**
 * Get product categories
 * @route GET /api/stock-in/categories
 */
exports.getCategories = asyncHandler(async (req, res) => {
    const categories = await StockIn.distinct('product.category');
    res.json({
        success: true,
        data: categories.filter(Boolean).sort()
    });
});
