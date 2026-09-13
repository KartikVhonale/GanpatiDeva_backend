const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const { createBruteForceLimiter } = require('../middleware/securityLimiter');
const userService = require('../services/userService');
const securityService = require('../services/securityService');

// Dummy bcrypt hash for timing attack protection
const DUMMY_HASH = '$2a$10$e8wVf59BfIuYgJ1hP3sEPe0.N.3O7sZ8Jq7O4T4i9bE8f9.aQ9j9e';

function createAuthRoutes(getIsMongoConnected) {
  const router = express.Router();
  const bruteForceLimiter = createBruteForceLimiter(getIsMongoConnected);

  // POST /api/auth/login
  router.post('/login', bruteForceLimiter, async (req, res) => {
    try {
      const isMongo = typeof getIsMongoConnected === 'function' ? getIsMongoConnected() : false;
      const clientIp = req.clientIp || securityService.getClientIp(req);
      const { username, password } = req.body;

      // 1. Basic validation
      if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({
          error: 'कृपया वापरकर्ता नाव आणि पासवर्ड प्रविष्ट करा (Username and password are required)',
        });
      }

      const cleanUsername = username.toLowerCase().trim();
      const user = await userService.findUserByUsername(cleanUsername, isMongo);

      // 2. User not found -> Execute dummy compare to prevent timing-based user enumeration
      if (!user) {
        await bcrypt.compare(password, DUMMY_HASH);
        const attempt = await securityService.recordFailedAttempt(
          clientIp,
          cleanUsername,
          req.headers['user-agent'],
          isMongo
        );

        if (attempt.blocked) {
          res.set('Retry-After', String(attempt.secondsLeft));
          return res.status(429).json({
            error: `सुरक्षा कारणास्तव १० चुकीच्या प्रयत्नांनंतर हा IP पुढील ${attempt.minutesLeft} मिनिटांसाठी ब्लॉक केला आहे. (Security Lockout: This IP has been blocked for ${attempt.minutesLeft} minutes due to 10 failed login attempts.)`,
            blocked: true,
            retryAfterMinutes: attempt.minutesLeft,
            retryAfterSeconds: attempt.secondsLeft,
            blockedUntil: attempt.blockedUntil,
          });
        }

        res.set('X-RateLimit-Limit', String(securityService.MAX_FAILED_ATTEMPTS));
        res.set('X-RateLimit-Remaining', String(attempt.remainingAttempts));
        return res.status(401).json({
          error: `अवैध वापरकर्ता नाव किंवा पासवर्ड. उर्वरित प्रयत्न: ${attempt.remainingAttempts}/10 (Invalid credentials. ${attempt.remainingAttempts} attempts remaining before 30-min block)`,
          remainingAttempts: attempt.remainingAttempts,
        });
      }

      // 3. User deactivated check
      if (!user.isActive) {
        const attempt = await securityService.recordFailedAttempt(
          clientIp,
          cleanUsername,
          req.headers['user-agent'],
          isMongo
        );

        if (attempt.blocked) {
          res.set('Retry-After', String(attempt.secondsLeft));
          return res.status(429).json({
            error: `सुरक्षा कारणास्तव १० चुकीच्या प्रयत्नांनंतर हा IP पुढील ${attempt.minutesLeft} मिनिटांसाठी ब्लॉक केला आहे. (Security Lockout: This IP has been blocked for ${attempt.minutesLeft} minutes.)`,
            blocked: true,
            retryAfterMinutes: attempt.minutesLeft,
            retryAfterSeconds: attempt.secondsLeft,
            blockedUntil: attempt.blockedUntil,
          });
        }

        return res.status(403).json({
          error: 'आपले खाते निष्क्रिय केले आहे. कृपया मुख्य व्यवस्थापकाशी संपर्क साधा. (Account is deactivated)',
        });
      }

      // 4. Verify password
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

      // 5. Password mismatch -> record failure & check threshold
      if (!isMatch) {
        const attempt = await securityService.recordFailedAttempt(
          clientIp,
          cleanUsername,
          req.headers['user-agent'],
          isMongo
        );

        if (attempt.blocked) {
          res.set('Retry-After', String(attempt.secondsLeft));
          return res.status(429).json({
            error: `सुरक्षा कारणास्तव १० चुकीच्या प्रयत्नांनंतर हा IP पुढील ${attempt.minutesLeft} मिनिटांसाठी ब्लॉक केला आहे. कृपया नंतर पुन्हा प्रयत्न करा. (Security Lockout: This IP has been blocked for ${attempt.minutesLeft} minutes due to 10 failed login attempts.)`,
            blocked: true,
            retryAfterMinutes: attempt.minutesLeft,
            retryAfterSeconds: attempt.secondsLeft,
            blockedUntil: attempt.blockedUntil,
          });
        }

        res.set('X-RateLimit-Limit', String(securityService.MAX_FAILED_ATTEMPTS));
        res.set('X-RateLimit-Remaining', String(attempt.remainingAttempts));
        return res.status(401).json({
          error: `अवैध वापरकर्ता नाव किंवा पासवर्ड. उर्वरित प्रयत्न: ${attempt.remainingAttempts}/10 (Invalid credentials. ${attempt.remainingAttempts} attempts remaining before 30-min block)`,
          remainingAttempts: attempt.remainingAttempts,
        });
      }

      // 6. Login Successful! Reset failed attempts for this IP immediately
      await securityService.recordSuccessfulLogin(clientIp, isMongo);

      // 7. Generate JWT
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

      console.log(`🔑 Successful login: ${user.name} (${user.username}) [Role: ${user.role}] from IP: ${clientIp}`);

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
      const isMongo = typeof getIsMongoConnected === 'function' ? getIsMongoConnected() : false;
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
