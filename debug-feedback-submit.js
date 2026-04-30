// debug-feedback-submit.js
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
    // First get an issue that can be rated
    const issuesRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/issues',
      method: 'GET'
    });

    const issues = JSON.parse(issuesRes.body);
    const rateableIssue = issues.find(i => i.status === 'Resolved' && i.assignedTo && !i.feedbackSubmitted);
    
    if (!rateableIssue) {
      console.log('No rateable issues found');
      console.log('Issues:', issues.slice(0, 3).map(i => ({ status: i.status, assignedTo: i.assignedTo, feedbackSubmitted: i.feedbackSubmitted })));
      return;
    }

    console.log('Testing with issue:', rateableIssue._id);
    console.log('  status:', rateableIssue.status);
    console.log('  assignedTo:', rateableIssue.assignedTo);
    console.log('  feedbackSubmitted:', rateableIssue.feedbackSubmitted);

    const feedbackData = {
      issueId: rateableIssue._id,
      workerId: rateableIssue.assignedTo,
      rating: 5,
      comment: 'Test feedback',
      user: { name: 'CHAVDA MANAN GIRISHBHAI', email: 'student@test.com' }
    };

    console.log('\nSubmitting feedback:', feedbackData);

    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/feedback',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, feedbackData);

    console.log('\nStatus:', res.status);
    console.log('Response:', res.body);
  } catch (err) {
    console.error('Error:', err);
  }
})();
