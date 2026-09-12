const Setting = require('../models/Setting');

const DEFAULT_GANESHA_IMAGES = [
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/Gemini_Generated_Image_g93ok4g93ok4g93o',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231045/Gemini_Generated_Image_3bfuu3bfuu3bfuu3.png',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231044/Gemini_Generated_Image_aknpsbaknpsbaknp.png',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231040/Gemini_Generated_Image_xl6eqaxl6eqaxl6e.png',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231039/Gemini_Generated_Image_b2b8lyb2b8lyb2b8.png',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231037/Gemini_Generated_Image_yrtxveyrtxveyrtx.png',
  'https://res.cloudinary.com/d0tgvag4/image/upload/f_auto,q_auto/v1789231032/Gemini_Generated_Image_a0g10oa0g10oa0g1_1.png',
];

let inMemorySettings = {
  targetAmount: 500000,
  upiId: 'mandal.ganpati@upi',
  upiName: 'सार्वजनिक श्री गणेश उत्सव मंडळ',
  qrCodeUrl: '',
  qrCodeNote: 'स्कॅन करा आणि बाप्पाच्या चरणी सेवा अर्पण करा',
  ganeshaImages: DEFAULT_GANESHA_IMAGES,
};

async function getSettings(isMongoConnected) {
  if (isMongoConnected) {
    try {
      let doc = await Setting.findOne();
      if (!doc) {
        doc = await Setting.create(inMemorySettings);
      }
      return {
        targetAmount: doc.targetAmount || 500000,
        upiId: doc.upiId || 'mandal.ganpati@upi',
        upiName: doc.upiName || 'सार्वजनिक श्री गणेश उत्सव मंडळ',
        qrCodeUrl: doc.qrCodeUrl || '',
        qrCodeNote: doc.qrCodeNote || 'स्कॅन करा आणि बाप्पाच्या चरणी सेवा अर्पण करा',
        ganeshaImages: Array.isArray(doc.ganeshaImages) && doc.ganeshaImages.length > 0 ? doc.ganeshaImages : DEFAULT_GANESHA_IMAGES,
        updatedAt: doc.updatedAt,
        updatedBy: doc.updatedBy,
      };
    } catch (err) {
      console.error('Error fetching settings from MongoDB:', err.message);
    }
  }
  return inMemorySettings;
}

async function updateSettings(updates, isMongoConnected, updatedBy = 'admin') {
  const { targetAmount, upiId, upiName, qrCodeUrl, qrCodeNote, ganeshaImages } = updates;

  const newValues = {};
  if (targetAmount !== undefined && !isNaN(Number(targetAmount))) {
    newValues.targetAmount = Math.max(1, Number(targetAmount));
  }
  if (upiId !== undefined) newValues.upiId = upiId.trim();
  if (upiName !== undefined) newValues.upiName = upiName.trim();
  if (qrCodeUrl !== undefined) newValues.qrCodeUrl = qrCodeUrl.trim();
  if (qrCodeNote !== undefined) newValues.qrCodeNote = qrCodeNote.trim();
  if (ganeshaImages !== undefined && Array.isArray(ganeshaImages)) {
    newValues.ganeshaImages = ganeshaImages.filter((img) => typeof img === 'string' && img.trim().length > 0);
  }
  newValues.updatedAt = new Date();
  newValues.updatedBy = updatedBy;

  if (isMongoConnected) {
    try {
      let doc = await Setting.findOne();
      if (!doc) {
        doc = new Setting({ ...inMemorySettings, ...newValues });
      } else {
        Object.assign(doc, newValues);
      }
      await doc.save();
      inMemorySettings = {
        targetAmount: doc.targetAmount,
        upiId: doc.upiId,
        upiName: doc.upiName,
        qrCodeUrl: doc.qrCodeUrl,
        qrCodeNote: doc.qrCodeNote,
        ganeshaImages: doc.ganeshaImages,
      };
      return doc.toObject();
    } catch (err) {
      console.error('Error updating settings in MongoDB:', err.message);
      throw err;
    }
  } else {
    inMemorySettings = { ...inMemorySettings, ...newValues };
    return inMemorySettings;
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
