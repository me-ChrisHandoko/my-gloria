/**
 * Test Authentication Flow
 * This script tests the authentication flow between frontend and backend
 */

const API_URL = 'http://localhost:3001/api/v1';

async function testAuthFlow() {
  console.log('Testing authentication flow...\n');
  
  // Test 1: Check if backend is running
  console.log('1. Testing backend health...');
  try {
    const healthResponse = await fetch(`${API_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('   Backend status:', healthResponse.status);
    console.log('   Health data:', JSON.stringify(healthData, null, 2));
  } catch (error) {
    console.error('   ❌ Backend not accessible:', error.message);
    return;
  }
  
  // Test 2: Test unauthenticated request
  console.log('\n2. Testing unauthenticated request to /schools...');
  try {
    const response = await fetch(`${API_URL}/schools`);
    const data = await response.json();
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log('   ✅ Correctly returned 401 for unauthenticated request');
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  // Test 3: Test with a mock Bearer token
  console.log('\n3. Testing with mock Bearer token...');
  try {
    const response = await fetch(`${API_URL}/schools`, {
      headers: {
        'Authorization': 'Bearer mock-token-for-testing',
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  // Test 4: Check CORS headers
  console.log('\n4. Testing CORS headers...');
  try {
    const response = await fetch(`${API_URL}/schools`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization,Content-Type'
      }
    });
    
    console.log('   CORS Status:', response.status);
    console.log('   Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
    console.log('   Access-Control-Allow-Methods:', response.headers.get('access-control-allow-methods'));
    console.log('   Access-Control-Allow-Headers:', response.headers.get('access-control-allow-headers'));
    console.log('   Access-Control-Allow-Credentials:', response.headers.get('access-control-allow-credentials'));
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  console.log('\n✅ Authentication flow test complete');
  console.log('\nNext steps:');
  console.log('1. Ensure Clerk environment variables are correctly set in both frontend and backend');
  console.log('2. Verify that the Clerk issuer domain matches in both environments');
  console.log('3. Check that the frontend is properly retrieving and sending the Clerk token');
  console.log('4. Ensure the backend can verify tokens from your Clerk instance');
}

testAuthFlow();