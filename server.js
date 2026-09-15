const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Donation = require('./models/Donation');
const userService = require('./services/userService');
const settingsService = require('./services/settingsService');
const noticeService = require('./services/noticeService');
const musicService = require('./services/musicService');
const { JWT_SECRET } = require('./middleware/auth');
const createAuthRoutes = require('./routes/authRoutes');
const createAdminRoutes = require('./routes/adminRoutes');
const { securityHeaders } = require('./middleware/securityLimiter');

const app = express();
// Enable trust proxy so Express correctly reads real client IP behind reverse proxies / cloud platforms (Render, Vercel, Nginx)
app.set('trust proxy', 1);

const server = http.createServer(app);

// In-memory fallback store (empty by default - all data stored in MongoDB Atlas)
let isMongoConnected = false;
let inMemoryDonations = [];

// Allowed origins for CORS (Local + Vercel + Configured FRONTEND_URL)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach((url) => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

function checkOrigin(origin, callback) {
  // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
  if (!origin) return callback(null, true);

  const cleanOrigin = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(cleanOrigin)) {
    return callback(null, true);
  }

  try {
    const hostname = new URL(cleanOrigin).hostname;
    // Allow any Vercel deployment preview or production domain automatically
    if (hostname.endsWith('.vercel.app') || hostname === 'localhost' || hostname === '127.0.0.1') {
      return callback(null, true);
    }
  } catch (e) {}

  // Fallback: allow origin so production frontend is never blocked
  return callback(null, true);
}

// Configure Socket.io with dynamic CORS
const io = new Server(server, {
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const compression = require('compression');

// Middleware
app.use(cors({
  origin: checkOrigin,
  credentials: true,
}));
app.use(compression({
  threshold: 1024,
}));
app.use(express.json());
app.use(securityHeaders);

// Root & Health Check routes for Render monitoring
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: '🙏 Ganpati Utsav 2026 Seva Backend API is running smoothly',
    database: isMongoConnected ? 'MongoDB Atlas' : 'In-Memory Fallback',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Initialize users in in-memory list initially
userService.initDefaultUsers(false);

// MongoDB Atlas Connection with high-concurrency connection pooling
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ganpati_utsav';
console.log('Connecting to MongoDB Atlas...');
mongoose.connect(MONGO_URI, { 
  dbName: 'ganpati_utsav',
  serverSelectionTimeoutMS: 15000,
  maxPoolSize: 50,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
})
  .then(async () => {
    isMongoConnected = true;
    console.log('✅ Connected to MongoDB Atlas! Database:', mongoose.connection.name);
    await userService.initDefaultUsers(true);
    await noticeService.seedDefaultNoticesIfEmpty(true);
    await musicService.seedDefaultSongsIfEmpty(true);
  })
  .catch((err) => {
    isMongoConnected = false;
    console.error('❌ MongoDB Atlas connection error:', err.message);
  });

mongoose.connection.on('connected', async () => {
  isMongoConnected = true;
  await userService.initDefaultUsers(true);
  await noticeService.seedDefaultNoticesIfEmpty(true);
  await musicService.seedDefaultSongsIfEmpty(true);
});
mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
});

// Register Authentication & Admin Routes
app.use('/api/auth', createAuthRoutes(() => isMongoConnected));
app.use(
  '/api/admin',
  createAdminRoutes({
    getIsMongoConnected: () => isMongoConnected,
    getDonationsData: (force = true) => getDonationsData(force),
    invalidateDonationsCache,
    io,
    getInMemoryDonations: () => inMemoryDonations,
    deleteInMemoryDonation: (id) => {
      const idx = inMemoryDonations.findIndex((d) => String(d._id) === String(id) || String(d.id) === String(id));
      if (idx !== -1) {
        return inMemoryDonations.splice(idx, 1)[0];
      }
      return null;
    },
  })
);

// High-concurrency in-memory cache for donations aggregated stats
let donationsCache = null;
let donationsCacheTime = 0;
const DONATIONS_CACHE_TTL_MS = 3000; // 3 seconds cache TTL for peak concurrent traffic

function invalidateDonationsCache() {
  donationsCache = null;
  donationsCacheTime = 0;
}

