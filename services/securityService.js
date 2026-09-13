const SecurityBlock = require('../models/SecurityBlock');

const MAX_FAILED_ATTEMPTS = 10;
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

// Fast L1 in-memory cache for ultra-fast checks (<0.01ms) on high traffic / DDoS attempts
const fastBlockCache = new Map(); // ip -> { blockedUntil: number, failedAttempts: number }

// In-memory fallback if MongoDB Atlas is temporarily unreachable
const inMemoryAttempts = new Map(); // ip -> { failedAttempts: number, isBlocked: boolean, blockedUntil: number, lastAttemptAt: Date, username: string }

/**
 * Extract clean, real client IP address from HTTP request (supports Cloudflare, Render, AWS, Nginx proxies)
 */
function getClientIp(req) {
  let ip = '';

  // 1. Cloudflare header
  if (req.headers && req.headers['cf-connecting-ip']) {
    ip = req.headers['cf-connecting-ip'];
  }
  // 2. Standard X-Forwarded-For (proxy list: client, proxy1, proxy2)
  else if (req.headers && req.headers['x-forwarded-for']) {
    const list = String(req.headers['x-forwarded-for']).split(',');
    ip = list[0].trim();
  }
  // 3. X-Real-IP
  else if (req.headers && req.headers['x-real-ip']) {
    ip = req.headers['x-real-ip'];
  }
  // 4. Express req.ip (works when 'trust proxy' is enabled)
  else if (req.ip) {
    ip = req.ip;
  }
  // 5. Raw socket remote address
  else if (req.socket && req.socket.remoteAddress) {
    ip = req.socket.remoteAddress;
  }

  // Normalize IP
  if (typeof ip === 'string') {
    // Strip IPv4 mapped in IPv6 prefix (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }
    // Normalize localhost
    if (ip === '::1' || ip === '0.0.0.0' || ip === '') {
      ip = '127.0.0.1';
    }
  } else {
    ip = '127.0.0.1';
  }

  return ip.trim();
}

/**
 * Check if the given IP address is currently blocked
 */
async function checkIsBlocked(ip, isMongoConnected = false) {
  const now = Date.now();

  // Tier 1: Check fast in-memory L1 cache
  if (fastBlockCache.has(ip)) {
    const entry = fastBlockCache.get(ip);
    if (entry.blockedUntil > now) {
      const msLeft = entry.blockedUntil - now;
      return {
        blocked: true,
        minutesLeft: Math.max(1, Math.ceil(msLeft / 60000)),
        secondsLeft: Math.max(1, Math.ceil(msLeft / 1000)),
        blockedUntil: new Date(entry.blockedUntil),
        failedAttempts: entry.failedAttempts || MAX_FAILED_ATTEMPTS,
      };
    } else {
      fastBlockCache.delete(ip);
    }
  }

  // Tier 2: Check MongoDB
  if (isMongoConnected) {
    try {
      const record = await SecurityBlock.findOne({ ip });
      if (record) {
        if (record.isBlocked && record.blockedUntil && record.blockedUntil.getTime() > now) {
          const msLeft = record.blockedUntil.getTime() - now;
          // Populate L1 cache for sub-millisecond future checks
          fastBlockCache.set(ip, {
            blockedUntil: record.blockedUntil.getTime(),
            failedAttempts: record.failedAttempts,
          });
          return {
            blocked: true,
            minutesLeft: Math.max(1, Math.ceil(msLeft / 60000)),
            secondsLeft: Math.max(1, Math.ceil(msLeft / 1000)),
            blockedUntil: record.blockedUntil,
            failedAttempts: record.failedAttempts,
          };
        } else if (record.isBlocked && record.blockedUntil && record.blockedUntil.getTime() <= now) {
          // Block has expired, clean up record
          record.isBlocked = false;
          record.failedAttempts = 0;
          record.blockedUntil = null;
          await record.save();
        }
      }
    } catch (err) {
      console.warn('MongoDB security check error (falling back to memory):', err.message);
    }
  }

  // Tier 3: In-Memory Fallback
  if (inMemoryAttempts.has(ip)) {
    const mem = inMemoryAttempts.get(ip);
    if (mem.isBlocked && mem.blockedUntil > now) {
      const msLeft = mem.blockedUntil - now;
      return {
        blocked: true,
        minutesLeft: Math.max(1, Math.ceil(msLeft / 60000)),
        secondsLeft: Math.max(1, Math.ceil(msLeft / 1000)),
        blockedUntil: new Date(mem.blockedUntil),
        failedAttempts: mem.failedAttempts,
      };
    } else if (mem.isBlocked && mem.blockedUntil <= now) {
      inMemoryAttempts.delete(ip);
    }
  }

  return { blocked: false };
}

