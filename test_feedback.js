const mongoose = require('mongoose');
const Issue = require('./backend/models/Issue');
const Feedback = require('./backend/models/Feedback');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ci_app').catch(async () => {
    await mongoose.connect('mongodb+srv://manan:manan@cluster0.fpvn95n.mongodb.net/dduapp');
  });

  const issue = await Issue.findOne({ status: 'Resolved' }).lean();
  console.log('Resolved Issue:', issue);

  if (!issue) {
    console.log('No resolved issue found');
    process.exit(1);
  }

  const payload = {
    issueId: issue._id,
    workerId: issue.assignedTo,
    rating: 3,
    comment: 'keep it up',
    user: { name: 'sankesh patil', email: 'student@example.com' } // Dummy user
  };

  console.log('Sending payload:', payload);

  const res = await fetch('http://localhost:5000/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
  process.exit(0);
}

test();
