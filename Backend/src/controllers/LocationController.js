
const Location = require("../models/Location");
const StockIn = require("../models/StockIn");
const StockOut = require("../models/StockOut");
const AuditLog = require("../models/AuditLog");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

/**
 * Create a new location
 * @route POST /api/locations
 */
exports.create = asyncHandler(async (req, res) => {
    const locationData = {
        ...req.body,
        createdBy: req.user._id
    };

    // Verify parent location exists if provided
    if (req.body.parentLocationId) {
        const parent = await Location.findById(req.body.parentLocationId);
        if (!parent) {
            throw new AppError('Parent location not found', 404);
        }
    }

    // Generate code if not provided
    if (!locationData.code) {
        const prefix = locationData.type.substring(0, 3).toUpperCase();
        const count = await Location.countDocuments({ type: locationData.type });
        locationData.code = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    }

    const location = await Location.create(locationData);

    // Populate parent reference
    await location.populate('parentLocationId', 'name type');

    // Log the action
    await AuditLog.log({
        action: 'create',
        module: 'location',
        documentId: location._id,
        performedBy: req.user._id,
        description: `Created location: ${location.name}`,
        newState: { name: location.name, type: location.type, code: location.code },
        locationId: location._id
    });

    res.status(201).json({
        success: true,
        message: 'Location created successfully',
        data: location
    });
});

/**
 * Get all locations with filtering
 * @route GET /api/locations
 */
