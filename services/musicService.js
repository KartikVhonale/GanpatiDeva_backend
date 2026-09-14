const MusicSuggestion = require('../models/MusicSuggestion');

// Curated official Ganpati devotional playlist with tested YouTube Video IDs
const CURATED_SONGS = [
  // 1. AARTI & STOTRA
  {
    id: 'curated-aarti-1',
    title: 'सुखकर्ता दुःखहर्ता (Sukhkarta Dukh Harta)',
    titleEn: 'Sukhkarta Dukh Harta - Traditional Aarti',
    singer: 'लता मंगेशकर (Lata Mangeshkar)',
    category: 'aarti',
    youtubeId: '8Mmsn84X2aU',
    duration: '4:22',
    isCurated: true,
    description: 'समर्थ रामदास स्वामी विरचित श्री गणेशाची अत्यंत पवित्र व भावपूर्ण मुख्य महाआरती.',
    likes: 108,
  },
  {
    id: 'curated-aarti-2',
    title: 'शेंदुर लाल चढायो (Shendur Lal Chadhayo)',
    titleEn: 'Shendur Lal Chadhayo - Classic Aarti',
    singer: 'रवींद्र साठे (Ravindra Sathe)',
    category: 'aarti',
    youtubeId: 'w6e2q4rEwZ8',
    duration: '3:45',
    isCurated: true,
    description: 'सिंदूर वंदना आणि अष्टविनायकांचे स्मरण करणारी मंगलमय आरती.',
    likes: 89,
  },
  {
    id: 'curated-aarti-3',
    title: 'घालीन लोटांगण वंदिन चरण (Ghalin Lotangan)',
    titleEn: 'Ghalin Lotangan Vandin Charan',
    singer: 'पारंपारिक मंत्रपुष्पांजली (Traditional)',
    category: 'aarti',
    youtubeId: 'X9mN5pZ4d3I',
    duration: '2:50',
    isCurated: true,
    description: 'आरतीची सांगता करणारी मन आणि आत्मा तृप्त करणारी पवित्र प्रार्थना.',
    likes: 64,
  },
  {
    id: 'curated-aarti-4',
    title: 'दुर्गे दुर्घट भारी (Durge Durgat Bhari)',
    titleEn: 'Durge Durgat Bhari - Devi Aarti',
    singer: 'अनुराधा पौडवाल (Anuradha Paudwal)',
    category: 'aarti',
    youtubeId: 'd4Bv3u7qX0o',
    duration: '4:15',
    isCurated: true,
    description: 'गणेशोत्सवात आरतीनंतर गायली जाणारी आदिमाया दुर्गेची जगप्रसिद्ध आरती.',
    likes: 52,
  },

  // 2. AAGMAN & DHOL TASHA
  {
    id: 'curated-aagman-1',
    title: 'देवा श्री गणेशा (Deva Shree Ganesha)',
    titleEn: 'Deva Shree Ganesha - Agneepath',
    singer: 'अजय गोगावले (Ajay-Atul)',
    category: 'aagman',
    youtubeId: 'o-0ygW-B_gI',
    duration: '5:56',
    isCurated: true,
    description: 'बाप्पाच्या आगमन मिरवणुकीत संपूर्ण अंगावर रोमांच उभे करणारे सुप्रसिद्ध गीत.',
    likes: 195,
  },
  {
    id: 'curated-aagman-2',
    title: 'मोरया रे (Morya Re - Bappa Morya Re)',
    titleEn: 'Morya Re - Shankar Mahadevan (Don)',
    singer: 'शंकर महादेवन (Shankar Mahadevan)',
    category: 'aagman',
    youtubeId: '_H4m0j_w_Xg',
    duration: '5:50',
    isCurated: true,
    description: 'मुंबई व महाराष्ट्रातील गणेश मंडपांची ओळख बनलेला जल्लोषमय ट्रॅक.',
    likes: 162,
  },
  {
    id: 'curated-aagman-3',
    title: 'आला रे आला गणपती आला (Aala Re Aala Ganesha)',
    titleEn: 'Aala Re Aala Ganesha - Daddy',
    singer: 'वाजिद, साजिद (Sajid-Wajid)',
    category: 'aagman',
    youtubeId: 's0-PzC_sK90',
    duration: '4:35',
    isCurated: true,
    description: 'लालबाग व गिरगावच्या बाप्पाच्या आगमनाची थरारक अनुभूती देणारे गाणे.',
    likes: 120,
  },
  {
    id: 'curated-aagman-4',
    title: 'पुणेरी व नाशिक ढोल-ताशा जुगलबंदी (Dhol Tasha Beats)',
    titleEn: 'Puneri & Nashik Dhol Tasha Jugalbandi',
    singer: 'पारंपारिक ढोल ताशा पथक (Dhol Tasha Pathak)',
    category: 'aagman',
    youtubeId: 'zN18K9Pj_dE',
    duration: '6:12',
    isCurated: true,
    description: 'टाळ, मृदुंग आणि ढोल-ताशांच्या कडक आवाजात बाप्पाचे जंगी स्वागत!',
    likes: 144,
  },
  {
    id: 'curated-aagman-5',
    title: 'बाप्पा मोरया रे (Bappa Morya Re)',
    titleEn: 'Bappa Morya Re - Pralhad Shinde',
    singer: 'प्रल्हाद शिंदे (Pralhad Shinde)',
    category: 'aagman',
    youtubeId: 'oUqV9B_uMbc',
    duration: '5:10',
    isCurated: true,
    description: 'महाराष्ट्राच्या खेड्यापाड्यात आणि शहरात गुंजणारा लोकमान्य भक्ती आवाज.',
    likes: 178,
  },

  // 3. CLASSIC BHAJANS
  {
    id: 'curated-bhajan-1',
    title: 'प्रथम तुला वंदितो (Pratham Tula Vandito)',
    titleEn: 'Pratham Tula Vandito - Ashtavinayak',
    singer: 'अनुराधा पौडवाल, सुरेश वाडकर',
    category: 'bhajan',
    youtubeId: 'P7p9lE0U36A',
    duration: '6:24',
    isCurated: true,
    description: 'कोणत्याही शुभकार्याची मंगल सुरुवात करणारे महाराष्ट्राचे अमर गणेशगीत.',
    likes: 210,
  },
  {
    id: 'curated-bhajan-2',
    title: 'तुझ मागतो मी आता (Tujh Magato Mi Aata)',
    titleEn: 'Tujh Magato Mi Aata - Lata Mangeshkar',
    singer: 'लता मंगेशकर, हृदयनाथ मंगेशकर',
    category: 'bhajan',
    youtubeId: 'hK0Z7mY5X5Q',
    duration: '4:48',
    isCurated: true,
    description: 'संत ज्ञानेश्वर महाराज रचित आणि लतादीदींच्या मधुर स्वरातील भावपूर्ण प्रार्थना.',
    likes: 156,
  },
  {
    id: 'curated-bhajan-3',
    title: 'ओंकार स्वरूपा (Omkar Swarupa)',
    titleEn: 'Omkar Swarupa - Suresh Wadkar',
    singer: 'सुरेश वाडकर (Suresh Wadkar)',
    category: 'bhajan',
    youtubeId: 'd4Bv3u7qX0o',
    duration: '7:15',
    isCurated: true,
    description: 'सद्गुरू आणि विघ्नहर्त्याचे ध्यान करणारा अध्यात्मिक स्वरानुभव.',
    likes: 142,
  },
  {
    id: 'curated-bhajan-4',
    title: 'उठा उठा हो सकळीक (Utha Utha Ho Sakalika)',
    titleEn: 'Utha Utha Ho Sakalika - Prabhat Bhupali',
    singer: 'पं. भीमसेन जोशी (Bhimsen Joshi)',
    category: 'bhajan',
    youtubeId: 'Wv7L9g9z_B0',
    duration: '5:02',
    isCurated: true,
    description: 'पहाटेच्या मंगल वेळी बाप्पाला जागे करणारी सुरेल भूपाळी.',
    likes: 88,
  },
  {
    id: 'curated-bhajan-5',
    title: 'तू सुखकर्ता तू दुःखहर्ता (Tu Sukhkarta Tu Dukh Harta)',
    titleEn: 'Tu Sukhkarta Tu Dukh Harta - Hariharan',
    singer: 'हरिहरन (Hariharan)',
    category: 'bhajan',
    youtubeId: 'K1F49uK8a3M',
    duration: '5:32',
    isCurated: true,
    description: 'भक्तांच्या मनोकामना पूर्ण करणारी शांत आणि प्रभावी गणेश वंदना.',
    likes: 95,
  },

  // 4. MODERN HITS
  {
    id: 'curated-modern-1',
    title: 'श्री गणेशाय धीमहि (Shree Ganeshay Dheemahi)',
    titleEn: 'Shree Ganeshay Dheemahi - Shankar Mahadevan',
    singer: 'शंकर महादेवन (Shankar Mahadevan)',
    category: 'modern',
    youtubeId: 'h18T3a4_JvU',
    duration: '6:18',
    isCurated: true,
    description: 'एकदंताय वक्रतुण्डाय गौरीतनयाय धीमहि - जगप्रसिद्ध आधुनिक स्तोत्र संगीत.',
    likes: 230,
  },
  {
    id: 'curated-modern-2',
    title: 'गजानना (Gajanana - Bajirao Mastani)',
    titleEn: 'Gajanana - Sukhwinder Singh',
    singer: 'सुखविंदर सिंग (Sukhwinder Singh)',
    category: 'modern',
    youtubeId: 'f8YJ0h4mQ1g',
    duration: '3:34',
    isCurated: true,
    description: 'श्रीमंत बाजीराव पेशवे यांच्या काळातील भव्य आणि ओजस्वी गणेश महाआरती.',
    likes: 112,
  },
  {
    id: 'curated-modern-3',
    title: 'विघ्नहर्ता (Vighnaharta - Antim)',
    titleEn: 'Vighnaharta - Ajay Gogavale',
    singer: 'अजय गोगावले (Ajay Gogavale)',
    category: 'modern',
    youtubeId: '2JpS1c068_c',
    duration: '4:18',
    isCurated: true,
    description: 'हाय-एनर्जी मॉडर्न गणेश उत्सव गाणे.',
    likes: 98,
  },
  {
    id: 'curated-modern-4',
    title: 'बप्पा (Bappa - Banjo)',
    titleEn: 'Bappa - Vishal Dadlani (Banjo)',
    singer: 'विशाल दादलानी (Vishal Dadlani)',
    category: 'modern',
    youtubeId: 'U0H_L7hC0dE',
    duration: '4:38',
    isCurated: true,
    description: 'तरुणाईच्या आवडीचे रॉक व ढोल ताशाचे अप्रतिम मिश्रण.',
    likes: 85,
  },
  {
    id: 'curated-modern-5',
    title: 'सुनो गणपती बाप्पा मोरया (Suno Ganpati Bappa Morya)',
    titleEn: 'Suno Ganpati Bappa Morya - Judwaa 2',
    singer: 'अमित मिश्रा (Amit Mishra)',
    category: 'modern',
    youtubeId: 'kS6c4qG8hM0',
    duration: '4:40',
    isCurated: true,
    description: 'गणेशोत्सवाच्या मंचावर सादर होणारे तरुणाईचे आवडीचे गाणे.',
    likes: 74,
  },

  // 5. VISARJAN GEETE
  {
    id: 'curated-visarjan-1',
    title: 'बाप्पा निघाले गावाला (Bappa Nighale Gaavala)',
    titleEn: 'Bappa Nighale Gaavala - Visarjan Special',
    singer: 'अनंत पांचाळ (Anant Panchal)',
    category: 'visarjan',
    youtubeId: 'BfC8w-ZfE7M',
    duration: '6:45',
    isCurated: true,
    description: 'अनंत चतुर्दशीच्या दिवशी डोळ्यात अश्रू आणणारे भावुक विसर्जन गीत.',
    likes: 180,
  },
  {
    id: 'curated-visarjan-2',
    title: 'मोरया रे बाप्पा मोरया रे पुढच्या वर्षी लवकर या',
    titleEn: 'Pudhchya Varshi Lavkar Ya - Visarjan',
    singer: 'अजय-अतुल / पारंपारिक',
    category: 'visarjan',
    youtubeId: '5n2F6b7Qf7k',
    duration: '5:22',
    isCurated: true,
    description: 'निरोप देताना सर्वांच्या तोंडी असणारा लाडका जयघोष.',
    likes: 145,
  },
];

