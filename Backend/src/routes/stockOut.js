
const router = require("express").Router();
const c = require("../controllers/stockOutController");
const auth = require("../middleware/auth");
const { requirePermission, filterByLocation, requireLocationAccess, requireRole, PERMISSIONS } = require("../middleware/rbac");
const validatePolicy = require("../middleware/policy");
const { stockOutValidators, queryValidators } = require("../validators");

// Get stats (must be before /:id route)
router.get("/stats", auth, requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']), filterByLocation, c.getStats);

// Create distribution
router.post("/", 
    auth, 
    requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']),
    requirePermission(PERMISSIONS.STOCK_OUT.CREATE),
    requireLocationAccess('locationId'),
    stockOutValidators.create, 
    validatePolicy,
    c.create
);

// Get distributions
router.get("/", 
    auth, 
    requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']),
    requirePermission(PERMISSIONS.STOCK_OUT.READ),
    filterByLocation,
    queryValidators.pagination, 
    c.get
);

// Get single distribution
router.get("/:id", 
    auth, 
    requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']),
    requirePermission(PERMISSIONS.STOCK_OUT.READ),
    stockOutValidators.getById, 
    c.getById
);

// Cancel/Return distribution
router.patch("/:id/cancel", 
    auth, 
    requireRole(['admin', 'master_inventory_manager', 'location_inventory_manager']),
    requirePermission(PERMISSIONS.STOCK_OUT.UPDATE),
    stockOutValidators.getById, 
    c.cancel
);

module.exports = router;
