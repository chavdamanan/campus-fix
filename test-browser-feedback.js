// test-browser-feedback.js
// This simulates what the browser does
(async () => {
  try {
    // Test 1: Health check
    console.log('Test 1: Health check');
    let res = await fetch('http://localhost:3000/api/health');
    console.log('Status:', res.status);
    console.log('Response:', await res.json());

    // Test 2: Get issues
    console.log('\nTest 2: Get issues');
    res = await fetch('http://localhost:3000/api/issues');
    console.log('Status:', res.status);
    const issues = await res.json();
    console.log('Got', issues.length, 'issues');
    
    const rateableIssue = issues.find(i => i.status === 'Resolved' && i.assignedTo && !i.feedbackSubmitted);
    if (!rateableIssue) {
      console.log('No rateable issues found');
      return;
    }

    // Test 3: Submit feedback as browser
    console.log('\nTest 3: Submit feedback');
    const feedbackData = {
      issueId: rateableIssue._id,
      workerId: rateableIssue.assignedTo,
      rating: 5,
      comment: 'Test from browser',
      user: { name: 'Test User', email: 'test@example.com' }
    };
    
    console.log('Sending:', JSON.stringify(feedbackData));
    
    res = await fetch('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
    
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers));
    const text = await res.text();
    console.log('Response text:', text);
    
    if (!res.ok) {
      console.log('Response was not ok!');
    } else {
      console.log('Success!');
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();