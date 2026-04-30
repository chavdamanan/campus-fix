const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  const r1 = await request({ hostname: 'localhost', port: 5000, path: '/api/issues', method: 'GET' });
  const issues = JSON.parse(r1.body);
  
  console.log('=== ALL ISSUES ===');
  issues.forEach(i => {
    console.log(`ID: ${i._id} | Status: ${i.status} | assignedTo: ${i.assignedTo} | feedbackSubmitted: ${i.feedbackSubmitted} | category: ${i.category}`);
  });
})();
