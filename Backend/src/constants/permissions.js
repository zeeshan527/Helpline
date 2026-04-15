// Permission definitions for RBAC
const PERMISSIONS = {
    BENEFICIARIES: {
        CREATE: 'beneficiaries.create',
        READ: 'beneficiaries.read',
        UPDATE: 'beneficiaries.update',
        DELETE: 'beneficiaries.delete',
        APPROVE: 'beneficiaries.approve'
    },
    DONORS: {
        CREATE: 'donors.create',
        READ: 'donors.read',
        UPDATE: 'donors.update',
        DELETE: 'donors.delete'
    },
    LOCATIONS: {
        CREATE: 'locations.create',
        READ: 'locations.read',
        UPDATE: 'locations.update',
        DELETE: 'locations.delete'
    },
    STOCK_IN: {
        CREATE: 'stockIn.create',
        READ: 'stockIn.read',
        UPDATE: 'stockIn.update',
        DELETE: 'stockIn.delete',
        TRANSFER: 'stockIn.transfer'
    },
    STOCK_OUT: {
        CREATE: 'stockOut.create',
        READ: 'stockOut.read',
        UPDATE: 'stockOut.update',
        DELETE: 'stockOut.delete'
    },
    EXTERNAL_STOCK_IN: {
        CREATE: 'externalStockIn.create',
        READ: 'externalStockIn.read',
        UPDATE: 'externalStockIn.update',
        DELETE: 'externalStockIn.delete'
    },
    EXTERNAL_STOCK_OUT: {
        CREATE: 'externalStockOut.create',
        READ: 'externalStockOut.read',
        UPDATE: 'externalStockOut.update',
        DELETE: 'externalStockOut.delete'
    },
    REPORTS: {
        VIEW: 'reports.view',
        EXPORT: 'reports.export',
        COMPLIANCE: 'reports.compliance'
    },
    USERS: {
        CREATE: 'users.create',
        READ: 'users.read',
        UPDATE: 'users.update',
        DELETE: 'users.delete'
    },
    DASHBOARD: {
        VIEW: 'dashboard.view',
        ANALYTICS: 'dashboard.analytics'
    },
    FUND_CATEGORIES: {
        CREATE: 'fundCategories.create',
        READ: 'fundCategories.read',
        UPDATE: 'fundCategories.update',
        DELETE: 'fundCategories.delete'
    }
};

