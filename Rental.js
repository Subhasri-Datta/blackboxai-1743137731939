const mongoose = require('mongoose');

const RentalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  stripePaymentId: {
    type: String
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  status: {
    type: String,
    enum: ['requested', 'approved', 'rejected', 'in_progress', 'completed'],
    default: 'requested'
  }
}, { timestamps: true });

// Add index for better query performance
RentalSchema.index({ user: 1, item: 1, startDate: 1 });

module.exports = mongoose.model('Rental', RentalSchema);