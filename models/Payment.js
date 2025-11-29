const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'other'],
    required: true
  },
  transactionId: {
    type: String,
    trim: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  notes: String,
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed', 'refunded'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
