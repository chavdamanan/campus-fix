// fix-feedback-submitted.js
const mongoose = require('mongoose');
const Issue = require('./models/Issue');

require('dotenv').config();

async function run() {
  try {
    const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ci_app';
    await mongoose.connect(MONGO);
    console.log('connected');

    const result = await Issue.updateMany(
      { feedbackSubmitted: { $exists: false } },
      { feedbackSubmitted: false }
    );
    console.log('Updated', result.modifiedCount, 'issues');

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    mongoose.disconnect();
  }
}
run();