/**
 * Record a failed login / password attempt for an IP
 * Automatically blocks the IP for 30 minutes when reaching 10 attempts
 */
async function recordFailedAttempt(ip, username = '', userAgent = '', isMongoConnected = false) {
  const now = Date.now();
  const cleanUsername = String(username || '').slice(0, 50);
  const cleanUA = String(userAgent || '').slice(0, 200);

  // Check if already blocked
  const alreadyBlocked = await checkIsBlocked(ip, isMongoConnected);
  if (alreadyBlocked.blocked) {
    return alreadyBlocked;
  }

  let totalAttempts = 1;
  let isNowBlocked = false;
  let blockedUntil = null;

  if (isMongoConnected) {
    try {
      let record = await SecurityBlock.findOne({ ip });

      if (!record) {
        record = new SecurityBlock({
          ip,
          failedAttempts: 1,
          lastAttemptAt: new Date(),
          firstAttemptAt: new Date(),
          lastAttemptedUsername: cleanUsername,
          userAgent: cleanUA,
          expiresAt: new Date(now + BLOCK_DURATION_MS),
        });
      } else {
        // If previous block expired, reset counter
        if (record.isBlocked && record.blockedUntil && record.blockedUntil.getTime() <= now) {
          record.failedAttempts = 1;
          record.isBlocked = false;
          record.blockedUntil = null;
        } else {
          record.failedAttempts = (record.failedAttempts || 0) + 1;
        }

        record.lastAttemptAt = new Date();
        record.lastAttemptedUsername = cleanUsername;
        record.userAgent = cleanUA;
      }

      totalAttempts = record.failedAttempts;

      if (totalAttempts >= MAX_FAILED_ATTEMPTS) {
        isNowBlocked = true;
        blockedUntil = new Date(now + BLOCK_DURATION_MS);
        record.isBlocked = true;
        record.blockedUntil = blockedUntil;
        // TTL auto-cleans MongoDB document 1 minute after block expires
        record.expiresAt = new Date(blockedUntil.getTime() + 60 * 1000);

        // Put in fast cache
        fastBlockCache.set(ip, {
          blockedUntil: blockedUntil.getTime(),
          failedAttempts: totalAttempts,
        });

        console.warn(
          `🚨 [SECURITY ALERT] IP ${ip} BLOCKED FOR 30 MINUTES after ${totalAttempts} failed password attempts. Last username tried: "${cleanUsername}"`
        );
      } else {
        // Rolling 30 minute expiry for attempt counter
        record.expiresAt = new Date(now + BLOCK_DURATION_MS);
      }

      await record.save();
    } catch (err) {
      console.error('Error saving failed login attempt in MongoDB:', err.message);
      // Fallback to in-memory handling
      return recordFailedAttemptInMemory(ip, cleanUsername, cleanUA);
    }
  } else {
    return recordFailedAttemptInMemory(ip, cleanUsername, cleanUA);
  }

  if (isNowBlocked) {
    return {
      blocked: true,
      failedAttempts: totalAttempts,
      remainingAttempts: 0,
      minutesLeft: 30,
      secondsLeft: 1800,
      blockedUntil,
    };
  }

  return {
    blocked: false,
    failedAttempts: totalAttempts,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - totalAttempts),
  };
}

/**
 * In-memory helper when MongoDB is offline
 */
function recordFailedAttemptInMemory(ip, username, userAgent) {
  const now = Date.now();
  let mem = inMemoryAttempts.get(ip);

  if (!mem || (mem.isBlocked && mem.blockedUntil <= now)) {
    mem = {
      failedAttempts: 1,
      isBlocked: false,
      blockedUntil: null,
      lastAttemptAt: new Date(),
      username,
      userAgent,
      expiresAt: now + BLOCK_DURATION_MS,
    };
  } else {
    mem.failedAttempts += 1;
    mem.lastAttemptAt = new Date();
    mem.username = username;
    mem.userAgent = userAgent;
    mem.expiresAt = now + BLOCK_DURATION_MS;
  }

  if (mem.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    mem.isBlocked = true;
    mem.blockedUntil = now + BLOCK_DURATION_MS;
    mem.expiresAt = mem.blockedUntil + 60 * 1000;

    fastBlockCache.set(ip, {
      blockedUntil: mem.blockedUntil,
      failedAttempts: mem.failedAttempts,
    });

    console.warn(
      `🚨 [SECURITY ALERT] (In-Memory) IP ${ip} BLOCKED FOR 30 MINUTES after ${mem.failedAttempts} failed password attempts. Username: "${username}"`
    );

    inMemoryAttempts.set(ip, mem);
    return {
      blocked: true,
      failedAttempts: mem.failedAttempts,
      remainingAttempts: 0,
      minutesLeft: 30,
      secondsLeft: 1800,
      blockedUntil: new Date(mem.blockedUntil),
    };
  }

  inMemoryAttempts.set(ip, mem);
  return {
    blocked: false,
    failedAttempts: mem.failedAttempts,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - mem.failedAttempts),
  };
}

