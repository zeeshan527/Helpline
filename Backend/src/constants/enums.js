// Enum definitions for consistent values across the application

const DISTRIBUTION_POLICY_TYPES = {
    FREE_ONLY: 'free_only',
    CONTROL_PRICE: 'control_price',
    FLEXIBLE: 'flexible'
};

const DISTRIBUTION_MODES = {
    FREE: 'free',
    CONTROL_PRICE: 'control_price',
    DISCOUNTED: 'discounted'
};

const SOURCE_TYPES = {
    DONOR: 'donor',
    COMPANY: 'company',
    PURCHASE: 'purchase'
};

const LOCATION_TYPES = {
    SHOP: 'shop',
    WAREHOUSE: 'warehouse',
    OFFICE: 'office',
    DEPOT: 'depot',
    DISTRIBUTION_CENTER: 'distribution_center'
};

const DONOR_TYPES = {
    INDIVIDUAL: 'individual',
    COMPANY: 'company',
    ORGANIZATION: 'organization',
    GOVERNMENT: 'government',
    ANONYMOUS: 'anonymous'
};

const BENEFICIARY_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended'
};

const USER_ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff'
};

const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended'
};

const STOCK_STATUS = {
    ACTIVE: 'active',
    DEPLETED: 'depleted',
    EXPIRED: 'expired',
    RETURNED: 'returned'
};

const STOCK_OUT_STATUS = {
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    RETURNED: 'returned'
};

const ELIGIBILITY_FREQUENCY = {
    ONCE: 'once',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    YEARLY: 'yearly',
    UNLIMITED: 'unlimited'
};

const PRODUCT_UNITS = {
    PIECES: 'pieces',
    KG: 'kg',
    LITERS: 'liters',
    BOXES: 'boxes',
    PACKETS: 'packets',
    BAGS: 'bags',
    CARTONS: 'cartons'
};

const VIOLATION_TYPES = {
    NONE: 'none',
    POLICY_VIOLATION: 'policy_violation',
    PRICE_VIOLATION: 'price_violation',
    QUANTITY_VIOLATION: 'quantity_violation',
    ELIGIBILITY_VIOLATION: 'eligibility_violation'
};

const EMPLOYMENT_STATUS = {
    EMPLOYED: 'employed',
    DAILY_WAGES: 'daily_wages',
    UNEMPLOYED: 'unemployed',
    WIDOW_LED: 'widow_led',
    ORPHAN_FAMILY: 'orphan_family',
    DISABLED_BREADWINNER: 'disabled_breadwinner'
};

const HOUSING_TYPES = {
    OWNED: 'owned',
    RENTED: 'rented',
    TEMPORARY: 'temporary'
};

module.exports = {
    DISTRIBUTION_POLICY_TYPES,
    DISTRIBUTION_MODES,
    SOURCE_TYPES,
    LOCATION_TYPES,
    DONOR_TYPES,
    BENEFICIARY_STATUS,
    USER_ROLES,
    USER_STATUS,
    STOCK_STATUS,
    STOCK_OUT_STATUS,
    ELIGIBILITY_FREQUENCY,
    PRODUCT_UNITS,
    VIOLATION_TYPES,
    EMPLOYMENT_STATUS,
    HOUSING_TYPES
};
