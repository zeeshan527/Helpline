const FundCategory = require('../models/FundCategory');
const FundSubCategory = require('../models/FundSubCategory');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * Create fund category
 * @route POST /api/fund-categories
 */
exports.createCategory = asyncHandler(async (req, res) => {
    const category = await FundCategory.create({
        ...req.body,
        createdBy: req.user._id
    });

    res.status(201).json({
        success: true,
        message: 'Fund category created successfully',
        data: category
    });
});

/**
 * Get fund categories
 * @route GET /api/fund-categories
 */
exports.getCategories = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        search,
        status,
        includeSubcategories = 'false',
        sortBy = 'name',
        sortOrder = 'asc'
    } = req.query;

    const query = {};
    if (status) query.status = status;

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } }
        ];
    }

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const skip = (parsedPage - 1) * parsedLimit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [categories, total] = await Promise.all([
        FundCategory.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parsedLimit),
        FundCategory.countDocuments(query)
    ]);

    let data = categories;

    if (includeSubcategories === 'true') {
        const categoryIds = categories.map((cat) => cat._id);
        const subcategories = await FundSubCategory.find({
            categoryId: { $in: categoryIds }
        }).sort({ name: 1 });

        const subMap = subcategories.reduce((acc, item) => {
            const key = item.categoryId.toString();
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});

        data = categories.map((category) => ({
            ...category.toObject(),
            subcategories: subMap[category._id.toString()] || []
        }));
    }

    res.json({
        success: true,
        data,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get fund category by ID
 * @route GET /api/fund-categories/:id
 */
exports.getCategoryById = asyncHandler(async (req, res) => {
    const category = await FundCategory.findById(req.params.id);

    if (!category) {
        throw new AppError('Fund category not found', 404);
    }

    const subcategories = await FundSubCategory.find({ categoryId: category._id })
        .sort({ name: 1 });

    res.json({
        success: true,
        data: {
            ...category.toObject(),
            subcategories
        }
    });
});

/**
 * Update fund category
 * @route PUT /api/fund-categories/:id
 */
exports.updateCategory = asyncHandler(async (req, res) => {
    const category = await FundCategory.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!category) {
        throw new AppError('Fund category not found', 404);
    }

    res.json({
        success: true,
        message: 'Fund category updated successfully',
        data: category
    });
});

/**
 * Delete fund category
 * @route DELETE /api/fund-categories/:id
 */
exports.deleteCategory = asyncHandler(async (req, res) => {
    const category = await FundCategory.findById(req.params.id);

    if (!category) {
        throw new AppError('Fund category not found', 404);
    }

    const subCount = await FundSubCategory.countDocuments({ categoryId: category._id });
    if (subCount > 0) {
        throw new AppError('Cannot delete category with subcategories. Delete subcategories first.', 400);
    }

    await FundCategory.findByIdAndDelete(req.params.id);

    res.json({
        success: true,
        message: 'Fund category deleted successfully'
    });
});

/**
 * Get subcategories for a category
 * @route GET /api/fund-categories/:categoryId/subcategories
 */
exports.getSubcategories = asyncHandler(async (req, res) => {
    const category = await FundCategory.findById(req.params.categoryId);
    if (!category) {
        throw new AppError('Fund category not found', 404);
    }

    const { status } = req.query;
    const query = { categoryId: req.params.categoryId };
    if (status) query.status = status;

    const subcategories = await FundSubCategory.find(query).sort({ name: 1 });

    res.json({
        success: true,
        data: subcategories
    });
});

/**
 * Create subcategory
 * @route POST /api/fund-categories/:categoryId/subcategories
 */
exports.createSubcategory = asyncHandler(async (req, res) => {
    const category = await FundCategory.findById(req.params.categoryId);
    if (!category) {
        throw new AppError('Fund category not found', 404);
    }

    const subcategory = await FundSubCategory.create({
        ...req.body,
        categoryId: req.params.categoryId,
        createdBy: req.user._id
    });

    res.status(201).json({
        success: true,
        message: 'Fund subcategory created successfully',
        data: subcategory
    });
});

/**
 * Update subcategory
 * @route PUT /api/fund-categories/subcategories/:id
 */
exports.updateSubcategory = asyncHandler(async (req, res) => {
    const subcategory = await FundSubCategory.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).populate('categoryId', 'name');

    if (!subcategory) {
        throw new AppError('Fund subcategory not found', 404);
    }

    res.json({
        success: true,
        message: 'Fund subcategory updated successfully',
        data: subcategory
    });
});

/**
 * Delete subcategory
 * @route DELETE /api/fund-categories/subcategories/:id
 */
exports.deleteSubcategory = asyncHandler(async (req, res) => {
    const subcategory = await FundSubCategory.findById(req.params.id);

    if (!subcategory) {
        throw new AppError('Fund subcategory not found', 404);
    }

    await FundSubCategory.findByIdAndDelete(req.params.id);

    res.json({
        success: true,
        message: 'Fund subcategory deleted successfully'
    });
});
