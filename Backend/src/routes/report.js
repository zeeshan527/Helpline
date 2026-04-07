
const router = require("express").Router();
const c = require("../controllers/reportController");
const auth = require("../middleware/auth");
const { requirePermission, filterByLocation, PERMISSIONS } = require("../middleware/rbac");
const { reportValidators } = require("../validators");

// Beneficiary report
router.get("/beneficiary/:id", 
    auth, 
    requirePermission(PERMISSIONS.REPORTS.VIEW),
    reportValidators.beneficiary, 
    c.beneficiary
);

// Donor compliance report
router.get("/donor/:id", 
    auth, 
    requirePermission(PERMISSIONS.REPORTS.COMPLIANCE || PERMISSIONS.REPORTS.VIEW),
    reportValidators.donor, 
    c.donor
);

// Location report
router.get("/location/:id", 
    auth, 
    requirePermission(PERMISSIONS.REPORTS.VIEW),
    reportValidators.location, 
    c.location
);

// Stock In report
router.get("/stock-in", 
    auth, 
    requirePermission(PERMISSIONS.REPORTS.VIEW),
    filterByLocation,
    reportValidators.dateRange, 
    c.stockIn
);

// Stock Out report
router.get("/stock-out", 
    auth, 
    requirePermission(PERMISSIONS.REPORTS.VIEW),
    filterByLocation,
    reportValidators.dateRange, 
    c.stockOut
);

// Financial report
router.get("/financial", 
    auth, 
    requirePermission(PERMISSIONS.REPORTS.VIEW),
    filterByLocation,
    reportValidators.dateRange, 
    c.financial
);

// Low stock report
router.get("/low-stock", 
    auth, 
    requirePermission(PERMISSIONS.REPORTS.VIEW),
    filterByLocation,
    c.lowStock
);

// Compliance/Violations report
router.get("/compliance", 
    auth, 
    requirePermission(PERMISSIONS.REPORTS.COMPLIANCE || PERMISSIONS.REPORTS.VIEW),
    filterByLocation,
    reportValidators.dateRange, 
    c.compliance
);

module.exports = router;
