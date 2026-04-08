const router = require('express').Router();
const c = require('../controllers/FundCategoryController');
const auth = require('../middleware/auth');
const { requirePermission, requireRole, PERMISSIONS } = require('../middleware/rbac');
const { fundCategoryValidators, queryValidators } = require('../validators');

// Category CRUD
router.post(
    '/',
    auth,
    requireRole(['admin', 'staff']),
    requirePermission(PERMISSIONS.FUND_CATEGORIES.CREATE),
    fundCategoryValidators.createCategory,
    c.createCategory
);

router.get(
    '/',
    auth,
    requireRole(['admin', 'staff']),
    requirePermission(PERMISSIONS.FUND_CATEGORIES.READ),
    queryValidators.pagination,
    c.getCategories
);

router.get(
    '/:id',
    auth,
    requireRole(['admin', 'staff']),
    requirePermission(PERMISSIONS.FUND_CATEGORIES.READ),
    fundCategoryValidators.getCategoryById,
    c.getCategoryById
);

router.put(
    '/:id',
    auth,
    requireRole(['admin', 'staff']),
    requirePermission(PERMISSIONS.FUND_CATEGORIES.UPDATE),
    fundCategoryValidators.updateCategory,
    c.updateCategory
);

router.delete(
    '/:id',
    auth,
    requireRole(['admin', 'staff']),
    requirePermission(PERMISSIONS.FUND_CATEGORIES.DELETE),
    fundCategoryValidators.getCategoryById,
    c.deleteCategory
);

// Subcategory CRUD
router.get(
    '/:categoryId/subcategories',
    auth,
    requireRole(['admin', 'staff']),
    requirePermission(PERMISSIONS.FUND_CATEGORIES.READ),
    fundCategoryValidators.getSubcategories,
    c.getSubcategories
);

router.post(
    '/:categoryId/subcategories',
    auth,
    requireRole(['admin', 'staff']),
    requirePermission(PERMISSIONS.FUND_CATEGORIES.CREATE),
    fundCategoryValidators.createSubcategory,
    c.createSubcategory
);

router.put(
    '/subcategories/:id',
    auth,
    requireRole(['admin', 'staff']),
    requirePermission(PERMISSIONS.FUND_CATEGORIES.UPDATE),
    fundCategoryValidators.updateSubcategory,
    c.updateSubcategory
);

router.delete(
    '/subcategories/:id',
    auth,
    requireRole(['admin', 'staff']),
    requirePermission(PERMISSIONS.FUND_CATEGORIES.DELETE),
    fundCategoryValidators.updateSubcategory,
    c.deleteSubcategory
);

module.exports = router;
