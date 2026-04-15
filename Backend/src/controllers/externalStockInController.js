const ExternalStockIn = require("../models/ExternalStockIn");
const Donor = require("../models/Donor");
const Location = require("../models/Location");
const AuditLog = require("../models/AuditLog");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

const hasLocationAccess = (req, locationId) => {
    if (req.user.role !== 'location_inventory_manager') {
        return true;
    }

    const assignedLocations = req.user.assignedLocations || [];
    return assignedLocations.some((loc) => loc.toString() === locationId.toString());
};

exports.create = asyncHandler(async (req, res) => {
    const { packageName, quantity, donorId, locationId, notes } = req.body;

    const [donor, location] = await Promise.all([
        Donor.findById(donorId),
        Location.findById(locationId)
    ]);

    if (!donor) {
        throw new AppError('Donor not found', 404);
    }

    if (!location) {
        throw new AppError('Location not found', 404);
    }

    if (location.status !== 'active') {
        throw new AppError('Cannot add external stock to inactive location', 400);
    }

    if (!hasLocationAccess(req, location._id)) {
        throw new AppError('Not authorized for this location', 403);
    }

    const externalStockIn = await ExternalStockIn.create({
        packageName,
        quantity,
        remainingQuantity: quantity,
        donorId,
        locationId,
        notes,
        createdBy: req.user._id
    });

    await externalStockIn.populate([
        { path: 'donorId', select: 'name type' },
        { path: 'locationId', select: 'name type' },
        { path: 'createdBy', select: 'name email' }
    ]);

    await AuditLog.log({
        action: 'create',
        module: 'externalStockIn',
        documentId: externalStockIn._id,
        performedBy: req.user._id,
        description: `Created external stock package: ${packageName}`,
        newState: {
            packageName,
            quantity,
            donorId,
            locationId
        },
        locationId
    });

    res.status(201).json({
        success: true,
        message: 'External stock added successfully',
        data: externalStockIn
    });
});

exports.get = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        search,
        donorId,
        locationId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (req.user.role === 'location_inventory_manager') {
        const assignedLocations = req.user.assignedLocations || [];
        query.locationId = { $in: assignedLocations };
    }

    if (donorId) {
        query.donorId = donorId;
    }

    if (locationId) {
        if (req.user.role === 'location_inventory_manager') {
            const assignedLocations = (req.user.assignedLocations || []).map((loc) => loc.toString());
            if (!assignedLocations.includes(locationId.toString())) {
                query.locationId = { $in: [] };
            } else {
                query.locationId = locationId;
            }
        } else {
            query.locationId = locationId;
        }
    }

    if (search) {
        query.$text = { $search: search };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
        ExternalStockIn.find(query)
            .populate('donorId', 'name type')
            .populate('locationId', 'name type')
            .populate('createdBy', 'name')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit, 10)),
        ExternalStockIn.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: items,
        pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            pages: Math.ceil(total / parseInt(limit, 10))
        }
    });
});

exports.getById = asyncHandler(async (req, res) => {
    const item = await ExternalStockIn.findById(req.params.id)
        .populate('donorId', 'name type')
        .populate('locationId', 'name type')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

    if (!item) {
        throw new AppError('External stock record not found', 404);
    }

    if (!hasLocationAccess(req, item.locationId._id)) {
        throw new AppError('Not authorized to view this external stock record', 403);
    }

    res.json({
        success: true,
        data: item
    });
});

exports.update = asyncHandler(async (req, res) => {
    const item = await ExternalStockIn.findById(req.params.id);

    if (!item) {
        throw new AppError('External stock record not found', 404);
    }

    if (!hasLocationAccess(req, item.locationId)) {
        throw new AppError('Not authorized to update this external stock record', 403);
    }

    const nextLocationId = req.body.locationId || item.locationId;
    if (!hasLocationAccess(req, nextLocationId)) {
        throw new AppError('Not authorized for the selected location', 403);
    }

    if (req.body.donorId) {
        const donor = await Donor.findById(req.body.donorId);
        if (!donor) {
            throw new AppError('Donor not found', 404);
        }
    }

    if (req.body.locationId) {
        const location = await Location.findById(req.body.locationId);
        if (!location) {
            throw new AppError('Location not found', 404);
        }
        if (location.status !== 'active') {
            throw new AppError('Cannot move external stock to inactive location', 400);
        }
    }

    const previousState = {
        packageName: item.packageName,
        quantity: item.quantity,
        remainingQuantity: item.remainingQuantity,
        donorId: item.donorId,
        locationId: item.locationId
    };

    const allowedUpdates = ['packageName', 'donorId', 'locationId', 'notes'];
    allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
            item[field] = req.body[field];
        }
    });

    if (req.body.quantity !== undefined) {
        const nextQuantity = parseInt(req.body.quantity, 10);
        const distributedQuantity = Math.max(0, (item.quantity || 0) - (item.remainingQuantity || 0));
        item.quantity = nextQuantity;
        item.remainingQuantity = Math.max(0, nextQuantity - distributedQuantity);
    }

    item.lastModifiedBy = req.user._id;
    await item.save();

    await AuditLog.log({
        action: 'update',
        module: 'externalStockIn',
        documentId: item._id,
        performedBy: req.user._id,
        description: `Updated external stock package: ${item.packageName}`,
        previousState,
        newState: {
            packageName: item.packageName,
            quantity: item.quantity,
            remainingQuantity: item.remainingQuantity,
            donorId: item.donorId,
            locationId: item.locationId
        },
        locationId: item.locationId
    });

    await item.populate([
        { path: 'donorId', select: 'name type' },
        { path: 'locationId', select: 'name type' },
        { path: 'createdBy', select: 'name email' },
        { path: 'lastModifiedBy', select: 'name email' }
    ]);

    res.json({
        success: true,
        message: 'External stock updated successfully',
        data: item
    });
});