exports.get = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 50,
        type,
        status,
        search,
        parentId,
        sortBy = 'name',
        sortOrder = 'asc',
        tree = false
    } = req.query;

    // Build query
    const query = {};

    // For staff, filter by assigned locations
    if (req.user.role !== 'admin' && req.user.assignedLocations?.length > 0) {
        query._id = { $in: req.user.assignedLocations };
    }

    if (type) query.type = type;
    if (status) query.status = status;
    if (parentId === 'null') {
        query.parentLocationId = null;
    } else if (parentId) {
        query.parentLocationId = parentId;
    }

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
            { 'address.city': { $regex: search, $options: 'i' } }
        ];
    }

    // If tree view is requested, return hierarchical structure
    if (tree === 'true') {
        const rootLocations = await Location.find({ 
            ...query, 
            parentLocationId: null 
        }).sort({ name: 1 });

        const buildTree = async (locations) => {
            const result = [];
            for (const loc of locations) {
                const children = await Location.find({ parentLocationId: loc._id });
                result.push({
                    ...loc.toObject(),
                    children: await buildTree(children)
                });
            }
            return result;
        };

        const tree = await buildTree(rootLocations);
        return res.json({
            success: true,
            data: tree
        });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [locations, total] = await Promise.all([
        Location.find(query)
            .populate('parentLocationId', 'name type')
            .populate('manager', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit)),
        Location.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: locations,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single location by ID
 * @route GET /api/locations/:id
 */
exports.getById = asyncHandler(async (req, res) => {
    const location = await Location.findById(req.params.id)
        .populate('parentLocationId', 'name type code')
        .populate('manager', 'name email phone')
        .populate('createdBy', 'name email');

    if (!location) {
        throw new AppError('Location not found', 404);
    }

    // Get children
    const children = await Location.find({ parentLocationId: location._id })
        .select('name type code status');

    // Get path (breadcrumb)
    const path = await location.getPath();

    res.json({
        success: true,
        data: {
            ...location.toObject(),
            children,
            path: path.map(p => ({ _id: p._id, name: p.name, type: p.type }))
        }
    });
});

/**
 * Update location
 * @route PUT /api/locations/:id
 */
exports.update = asyncHandler(async (req, res) => {
    const location = await Location.findById(req.params.id);

    if (!location) {
        throw new AppError('Location not found', 404);
    }

    // Prevent setting parent as self
    if (req.body.parentLocationId === req.params.id) {
        throw new AppError('A location cannot be its own parent', 400);
    }

    // Verify parent location exists if provided
    if (req.body.parentLocationId) {
        const parent = await Location.findById(req.body.parentLocationId);
        if (!parent) {
            throw new AppError('Parent location not found', 404);
        }
    }

    const previousState = {
        name: location.name,
        type: location.type,
        status: location.status
    };

    // Update fields
    Object.assign(location, req.body);
    await location.save();

    // Populate for response
    await location.populate([
        { path: 'parentLocationId', select: 'name type' },
        { path: 'manager', select: 'name email' }
    ]);

    // Log the action
    await AuditLog.log({
        action: 'update',
        module: 'location',
        documentId: location._id,
        performedBy: req.user._id,
        description: `Updated location: ${location.name}`,
        previousState,
        newState: {
            name: location.name,
            type: location.type,
            status: location.status
        },
        locationId: location._id
    });

    res.json({
        success: true,
        message: 'Location updated successfully',
        data: location
    });
});

/**
 * Delete location
 * @route DELETE /api/locations/:id
 */
exports.delete = asyncHandler(async (req, res) => {
    const location = await Location.findById(req.params.id);

    if (!location) {
        throw new AppError('Location not found', 404);
    }

    // Check for child locations
    const childCount = await Location.countDocuments({ parentLocationId: req.params.id });
    if (childCount > 0) {
        throw new AppError(
            `Cannot delete location with ${childCount} child locations. Delete children first.`,
            400
        );
    }

    // Check for stock records
    const stockInCount = await StockIn.countDocuments({ locationId: req.params.id });
    const stockOutCount = await StockOut.countDocuments({ locationId: req.params.id });

    if (stockInCount > 0 || stockOutCount > 0) {
        throw new AppError(
            `Cannot delete location with inventory records. Consider marking as inactive instead.`,
            400
        );
    }

    await Location.findByIdAndDelete(req.params.id);

    // Log the action
    await AuditLog.log({
        action: 'delete',
        module: 'location',
        documentId: location._id,
        performedBy: req.user._id,
        description: `Deleted location: ${location.name}`,
        previousState: { name: location.name, type: location.type, code: location.code }
    });

    res.json({
        success: true,
        message: 'Location deleted successfully'
    });
});

/**
 * Get location inventory
 * @route GET /api/locations/:id/inventory
 */
exports.getInventory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status = 'active' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { locationId: req.params.id };
    if (status) query.status = status;

    const [inventory, total] = await Promise.all([
        StockIn.find(query)
            .populate('source.referenceId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        StockIn.countDocuments(query)
    ]);

    // Calculate summary
    const summary = await StockIn.aggregate([
        { $match: { locationId: require('mongoose').Types.ObjectId(req.params.id), status: 'active' } },
        {
            $group: {
                _id: '$product.category',
                totalQuantity: { $sum: '$quantity' },
                remainingQuantity: { $sum: '$remainingQuantity' },
                itemCount: { $sum: 1 }
            }
        }
    ]);

    res.json({
        success: true,
        data: {
            inventory,
            summary
        },
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get location statistics
 * @route GET /api/locations/stats
 */
exports.getStats = asyncHandler(async (req, res) => {
    const locationFilter = req.user.role === 'admin' 
        ? {} 
        : { _id: { $in: req.user.assignedLocations || [] } };

    const [locationStats] = await Location.aggregate([
        { $match: locationFilter },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
                byType: { $push: '$type' }
            }
        },
        {
            $project: {
                total: 1,
                active: 1,
                inactive: 1,
                typeBreakdown: {
                    shop: { $size: { $filter: { input: '$byType', cond: { $eq: ['$$this', 'shop'] } } } },
                    warehouse: { $size: { $filter: { input: '$byType', cond: { $eq: ['$$this', 'warehouse'] } } } },
                    office: { $size: { $filter: { input: '$byType', cond: { $eq: ['$$this', 'office'] } } } },
                    depot: { $size: { $filter: { input: '$byType', cond: { $eq: ['$$this', 'depot'] } } } },
                    distribution_center: { $size: { $filter: { input: '$byType', cond: { $eq: ['$$this', 'distribution_center'] } } } }
                }
            }
        }
    ]);

    res.json({
        success: true,
        data: locationStats || { total: 0, active: 0, inactive: 0, typeBreakdown: {} }
    });
});
