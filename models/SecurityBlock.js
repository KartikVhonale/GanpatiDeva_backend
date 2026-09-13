const mongoose = require('mongoose');

const SecurityBlockSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  failedAttempts: {
    type: Number,
    default: 0,
  },
  isBlocked: {
    type: Boolean,
    default: false,
    index: true,
  },
  blockedUntil: {
    type: Date,
    default: null,
    index: true,
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now,
  },
  firstAttemptAt: {
    type: Date,
    default: Date.now,
  },
  lastAttemptedUsername: {
    type: String,
    default: '',
    trim: true,
  },
  userAgent: {
    type: String,
    default: '',
  },
  // MongoDB TTL index: automatically purges document when expiresAt timestamp passes
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for fast queries
SecurityBlockSchema.index({ ip: 1, isBlocked: 1 });

module.exports = mongoose.model('SecurityBlock', SecurityBlockSchema);
