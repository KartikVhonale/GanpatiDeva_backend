const mongoose = require('mongoose');

const MusicSuggestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'गाण्याचे नाव आवश्यक आहे (Song title is required)'],
    trim: true,
  },
  category: {
    type: String,
    enum: ['aarti', 'aagman', 'bhajan', 'modern', 'visarjan'],
    default: 'bhajan',
  },
  singer: {
    type: String,
    trim: true,
    default: '',
  },
  youtubeUrl: {
    type: String,
    trim: true,
    default: '',
  },
  youtubeId: {
    type: String,
    required: [true, 'YouTube Video ID आवश्यक आहे (YouTube Video ID is required)'],
    trim: true,
  },
  suggestedBy: {
    type: String,
    trim: true,
    default: 'भाविक',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  message: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved',
  },
  likes: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('MusicSuggestion', MusicSuggestionSchema);
