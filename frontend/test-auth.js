// Test script to verify authentication with backend

async function testAuth() {
  console.log('Testing authentication...');
  
  // First, we need to get a Clerk token
  // This would normally come from the Clerk session in the browser
  console.log('Note: This test requires a valid Clerk session token.');
  console.log('To get a token:');
  console.log('1. Open the app in browser (http://localhost:3000)');
  console.log('2. Sign in with Clerk');
  console.log('3. Open browser console');
  console.log('4. Run: await window.Clerk.session.getToken()');
  console.log('5. Copy the token and use it here');
  
  // Replace this with an actual token from your Clerk session
  const token = 'YOUR_CLERK_TOKEN_HERE';
  
  if (token === 'YOUR_CLERK_TOKEN_HERE') {
    console.log('\n❌ Please replace YOUR_CLERK_TOKEN_HERE with an actual token');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:3001/api/v1/admin/impersonation/session', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    console.log('\nResponse status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Authentication successful!');
    } else {
      console.log('\n❌ Authentication failed');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// You can also test this in the browser console
console.log('To test in browser console:');
console.log('1. Copy this entire script');
console.log('2. Replace YOUR_CLERK_TOKEN_HERE with: await window.Clerk.session.getToken()');
console.log('3. Run the testAuth() function');

// Uncomment to run the test
// testAuth();