// Helper to compute all stats and return all donations from the database (cached for high concurrency)
async function getDonationsData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && donationsCache && (now - donationsCacheTime < DONATIONS_CACHE_TTL_MS)) {
    return donationsCache;
  }

  let allDonations = [];
  const verifiedFilter = {
    $or: [
      { status: 'verified' },
      { status: { $exists: false } },
      { status: null },
    ],
  };

  if (isMongoConnected) {
    try {
      allDonations = await Donation.find(verifiedFilter)
        .sort({ amount: -1, timestamp: -1 })
        .lean();
    } catch (err) {
      console.error('Error calculating from MongoDB:', err.message);
      allDonations = inMemoryDonations
        .filter((d) => d.status !== 'pending_verification' && d.status !== 'rejected')
        .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0) || new Date(b.timestamp) - new Date(a.timestamp));
    }
  } else {
    allDonations = inMemoryDonations
      .filter((d) => d.status !== 'pending_verification' && d.status !== 'rejected')
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0) || new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Count pending verification requests
  let pendingRequestsCount = 0;
  if (isMongoConnected) {
    try {
      pendingRequestsCount = await Donation.countDocuments({ status: 'pending_verification' });
    } catch (e) {}
  } else {
    pendingRequestsCount = inMemoryDonations.filter((d) => d.status === 'pending_verification').length;
  }

  // Load dynamic settings (targetAmount, upiId, etc.)
  const settings = await settingsService.getSettings(isMongoConnected);
  const targetAmount = settings.targetAmount || 10000;

  let totalVargani = 0;
  let prasadCount = 0;
  let aartiSponsors = 0;
  let cashTotal = 0;
  let onlineTotal = 0;

  for (const d of allDonations) {
    const amt = Number(d.amount) || 0;
    totalVargani += amt;

    const cat = d.category || '';
    if (cat.includes('महाप्रसाद') || cat.includes('नैवेद्य') || cat.includes('मोदक')) {
      prasadCount += Math.max(1, Math.floor(amt / 50));
    }
    if (cat.includes('आरती') || cat.includes('दीप') || cat.includes('छत्र')) {
      aartiSponsors += 1;
    }
    if (d.paymentMethod === 'online') {
      onlineTotal += amt;
    } else {
      cashTotal += amt;
    }
  }

  const result = {
    totalVargani,
    targetAmount,
    donorCount: allDonations.length,
    prasadCount,
    aartiSponsors,
    cashTotal,
    onlineTotal,
    donors: allDonations, // ALL donations with all names and numbers of money
    allDonors: allDonations,
    recentDonors: allDonations.slice(0, 10),
    pendingRequestsCount,
    settings,
    isMongoConnected,
  };

  donationsCache = result;
  donationsCacheTime = now;
  return result;
}

async function calculateTotalVargani() {
  const data = await getDonationsData();
  return data.totalVargani;
}

// Routes

// GET / - Root welcome and status page
app.get('/', async (req, res) => {
  const total = await calculateTotalVargani();
  res.send(`
    <!DOCTYPE html>
    <html lang="mr">
      <head>
        <meta charset="UTF-8" />
        <title>श्री गणेश उत्सव - Backend API</title>
        <style>
          body {
            margin: 0; padding: 40px 20px; background: #0f0705; color: #fff7ed;
            font-family: system-ui, -apple-system, sans-serif; text-align: center;
          }
          .card {
            max-width: 580px; margin: 0 auto; background: rgba(36, 12, 6, 0.6);
            border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 24px; padding: 32px;
            box-shadow: 0 16px 40px rgba(234, 88, 12, 0.2); backdrop-filter: blur(12px);
          }
          h1 { color: #f59e0b; margin: 0 0 8px; font-size: 28px; }
          .badge {
            display: inline-block; padding: 4px 12px; border-radius: 9999px;
            background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4);
            color: #6ee7b7; font-size: 13px; font-weight: 600; margin-bottom: 20px;
          }
          .btn {
            display: inline-block; margin-top: 20px; padding: 12px 28px;
            background: linear-gradient(135deg, #f59e0b, #ea580c, #dc2626);
            color: white; text-decoration: none; border-radius: 14px; font-weight: bold;
            box-shadow: 0 4px 15px rgba(234, 88, 12, 0.4);
          }
          .info { color: #fed7aa; opacity: 0.8; font-size: 14px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🪔 श्री गणेश उत्सव सर्व्हर चालू आहे!</h1>
          <div class="badge">● Backend & Socket.io Online (Port 5000)</div>
          <p>डेटाबेस स्थिती: <strong>${isMongoConnected ? 'MongoDB Connected 🟢' : 'In-Memory Active 🟡'}</strong></p>
          <p>एकूण जमा देणगी: <span style="font-size: 22px; font-weight: bold; color: #fbbf24;">₹${total.toLocaleString()}</span></p>
          <p class="info">मुख्य डिस्प्ले बोर्ड पाहण्यासाठी खालील बटणावर क्लिक करा:</p>
          <a href="http://localhost:5173" class="btn">मुख्य डिस्प्ले बोर्ड उघडा (Go to Display Board) ↗</a>
        </div>
      </body>
    </html>
  `);
});