// Role-based permission mappings
const ROLE_PERMISSIONS = {
    admin: [
        ...Object.values(PERMISSIONS.BENEFICIARIES),
        ...Object.values(PERMISSIONS.DONORS),
        ...Object.values(PERMISSIONS.LOCATIONS),
        ...Object.values(PERMISSIONS.STOCK_IN),
        ...Object.values(PERMISSIONS.STOCK_OUT),
        ...Object.values(PERMISSIONS.EXTERNAL_STOCK_IN),
        ...Object.values(PERMISSIONS.EXTERNAL_STOCK_OUT),
        ...Object.values(PERMISSIONS.REPORTS),
        ...Object.values(PERMISSIONS.USERS),
        ...Object.values(PERMISSIONS.DASHBOARD),
        ...Object.values(PERMISSIONS.FUND_CATEGORIES)
    ],
    staff: [
        PERMISSIONS.BENEFICIARIES.READ,
        PERMISSIONS.BENEFICIARIES.CREATE,
        PERMISSIONS.BENEFICIARIES.UPDATE,
        PERMISSIONS.DONORS.READ,
        PERMISSIONS.LOCATIONS.READ,
        PERMISSIONS.STOCK_IN.READ,
        PERMISSIONS.STOCK_IN.CREATE,
        PERMISSIONS.STOCK_OUT.READ,
        PERMISSIONS.STOCK_OUT.CREATE,
        PERMISSIONS.EXTERNAL_STOCK_IN.CREATE,
        PERMISSIONS.EXTERNAL_STOCK_IN.READ,
        PERMISSIONS.EXTERNAL_STOCK_IN.UPDATE,
        PERMISSIONS.EXTERNAL_STOCK_IN.DELETE,
        PERMISSIONS.EXTERNAL_STOCK_OUT.CREATE,
        PERMISSIONS.EXTERNAL_STOCK_OUT.READ,
        PERMISSIONS.EXTERNAL_STOCK_OUT.UPDATE,
        PERMISSIONS.EXTERNAL_STOCK_OUT.DELETE,
        PERMISSIONS.REPORTS.VIEW,
        PERMISSIONS.DASHBOARD.VIEW,
        PERMISSIONS.FUND_CATEGORIES.CREATE,
        PERMISSIONS.FUND_CATEGORIES.READ,
        PERMISSIONS.FUND_CATEGORIES.UPDATE,
        PERMISSIONS.FUND_CATEGORIES.DELETE
    ],
    master_inventory_manager: [
        PERMISSIONS.STOCK_IN.CREATE,
        PERMISSIONS.STOCK_IN.READ,
        PERMISSIONS.STOCK_IN.UPDATE,
        PERMISSIONS.STOCK_IN.DELETE,
        PERMISSIONS.STOCK_IN.TRANSFER,
        PERMISSIONS.STOCK_OUT.CREATE,
        PERMISSIONS.STOCK_OUT.READ,
        PERMISSIONS.STOCK_OUT.UPDATE,
        PERMISSIONS.STOCK_OUT.DELETE,
        PERMISSIONS.EXTERNAL_STOCK_IN.CREATE,
        PERMISSIONS.EXTERNAL_STOCK_IN.READ,
        PERMISSIONS.EXTERNAL_STOCK_IN.UPDATE,
        PERMISSIONS.EXTERNAL_STOCK_IN.DELETE,
        PERMISSIONS.EXTERNAL_STOCK_OUT.CREATE,
        PERMISSIONS.EXTERNAL_STOCK_OUT.READ,
        PERMISSIONS.EXTERNAL_STOCK_OUT.UPDATE,
        PERMISSIONS.EXTERNAL_STOCK_OUT.DELETE,
        PERMISSIONS.REPORTS.VIEW,
        PERMISSIONS.REPORTS.EXPORT,
        PERMISSIONS.DASHBOARD.VIEW,
        PERMISSIONS.DASHBOARD.ANALYTICS
    ],
    location_inventory_manager: [
        PERMISSIONS.STOCK_IN.CREATE,
        PERMISSIONS.STOCK_IN.READ,
        PERMISSIONS.STOCK_IN.UPDATE,
        PERMISSIONS.STOCK_OUT.CREATE,
        PERMISSIONS.STOCK_OUT.READ,
        PERMISSIONS.STOCK_OUT.UPDATE,
        PERMISSIONS.EXTERNAL_STOCK_IN.CREATE,
        PERMISSIONS.EXTERNAL_STOCK_IN.READ,
        PERMISSIONS.EXTERNAL_STOCK_IN.UPDATE,
        PERMISSIONS.EXTERNAL_STOCK_IN.DELETE,
        PERMISSIONS.EXTERNAL_STOCK_OUT.CREATE,
        PERMISSIONS.EXTERNAL_STOCK_OUT.READ,
        PERMISSIONS.EXTERNAL_STOCK_OUT.UPDATE,
        PERMISSIONS.EXTERNAL_STOCK_OUT.DELETE,
        PERMISSIONS.REPORTS.VIEW,
        PERMISSIONS.DASHBOARD.VIEW
    ]
};

// Check if a role has a specific permission
const hasPermission = (role, permission) => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    return rolePermissions.includes(permission);
};

// Get all permissions for a role
const getRolePermissions = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};

module.exports = {
    PERMISSIONS,
    ROLE_PERMISSIONS,
    hasPermission,
    getRolePermissions
};
