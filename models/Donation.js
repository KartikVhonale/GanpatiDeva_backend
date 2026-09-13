const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'Anonymous',
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Donation amount is required'],
    min: [1, 'Amount must be greater than 0'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  category: {
    type: String,
    default: 'महाप्रसाद सेवा',
  },
  city: {
    type: String,
    default: 'स्थानिक भाविक',
  },
  blessing: {
    type: String,
    default: 'गणेश कृपेने सर्व मनोरथ पूर्ण होवोत',
  },
  recordedBy: {
    type: String,
    default: 'मंडळ स्वयंसेवक',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'online'],
    default: 'cash',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['verified', 'pending_verification', 'rejected'],
    default: 'verified',
  },
  utrNumber: {
    type: String,
    trim: true,
    default: '',
  },
  verifiedBy: {
    type: String,
    default: '',
  },
  rejectionReason: {
    type: String,
    default: '',
  },
});

// Index to optimize queries sorting by highest donation amount first
DonationSchema.index({ amount: -1, timestamp: -1 });
DonationSchema.index({ status: 1, amount: -1, timestamp: -1 });

module.exports = mongoose.model('Donation', DonationSchema);
