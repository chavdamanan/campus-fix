// test-feedback-submit.js
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
  // Test feedback submission for an issue with feedbackSubmitted: undefined
  const feedbackData = {
    issueId: '69c600c5dccba12542ee040f',
    workerId: '69b4f7f3d1ce5325aeba80f4',
    rating: 5,
    comment: 'Test feedback',
    user: { name: 'Test User', email: 'test@example.com' }
  };

  console.log('Submitting feedback:', feedbackData);

  try {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/feedback',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, feedbackData);

    console.log('Status:', res.status);
    console.log('Response:', res.body);
  } catch (err) {
    console.error('Error:', err);
  }
})();