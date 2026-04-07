require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

const seedAdmin = async () => {
  try {
    await connectDB();
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@helpline.org' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const admin = new User({
      name: 'Admin User',
      email: 'admin@helpline.org',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      permissions: [
        'beneficiaries.create', 'beneficiaries.read', 'beneficiaries.update', 'beneficiaries.delete',
        'donors.create', 'donors.read', 'donors.update', 'donors.delete',
        'locations.create', 'locations.read', 'locations.update', 'locations.delete',
        'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete',
        'stock_in.create', 'stock_in.read', 'stock_in.update', 'stock_in.delete',
        'stock_out.create', 'stock_out.read', 'stock_out.update', 'stock_out.delete',
        'reports.read', 'reports.export',
        'users.create', 'users.read', 'users.update', 'users.delete',
        'settings.read', 'settings.update'
      ]
    });

    await admin.save();
    console.log('✅ Admin user created successfully');
    console.log('   Email: admin@helpline.org');
    console.log('   Password: password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