/**
 * Reset failed attempts on successful login
 */
async function recordSuccessfulLogin(ip, isMongoConnected = false) {
  fastBlockCache.delete(ip);
  inMemoryAttempts.delete(ip);

  if (isMongoConnected) {
    try {
      await SecurityBlock.deleteOne({ ip });
    } catch (err) {
      console.warn('Notice clearing security block in MongoDB:', err.message);
    }
  }
}

/**
 * Unblock an IP manually (Admin operation)
 */
async function unblockIp(ip, isMongoConnected = false) {
  const cleanIp = String(ip || '').trim();
  fastBlockCache.delete(cleanIp);
  inMemoryAttempts.delete(cleanIp);

  let deletedCount = 0;
  if (isMongoConnected) {
    try {
      const res = await SecurityBlock.deleteMany({ ip: cleanIp });
      deletedCount = res.deletedCount || 0;
    } catch (err) {
      console.error('Error unblocking IP in MongoDB:', err.message);
      throw err;
    }
  }

  console.log(`🔓 [SECURITY] IP ${cleanIp} manually unblocked by administrator.`);
  return {
    success: true,
    ip: cleanIp,
    unblocked: true,
    message: `IP ${cleanIp} यशस्वीरित्या अनब्लॉक केला आहे. (IP ${cleanIp} unblocked successfully)`,
  };
}

/**
 * List all currently blocked IPs (For Admin security panel)
 */
async function listBlockedIps(isMongoConnected = false) {
  const now = Date.now();
  const results = [];
  const seenIps = new Set();

  // From MongoDB
  if (isMongoConnected) {
    try {
      const dbBlocks = await SecurityBlock.find({
        isBlocked: true,
        blockedUntil: { $gt: new Date() },
      })
        .sort({ blockedUntil: -1 })
        .lean();

      for (const b of dbBlocks) {
        const msLeft = new Date(b.blockedUntil).getTime() - now;
        seenIps.add(b.ip);
        results.push({
          ip: b.ip,
          failedAttempts: b.failedAttempts,
          lastAttemptedUsername: b.lastAttemptedUsername,
          lastAttemptAt: b.lastAttemptAt,
          blockedUntil: b.blockedUntil,
          minutesLeft: Math.max(1, Math.ceil(msLeft / 60000)),
          secondsLeft: Math.max(1, Math.ceil(msLeft / 1000)),
          userAgent: b.userAgent,
          source: 'MongoDB Atlas',
        });
      }
    } catch (err) {
      console.error('Error listing blocked IPs from MongoDB:', err.message);
    }
  }

  // From In-Memory
  for (const [ip, mem] of inMemoryAttempts.entries()) {
    if (mem.isBlocked && mem.blockedUntil > now && !seenIps.has(ip)) {
      const msLeft = mem.blockedUntil - now;
      seenIps.add(ip);
      results.push({
        ip,
        failedAttempts: mem.failedAttempts,
        lastAttemptedUsername: mem.username,
        lastAttemptAt: mem.lastAttemptAt,
        blockedUntil: new Date(mem.blockedUntil),
        minutesLeft: Math.max(1, Math.ceil(msLeft / 60000)),
        secondsLeft: Math.max(1, Math.ceil(msLeft / 1000)),
        userAgent: mem.userAgent,
        source: 'In-Memory Cache',
      });
    }
  }

  return results;
}

module.exports = {
  MAX_FAILED_ATTEMPTS,
  BLOCK_DURATION_MS,
  getClientIp,
  checkIsBlocked,
  recordFailedAttempt,
  recordSuccessfulLogin,
  unblockIp,
  listBlockedIps,
};
