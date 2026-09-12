const mongoose = require('mongoose');

const DEFAULT_GANESHA_IMAGES = [
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/Gemini_Generated_Image_g93ok4g93ok4g93o',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231045/Gemini_Generated_Image_3bfuu3bfuu3bfuu3.png',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231044/Gemini_Generated_Image_aknpsbaknpsbaknp.png',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231040/Gemini_Generated_Image_xl6eqaxl6eqaxl6e.png',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231039/Gemini_Generated_Image_b2b8lyb2b8lyb2b8.png',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231037/Gemini_Generated_Image_yrtxveyrtxveyrtx.png',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231032/Gemini_Generated_Image_a0g10oa0g10oa0g1_1.png',
];

const SettingSchema = new mongoose.Schema({
  targetAmount: {
    type: Number,
    default: 500000,
    min: [1, 'लक्ष्य रक्कम १ पेक्षा जास्त असावी'],
  },
  upiId: {
    type: String,
    default: 'mandal.ganpati@upi',
    trim: true,
  },
  upiName: {
    type: String,
    default: 'सार्वजनिक श्री गणेश उत्सव मंडळ',
    trim: true,
  },
  qrCodeUrl: {
    type: String,
    default: '',
    trim: true,
  },
  qrCodeNote: {
    type: String,
    default: 'स्कॅन करा आणि बाप्पाच्या चरणी सेवा अर्पण करा',
    trim: true,
  },
  ganeshaImages: {
    type: [String],
    default: DEFAULT_GANESHA_IMAGES,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: String,
    default: 'admin',
  },
});

module.exports = mongoose.model('Setting', SettingSchema);
