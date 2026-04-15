const router = require("express").Router();
const c = require("../controllers/externalStockOutController");
const auth = require("../middleware/auth");
const { requirePermission, requireRole, PERMISSIONS } = require("../middleware/rbac");
const { externalStockOutValidators, queryValidators } = require("../validators");

const allowedRoles = ['admin', 'staff', 'master_inventory_manager', 'location_inventory_manager'];

router.post(
    "/",
    auth,
    requireRole(allowedRoles),
    requirePermission(PERMISSIONS.EXTERNAL_STOCK_OUT.CREATE),
    externalStockOutValidators.create,
    c.create
);

router.get(
    "/",
    auth,
    requireRole(allowedRoles),
    requirePermission(PERMISSIONS.EXTERNAL_STOCK_OUT.READ),
    queryValidators.pagination,
    c.get
);

router.get(
    "/:id",
    auth,
    requireRole(allowedRoles),
    requirePermission(PERMISSIONS.EXTERNAL_STOCK_OUT.READ),
    externalStockOutValidators.getById,
    c.getById
);

router.put(
    "/:id",
    auth,
    requireRole(allowedRoles),
    requirePermission(PERMISSIONS.EXTERNAL_STOCK_OUT.UPDATE),
    externalStockOutValidators.update,
    c.update
);

router.delete(
    "/:id",
    auth,
    requireRole(allowedRoles),
    requirePermission(PERMISSIONS.EXTERNAL_STOCK_OUT.DELETE),
    externalStockOutValidators.getById,
    c.delete
);

module.exports = router;