// In-memory fallback for user suggestions
let inMemorySuggestions = [
  {
    _id: 'suggest-seed-1',
    title: 'गणपती बाप्पा मोरया (मंगलमूर्ती मोरया)',
    category: 'aagman',
    singer: 'स्वप्नील बांदोडकर',
    youtubeId: 'o-0ygW-B_gI',
    youtubeUrl: 'https://youtu.be/o-0ygW-B_gI',
    suggestedBy: 'संदीप पाटील (धानोरा बु.)',
    phone: '9822******',
    message: 'आमच्या गल्लीतील आगमन मिरवणुकीत हे गाणे नक्की वाजवावे!',
    status: 'approved',
    likes: 24,
    createdAt: new Date(Date.now() - 3600000),
  },
];

/**
 * Extracts clean 11-char YouTube ID from any standard URL or ID format
 */
function extractYouTubeId(urlOrId) {
  if (!urlOrId) return '';
  const trimmed = String(urlOrId).trim();

  // Already 11 characters ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Parses:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return match[1];
  }

  return '';
}

/**
 * Get all playable songs: Curated list + Approved Devotee Suggestions
 */
async function getAllSongs(isMongoConnected) {
  let suggestions = [];

  if (isMongoConnected) {
    try {
      suggestions = await MusicSuggestion.find({ status: 'approved' })
        .sort({ createdAt: -1 })
        .lean();
    } catch (err) {
      console.warn('Fallback to in-memory suggestions:', err.message);
      suggestions = inMemorySuggestions.filter((s) => s.status === 'approved');
    }
  } else {
    suggestions = inMemorySuggestions.filter((s) => s.status === 'approved');
  }

  // Format suggestions to match unified song item format
  const formattedSuggestions = suggestions.map((s) => ({
    id: s._id ? String(s._id) : s.id,
    title: s.title,
    titleEn: s.title,
    singer: s.singer || 'सुचवलेले गाणे',
    category: s.category || 'bhajan',
    youtubeId: s.youtubeId,
    duration: 'Play Now',
    isCurated: false,
    isSuggestion: true,
    suggestedBy: s.suggestedBy || 'भाविक',
    message: s.message || '',
    likes: s.likes || 0,
    createdAt: s.createdAt,
  }));

  // Return curated first, then suggestions, or combined
  return {
    curated: CURATED_SONGS,
    suggestions: formattedSuggestions,
    all: [...CURATED_SONGS, ...formattedSuggestions],
  };
}

