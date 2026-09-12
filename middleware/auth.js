const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ganpati_utsav_super_secret_jwt_key_2026';

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'प्रवेश नाकारला: कृपया आधी लॉगिन करा (Access denied: Please login first)',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'सत्र कालबाह्य झाले आहे, कृपया पुन्हा लॉगिन करा (Invalid or expired token)',
    });
  }
}

// Middleware to require Admin role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'केवळ मुख्य व्यवस्थापकांसाठी राखीव (Restricted to Admins only)',
    });
  }
  next();
}

module.exports = {
  verifyToken,
  requireAdmin,
  JWT_SECRET,
};
