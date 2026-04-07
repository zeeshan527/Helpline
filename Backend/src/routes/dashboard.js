const router = require("express").Router();
const c = require("../controllers/dashboardController");
const auth = require("../middleware/auth");
const { filterByLocation } = require("../middleware/rbac");

// Dashboard overview
router.get("/", auth, filterByLocation, c.getOverview);

// Quick stats
router.get("/quick-stats", auth, filterByLocation, c.getQuickStats);

// Distribution chart
router.get("/distribution-chart", auth, filterByLocation, c.getDistributionChart);

// Top distributed items
router.get("/top-items", auth, filterByLocation, c.getTopItems);

module.exports = router;