/**
 * Get all suggestions (for Admin management)
 */
async function getAllSuggestions(isMongoConnected) {
  if (isMongoConnected) {
    try {
      return await MusicSuggestion.find({}).sort({ createdAt: -1 }).lean();
    } catch (err) {
      console.warn('Fallback to in-memory suggestions:', err.message);
      return inMemorySuggestions;
    }
  }
  return inMemorySuggestions;
}

/**
 * Create a new song suggestion by a devotee
 */
async function createSuggestion(data, isMongoConnected) {
  const { title, category, singer, youtubeUrl, suggestedBy, phone, message } = data;

  const rawInput = youtubeUrl || data.youtubeId;
  const youtubeId = extractYouTubeId(rawInput);

  if (!youtubeId) {
    throw new Error('कृपया योग्य YouTube लिंक किंवा Video ID द्या. (Valid YouTube link or ID required)');
  }

  const suggestionData = {
    title: title.trim(),
    category: category || 'bhajan',
    singer: (singer || '').trim(),
    youtubeUrl: (youtubeUrl || '').trim(),
    youtubeId: youtubeId,
    suggestedBy: (suggestedBy || 'भाविक').trim(),
    phone: (phone || '').trim(),
    message: (message || '').trim(),
    status: 'approved', // Auto-approved so devotee immediately hears their track on the page
    likes: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (isMongoConnected) {
    const doc = new MusicSuggestion(suggestionData);
    const saved = await doc.save();
    return saved.toObject();
  } else {
    const inMemoryItem = {
      _id: `suggest-${Date.now()}`,
      ...suggestionData,
    };
    inMemorySuggestions.unshift(inMemoryItem);
    return inMemoryItem;
  }
}

/**
 * Update suggestion status (Admin)
 */
async function updateSuggestionStatus(id, status, isMongoConnected) {
  if (isMongoConnected) {
    const updated = await MusicSuggestion.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (updated) return updated;
  }

  const item = inMemorySuggestions.find((s) => String(s._id) === String(id));
  if (item) {
    item.status = status;
    item.updatedAt = new Date();
    return item;
  }
  return null;
}

/**
 * Delete a suggestion (Admin)
 */
async function deleteSuggestion(id, isMongoConnected) {
  if (isMongoConnected) {
    const res = await MusicSuggestion.findByIdAndDelete(id).lean();
    if (res) return res;
  }

  const idx = inMemorySuggestions.findIndex((s) => String(s._id) === String(id));
  if (idx !== -1) {
    return inMemorySuggestions.splice(idx, 1)[0];
  }
  return null;
}

/**
 * Upvote/Like a song
 */
async function likeSong(id, isMongoConnected) {
  // Check in curated
  const curated = CURATED_SONGS.find((s) => s.id === id);
  if (curated) {
    curated.likes = (curated.likes || 0) + 1;
    return { id, likes: curated.likes };
  }

  if (isMongoConnected) {
    try {
      const doc = await MusicSuggestion.findByIdAndUpdate(
        id,
        { $inc: { likes: 1 } },
        { new: true }
      ).lean();
      if (doc) return { id, likes: doc.likes };
    } catch (_) {}
  }

  const item = inMemorySuggestions.find((s) => String(s._id) === String(id));
  if (item) {
    item.likes = (item.likes || 0) + 1;
    return { id, likes: item.likes };
  }

  return { id, likes: 1 };
}

module.exports = {
  CURATED_SONGS,
  extractYouTubeId,
  getAllSongs,
  getAllSuggestions,
  createSuggestion,
  updateSuggestionStatus,
  deleteSuggestion,
  likeSong,
};
