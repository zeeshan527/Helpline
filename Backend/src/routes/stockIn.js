
const router = require("express").Router();
const c = require("../controllers/stockInController");
const auth = require("../middleware/auth");
const { requirePermission, filterByLocation, requireLocationAccess, requireRole, PERMISSIONS } = require("../middleware/rbac");
const { stockInValidators, queryValidators } = require("../validators");

// Get stats (must be before /:id route)
router.get("/stats", auth, requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']), filterByLocation, c.getStats);

// Get categories
router.get("/categories", auth, requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']), c.getCategories);

// Transfer stock
router.post("/transfer", 
    auth, 
    requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']),
    requirePermission(PERMISSIONS.STOCK_IN.TRANSFER || PERMISSIONS.STOCK_IN.UPDATE),
    stockInValidators.transfer, 
    c.transfer
);

// CRUD operations
router.post("/", 
    auth, 
    requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']),
    requirePermission(PERMISSIONS.STOCK_IN.CREATE),
    requireLocationAccess('locationId'),
    stockInValidators.create, 
    c.create
);

router.get("/", 
    auth, 
    requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']),
    requirePermission(PERMISSIONS.STOCK_IN.READ),
    filterByLocation,
    queryValidators.pagination, 
    c.get
);

router.get("/:id", 
    auth, 
    requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']),
    requirePermission(PERMISSIONS.STOCK_IN.READ),
    stockInValidators.getById, 
    c.getById
);

router.put("/:id", 
    auth, 
    requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']),
    requirePermission(PERMISSIONS.STOCK_IN.UPDATE),
    stockInValidators.update, 
    c.update
);

router.delete("/:id",
    auth,
    requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']),
    requirePermission(PERMISSIONS.STOCK_IN.DELETE),
    stockInValidators.getById,
    c.delete
);

module.exports = router;