// GET /api/donations - Returns totalVargani, stats, and all donations with names & amounts
app.get('/api/donations', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=3, stale-while-revalidate=10');
    const data = await getDonationsData();
    res.json(data);
  } catch (err) {
    console.error('Error in GET /api/donations:', err);
    res.status(500).json({ error: 'Failed to retrieve donations', details: err.message });
  }
});

// GET /api/donations/all - Dedicated endpoint for all donations
app.get('/api/donations/all', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=3, stale-while-revalidate=10');
    const data = await getDonationsData();
    res.json({
      success: true,
      totalAmount: data.totalVargani,
      donorCount: data.donorCount,
      donors: data.donors,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve all donations', details: err.message });
  }
});

// GET /api/settings - Public settings (Target amount, UPI ID, QR Code URL)
app.get('/api/settings', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    const settings = await settingsService.getSettings(isMongoConnected);
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// GET /api/notices - Public notice board announcements
app.get('/api/notices', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    const notices = await noticeService.getPublicNotices(isMongoConnected);
    res.json({ success: true, count: notices.length, notices });
  } catch (err) {
    console.error('Error fetching public notices:', err);
    res.status(500).json({ error: 'Failed to retrieve notices', details: err.message });
  }
});

// =========================================================================
// MUSIC & BHAJAN PLAYLIST & SUGGESTIONS API (गणपती भक्ती संगीत व गाणी)
// =========================================================================

// GET /api/music/songs - Public curated playlist and approved devotee suggestions
app.get('/api/music/songs', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    const data = await musicService.getAllSongs(isMongoConnected);
    res.json({
      success: true,
      ...data,
      mandalName: 'श्री बाल गणेश मंडळ धानोरा बु.',
    });
  } catch (err) {
    console.error('Error fetching music songs:', err);
    res.status(500).json({ error: 'Failed to retrieve music playlist', details: err.message });
  }
});

// POST /api/music/suggest - Devotee submits a Ganpati song suggestion
app.post('/api/music/suggest', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'कृपया गाण्याचे नाव प्रविष्ट करा (Song title is required)' });
    }

    const saved = await musicService.createSuggestion(req.body, isMongoConnected);

    // Broadcast new suggestion event to all connected clients
    io.emit('new_music_suggestion', {
      suggestion: saved,
      message: `🎶 नवीन गाणे सुचवले गेले: "${saved.title}" (${saved.suggestedBy})`,
    });

    console.log(`🎶 Music suggested: "${saved.title}" by ${saved.suggestedBy} (YouTube ID: ${saved.youtubeId})`);

    res.status(201).json({
      success: true,
      message: 'गाणे यशस्वीरित्या पाठवले आहे! मंडळाच्या प्रशासक मंजुरीनंतर (Admin Approval) हे गाणे लाइव्ह प्लेअरमध्ये जोडले जाईल. बाप्पा मोरया! 🎶',
      suggestion: saved,
    });
  } catch (err) {
    console.error('Error submitting music suggestion:', err);
    res.status(400).json({ error: err.message || 'गाणे सुचवताना त्रुटी आली' });
  }
});

// POST /api/music/like/:id - Upvote a song
app.post('/api/music/like/:id', async (req, res) => {
  try {
    const result = await musicService.likeSong(req.params.id, isMongoConnected);
    io.emit('music_liked', result);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Like failed' });
  }
});

