const Notice = require('../models/Notice');

const DEFAULT_NOTICES = [
  {
    _id: 'notice-default-1',
    title: 'काकड आरती, महाआरती व महाप्रसाद वेळ',
    content: 'रोज सकाळी ८:०० वाजता काकड आरती व सायंकाळी ७:३० वाजता मुख्य महाआरती होईल. दुपारी १२:०० ते ३:०० दरम्यान महाप्रसाद (अन्नदान) वाटप सुरू राहील. सर्व भाविकांनी उपस्थित राहावे.',
    category: 'prasad',
    priority: 'high',
    isActive: true,
    postedBy: 'श्री बाल गणेश मंडळ व्यवस्थापक',
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    updatedAt: new Date(Date.now() - 3600000),
  },
  {
    _id: 'notice-default-2',
    title: 'ऑनलाइन देणगी व तात्काळ डिजिटल पावती सुविधा',
    content: 'मंडळाच्या अधिकृत UPI ID (8484844728@slc) वरून घरबसल्या अथवा मंडपात देणगी पाठवू शकता. देणगी नोंद होताच तात्काळ अधिकृत डिजिटल पावती थेट आपल्या व्हॉट्सॲपवर पाठवली जाते.',
    category: 'general',
    priority: 'normal',
    isActive: true,
    postedBy: 'श्री बाल गणेश मंडळ व्यवस्थापक',
    createdAt: new Date(Date.now() - 7200000), // 2 hours ago
    updatedAt: new Date(Date.now() - 7200000),
  },
  {
    _id: 'notice-default-3',
    title: 'भव्य रक्तदान व मोफत आरोग्य तपासणी शिबिर',
    content: 'रविवार रोजी सकाळी ९ ते दुपारी २ वाजेपर्यंत मंडळाच्या मुख्य मंडपामध्ये मोफत रक्तदान व आरोग्य तपासणी शिबिर आयोजित केले आहे. जास्तीत जास्त भाविकांनी व युवकांनी रक्तदान करावे.',
    category: 'event',
    priority: 'medium',
    isActive: true,
    postedBy: 'श्री बाल गणेश मंडळ व्यवस्थापक',
    createdAt: new Date(Date.now() - 14400000), // 4 hours ago
    updatedAt: new Date(Date.now() - 14400000),
  },
];

let inMemoryNotices = [...DEFAULT_NOTICES];

async function seedDefaultNoticesIfEmpty(isMongoConnected) {
  if (isMongoConnected) {
    try {
      const count = await Notice.countDocuments();
      if (count === 0) {
        for (const item of DEFAULT_NOTICES) {
          const { _id, ...rest } = item;
          await Notice.create(rest);
        }
        console.log('📢 Seeded default notices in MongoDB');
      }
    } catch (err) {
      console.warn('Could not seed default notices:', err.message);
    }
  }
}

// Priority rank helper
const PRIORITY_ORDER = { high: 3, medium: 2, normal: 1 };

function sortNotices(list) {
  return [...list].sort((a, b) => {
    const pA = PRIORITY_ORDER[a.priority] || 1;
    const pB = PRIORITY_ORDER[b.priority] || 1;
    if (pB !== pA) return pB - pA;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

// Get public active notices
async function getPublicNotices(isMongoConnected) {
  if (isMongoConnected) {
    try {
      await seedDefaultNoticesIfEmpty(true);
      const docs = await Notice.find({ isActive: true }).lean();
      return sortNotices(docs);
    } catch (err) {
      console.error('Error fetching public notices from MongoDB:', err.message);
    }
  }
  return sortNotices(inMemoryNotices.filter((n) => n.isActive));
}

// Get all notices for admin
async function getAllNotices(isMongoConnected) {
  if (isMongoConnected) {
    try {
      await seedDefaultNoticesIfEmpty(true);
      const docs = await Notice.find().sort({ createdAt: -1 }).lean();
      return docs;
    } catch (err) {
      console.error('Error fetching all notices from MongoDB:', err.message);
    }
  }
  return [...inMemoryNotices].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

// Create new notice
async function createNotice(data, isMongoConnected, authorName) {
  const { title, content, category, priority, isActive } = data;
  if (!title || !title.trim()) {
    throw new Error('सूचनेचे शीर्षक आवश्यक आहे (Title is required)');
  }
  if (!content || !content.trim()) {
    throw new Error('सूचनेचा तपशील आवश्यक आहे (Content is required)');
  }

  const payload = {
    title: title.trim(),
    content: content.trim(),
    category: category || 'general',
    priority: priority || 'normal',
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    postedBy: authorName || 'श्री बाल गणेश मंडळ व्यवस्थापक',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (isMongoConnected) {
    const doc = await Notice.create(payload);
    return doc.toObject();
  }

  const newNotice = {
    _id: `notice-${Date.now()}`,
    ...payload,
  };
  inMemoryNotices.unshift(newNotice);
  return newNotice;
}

// Update existing notice
async function updateNotice(id, data, isMongoConnected) {
  const { title, content, category, priority, isActive } = data;

  const updateFields = {
    updatedAt: new Date(),
  };
  if (title !== undefined) updateFields.title = title.trim();
  if (content !== undefined) updateFields.content = content.trim();
  if (category !== undefined) updateFields.category = category;
  if (priority !== undefined) updateFields.priority = priority;
  if (isActive !== undefined) updateFields.isActive = Boolean(isActive);

  if (isMongoConnected && id && !id.startsWith('notice-')) {
    const updated = await Notice.findByIdAndUpdate(id, { $set: updateFields }, { new: true }).lean();
    if (!updated) throw new Error('सूचना सापडली नाही (Notice not found)');
    return updated;
  }

  const index = inMemoryNotices.findIndex((n) => String(n._id) === String(id));
  if (index === -1) throw new Error('सूचना सापडली नाही (Notice not found)');
  inMemoryNotices[index] = { ...inMemoryNotices[index], ...updateFields };
  return inMemoryNotices[index];
}

// Toggle active status
async function toggleNoticeActive(id, isMongoConnected) {
  if (isMongoConnected && id && !id.startsWith('notice-')) {
    const notice = await Notice.findById(id);
    if (!notice) throw new Error('सूचना सापडली नाही');
    notice.isActive = !notice.isActive;
    notice.updatedAt = new Date();
    await notice.save();
    return notice.toObject();
  }

  const notice = inMemoryNotices.find((n) => String(n._id) === String(id));
  if (!notice) throw new Error('सूचना सापडली नाही');
  notice.isActive = !notice.isActive;
  notice.updatedAt = new Date();
  return notice;
}

// Delete notice
async function deleteNotice(id, isMongoConnected) {
  if (isMongoConnected && id && !id.startsWith('notice-')) {
    const deleted = await Notice.findByIdAndDelete(id).lean();
    if (!deleted) throw new Error('सूचना सापडली नाही');
    return deleted;
  }

  const index = inMemoryNotices.findIndex((n) => String(n._id) === String(id));
  if (index === -1) throw new Error('सूचना सापडली नाही');
  const [removed] = inMemoryNotices.splice(index, 1);
  return removed;
}

module.exports = {
  getPublicNotices,
  getAllNotices,
  createNotice,
  updateNotice,
  toggleNoticeActive,
  deleteNotice,
};
