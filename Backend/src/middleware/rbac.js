const { PERMISSIONS, hasPermission } = require('../constants/permissions');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if the user has the required permission to access a resource
 */

/**
 * Check if user has specific permission
 * @param {string} permission - Permission to check (e.g., 'beneficiaries.create')
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;
        
        // Admin has all permissions
        if (userRole === 'admin') {
            return next();
        }

        // Check if role has the permission
        if (hasPermission(userRole, permission)) {
            return next();
        }

        // Check user-specific permissions
        const permParts = permission.split('.');
        if (permParts.length === 2) {
            const [module, action] = permParts;
            if (req.user.permissions && 
                req.user.permissions[module] && 
                req.user.permissions[module][action]) {
                return next();
            }
        }

        return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions.',
            required: permission
        });
    };
};

/**
 * Check if user has any of the specified permissions
 * @param {string[]} permissions - Array of permissions (any match allows access)
 */
const requireAnyPermission = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;
        
        // Admin has all permissions
        if (userRole === 'admin') {
            return next();
        }

        // Check if user has any of the permissions
        for (const permission of permissions) {
            if (hasPermission(userRole, permission)) {
                return next();
            }
        }

        return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions.',
            required: permissions
        });
    };
};

/**
 * Check if user has all specified permissions
 * @param {string[]} permissions - Array of permissions (all must match)
 */
const requireAllPermissions = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;
        
        // Admin has all permissions
        if (userRole === 'admin') {
            return next();
        }

        // Check if user has all permissions
        for (const permission of permissions) {
            if (!hasPermission(userRole, permission)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient permissions.',
                    required: permissions,
                    missing: permission
                });
            }
        }

        next();
    };
};

/**
 * Check if user has specific role
 * @param {string|string[]} roles - Required role(s)
 */
const requireRole = (roles) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Role not authorized.',
                required: allowedRoles
            });
        }

        next();
    };
};

/**
 * Check if staff user has access to the specified location
 * Admins have access to all locations
 */
const requireLocationAccess = (locationIdField = 'locationId') => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Admin has access to all locations
        if (req.user.role === 'admin') {
            return next();
        }

        // Get location ID from request
        const locationId = req.body[locationIdField] || 
                          req.params[locationIdField] || 
                          req.query[locationIdField];

        if (!locationId) {
            // If no location specified, continue (will be handled elsewhere)
            return next();
        }

        // Check if staff has access to this location
        const assignedLocations = req.user.assignedLocations || [];
        const hasAccess = assignedLocations.some(
            loc => loc.toString() === locationId.toString()
        );

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Not authorized for this location.'
            });
        }

        next();
    };
};

/**
 * Filter query results to only include user's assigned locations
 * For staff users only - admins see all
 */
const filterByLocation = (req, res, next) => {
    if (!req.user) {
        return next();
    }

    // Admin sees all locations
    if (req.user.role === 'admin') {
        req.locationFilter = {};
        return next();
    }

    // Staff only sees their assigned locations
    const assignedLocations = req.user.assignedLocations || [];
    
    if (assignedLocations.length === 0) {
        req.locationFilter = { locationId: { $in: [] } }; // No results
    } else {
        req.locationFilter = { locationId: { $in: assignedLocations } };
    }

    next();
};

/**
 * Check if user can manage (edit/delete) a resource
 * - Admin can manage all
 * - Staff can only manage resources they created (if allowOwnOnly is true)
 */
const canManageResource = (options = {}) => {
    const { allowOwnOnly = false, createdByField = 'createdBy' } = options;

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Admin can manage all
        if (req.user.role === 'admin') {
            return next();
        }

        // If allowOwnOnly, staff can only manage their own resources
        if (allowOwnOnly) {
            req.ownershipFilter = { [createdByField]: req.user._id };
        }

        next();
    };
};

module.exports = {
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    requireRole,
    requireLocationAccess,
    filterByLocation,
    canManageResource,
    PERMISSIONS
};
