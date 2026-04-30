// test-frontend-api-connection.js
(async () => {
  try {
    console.log('Testing frontend API connection...');
    
    // Test 1: Health check through frontend proxy
    let res = await fetch('http://localhost:3000/api/health');
    console.log('Health check from 3000:', res.status);
    
    // Test 2: Get issues through frontend proxy
    res = await fetch('http://localhost:3000/api/issues');
    console.log('Get issues from 3000:', res.status);
    const issues = await res.json();
    console.log('Got', issues.length, 'issues');
    
    // Test 3: Test feedback endpoint directly on backend
    res = await fetch('http://localhost:5000/api/health');
    console.log('Health check from 5000 (backend):', res.status);
    
    console.log('\n✓ All connections working!');
  } catch (err) {
    console.error('Error:', err);
  }
})();