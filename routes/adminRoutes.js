const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const userService = require('../services/userService');

function createAdminRoutes(getIsMongoConnected) {
  const router = express.Router();

  // Protect all admin routes
  router.use(verifyToken);
  router.use(requireAdmin);

  // GET /api/admin/users - Get all users
  router.get('/users', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const users = await userService.listAllUsers(isMongo);
      res.json({ success: true, users });
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Failed to fetch users', details: err.message });
    }
  });

  // POST /api/admin/users - Add a new volunteer / admin
  router.post('/users', async (req, res) => {
    try {
      const { name, username, password, role, phone } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'कृपया नाव प्रविष्ट करा (Name is required)' });
      }
      if (!username || !username.trim()) {
        return res.status(400).json({ error: 'कृपया वापरकर्ता नाव प्रविष्ट करा (Username is required)' });
      }
      if (!password || password.length < 4) {
        return res.status(400).json({ error: 'पासवर्ड किमान ४ अक्षरांचा असावा (Password must be at least 4 characters)' });
      }

      const isMongo = getIsMongoConnected();
      const createdUser = await userService.createUser(
        {
          name,
          username,
          password,
          role: role === 'admin' ? 'admin' : 'volunteer',
          phone: phone || '',
          createdBy: req.user.username,
        },
        isMongo
      );

      res.status(201).json({
        success: true,
        message: 'नवीन वापरकर्ता यशस्वीपणे जोडला गेला! (User created successfully)',
        user: createdUser,
      });
    } catch (err) {
      console.error('Error creating user:', err);
      res.status(400).json({ error: err.message || 'वापरकर्ता जोडण्यात त्रुटी' });
    }
  });

  // PATCH /api/admin/users/:id/toggle - Toggle user active status
  router.patch('/users/:id/toggle', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const updatedUser = await userService.toggleUserStatus(req.params.id, isMongo);
      res.json({
        success: true,
        message: `वापरकर्ता स्थिती बदलली: ${updatedUser.isActive ? 'सक्रिय' : 'निष्क्रिय'}`,
        user: updatedUser,
      });
    } catch (err) {
      console.error('Error toggling user status:', err);
      res.status(400).json({ error: err.message || 'स्थिती बदलण्यात त्रुटी' });
    }
  });

  // DELETE /api/admin/users/:id - Delete a volunteer
  router.delete('/users/:id', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const result = await userService.deleteUser(req.params.id, isMongo);
      res.json(result);
    } catch (err) {
      console.error('Error deleting user:', err);
      res.status(400).json({ error: err.message || 'वापरकर्ता हटवण्यात त्रुटी' });
    }
  });

  return router;
}

module.exports = createAdminRoutes;
