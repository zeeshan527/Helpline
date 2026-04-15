const router = require("express").Router();
const c = require("../controllers/externalStockInController");
const auth = require("../middleware/auth");
const {
    requirePermission,
    requireRole,
    PERMISSIONS
} = require("../middleware/rbac");
const { externalStockInValidators, queryValidators } = require("../validators");

const allowedRoles = ['admin', 'staff', 'master_inventory_manager', 'location_inventory_manager'];

router.post(
    "/transfer",
    auth,
    requireRole(allowedRoles),
    requirePermission(PERMISSIONS.EXTERNAL_STOCK_IN.UPDATE),
    externalStockInValidators.transfer,
    c.transfer
);

router.post(
    "/",
    auth,
    requireRole(allowedRoles),
    requirePermission(PERMISSIONS.EXTERNAL_STOCK_IN.CREATE),
    externalStockInValidators.create,
    c.create
);

router.get(
    "/",
    auth,
    requireRole(allowedRoles),
    requirePermission(PERMISSIONS.EXTERNAL_STOCK_IN.READ),
    queryValidators.pagination,
    c.get
);

router.get(
    "/:id",
    auth,
    requireRole(allowedRoles),
    requirePermission(PERMISSIONS.EXTERNAL_STOCK_IN.READ),
    externalStockInValidators.getById,
    c.getById
);

router.put(
    "/:id",
    auth,
    requireRole(allowedRoles),
    requirePermission(PERMISSIONS.EXTERNAL_STOCK_IN.UPDATE),
    externalStockInValidators.update,
    c.update
);

router.delete(
    "/:id",
    auth,
    requireRole(allowedRoles),
    requirePermission(PERMISSIONS.EXTERNAL_STOCK_IN.DELETE),
    externalStockInValidators.getById,
    c.delete
);

module.exports = router;