exports.delete = asyncHandler(async (req, res) => {
    const item = await ExternalStockIn.findById(req.params.id);

    if (!item) {
        throw new AppError('External stock record not found', 404);
    }

    if (!hasLocationAccess(req, item.locationId)) {
        throw new AppError('Not authorized to delete this external stock record', 403);
    }

    await ExternalStockIn.deleteOne({ _id: item._id });

    await AuditLog.log({
        action: 'delete',
        module: 'externalStockIn',
        documentId: item._id,
        performedBy: req.user._id,
        description: `Deleted external stock package: ${item.packageName}`,
        previousState: {
            packageName: item.packageName,
            quantity: item.quantity,
            donorId: item.donorId,
            locationId: item.locationId
        },
        locationId: item.locationId
    });

    res.json({
        success: true,
        message: 'External stock deleted successfully'
    });
});

exports.transfer = asyncHandler(async (req, res) => {
    const { externalStockInId, toLocationId, quantity, notes } = req.body;

    const sourceRecord = await ExternalStockIn.findById(externalStockInId);
    if (!sourceRecord) {
        throw new AppError('External stock record not found', 404);
    }

    if (!hasLocationAccess(req, sourceRecord.locationId)) {
        throw new AppError('Not authorized to transfer from this location', 403);
    }

    if (!hasLocationAccess(req, toLocationId)) {
        throw new AppError('Not authorized to transfer to this location', 403);
    }

    const destination = await Location.findById(toLocationId);
    if (!destination) {
        throw new AppError('Destination location not found', 404);
    }

    if (destination.status !== 'active') {
        throw new AppError('Cannot transfer to inactive location', 400);
    }

    const transferQuantity = parseInt(quantity, 10);
    if (transferQuantity > sourceRecord.quantity) {
        throw new AppError(`Insufficient quantity. Available: ${sourceRecord.quantity}`, 400);
    }

    if (sourceRecord.locationId.toString() === toLocationId.toString()) {
        throw new AppError('Source and destination locations must be different', 400);
    }

    const transferredRecord = await ExternalStockIn.create({
        packageName: sourceRecord.packageName,
        quantity: transferQuantity,
        remainingQuantity: transferQuantity,
        donorId: sourceRecord.donorId,
        locationId: toLocationId,
        notes: notes || `Transferred from location ${sourceRecord.locationId}`,
        createdBy: req.user._id
    });

    const availableQuantity = sourceRecord.remainingQuantity ?? sourceRecord.quantity;
    sourceRecord.remainingQuantity = availableQuantity - transferQuantity;
    sourceRecord.lastModifiedBy = req.user._id;
    await sourceRecord.save();

    await AuditLog.log({
        action: 'transfer',
        module: 'externalStockIn',
        documentId: sourceRecord._id,
        performedBy: req.user._id,
        description: `Transferred ${transferQuantity} of ${sourceRecord.packageName} to location ${toLocationId}`,
        previousState: {
            sourceLocationId: sourceRecord.locationId,
            quantity: sourceRecord.quantity,
            remainingQuantity: availableQuantity
        },
        newState: {
            sourceLocationId: sourceRecord.locationId,
            destinationLocationId: toLocationId,
            transferredQuantity: transferQuantity,
            remainingQuantity: sourceRecord.remainingQuantity
        },
        locationId: toLocationId
    });

    await transferredRecord.populate([
        { path: 'donorId', select: 'name type' },
        { path: 'locationId', select: 'name type' },
        { path: 'createdBy', select: 'name email' }
    ]);

    res.json({
        success: true,
        message: 'External stock transferred successfully',
        data: {
            sourceRecord,
            transferredRecord
        }
    });
});
