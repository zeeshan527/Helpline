const ExternalStockOut = require("../models/ExternalStockOut");
const ExternalStockIn = require("../models/ExternalStockIn");
const Beneficiary = require("../models/Beneficiary");
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

const restoreSourceQuantity = async (sourceId, quantity) => {
    const source = await ExternalStockIn.findById(sourceId);
    if (!source) {
        return null;
    }

    source.remainingQuantity = Math.min(source.quantity, (source.remainingQuantity || 0) + quantity);
    await source.save();
    return source;
};

const consumeSourceQuantity = async (sourceId, quantity) => {
    const source = await ExternalStockIn.findById(sourceId);
    if (!source) {
        throw new AppError('External stock source not found', 404);
    }

    const availableQuantity = source.remainingQuantity ?? source.quantity;
    if (availableQuantity < quantity) {
        throw new AppError(`Insufficient stock. Available: ${availableQuantity}, Requested: ${quantity}`, 400);
    }

    source.remainingQuantity = availableQuantity - quantity;
    await source.save();
    return source;
};

const populateRecord = async (record) => {
    await record.populate([
        { path: 'externalStockInId', select: 'packageName remainingQuantity quantity locationId' },
        { path: 'beneficiaryId', select: 'basicInfo status locationId' },
        { path: 'locationId', select: 'name type' },
        { path: 'createdBy', select: 'name email' },
        { path: 'lastModifiedBy', select: 'name email' }
    ]);
    return record;
};

exports.create = asyncHandler(async (req, res) => {
    const { externalStockInId, beneficiaryId, quantity, notes } = req.body;

    const source = await ExternalStockIn.findById(externalStockInId)
        .populate('locationId', 'name type status');

    if (!source) {
        throw new AppError('External stock package not found', 404);
    }

    const beneficiary = await Beneficiary.findById(beneficiaryId);
    if (!beneficiary) {
        throw new AppError('Beneficiary not found', 404);
    }

    if (beneficiary.status !== 'approved') {
        throw new AppError('Beneficiary must be approved before distribution', 400);
    }

    if (!hasLocationAccess(req, source.locationId._id)) {
        throw new AppError('Not authorized for this location', 403);
    }

    if (source.locationId.status !== 'active') {
        throw new AppError('Cannot distribute from inactive location', 400);
    }

    const availableQuantity = source.remainingQuantity ?? source.quantity;
    if (availableQuantity < quantity) {
        throw new AppError(`Insufficient quantity. Available: ${availableQuantity}`, 400);
    }

    const stockOut = await ExternalStockOut.create({
        externalStockInId: source._id,
        packageName: source.packageName,
        beneficiaryId,
        locationId: source.locationId._id,
        quantity,
        notes,
        createdBy: req.user._id
    });

    source.remainingQuantity = availableQuantity - quantity;
    await source.save();

    beneficiary.distributionHistory.totalReceived += quantity;
    beneficiary.distributionHistory.lastDistributionDate = new Date();
    beneficiary.distributionHistory.lastDistributionItems.push({
        productName: source.packageName,
        quantity,
        date: new Date()
    });
    if (beneficiary.distributionHistory.lastDistributionItems.length > 10) {
        beneficiary.distributionHistory.lastDistributionItems = beneficiary.distributionHistory.lastDistributionItems.slice(-10);
    }
    await beneficiary.save();

    await populateRecord(stockOut);

    await AuditLog.log({
        action: 'stock_out',
        module: 'externalStockOut',
        documentId: stockOut._id,
        performedBy: req.user._id,
        description: `Distributed external package ${source.packageName} to ${beneficiary.basicInfo.headOfFamilyName}`,
        newState: {
            packageName: source.packageName,
            quantity,
            beneficiary: beneficiary.basicInfo.headOfFamilyName,
            locationId: source.locationId._id
        },
        locationId: source.locationId._id
    });

    res.status(201).json({
        success: true,
        message: 'External stock distribution recorded successfully',
        data: stockOut
    });
});

exports.get = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        search,
        beneficiaryId,
        locationId,
        status,
        sortBy = 'distributionDate',
        sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (req.user.role === 'location_inventory_manager') {
        const assignedLocations = req.user.assignedLocations || [];
        query.locationId = { $in: assignedLocations };
    }

    if (beneficiaryId) {
        query.beneficiaryId = beneficiaryId;
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

    if (status) {
        query.status = status;
    }

    if (search) {
        query.$or = [
            { packageName: { $regex: search, $options: 'i' } },
            { notes: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
        ExternalStockOut.find(query)
            .populate('externalStockInId', 'packageName quantity remainingQuantity locationId')
            .populate('beneficiaryId', 'basicInfo status')
            .populate('locationId', 'name type')
            .populate('createdBy', 'name')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit, 10)),
        ExternalStockOut.countDocuments(query)
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
    const item = await ExternalStockOut.findById(req.params.id)
        .populate('externalStockInId', 'packageName quantity remainingQuantity locationId')
        .populate('beneficiaryId', 'basicInfo status')
        .populate('locationId', 'name type')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

    if (!item) {
        throw new AppError('External stock distribution not found', 404);
    }

    if (!hasLocationAccess(req, item.locationId._id)) {
        throw new AppError('Not authorized to view this distribution', 403);
    }

    res.json({
        success: true,
        data: item
    });
});

