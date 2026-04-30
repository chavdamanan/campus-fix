// test-feedback.js
const mongoose = require('mongoose');
const Issue = require('./models/Issue');
const Feedback = require('./models/Feedback');
const User = require('./models/User');

require('dotenv').config();

async function run() {
  try {
    const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ci_app';
    await mongoose.connect(MONGO);
    console.log('connected');

    // Create a dummy user
    const user = new User({ name: 'Test Worker', email: 'worker@test.com', role: 'worker', password: 'abc' });
    await user.save();
    console.log('user created', user._id);

    // Create a dummy issue
    const issue = new Issue({
      category: 'Water',
      description: 'Test',
      reporter: { name: 'Student', email: 'student@test.com' },
      status: 'Resolved',
      assignedTo: user._id
    });
    await issue.save();
    console.log('issue created', issue._id);

    // Save feedback
    const feedbackUser = { name: 'Student', email: 'student@test.com' };
    const feedback = new Feedback({
      issue: issue._id,
      worker: user._id,
      rating: 5,
      comment: 'Good',
      user: feedbackUser
    });
    await feedback.save();
    console.log('feedback saved', feedback._id);

    issue.feedbackSubmitted = true;
    await issue.save();
    console.log('issue updated with feedback');

  } catch (err) {
    console.error('TEST ERROR:', err);
  } finally {
    mongoose.disconnect();
  }
}
run();