// POST /api/donations/verify-request - Devotee submits online payment verification request
app.post('/api/donations/verify-request', async (req, res) => {
  try {
    const { name, amount, category, city, phone, utrNumber } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'कृपया वैध देणगी रक्कम प्रविष्ट करा (Valid amount required)' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'कृपया आपले नाव प्रविष्ट करा (Donor name is required)' });
    }
    if (!utrNumber || !utrNumber.trim()) {
      return res.status(400).json({ error: 'कृपया UPI / बँक ट्रॅन्झॅक्शन UTR नंबर प्रविष्ट करा (UTR / Ref number required)' });
    }

    const payload = {
      name: name.trim(),
      amount: Number(amount),
      category: category || 'महाप्रसाद सेवा',
      city: city && city.trim() ? city.trim() : 'ऑनलाइन भाविक',
      phone: phone ? String(phone).trim() : '',
      utrNumber: utrNumber.trim(),
      paymentMethod: 'online',
      status: 'pending_verification',
      recordedBy: 'ऑनलाइन भाविक (स्वयं-नोंदणी)',
      timestamp: new Date(),
    };

    let savedRequest;
    if (isMongoConnected) {
      savedRequest = await Donation.create(payload);
    } else {
      savedRequest = {
        _id: `mem-${Date.now()}`,
        ...payload,
      };
      inMemoryDonations.push(savedRequest);
      inMemoryDonations.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0) || new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Broadcast to Admin dashboards via Socket.io in real-time
    io.emit('payment_request_created', {
      request: savedRequest,
      message: `🔔 नवीन ऑनलाइन पेमेंट पडताळणी विनंती: ₹${savedRequest.amount} - ${savedRequest.name}`,
    });

    console.log(`📩 New payment verification request received: ₹${savedRequest.amount} from ${savedRequest.name} (UTR: ${savedRequest.utrNumber})`);

    res.status(201).json({
      success: true,
      message: 'आपली देणगी पडताळणी विनंती यशस्वीपणे पाठवली आहे! व्यवस्थापकांच्या पडताळणीनंतर पावती तयार होईल.',
      request: savedRequest,
    });
  } catch (err) {
    console.error('Error submitting payment verification request:', err);
    res.status(500).json({ error: 'विनंती पाठवताना त्रुटी आली', details: err.message });
  }
});


// POST /api/donations - Saves new donation and broadcasts via Socket.io
app.post('/api/donations', async (req, res) => {
  try {
    const { name, amount, category, city, phone, blessing, paymentMethod, utrNumber } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount greater than 0 is required.' });
    }

    // Determine volunteer attribution from auth token or body
    let recordedBy = req.body.recordedBy || 'मंडळ स्वयंसेवक';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        if (decoded && decoded.name) {
          recordedBy = decoded.name;
        }
      } catch (_) {}
    }

    const cleanPhone = phone ? String(phone).trim() : '';
    const cleanUtr = utrNumber ? String(utrNumber).trim() : '';

    let savedDonation;
    if (isMongoConnected) {
      const newDonation = new Donation({
        name: name && name.trim() ? name.trim() : 'Anonymous',
        amount: Number(amount),
        category: category || 'महाप्रसाद सेवा',
        city: city || 'स्थानिक भाविक',
        blessing: blessing || 'गणेश कृपेने सर्व मनोरथ पूर्ण होवोत',
        recordedBy,
        paymentMethod: paymentMethod || 'cash',
        phone: cleanPhone,
        utrNumber: cleanUtr,
      });
      savedDonation = await newDonation.save();
    } else {
      savedDonation = {
        _id: `mem-${Date.now()}`,
        name: name && name.trim() ? name.trim() : 'Anonymous',
        amount: Number(amount),
        category: category || 'महाप्रसाद सेवा',
        city: city || 'स्थानिक भाविक',
        blessing: blessing || 'गणेश कृपेने सर्व मनोरथ पूर्ण होवोत',
        recordedBy,
        paymentMethod: paymentMethod || 'cash',
        phone: cleanPhone,
        utrNumber: cleanUtr,
        timestamp: new Date(),
      };
      inMemoryDonations.push(savedDonation);
      inMemoryDonations.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0) || new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Invalidate cache and fetch fresh stats
    invalidateDonationsCache();
    const statsData = await getDonationsData(true);

    // Broadcast new_donation event with all updated numbers & new donor to all connected Socket.io clients
    io.emit('new_donation', {
      ...statsData,
      donation: savedDonation,
    });

    console.log(`📢 Broadcasted new donation: ${savedDonation.name} - ₹${savedDonation.amount} | Recorded by: ${recordedBy} | New Total: ₹${statsData.totalVargani}`);

    res.status(201).json({
      success: true,
      donation: savedDonation,
      ...statsData,
    });
  } catch (err) {
    console.error('Error in POST /api/donations:', err);
    res.status(500).json({ error: 'Failed to save donation', details: err.message });
  }
});

// Socket.io connection logging
io.on('connection', (socket) => {
  console.log(`🔌 Client connected to Socket.io: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Ganpati Seva Backend running on http://localhost:${PORT}`);
});
