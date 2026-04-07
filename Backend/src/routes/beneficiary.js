
const router = require("express").Router();
const c = require("../controllers/BeneficiaryController");
const auth = require("../middleware/auth");
const { requirePermission, filterByLocation, PERMISSIONS } = require("../middleware/rbac");
const { beneficiaryValidators, queryValidators } = require("../validators");

// Get stats (must be before /:id route)
router.get("/stats", auth, filterByLocation, c.getStats);

// CRUD operations
router.post("/", 
    auth, 
    requirePermission(PERMISSIONS.BENEFICIARIES.CREATE),
    beneficiaryValidators.create, 
    c.create
);

router.get("/", 
    auth, 
    requirePermission(PERMISSIONS.BENEFICIARIES.READ),
    filterByLocation,
    queryValidators.pagination, 
    c.get
);

router.get("/:id", 
    auth, 
    requirePermission(PERMISSIONS.BENEFICIARIES.READ),
    beneficiaryValidators.getById, 
    c.getById
);

router.put("/:id", 
    auth, 
    requirePermission(PERMISSIONS.BENEFICIARIES.UPDATE),
    beneficiaryValidators.update, 
    c.update
);

router.delete("/:id", 
    auth, 
    requirePermission(PERMISSIONS.BENEFICIARIES.DELETE),
    beneficiaryValidators.getById, 
    c.delete
);

// Status update (approve/reject)
router.put("/:id/status", 
    auth, 
    requirePermission(PERMISSIONS.BENEFICIARIES.APPROVE || PERMISSIONS.BENEFICIARIES.UPDATE),
    beneficiaryValidators.getById, 
    c.updateStatus
);

// Distribution history
router.get("/:id/history", 
    auth, 
    requirePermission(PERMISSIONS.BENEFICIARIES.READ),
    beneficiaryValidators.getById, 
    c.getHistory
);

module.exports = router;
