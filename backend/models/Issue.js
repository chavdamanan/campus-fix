const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  category: { type: String, required: true },
  location: { type: String },
  description: { type: String, required: true },
  status: { type: String, default: 'Open' },
  createdAt: { type: Date, default: Date.now },
  reporter: {
    name: String,
    email: String,
    role: String
  },
  // Admin can assign an issue to a maintenance worker (User with role "worker")
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Worker can add resolution note and upload a proof image when resolving
  resolutionNote: { type: String },
  resolvedAt: { type: Date },
  proofImageUrl: { type: String },
  history: [{ type: Object }],
  userNotified: { type: Boolean, default: false } // Track if user has seen resolution
});

module.exports = mongoose.model('Issue', IssueSchema);


