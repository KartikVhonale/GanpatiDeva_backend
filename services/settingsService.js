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

const DEFAULT_SOCIAL_INITIATIVES = [
  {
    id: 'init-1',
    title: 'भव्य रक्तदान शिबिर (Blood Donation Camp)',
    stats: '२५०+ बाटल्या रक्त संकलन',
    desc: 'दरवर्षी गणेशोत्सवाच्या ५ व्या दिवशी स्थानिक शासकीय रुग्णालयांच्या सहकार्याने आयोजित.',
    iconName: 'Droplet',
    tag: 'आरोग्य सेवा',
    color: 'border-rose-500/40 bg-rose-950/30 text-rose-300',
  },
  {
    id: 'init-2',
    title: 'दैनिक महाप्रसाद वाटप (Maha Prasad)',
    stats: '१,५००+ दररोज थाळ्या',
    desc: 'मंडळात येणाऱ्या प्रत्येक भाविकासाठी शुद्ध, सात्विक आणि तृप्त करणारा महाप्रसाद विनामूल्य.',
    iconName: 'Utensils',
    tag: 'अन्नदान सेवा',
    color: 'border-amber-500/40 bg-amber-950/30 text-amber-300',
  },
  {
    id: 'init-3',
    title: 'गुणवंत विद्यार्थी सत्कार व शैक्षणिक मदत',
    stats: '५० गरजू विद्यार्थ्यांना शिष्यवृत्ती',
    desc: 'परिसरातील होतकरू विद्यार्थ्यांना वह्या, पुस्तके व शालेय साहित्य वाटप उपक्रम.',
    iconName: 'GraduationCap',
    tag: 'शैक्षणिक सेवा',
    color: 'border-orange-500/40 bg-orange-950/30 text-orange-300',
  },
  {
    id: 'init-4',
    title: 'बाल संस्कार व सांस्कृतिक स्पर्धा',
    stats: '४+ बाल कलाकार सहभागी',
    desc: 'चित्रकला, वकृत्व, श्लोक पठण व पारंपरिक भजन स्पर्धांचे आयोजन करून कलागुणांना प्रोत्साहन.',
    iconName: 'Award',
    tag: 'संस्कृती संवर्धन',
    color: 'border-red-500/40 bg-red-950/30 text-red-300',
  },
];

const DEFAULT_DAILY_SCHEDULE = [
  { id: 'sch-1', time: 'सकाळी ०६:००', title: 'काकड आरती व भूपाळी', icon: '🌅', desc: 'बाप्पाची मंगल प्रभात व सुमधूर भूपाळी गायन.' },
  { id: 'sch-2', time: 'सकाळी ०८:३०', title: 'अभिषेक, पंचामृत स्नान व नित्य पूजा', icon: '🪔', desc: 'वेदमंत्रांच्या जयघोषात मुख्य मूर्तीचा पवित्र अभिषेक.' },
  { id: 'sch-3', time: 'दुपारी १२:१५', title: 'दुपारची नैवेद्य महाआरती', icon: '🔔', desc: '२१ मोदक व पंचपक्वान्न नैवेद्य अर्पण.' },
  { id: 'sch-4', time: 'दुपारी १२:३० ते ०३:००', title: 'सार्वजनिक महाप्रसाद (अन्नदान)', icon: '🍲', desc: 'सर्व भाविकांसाठी महाप्रसाद भोजन व्यवस्था.' },
  { id: 'sch-5', time: 'सायंकाळी ०७:३०', title: 'मुख्य संध्या महाआरती व धूपारती', icon: '🕯️', desc: 'दिव्यांच्या लखलखाटात आणि ढोल-ताशांच्या गजरात महाआरती.' },
  { id: 'sch-6', time: 'रात्री ०८:३० ते १०:३०', title: 'रात्रीचा महाप्रसाद वाटप', icon: '🍛', desc: 'सायंकाळच्या दर्शनार्थी भाविकांसाठी प्रसाद वितरण.' },
  { id: 'sch-7', time: 'रात्री १०:००', title: 'शेजारती व मूक दर्शन', icon: '🌙', desc: 'दिवसाच्या सांगतेची शांत आणि भावपूर्ण शेजारती.' },
];

let inMemorySettings = {
  targetAmount: 500000,
  upiId: '8484844728@slc',
  upiName: 'श्री बाल गणेश मंडळ धानोरा बु.',
  qrCodeUrl: '',
  qrCodeNote: 'स्कॅन करा आणि बाप्पाच्या चरणी सेवा अर्पण करा',
  ganeshaImages: DEFAULT_GANESHA_IMAGES,
  socialInitiatives: DEFAULT_SOCIAL_INITIATIVES,
  dailySchedule: DEFAULT_DAILY_SCHEDULE,
};

async function getSettings(isMongoConnected) {
  if (isMongoConnected) {
    try {
      let doc = await Setting.findOne();
      if (!doc) {
        doc = await Setting.create(inMemorySettings);
      } else {
        let changed = false;
        if (!doc.upiId || doc.upiId === 'mandal.ganpati@upi') {
          doc.upiId = '8484844728@slc';
          changed = true;
        }
        if (!doc.upiName || doc.upiName === 'सार्वजनिक श्री गणेश उत्सव मंडळ') {
          doc.upiName = 'श्री बाल गणेश मंडळ धानोरा बु.';
          changed = true;
        }
        if (changed) {
          await doc.save();
        }
      }
      return {
        targetAmount: doc.targetAmount || 500000,
        upiId: doc.upiId || '8484844728@slc',
        upiName: doc.upiName || 'श्री बाल गणेश मंडळ धानोरा बु.',
        qrCodeUrl: doc.qrCodeUrl || '',
        qrCodeNote: doc.qrCodeNote || 'स्कॅन करा आणि बाप्पाच्या चरणी सेवा अर्पण करा',
        ganeshaImages: Array.isArray(doc.ganeshaImages) && doc.ganeshaImages.length > 0 ? doc.ganeshaImages : DEFAULT_GANESHA_IMAGES,
        socialInitiatives: Array.isArray(doc.socialInitiatives) && doc.socialInitiatives.length > 0 ? doc.socialInitiatives : DEFAULT_SOCIAL_INITIATIVES,
        dailySchedule: Array.isArray(doc.dailySchedule) && doc.dailySchedule.length > 0 ? doc.dailySchedule : DEFAULT_DAILY_SCHEDULE,
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
  const { targetAmount, upiId, upiName, qrCodeUrl, qrCodeNote, ganeshaImages, socialInitiatives, dailySchedule } = updates;

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
  if (socialInitiatives !== undefined && Array.isArray(socialInitiatives)) {
    newValues.socialInitiatives = socialInitiatives;
  }
  if (dailySchedule !== undefined && Array.isArray(dailySchedule)) {
    newValues.dailySchedule = dailySchedule;
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
        socialInitiatives: doc.socialInitiatives,
        dailySchedule: doc.dailySchedule,
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
