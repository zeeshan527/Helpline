
const router = require("express").Router();
const c = require("../controllers/stockOutController");
const auth = require("../middleware/auth");
const { requirePermission, filterByLocation, requireLocationAccess, PERMISSIONS } = require("../middleware/rbac");
const validatePolicy = require("../middleware/policy");
const { stockOutValidators, queryValidators } = require("../validators");

// Get stats (must be before /:id route)
router.get("/stats", auth, filterByLocation, c.getStats);

// Create distribution
router.post("/", 
    auth, 
    requirePermission(PERMISSIONS.STOCK_OUT.CREATE),
    requireLocationAccess('locationId'),
    stockOutValidators.create, 
    validatePolicy,
    c.create
);

// Get distributions
router.get("/", 
    auth, 
    requirePermission(PERMISSIONS.STOCK_OUT.READ),
    filterByLocation,
    queryValidators.pagination, 
    c.get
);

// Get single distribution
router.get("/:id", 
    auth, 
    requirePermission(PERMISSIONS.STOCK_OUT.READ),
    stockOutValidators.getById, 
    c.getById
);

// Cancel/Return distribution
router.patch("/:id/cancel", 
    auth, 
    requirePermission(PERMISSIONS.STOCK_OUT.UPDATE),
    stockOutValidators.getById, 
    c.cancel
);

module.exports = router;
