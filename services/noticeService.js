const Notice = require('../models/Notice');

const DEFAULT_NOTICES = [
  
];

let inMemoryNotices = [];

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

// Get public active notices directly from MongoDB
async function getPublicNotices(isMongoConnected) {
  if (isMongoConnected) {
    try {
      const docs = await Notice.find({ isActive: true }).lean();
      return sortNotices(docs);
    } catch (err) {
      console.error('Error fetching public notices from MongoDB:', err.message);
    }
  }
  return [];
}

// Get all notices for admin directly from MongoDB
async function getAllNotices(isMongoConnected) {
  if (isMongoConnected) {
    try {
      const docs = await Notice.find().sort({ createdAt: -1 }).lean();
      return docs;
    } catch (err) {
      console.error('Error fetching all notices from MongoDB:', err.message);
    }
  }
  return [];
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
  seedDefaultNoticesIfEmpty,
  getPublicNotices,
  getAllNotices,
  createNotice,
  updateNotice,
  toggleNoticeActive,
  deleteNotice,
};
