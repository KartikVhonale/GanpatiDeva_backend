const securityService = require('../services/securityService');

/**
 * Express middleware to intercept and block IPs that exceeded 10 failed login attempts for 30 minutes
 */
function createBruteForceLimiter(getIsMongoConnected) {
  return async function bruteForceLimiter(req, res, next) {
    try {
      const clientIp = securityService.getClientIp(req);
      req.clientIp = clientIp;

      const isMongo = typeof getIsMongoConnected === 'function' ? getIsMongoConnected() : false;
      const blockStatus = await securityService.checkIsBlocked(clientIp, isMongo);

      if (blockStatus.blocked) {
        // Set RFC-standard rate limiting & retry headers
        res.set('Retry-After', String(blockStatus.secondsLeft));
        res.set('X-RateLimit-Limit', String(securityService.MAX_FAILED_ATTEMPTS));
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', String(Math.ceil(blockStatus.blockedUntil.getTime() / 1000)));

        return res.status(429).json({
          error: `सुरक्षा कारणास्तव १० चुकीच्या प्रयत्नांनंतर हा IP पुढील ${blockStatus.minutesLeft} मिनिटांसाठी ब्लॉक केला आहे. कृपया नंतर पुन्हा प्रयत्न करा. (Security Lockout: This IP has been blocked for ${blockStatus.minutesLeft} minutes due to 10 failed login attempts. Please try again later.)`,
          blocked: true,
          retryAfterMinutes: blockStatus.minutesLeft,
          retryAfterSeconds: blockStatus.secondsLeft,
          blockedUntil: blockStatus.blockedUntil,
        });
      }

      next();
    } catch (err) {
      console.error('Error in brute force limiter middleware:', err);
      // In case of any unexpected middleware error, do not completely break auth
      next();
    }
  };
}

/**
 * Security HTTP headers middleware for production hardening
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

module.exports = {
  createBruteForceLimiter,
  securityHeaders,
};
