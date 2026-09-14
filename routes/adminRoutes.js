const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const userService = require('../services/userService');
const settingsService = require('../services/settingsService');
const securityService = require('../services/securityService');
const noticeService = require('../services/noticeService');
const musicService = require('../services/musicService');
const Donation = require('../models/Donation');

function createAdminRoutes(options) {
  // Support both legacy signature createAdminRoutes(getIsMongoConnected) and options object
  const getIsMongoConnected = typeof options === 'function' ? options : options.getIsMongoConnected;
  const getDonationsData = typeof options === 'object' ? options.getDonationsData : null;
  const io = typeof options === 'object' ? options.io : null;
  const getInMemoryDonations = typeof options === 'object' ? options.getInMemoryDonations : () => [];
  const deleteInMemoryDonation = typeof options === 'object' ? options.deleteInMemoryDonation : null;

  const router = express.Router();

  // Protect all admin routes
  router.use(verifyToken);
  router.use(requireAdmin);

  // =========================================================================
  // 1. FESTIVAL SETTINGS (Target Limit, UPI ID, QR Code URL)
  // =========================================================================

  // GET /api/admin/settings - Fetch current settings
  router.get('/settings', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const settings = await settingsService.getSettings(isMongo);
      res.json({ success: true, settings });
    } catch (err) {
      console.error('Error fetching settings:', err);
      res.status(500).json({ error: 'Failed to fetch settings', details: err.message });
    }
  });

  // PUT /api/admin/settings - Update settings (Target Amount, UPI, QR Code)
  router.put('/settings', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const updated = await settingsService.updateSettings(req.body, isMongo, req.user.username);

      // Broadcast updated settings to all clients (Live TV, Dashboard, Mobile)
      if (io) {
        io.emit('settings_updated', updated);
        if (getDonationsData) {
          const stats = await getDonationsData();
          io.emit('stats_updated', stats);
        }
      }

      console.log(`⚙️ Admin updated settings: Target ₹${updated.targetAmount} | UPI: ${updated.upiId}`);

      res.json({
        success: true,
        message: 'सेटिंग्ज यशस्वीपणे सेव्ह झाल्या! (Settings updated successfully)',
        settings: updated,
      });
    } catch (err) {
      console.error('Error updating settings:', err);
      res.status(400).json({ error: err.message || 'सेटिंग्ज अपडेट करण्यात त्रुटी' });
    }
  });

  // =========================================================================
  // 2. ONLINE PAYMENT VERIFICATION REQUESTS
  // =========================================================================

  // GET /api/admin/payment-requests - List all pending requests
  router.get('/payment-requests', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      let requests = [];

      if (isMongo) {
        requests = await Donation.find({ status: 'pending_verification' })
          .sort({ amount: -1, timestamp: -1 })
          .lean();
      } else {
        const memList = getInMemoryDonations ? getInMemoryDonations() : [];
        requests = memList
          .filter((d) => d.status === 'pending_verification')
          .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0) || new Date(b.timestamp) - new Date(a.timestamp));
      }

      res.json({
        success: true,
        requests,
        count: requests.length,
      });
    } catch (err) {
      console.error('Error fetching payment requests:', err);
      res.status(500).json({ error: 'Failed to fetch payment requests', details: err.message });
    }
  });

  // PATCH /api/admin/payment-requests/:id/approve - Approve payment & add to Live TV
  router.patch('/payment-requests/:id/approve', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      let donation;

      if (isMongo && req.params.id && !req.params.id.startsWith('mem-')) {
        donation = await Donation.findById(req.params.id);
        if (!donation) {
          return res.status(404).json({ error: 'देणगी नोंद सापडली नाही' });
        }
        donation.status = 'verified';
        donation.verifiedBy = req.user.name || req.user.username;
        await donation.save();
      } else {
        const memList = getInMemoryDonations ? getInMemoryDonations() : [];
        donation = memList.find((d) => d._id.toString() === req.params.id.toString());
        if (!donation) {
          return res.status(404).json({ error: 'देणगी नोंद सापडली नाही' });
        }
        donation.status = 'verified';
        donation.verifiedBy = req.user.name || req.user.username;
      }

      // Recalculate stats with the newly verified donation
      let stats = {};
      if (getDonationsData) {
        stats = await getDonationsData();
      }

      // Broadcast new_donation event to all connected TV screens and dashboards
      if (io) {
        io.emit('new_donation', {
          ...stats,
          donation,
        });
      }

      console.log(`✅ Admin approved online payment: ₹${donation.amount} - ${donation.name} (UTR: ${donation.utrNumber})`);

      res.json({
        success: true,
        message: 'देणगी यशस्वीपणे मंजूर केली! (Payment approved and added to live stats)',
        donation,
        ...stats,
      });
    } catch (err) {
      console.error('Error approving payment request:', err);
      res.status(500).json({ error: 'मंजूर करताना त्रुटी आली', details: err.message });
    }
  });

  // PATCH /api/admin/payment-requests/:id/reject - Reject payment
  router.patch('/payment-requests/:id/reject', async (req, res) => {
    try {
      const { reason } = req.body;
      const isMongo = getIsMongoConnected();
      let donation;

      if (isMongo && req.params.id && !req.params.id.startsWith('mem-')) {
        donation = await Donation.findById(req.params.id);
        if (!donation) {
          return res.status(404).json({ error: 'देणगी नोंद सापडली नाही' });
        }
        donation.status = 'rejected';
        donation.rejectionReason = reason || 'पडताळणी अयशस्वी';
        donation.verifiedBy = req.user.name || req.user.username;
        await donation.save();
      } else {
        const memList = getInMemoryDonations ? getInMemoryDonations() : [];
        donation = memList.find((d) => d._id.toString() === req.params.id.toString());
        if (!donation) {
          return res.status(404).json({ error: 'देणगी नोंद सापडली नाही' });
        }
        donation.status = 'rejected';
        donation.rejectionReason = reason || 'पडताळणी अयशस्वी';
        donation.verifiedBy = req.user.name || req.user.username;
      }

      res.json({
        success: true,
        message: 'पेमेंट विनंती नाकारण्यात आली (Payment request rejected)',
        donation,
      });
    } catch (err) {
      console.error('Error rejecting payment request:', err);
      res.status(500).json({ error: 'रद्द करताना त्रुटी आली', details: err.message });
    }
  });

  // =========================================================================
  // 3. USER & VOLUNTEER MANAGEMENT
  // =========================================================================

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

  // =========================================================================
  // 4. DONATIONS MANAGEMENT & DELETION (Strictly Admin Only)
  // =========================================================================

  // GET /api/admin/donations - List all donations for admin
  router.get('/donations', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      let donations = [];

      if (isMongo) {
        donations = await Donation.find({ status: { $ne: 'rejected' } })
          .sort({ amount: -1, timestamp: -1 })
          .lean();
      } else {
        const memList = getInMemoryDonations ? getInMemoryDonations() : [];
        donations = memList
          .filter((d) => d.status !== 'rejected')
          .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0) || new Date(b.timestamp) - new Date(a.timestamp));
      }

      res.json({
        success: true,
        donations,
        count: donations.length,
      });
    } catch (err) {
      console.error('Error fetching donations for admin:', err);
      res.status(500).json({ error: 'देणग्या आणताना त्रुटी आली', details: err.message });
    }
  });

  // DELETE /api/admin/donations/:id - Delete a donation (Strictly Admin only)
  router.delete('/donations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const isMongo = getIsMongoConnected();
      let deletedDonation = null;

      if (isMongo && id && !id.startsWith('mem-')) {
        deletedDonation = await Donation.findByIdAndDelete(id);
      }

      if (!deletedDonation && deleteInMemoryDonation) {
        deletedDonation = deleteInMemoryDonation(id);
      }

      if (!deletedDonation) {
        const memList = getInMemoryDonations ? getInMemoryDonations() : [];
        const idx = memList.findIndex((d) => String(d._id) === String(id) || String(d.id) === String(id));
        if (idx !== -1) {
          deletedDonation = memList.splice(idx, 1)[0];
        }
      }

      if (!deletedDonation) {
        return res.status(404).json({ error: 'देणगी नोंद आढळली नाही (Donation not found)' });
      }

      console.log(`🗑️ Admin (${req.user.username}) deleted donation: ID ${id}, Amount ₹${deletedDonation.amount}, Donor: ${deletedDonation.name}`);

      // Recalculate stats and broadcast in real-time
      let stats = {};
      if (getDonationsData) {
        stats = await getDonationsData();
      }

      if (io) {
        io.emit('donation_deleted', {
          donationId: id,
          ...stats,
        });
        io.emit('stats_updated', stats);
      }

      res.json({
        success: true,
        message: `₹${Number(deletedDonation.amount).toLocaleString()} ची देणगी (${deletedDonation.name}) यशस्वीपणे हटवली!`,
        deletedDonation,
        stats,
      });
    } catch (err) {
      console.error('Error deleting donation:', err);
      res.status(500).json({ error: 'देणगी हटवताना त्रुटी आली', details: err.message });
    }
  });

  // =========================================================================
  // 5. SECURITY & BRUTE-FORCE LOCKOUT MANAGEMENT
  // =========================================================================

  // GET /api/admin/security/blocked-ips - List all currently blocked IPs
  router.get('/security/blocked-ips', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const blockedIps = await securityService.listBlockedIps(isMongo);
      res.json({
        success: true,
        count: blockedIps.length,
        blockedIps,
      });
    } catch (err) {
      console.error('Error fetching blocked IPs:', err);
      res.status(500).json({ error: 'Failed to fetch blocked IPs', details: err.message });
    }
  });

  // POST /api/admin/security/unblock-ip - Unblock an IP address manually
  router.post('/security/unblock-ip', async (req, res) => {
    try {
      const { ip } = req.body;
      if (!ip || typeof ip !== 'string') {
        return res.status(400).json({ error: 'अवैध IP पत्ता (Valid IP address required)' });
      }

      const isMongo = getIsMongoConnected();
      const result = await securityService.unblockIp(ip.trim(), isMongo);
      res.json(result);
    } catch (err) {
      console.error('Error unblocking IP:', err);
      res.status(500).json({ error: 'Failed to unblock IP', details: err.message });
    }
  });

  // =========================================================================
  // 6. NOTICE BOARD MANAGEMENT (अधिकृत सूचना फलक)
  // =========================================================================

  // GET /api/admin/notices - Fetch all notices (active & inactive)
  router.get('/notices', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const notices = await noticeService.getAllNotices(isMongo);
      res.json({
        success: true,
        count: notices.length,
        notices,
      });
    } catch (err) {
      console.error('Error fetching admin notices:', err);
      res.status(500).json({ error: 'Failed to fetch notices', details: err.message });
    }
  });

  // POST /api/admin/notices - Create new notice
  router.post('/notices', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const authorName = req.user.name || req.user.username || 'श्री बाल गणेश मंडळ व्यवस्थापक';
      const created = await noticeService.createNotice(req.body, isMongo, authorName);

      // Broadcast updated public notices to all screens (Home, Live TV, Volunteers)
      if (io) {
        const publicNotices = await noticeService.getPublicNotices(isMongo);
        io.emit('notices_updated', { notices: publicNotices, newNotice: created });
      }

      console.log(`📢 Notice published: "${created.title}" [${created.category}] by ${authorName}`);

      res.status(201).json({
        success: true,
        message: 'सूचना यशस्वीपणे फलकावर प्रकाशित झाली! (Notice published successfully)',
        notice: created,
      });
    } catch (err) {
      console.error('Error creating notice:', err);
      res.status(400).json({ error: err.message || 'सूचना तयार करताना त्रुटी आली' });
    }
  });

  // PUT /api/admin/notices/:id - Update existing notice
  router.put('/notices/:id', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const updated = await noticeService.updateNotice(req.params.id, req.body, isMongo);

      if (io) {
        const publicNotices = await noticeService.getPublicNotices(isMongo);
        io.emit('notices_updated', { notices: publicNotices, updatedNotice: updated });
      }

      res.json({
        success: true,
        message: 'सूचना यशस्वीरित्या अद्ययावत केली! (Notice updated)',
        notice: updated,
      });
    } catch (err) {
      console.error('Error updating notice:', err);
      res.status(400).json({ error: err.message || 'सूचना अद्ययावत करताना त्रुटी' });
    }
  });

  // PATCH /api/admin/notices/:id/toggle - Toggle notice active/inactive status
  router.patch('/notices/:id/toggle', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const toggled = await noticeService.toggleNoticeActive(req.params.id, isMongo);

      if (io) {
        const publicNotices = await noticeService.getPublicNotices(isMongo);
        io.emit('notices_updated', { notices: publicNotices, toggledNotice: toggled });
      }

      res.json({
        success: true,
        message: `सूचना आता ${toggled.isActive ? 'सक्रिय (Live)' : 'अप्रकाशित (Hidden)'} केली आहे!`,
        notice: toggled,
      });
    } catch (err) {
      console.error('Error toggling notice:', err);
      res.status(400).json({ error: err.message || 'स्थिती बदलताना त्रुटी' });
    }
  });

  // DELETE /api/admin/notices/:id - Delete a notice
  router.delete('/notices/:id', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const deleted = await noticeService.deleteNotice(req.params.id, isMongo);

      if (io) {
        const publicNotices = await noticeService.getPublicNotices(isMongo);
        io.emit('notices_updated', { notices: publicNotices, deletedId: req.params.id });
      }

      res.json({
        success: true,
        message: 'सूचना यशस्वीरित्या हटवली! (Notice deleted)',
        notice: deleted,
      });
    } catch (err) {
      console.error('Error deleting notice:', err);
      res.status(400).json({ error: err.message || 'सूचना हटवताना त्रुटी' });
    }
  });

  // =========================================================================
  // 7. GANPATI MUSIC & SUGGESTIONS MANAGEMENT (भक्ती संगीत व्यवस्थापन)
  // =========================================================================

  // GET /api/admin/music-suggestions - View all devotee suggestions
  router.get('/music-suggestions', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const suggestions = await musicService.getAllSuggestions(isMongo);
      res.json({
        success: true,
        count: suggestions.length,
        suggestions,
      });
    } catch (err) {
      console.error('Error fetching admin music suggestions:', err);
      res.status(500).json({ error: 'Failed to fetch suggestions', details: err.message });
    }
  });

  // PATCH /api/admin/music-suggestions/:id - Approve or Reject suggestion
  router.patch('/music-suggestions/:id', async (req, res) => {
    try {
      const { status } = req.body;
      if (!['approved', 'pending', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'अवैध स्थिती (Invalid status)' });
      }

      const isMongo = getIsMongoConnected();
      const updated = await musicService.updateSuggestionStatus(req.params.id, status, isMongo);

      if (io) {
        io.emit('music_suggestion_updated', { id: req.params.id, status });
        io.emit('songs_updated');
      }

      res.json({
        success: true,
        message: `गाण्याची स्थिती यशस्वीरित्या ${status === 'approved' ? 'मंजूर' : status === 'pending' ? 'प्रलंबित' : 'अस्वीकृत'} केली!`,
        suggestion: updated,
      });
    } catch (err) {
      console.error('Error updating music suggestion:', err);
      res.status(400).json({ error: err.message || 'स्थिती बदलताना त्रुटी' });
    }
  });

  // DELETE /api/admin/music-suggestions/:id - Delete suggestion
  router.delete('/music-suggestions/:id', async (req, res) => {
    try {
      const isMongo = getIsMongoConnected();
      const deleted = await musicService.deleteSuggestion(req.params.id, isMongo);

      if (io) {
        io.emit('music_suggestion_deleted', { id: req.params.id });
        io.emit('songs_updated');
      }

      res.json({
        success: true,
        message: 'गाण्याची सूचना यशस्वीरित्या हटवली!',
        suggestion: deleted,
      });
    } catch (err) {
      console.error('Error deleting music suggestion:', err);
      res.status(400).json({ error: err.message || 'गाणे हटवताना त्रुटी' });
    }
  });

  return router;
}

module.exports = createAdminRoutes;
