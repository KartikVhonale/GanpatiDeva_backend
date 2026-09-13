const bcrypt = require('bcryptjs');
const User = require('../models/User');

let inMemoryUsers = [];

// Initialize default admin account in MongoDB
async function initDefaultUsers(isMongoConnected) {
  const defaultAdminUser = (process.env.ADMIN_DEFAULT_USER || 'admin').toLowerCase().trim();
  const defaultAdminPass = process.env.ADMIN_DEFAULT_PASS || 'admin@ganpati2026';
  const defaultAdminPhone = (process.env.ADMIN_DEFAULT_PHONE || '8484844728').trim();
  const hashedAdminPassword = await bcrypt.hash(defaultAdminPass, 10);

  // Setup initial in-memory admin
  inMemoryUsers = [
    {
      _id: 'mem-admin-1',
      name: 'मुख्य व्यवस्थापक (Main Admin)',
      username: defaultAdminUser,
      password: hashedAdminPassword,
      role: 'admin',
      phone: defaultAdminPhone,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'system',
    },
  ];

  // If MongoDB is connected, check and seed/sync default admin account
  if (isMongoConnected) {
    try {
      const adminExists = await User.findOne({ username: defaultAdminUser });
      if (!adminExists) {
        await User.create({
          name: 'मुख्य व्यवस्थापक (Main Admin)',
          username: defaultAdminUser,
          password: hashedAdminPassword,
          role: 'admin',
          phone: defaultAdminPhone,
          isActive: true,
          createdBy: 'system',
        });
        console.log(`✅ Default Admin account created in MongoDB Atlas (username: ${defaultAdminUser}, phone: ${defaultAdminPhone})`);
      } else {
        // Synchronize password and phone with process.env / defaults
        adminExists.password = hashedAdminPassword;
        adminExists.isActive = true;
        adminExists.role = 'admin';
        adminExists.phone = defaultAdminPhone;
        await adminExists.save();
        console.log(`✅ Admin account synchronized in MongoDB Atlas (username: ${defaultAdminUser}, phone: ${defaultAdminPhone})`);
      }
    } catch (err) {
      console.warn('Notice while checking/seeding admin in MongoDB:', err.message);
    }
  }
}

// Find user by username
async function findUserByUsername(username, isMongoConnected) {
  const cleanUsername = username.toLowerCase().trim();
  if (isMongoConnected) {
    try {
      const user = await User.findOne({ username: cleanUsername });
      if (user) return user;
    } catch (err) {
      console.error('Error finding user in MongoDB:', err.message);
    }
  }
  return inMemoryUsers.find((u) => u.username.toLowerCase() === cleanUsername) || null;
}

// Find user by ID
async function findUserById(id, isMongoConnected) {
  if (isMongoConnected && id && !id.startsWith('mem-')) {
    try {
      const user = await User.findById(id).select('-password');
      if (user) return user;
    } catch (err) {
      console.error('Error finding user by ID in MongoDB:', err.message);
    }
  }
  const memUser = inMemoryUsers.find((u) => u._id.toString() === id.toString());
  if (memUser) {
    const { password, ...safe } = memUser;
    return safe;
  }
  return null;
}

// List all users
async function listAllUsers(isMongoConnected) {
  if (isMongoConnected) {
    try {
      const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
      return users;
    } catch (err) {
      console.error('Error fetching users from MongoDB:', err.message);
    }
  }
  return inMemoryUsers.map(({ password, ...safe }) => safe);
}

// Create a new user/volunteer
async function createUser({ name, username, password, role = 'volunteer', phone = '', createdBy = 'admin' }, isMongoConnected) {
  const cleanUsername = username.toLowerCase().trim();

  // Check if username already exists
  const existing = await findUserByUsername(cleanUsername, isMongoConnected);
  if (existing) {
    throw new Error('हा वापरकर्ता आधीपासून अस्तित्वात आहे (Username already exists)');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  if (isMongoConnected) {
    try {
      const newUser = new User({
        name: name.trim(),
        username: cleanUsername,
        password: hashedPassword,
        role,
        phone: phone ? phone.trim() : '',
        isActive: true,
        createdBy,
      });
      const saved = await newUser.save();
      const obj = saved.toObject();
      delete obj.password;

      // Keep in-memory in sync
      inMemoryUsers.unshift(saved.toObject());
      return obj;
    } catch (err) {
      console.error('Error creating user in MongoDB:', err.message);
      throw err;
    }
  } else {
    const memUser = {
      _id: `mem-user-${Date.now()}`,
      name: name.trim(),
      username: cleanUsername,
      password: hashedPassword,
      role,
      phone: phone ? phone.trim() : '',
      isActive: true,
      createdAt: new Date(),
      createdBy,
    };
    inMemoryUsers.unshift(memUser);
    const { password: _, ...safe } = memUser;
    return safe;
  }
}

// Toggle user active status
async function toggleUserStatus(id, isMongoConnected) {
  if (isMongoConnected && id && !id.startsWith('mem-')) {
    try {
      const user = await User.findById(id);
      if (!user) throw new Error('User not found');
      if (user.username === 'admin') throw new Error('मुख्य व्यवस्थापक निष्क्रिय करता येत नाही (Cannot deactivate main admin)');
      user.isActive = !user.isActive;
      await user.save();
      const obj = user.toObject();
      delete obj.password;
      return obj;
    } catch (err) {
      console.error('Error toggling user status in MongoDB:', err.message);
      throw err;
    }
  } else {
    const memUser = inMemoryUsers.find((u) => u._id.toString() === id.toString());
    if (!memUser) throw new Error('User not found');
    if (memUser.username === 'admin') throw new Error('मुख्य व्यवस्थापक निष्क्रिय करता येत नाही (Cannot deactivate main admin)');
    memUser.isActive = !memUser.isActive;
    const { password, ...safe } = memUser;
    return safe;
  }
}

// Delete user
async function deleteUser(id, isMongoConnected) {
  if (isMongoConnected && id && !id.startsWith('mem-')) {
    try {
      const user = await User.findById(id);
      if (!user) throw new Error('User not found');
      if (user.username === 'admin') throw new Error('मुख्य व्यवस्थापक हटवता येत नाही (Cannot delete main admin)');
      await User.findByIdAndDelete(id);
      inMemoryUsers = inMemoryUsers.filter((u) => u._id.toString() !== id.toString());
      return { success: true, message: 'User deleted successfully' };
    } catch (err) {
      console.error('Error deleting user in MongoDB:', err.message);
      throw err;
    }
  } else {
    const memUser = inMemoryUsers.find((u) => u._id.toString() === id.toString());
    if (!memUser) throw new Error('User not found');
    if (memUser.username === 'admin') throw new Error('मुख्य व्यवस्थापक हटवता येत नाही (Cannot delete main admin)');
    inMemoryUsers = inMemoryUsers.filter((u) => u._id.toString() !== id.toString());
    return { success: true, message: 'User deleted successfully' };
  }
}

module.exports = {
  initDefaultUsers,
  findUserByUsername,
  findUserById,
  listAllUsers,
  createUser,
  toggleUserStatus,
  deleteUser,
};
