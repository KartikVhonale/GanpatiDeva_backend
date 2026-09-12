const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const userService = require('../services/userService');

function createAuthRoutes(getIsMongoConnected) {
  const router = express.Router();

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          error: 'कृपया वापरकर्ता नाव आणि पासवर्ड प्रविष्ट करा (Username and password are required)',
        });
      }

      const isMongo = getIsMongoConnected();
      const user = await userService.findUserByUsername(username, isMongo);

      if (!user) {
        return res.status(401).json({
          error: 'अवैध वापरकर्ता नाव किंवा पासवर्ड (Invalid credentials)',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          error: 'आपले खाते निष्क्रिय केले आहे. कृपया मुख्य व्यवस्थापकाशी संपर्क साधा. (Account is deactivated)',
        });
      }

      // Check password
      let isMatch = await bcrypt.compare(password, user.password);

      // Direct fallback for default admin configured in .env
      const defaultAdminUser = (process.env.ADMIN_DEFAULT_USER || 'admin').toLowerCase().trim();
      const defaultAdminPass = process.env.ADMIN_DEFAULT_PASS;
      if (!isMatch && defaultAdminPass && user.username === defaultAdminUser) {
        if (password === defaultAdminPass) {
          isMatch = true;
          try {
            const newHash = await bcrypt.hash(defaultAdminPass, 10);
            if (isMongo && user.save) {
              user.password = newHash;
              await user.save();
            }
            console.log(`✅ Admin authenticated via .env and hash synced to MongoDB Atlas`);
          } catch (syncErr) {
            console.warn('Admin password sync notice:', syncErr.message);
          }
        }
      }

      if (!isMatch) {
        return res.status(401).json({
          error: 'अवैध वापरकर्ता नाव किंवा पासवर्ड (Invalid credentials)',
        });
      }

      // Create JWT
      const token = jwt.sign(
        {
          id: user._id,
          name: user.name,
          username: user.username,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'लॉगिन यशस्वी झाले! (Login successful)',
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          role: user.role,
          phone: user.phone,
        },
      });
    } catch (err) {
      console.error('Error during login:', err);
      res.status(500).json({ error: 'लॉगिन त्रुटी (Login error)', details: err.message });
    }
  });

  // GET /api/auth/me
  router.get('/me', verifyToken, async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const user = await userService.findUserById(req.user.id, isMongo);
      if (!user) {
        return res.status(404).json({ error: 'वापरकर्ता सापडला नाही (User not found)' });
      }
      res.json({
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          role: user.role,
          phone: user.phone,
        },
      });
    } catch (err) {
      console.error('Error in /api/auth/me:', err);
      res.status(500).json({ error: 'Failed to verify session', details: err.message });
    }
  });

  return router;
}

module.exports = createAuthRoutes;
