
const router = require("express").Router();
const c = require("../controllers/LocationController");
const auth = require("../middleware/auth");
const { requirePermission, PERMISSIONS } = require("../middleware/rbac");
const { locationValidators, queryValidators } = require("../validators");

// Get stats (must be before /:id route)
router.get("/stats", auth, c.getStats);

// CRUD operations
router.post("/", 
    auth, 
    requirePermission(PERMISSIONS.LOCATIONS.CREATE),
    locationValidators.create, 
    c.create
);

router.get("/", 
    auth, 
    requirePermission(PERMISSIONS.LOCATIONS.READ),
    queryValidators.pagination, 
    c.get
);

router.get("/:id", 
    auth, 
    requirePermission(PERMISSIONS.LOCATIONS.READ),
    locationValidators.getById, 
    c.getById
);

router.put("/:id", 
    auth, 
    requirePermission(PERMISSIONS.LOCATIONS.UPDATE),
    locationValidators.update, 
    c.update
);

router.delete("/:id", 
    auth, 
    requirePermission(PERMISSIONS.LOCATIONS.DELETE),
    locationValidators.getById, 
    c.delete
);

// Location inventory
router.get("/:id/inventory", 
    auth, 
    requirePermission(PERMISSIONS.LOCATIONS.READ),
    locationValidators.getById, 
    c.getInventory
);

module.exports = router;
