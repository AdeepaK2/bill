const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0
    },
    amount: {
      type: Number,
      required: true
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date
  },
  notes: String,
  terms: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

invoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => {
    item.amount = item.quantity * item.unitPrice;
    return sum + item.amount;
  }, 0);
  
  // Calculate tax
  this.taxAmount = this.items.reduce((sum, item) => {
    return sum + (item.amount * item.taxRate / 100);
  }, 0);
  
  // Calculate total
  this.total = this.subtotal + this.taxAmount - this.discount;
  
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
