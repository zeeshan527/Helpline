
const router = require("express").Router();
const c = require("../controllers/authController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { authValidators, userValidators } = require("../validators");

// Public routes
// router.post("/register", authValidators.register, c.register); // Disabled: Only admin can create users
router.post("/login", authValidators.login, c.login);

// Protected routes
router.get("/me", auth, c.getMe);
router.put("/me", auth, c.updateMe);
router.put("/change-password", auth, c.changePassword);

// Admin only routes
router.get("/users", auth, requireRole('admin'), c.getUsers);
router.post("/users", auth, requireRole('admin'), userValidators.create, c.register);
router.put("/users/:id", auth, requireRole('admin'), userValidators.update, c.updateUser);
router.delete("/users/:id", auth, requireRole('admin'), userValidators.getById, c.deleteUser);

module.exports = router;