exports.update = asyncHandler(async (req, res) => {
    const item = await ExternalStockOut.findById(req.params.id);

    if (!item) {
        throw new AppError('External stock distribution not found', 404);
    }

    if (!hasLocationAccess(req, item.locationId)) {
        throw new AppError('Not authorized to update this distribution', 403);
    }

    const sourceBefore = await restoreSourceQuantity(item.externalStockInId, item.quantity);
    if (!sourceBefore) {
        throw new AppError('Source stock not found for this distribution', 404);
    }

    const nextExternalStockInId = req.body.externalStockInId || item.externalStockInId;
    const nextQuantity = req.body.quantity !== undefined ? parseInt(req.body.quantity, 10) : item.quantity;
    const nextBeneficiaryId = req.body.beneficiaryId || item.beneficiaryId;
    const nextNotes = req.body.notes !== undefined ? req.body.notes : item.notes;

    const nextSource = await ExternalStockIn.findById(nextExternalStockInId).populate('locationId', 'status name type');
    if (!nextSource) {
        await consumeSourceQuantity(item.externalStockInId, item.quantity);
        throw new AppError('External stock package not found', 404);
    }

    if (!hasLocationAccess(req, nextSource.locationId._id)) {
        await consumeSourceQuantity(item.externalStockInId, item.quantity);
        throw new AppError('Not authorized for the selected location', 403);
    }

    if (nextSource.locationId.status !== 'active') {
        await consumeSourceQuantity(item.externalStockInId, item.quantity);
        throw new AppError('Cannot distribute from inactive location', 400);
    }

    const availableQuantity = nextSource.remainingQuantity ?? nextSource.quantity;
    if (availableQuantity < nextQuantity) {
        await consumeSourceQuantity(item.externalStockInId, item.quantity);
        throw new AppError(`Insufficient quantity. Available: ${availableQuantity}`, 400);
    }

    const nextBeneficiary = await Beneficiary.findById(nextBeneficiaryId);
    if (!nextBeneficiary) {
        await consumeSourceQuantity(item.externalStockInId, item.quantity);
        throw new AppError('Beneficiary not found', 404);
    }
    if (nextBeneficiary.status !== 'approved') {
        await consumeSourceQuantity(item.externalStockInId, item.quantity);
        throw new AppError('Beneficiary must be approved before distribution', 400);
    }

    const previousState = {
        externalStockInId: item.externalStockInId,
        beneficiaryId: item.beneficiaryId,
        quantity: item.quantity,
        notes: item.notes
    };

    try {
        await consumeSourceQuantity(nextSource._id, nextQuantity);
    } catch (error) {
        await consumeSourceQuantity(item.externalStockInId, item.quantity);
        throw error;
    }

    item.externalStockInId = nextSource._id;
    item.packageName = nextSource.packageName;
    item.beneficiaryId = nextBeneficiary._id;
    item.locationId = nextSource.locationId._id;
    item.quantity = nextQuantity;
    item.notes = nextNotes;
    item.lastModifiedBy = req.user._id;
    await item.save();

    await AuditLog.log({
        action: 'update',
        module: 'externalStockOut',
        documentId: item._id,
        performedBy: req.user._id,
        description: `Updated external stock distribution: ${item.packageName}`,
        previousState,
        newState: {
            externalStockInId: item.externalStockInId,
            beneficiaryId: item.beneficiaryId,
            quantity: item.quantity,
            notes: item.notes
        },
        locationId: item.locationId
    });

    await populateRecord(item);

    res.json({
        success: true,
        message: 'External stock distribution updated successfully',
        data: item
    });
});

exports.delete = asyncHandler(async (req, res) => {
    const item = await ExternalStockOut.findById(req.params.id);

    if (!item) {
        throw new AppError('External stock distribution not found', 404);
    }

    if (!hasLocationAccess(req, item.locationId)) {
        throw new AppError('Not authorized to delete this distribution', 403);
    }

    await restoreSourceQuantity(item.externalStockInId, item.quantity);
    await ExternalStockOut.deleteOne({ _id: item._id });

    await AuditLog.log({
        action: 'delete',
        module: 'externalStockOut',
        documentId: item._id,
        performedBy: req.user._id,
        description: `Deleted external stock distribution: ${item.packageName}`,
        previousState: {
            externalStockInId: item.externalStockInId,
            beneficiaryId: item.beneficiaryId,
            quantity: item.quantity,
            locationId: item.locationId
        },
        locationId: item.locationId
    });

    res.json({
        success: true,
        message: 'External stock distribution deleted successfully'
    });
});
