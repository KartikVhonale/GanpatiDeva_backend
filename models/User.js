const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'नाव प्रविष्ट करणे आवश्यक आहे (Name is required)'],
    trim: true,
  },
  username: {
    type: String,
    required: [true, 'वापरकर्ता नाव आवश्यक आहे (Username is required)'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'पासवर्ड आवश्यक आहे (Password is required)'],
  },
  role: {
    type: String,
    enum: ['admin', 'volunteer'],
    default: 'volunteer',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: String,
    default: 'system',
  },
});

module.exports = mongoose.model('User', UserSchema);
