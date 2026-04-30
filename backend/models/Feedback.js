const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user: {
    name: String,
    email: String
  },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
