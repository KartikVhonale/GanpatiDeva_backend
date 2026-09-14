const Song = require('../models/Song');

// 20 Official & Celebrated Ganpati Songs requested by the Mandal
const DEFAULT_SONGS = [
  
];

// In-memory fallback (empty - all data in MongoDB)
let inMemorySongs = [];

// High-performance in-memory cache for live songs playlist
let songsCache = null;
let songsCacheTime = 0;
const SONGS_CACHE_TTL_MS = 60 * 1000; // 60s cache TTL

function invalidateSongsCache() {
  songsCache = null;
  songsCacheTime = 0;
}

/**
 * Extract clean 11-char YouTube ID from any URL or ID
 */
function extractYouTubeId(urlOrId) {
  if (!urlOrId) return '';
  const trimmed = String(urlOrId).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : '';
}

/**
 * Seed all default 20 requested songs into MongoDB if collection is empty
 */
async function seedDefaultSongsIfEmpty(isMongoConnected) {
  if (!isMongoConnected) return;

  try {
    const count = await Song.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding 20 iconic Ganpati tracks into MongoDB Atlas...');
      for (const song of DEFAULT_SONGS) {
        await Song.create({
          ...song,
          status: 'approved',
          suggestedBy: 'श्री बाल गणेश मंडळ धानोरा बु.',
        });
      }
      invalidateSongsCache();
      console.log('✅ Successfully seeded 20 Ganpati songs into MongoDB!');
    }
  } catch (err) {
    console.warn('Could not seed songs into MongoDB:', err.message);
  }
}

/**
 * Get all playable songs directly from MongoDB (with in-memory cache for high concurrency)
 */
async function getAllSongs(isMongoConnected, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && songsCache && (now - songsCacheTime < SONGS_CACHE_TTL_MS)) {
    return songsCache;
  }

  if (isMongoConnected) {
    try {
      const docs = await Song.find({ status: 'approved' })
        .sort({ createdAt: 1 })
        .lean();

      if (docs && docs.length > 0) {
        // Format for client consumption
        const formatted = docs.map((s) => ({
          id: String(s._id),
          _id: String(s._id),
          title: s.title,
          titleEn: s.titleEn || s.title,
          artist: s.artist || s.singer || '',
          singer: s.singer || s.artist || '',
          category: s.category,
          vibe: s.vibe || '',
          movieOrAlbum: s.movieOrAlbum || '',
          youtubeId: s.youtubeId,
          youtubeUrl: s.youtubeUrl || `https://www.youtube.com/watch?v=${s.youtubeId}`,
          duration: s.duration || 'Audio',
          likes: s.likes || 0,
          isCurated: s.isCurated !== false,
          isSuggestion: Boolean(s.isSuggestion),
          suggestedBy: s.suggestedBy || 'भाविक',
          message: s.message || '',
          createdAt: s.createdAt,
        }));

        const result = {
          curated: formatted.filter((s) => !s.isSuggestion),
          suggestions: formatted.filter((s) => s.isSuggestion),
          all: formatted,
        };
        songsCache = result;
        songsCacheTime = now;
        return result;
      }
    } catch (err) {
      console.error('Error fetching songs from MongoDB:', err.message);
    }
  }

  return {
    curated: [],
    suggestions: [],
    all: [],
  };
}

/**
 * Get all suggestions for Admin dashboard
 */
async function getAllSuggestions(isMongoConnected) {
  if (isMongoConnected) {
    try {
      return await Song.find({ isSuggestion: true })
        .sort({ createdAt: -1 })
        .lean();
    } catch (err) {
      console.error('Error fetching suggestions from MongoDB:', err.message);
    }
  }
  return [];
}

/**
 * Save new devotee song suggestion to MongoDB
 */
async function createSuggestion(data, isMongoConnected) {
  const { title, category, singer, artist, youtubeUrl, suggestedBy, phone, message } = data;

  const rawInput = youtubeUrl || data.youtubeId;
  const youtubeId = extractYouTubeId(rawInput);

  if (!youtubeId) {
    throw new Error('कृपया योग्य YouTube लिंक किंवा Video ID द्या. (Valid YouTube link or ID required)');
  }

  const payload = {
    title: title.trim(),
    category: category || 'aagman',
    singer: (singer || artist || '').trim(),
    artist: (artist || singer || '').trim(),
    youtubeUrl: (youtubeUrl || `https://www.youtube.com/watch?v=${youtubeId}`).trim(),
    youtubeId,
    duration: 'Play Now',
    isCurated: false,
    isSuggestion: true,
    suggestedBy: (suggestedBy || 'भाविक').trim(),
    phone: (phone || '').trim(),
    message: (message || '').trim(),
    status: 'pending', // Requires admin approval before becoming live
    likes: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (isMongoConnected) {
    const doc = await Song.create(payload);
    return doc.toObject();
  }

  const inMem = {
    _id: `suggest-${Date.now()}`,
    id: `suggest-${Date.now()}`,
    ...payload,
  };
  inMemorySongs.unshift(inMem);
  return inMem;
}

/**
 * Toggle or update status of a song (Admin)
 */
async function updateSuggestionStatus(id, status, isMongoConnected) {
  invalidateSongsCache();
  if (isMongoConnected && id && !id.startsWith('mem-') && !id.startsWith('suggest-')) {
    const updated = await Song.findByIdAndUpdate(
      id,
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    ).lean();
    if (updated) return updated;
  }

  const item = inMemorySongs.find((s) => String(s._id) === String(id) || String(s.id) === String(id));
  if (item) {
    item.status = status;
    item.updatedAt = new Date();
    return item;
  }
  return null;
}

/**
 * Delete a song from MongoDB
 */
async function deleteSuggestion(id, isMongoConnected) {
  invalidateSongsCache();
  if (isMongoConnected && id && !id.startsWith('mem-') && !id.startsWith('suggest-')) {
    const res = await Song.findByIdAndDelete(id).lean();
    if (res) return res;
  }

  const idx = inMemorySongs.findIndex((s) => String(s._id) === String(id) || String(s.id) === String(id));
  if (idx !== -1) {
    return inMemorySongs.splice(idx, 1)[0];
  }
  return null;
}

/**
 * Like a song in MongoDB
 */
async function likeSong(id, isMongoConnected) {
  invalidateSongsCache();
  if (isMongoConnected && id && !id.startsWith('mem-') && !id.startsWith('suggest-')) {
    try {
      const updated = await Song.findByIdAndUpdate(
        id,
        { $inc: { likes: 1 } },
        { new: true }
      ).lean();
      if (updated) return { id, likes: updated.likes };
    } catch (_) {}
  }

  const item = inMemorySongs.find((s) => String(s._id) === String(id) || String(s.id) === String(id));
  if (item) {
    item.likes = (item.likes || 0) + 1;
    return { id, likes: item.likes };
  }

  return { id, likes: 1 };
}

module.exports = {
  DEFAULT_SONGS,
  extractYouTubeId,
  seedDefaultSongsIfEmpty,
  getAllSongs,
  getAllSuggestions,
  createSuggestion,
  updateSuggestionStatus,
  deleteSuggestion,
  likeSong,
};
