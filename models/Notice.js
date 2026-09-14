const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'सूचनेचे शीर्षक आवश्यक आहे (Title is required)'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'सूचनेचा तपशील आवश्यक आहे (Content is required)'],
    trim: true,
  },
  category: {
    type: String,
    enum: ['urgent', 'event', 'general', 'prasad', 'aarti'],
    default: 'general',
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'normal'],
    default: 'normal',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  postedBy: {
    type: String,
    default: 'श्री बाल गणेश मंडळ व्यवस्थापक',
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

NoticeSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Notice', NoticeSchema);
