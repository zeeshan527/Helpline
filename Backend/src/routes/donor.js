
const router = require("express").Router();
const c = require("../controllers/DonorController");
const auth = require("../middleware/auth");
const { requirePermission, PERMISSIONS } = require("../middleware/rbac");
const { donorValidators, queryValidators } = require("../validators");

// Get stats (must be before /:id route)
router.get("/stats", auth, c.getStats);

// CRUD operations
router.post("/", 
    auth, 
    requirePermission(PERMISSIONS.DONORS.CREATE),
    donorValidators.create, 
    c.create
);

router.get("/", 
    auth, 
    requirePermission(PERMISSIONS.DONORS.READ),
    queryValidators.pagination, 
    c.get
);

router.get("/:id", 
    auth, 
    requirePermission(PERMISSIONS.DONORS.READ),
    donorValidators.getById, 
    c.getById
);

router.put("/:id", 
    auth, 
    requirePermission(PERMISSIONS.DONORS.UPDATE),
    donorValidators.update, 
    c.update
);

router.delete("/:id", 
    auth, 
    requirePermission(PERMISSIONS.DONORS.DELETE),
    donorValidators.getById, 
    c.delete
);

// Donation history
router.get("/:id/donations", 
    auth, 
    requirePermission(PERMISSIONS.DONORS.READ),
    donorValidators.getById, 
    c.getDonationHistory
);

module.exports = router;
