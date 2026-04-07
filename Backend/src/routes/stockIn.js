
const router = require("express").Router();
const c = require("../controllers/stockInController");
const auth = require("../middleware/auth");
const { requirePermission, filterByLocation, requireLocationAccess, PERMISSIONS } = require("../middleware/rbac");
const { stockInValidators, queryValidators } = require("../validators");

// Get stats (must be before /:id route)
router.get("/stats", auth, filterByLocation, c.getStats);

// Get categories
router.get("/categories", auth, c.getCategories);

// Transfer stock
router.post("/transfer", 
    auth, 
    requirePermission(PERMISSIONS.STOCK_IN.TRANSFER || PERMISSIONS.STOCK_IN.UPDATE),
    stockInValidators.transfer, 
    c.transfer
);

// CRUD operations
router.post("/", 
    auth, 
    requirePermission(PERMISSIONS.STOCK_IN.CREATE),
    requireLocationAccess('locationId'),
    stockInValidators.create, 
    c.create
);

router.get("/", 
    auth, 
    requirePermission(PERMISSIONS.STOCK_IN.READ),
    filterByLocation,
    queryValidators.pagination, 
    c.get
);

router.get("/:id", 
    auth, 
    requirePermission(PERMISSIONS.STOCK_IN.READ),
    stockInValidators.getById, 
    c.getById
);

router.put("/:id", 
    auth, 
    requirePermission(PERMISSIONS.STOCK_IN.UPDATE),
    stockInValidators.update, 
    c.update
);

module.exports = router;
