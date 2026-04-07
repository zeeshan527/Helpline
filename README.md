# Helpline - NGO Donation & Inventory Management System

A comprehensive system for managing donations, inventory, beneficiaries, and reporting for NGOs.

## Features

- **Beneficiary Management**: Track people receiving aid with eligibility and distribution history
- **Donor Management**: Manage individual/company donors with donation tracking
- **Location Management**: Hierarchical locations (shops, warehouses, offices, depots)
- **Inventory Management**: 
  - Stock In: Receive donations from donors, companies, or purchases
  - Stock Out: Distribute to beneficiaries with policy enforcement
- **Distribution Policies**: Free only, control price, or flexible distribution modes
- **Comprehensive Reports**: Beneficiary, donor compliance, financial, low stock alerts
- **Role-Based Access Control**: Admin and Staff roles with location restrictions

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: React, Vite, Tailwind CSS
- **Authentication**: JWT
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB
- npm or yarn

### Backend Setup

```bash
cd Backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB connection string

# Seed admin user
node seedAdmin.js

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

**Backend (.env)**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/helpline
JWT_SECRET=your-secret-key
JWT_EXPIRE=30d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Default Login

After running the seed script:
- **Email**: admin@helpline.org
- **Password**: password123

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile
- `PUT /api/auth/change-password` - Change password
- `GET /api/auth/users` - Get all users (admin)

### Beneficiaries
- `GET /api/beneficiaries` - List beneficiaries
- `POST /api/beneficiaries` - Create beneficiary
- `GET /api/beneficiaries/:id` - Get beneficiary
- `PUT /api/beneficiaries/:id` - Update beneficiary
- `DELETE /api/beneficiaries/:id` - Delete beneficiary

### Donors
- `GET /api/donors` - List donors
- `POST /api/donors` - Create donor
- `GET /api/donors/:id` - Get donor
- `PUT /api/donors/:id` - Update donor
- `DELETE /api/donors/:id` - Delete donor

### Locations
- `GET /api/locations` - List locations
- `GET /api/locations/tree` - Get location hierarchy
- `POST /api/locations` - Create location
- `GET /api/locations/:id` - Get location
- `PUT /api/locations/:id` - Update location
- `DELETE /api/locations/:id` - Delete location

### Stock In
- `GET /api/stock-in` - List stock in records
- `POST /api/stock-in` - Create stock in
- `GET /api/stock-in/:id` - Get stock in record
- `PUT /api/stock-in/:id` - Update stock in
- `DELETE /api/stock-in/:id` - Delete stock in
- `POST /api/stock-in/:id/transfer` - Transfer stock

### Stock Out
- `GET /api/stock-out` - List distributions
- `POST /api/stock-out` - Create distribution
- `GET /api/stock-out/:id` - Get distribution
- `PATCH /api/stock-out/:id/cancel` - Cancel distribution

### Reports
- `GET /api/reports/beneficiary/:id` - Beneficiary report
- `GET /api/reports/donor/:id` - Donor compliance report
- `GET /api/reports/location/:id` - Location report
- `GET /api/reports/stock-in` - Stock in report
- `GET /api/reports/stock-out` - Stock out report
- `GET /api/reports/financial` - Financial report
- `GET /api/reports/low-stock` - Low stock alerts
- `GET /api/reports/compliance` - Compliance violations

### Dashboard
- `GET /api/dashboard/overview` - Dashboard overview
- `GET /api/dashboard/quick-stats` - Quick statistics

## Distribution Policies

When creating stock-in, you define how items can be distributed:

1. **free_only**: Items can only be given for free
2. **control_price**: Items must be sold at a fixed price
3. **flexible**: Items can be distributed as free, control price, or discounted

## User Roles

- **Admin**: Full access to all modules and locations
- **Staff**: Limited to assigned locations, can manage stock in/out

## License

MIT
