const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

/**
 * Register a new user (Admin only)
 * @route POST /api/auth/users
 */
exports.register = asyncHandler(async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        throw new AppError('Only admins can create users', 403);
    }
    const { name, email, password, role, assignedLocations, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        throw new AppError('User with this email already exists', 400);
    }

    // Only admin can create admin/master/location manager users
    const allowedRoles = ['admin', 'staff', 'master_inventory_manager', 'location_inventory_manager'];
    if (!allowedRoles.includes(role)) {
        throw new AppError('Invalid role', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'staff',
        assignedLocations: assignedLocations || [],
        phone,
        status: 'active'
    });

    // Log the action
    await AuditLog.log({
        action: 'create',
        module: 'user',
        documentId: user._id,
        performedBy: req.user._id,
        description: `Created new user: ${user.email}`,
        newState: { name: user.name, email: user.email, role: user.role }
    });

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user
    });
});

/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        throw new AppError('Invalid email or password', 401);
    }

    // Check if user is active
    if (user.status !== 'active') {
        throw new AppError(`Account is ${user.status}. Please contact administrator.`, 401);
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new AppError('Invalid email or password', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Log the login
    await AuditLog.log({
        action: 'login',
        module: 'auth',
        documentId: user._id,
        performedBy: user._id,
        description: `User logged in: ${user.email}`,
        metadata: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        }
    });

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
                assignedLocations: user.assignedLocations
            }
        }
    });
});

/**
 * Get current user profile
 * @route GET /api/auth/me
 */
exports.getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('assignedLocations', 'name type');

    res.json({
        success: true,
        data: user
    });
});

/**
 * Update current user profile
 * @route PUT /api/auth/me
 */
exports.updateMe = asyncHandler(async (req, res) => {
    const { name, phone, avatar } = req.body;
    
    // Only allow updating specific fields
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
    ).populate('assignedLocations', 'name type');

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user
    });
});

/**
 * Change password
 * @route PUT /api/auth/change-password
 */
exports.changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({
        success: true,
        message: 'Password changed successfully'
    });
});

/**
 * Get all users (Admin only)
 * @route GET /api/auth/users
 */
exports.getUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, status, search } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
        User.find(query)
            .populate('assignedLocations', 'name type')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        User.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Update user (Admin only)
 * @route PUT /api/auth/users/:id
 */
exports.updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, role, status, assignedLocations, permissions } = req.body;

    const user = await User.findById(id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Prevent changing own role
    if (req.user._id.toString() === id && role && role !== user.role) {
        throw new AppError('Cannot change your own role', 400);
    }

    const previousState = {
        name: user.name,
        role: user.role,
        status: user.status
    };

    // Update fields
    if (name) user.name = name;
    if (role) user.role = role;
    if (status) user.status = status;
    if (assignedLocations) user.assignedLocations = assignedLocations;
    if (permissions) user.permissions = { ...user.permissions, ...permissions };

    await user.save();

    // Log the action
    await AuditLog.log({
        action: 'update',
        module: 'user',
        documentId: user._id,
        performedBy: req.user._id,
        description: `Updated user: ${user.email}`,
        previousState,
        newState: {
            name: user.name,
            role: user.role,
            status: user.status
        }
    });

    res.json({
        success: true,
        message: 'User updated successfully',
        data: user
    });
});

/**
 * Delete user (Admin only)
 * @route DELETE /api/auth/users/:id
 */
exports.deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user._id.toString() === id) {
        throw new AppError('Cannot delete your own account', 400);
    }

    const user = await User.findById(id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    await User.findByIdAndDelete(id);

    // Log the action
    await AuditLog.log({
        action: 'delete',
        module: 'user',
        documentId: user._id,
        performedBy: req.user._id,
        description: `Deleted user: ${user.email}`,
        previousState: {
            name: user.name,
            email: user.email,
            role: user.role
        }
    });

    res.json({
        success: true,
        message: 'User deleted successfully'
    });
});
