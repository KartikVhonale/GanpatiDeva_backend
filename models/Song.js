const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'गाण्याचे नाव आवश्यक आहे (Song title is required)'],
    trim: true,
    index: true,
  },
  artist: {
    type: String,
    trim: true,
    default: '',
  },
  singer: {
    type: String,
    trim: true,
    default: '',
  },
  category: {
    type: String,
    enum: ['aagman', 'bhajan', 'aarti', 'modern', 'visarjan'],
    required: true,
    index: true,
  },
  vibe: {
    type: String,
    trim: true,
    default: '',
  },
  movieOrAlbum: {
    type: String,
    trim: true,
    default: '',
  },
  youtubeId: {
    type: String,
    required: [true, 'YouTube Video ID आवश्यक आहे (YouTube ID required)'],
    trim: true,
    index: true,
  },
  youtubeUrl: {
    type: String,
    trim: true,
    default: '',
  },
  duration: {
    type: String,
    default: 'Audio',
  },
  likes: {
    type: Number,
    default: 0,
  },
  isCurated: {
    type: Boolean,
    default: true,
  },
  isSuggestion: {
    type: Boolean,
    default: false,
  },
  suggestedBy: {
    type: String,
    default: 'श्री बाल गणेश मंडळ धानोरा बु.',
  },
  phone: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved',
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

SongSchema.index({ category: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Song', SongSchema);
