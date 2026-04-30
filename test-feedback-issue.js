// test-feedback-issue.js
const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  try {
    // Get a specific issue that's resolved and assigned
    const issuesRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/issues',
      method: 'GET'
    });

    const issues = JSON.parse(issuesRes.body);
    // Get the first resolved issue with assignedTo
    const testIssue = issues.find(i => i.status === 'Resolved' && i.assignedTo);
    
    if (!testIssue) {
      console.log('No suitable issue found');
      return;
    }

    console.log('Test issue:', testIssue._id);
    console.log('Status:', testIssue.status);
    console.log('AssignedTo:', testIssue.assignedTo);
    console.log('FeedbackSubmitted:', testIssue.feedbackSubmitted);

    // Try to submit feedback for this specific issue
    const data = {
      issueId: testIssue._id,
      workerId: testIssue.assignedTo,
      rating: 5,
      comment: 'Test',
      user: { name: 'Test', email: 'test@test.com' }
    };

    console.log('\n=== First submission ===');
    let res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/feedback',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, data);

    console.log('Status:', res.status);
    console.log('Response:', res.body);

    // Try again - should fail because feedback already submitted
    console.log('\n=== Second submission (should fail) ===');
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/feedback',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, data);

    console.log('Status:', res.status);
    console.log('Response:', res.body);
  } catch (err) {
    console.error('Error:', err);
  }
})();