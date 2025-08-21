/**
 * API Authentication Tester for Clerk JWT Tokens
 * 
 * This script demonstrates how to properly test your API with valid Clerk tokens
 */

const axios = require('axios').default;
const readline = require('readline');
require('dotenv').config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testAuthentication() {
  console.log('🧪 Clerk JWT Authentication Tester\n');
  console.log('================================');
  console.log('This tool tests your backend authentication with Clerk JWT tokens.\n');

  // Example invalid tokens to demonstrate why they don't work
  const invalidTokenExamples = {
    'plain-string': 'test-token',
    'fake-jwt': 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.fake',
    'expired': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid'
  };

  console.log('❌ Examples of INVALID tokens that WON\'T work:\n');
  for (const [type, token] of Object.entries(invalidTokenExamples)) {
    console.log(`${type}:`);
    console.log(`  Token: "${token}"`);
    console.log(`  Why it fails: ${getFailureReason(type)}\n`);
  }

  console.log('✅ To get a VALID token:\n');
  console.log('1. Open get-clerk-token.html in your browser');
  console.log('2. Sign in with your Clerk account');
  console.log('3. Copy the JWT token displayed');
  console.log('4. Paste it here when prompted\n');

  const token = await question('Enter your Clerk JWT token (or "test" to see why test-token fails): ');
  
  console.log('\n🔍 Analyzing token...\n');

  if (token === 'test' || token === 'test-token') {
    demonstrateWhyTestTokenFails();
    rl.close();
    return;
  }

  // Analyze the token
  analyzeToken(token);

  // Test API calls
  console.log('\n🚀 Testing API endpoints...\n');
  
  // Test /auth/me endpoint
  await testEndpoint('/auth/me', token, 'GET');
  
  // Test /auth/sync endpoint
  await testEndpoint('/auth/sync', token, 'POST');
  
  // Test a protected endpoint
  await testEndpoint('/users', token, 'GET');

  rl.close();
}

function getFailureReason(type) {
  const reasons = {
    'plain-string': 'Not a JWT format (missing header.payload.signature structure)',
    'fake-jwt': 'Not signed by Clerk with your secret key',
    'expired': 'Token has expired (exp claim is in the past)'
  };
  return reasons[type] || 'Invalid token format';
}

function analyzeToken(token) {
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    console.log('❌ Invalid JWT format!');
    console.log(`   Expected: 3 parts (header.payload.signature)`);
    console.log(`   Got: ${parts.length} part(s)`);
    console.log('\n   This is why "test-token" doesn\'t work - it\'s not a JWT!');
    return false;
  }

  console.log('✅ Valid JWT format detected (3 parts)\n');

  try {
    // Decode header
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    console.log('📋 Token Header:');
    console.log(JSON.stringify(header, null, 2));

    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('\n📋 Token Payload:');
    console.log(JSON.stringify(payload, null, 2));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log('\n⚠️  Token has EXPIRED!');
      console.log(`   Expired: ${new Date(payload.exp * 1000).toLocaleString()}`);
      console.log(`   Current: ${new Date().toLocaleString()}`);
    } else if (payload.exp) {
      console.log('\n✅ Token is valid until:', new Date(payload.exp * 1000).toLocaleString());
    }

    // Check required claims
    console.log('\n🔍 Required Claims Check:');
    const requiredClaims = ['sub', 'exp', 'iat', 'iss'];
    for (const claim of requiredClaims) {
      if (payload[claim]) {
        console.log(`   ✅ ${claim}: ${payload[claim]}`);
      } else {
        console.log(`   ❌ ${claim}: MISSING`);
      }
    }

    return true;
  } catch (error) {
    console.log('❌ Failed to decode token:', error.message);
    return false;
  }
}

async function testEndpoint(endpoint, token, method = 'GET') {
  console.log(`\n📡 Testing ${method} ${endpoint}...`);
  
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Success! Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 500));
  } catch (error) {
    if (error.response) {
      console.log(`❌ Failed! Status: ${error.response.status}`);
      console.log('Error:', error.response.data?.message || error.response.data);
      
      // Explain common errors
      if (error.response.status === 401) {
        console.log('\n💡 401 Unauthorized means:');
        console.log('   - Token is invalid or expired');
        console.log('   - Token not signed by your Clerk instance');
        console.log('   - Missing required claims (sub, exp, etc.)');
      }
    } else {
      console.log(`❌ Network error:`, error.message);
      console.log('   Make sure your backend is running on', API_BASE_URL);
    }
  }
}

function demonstrateWhyTestTokenFails() {
  console.log('\n❌ Why "test-token" doesn\'t work:\n');
  console.log('================================');
  console.log('1. NOT a JWT:');
  console.log('   - "test-token" is just a plain string');
  console.log('   - JWTs have 3 parts: header.payload.signature');
  console.log('   - Example: eyJhbGc...[header].eyJzdWI...[payload].SflKxw...[signature]');
  console.log('');
  console.log('2. NOT signed by Clerk:');
  console.log('   - Clerk uses RS256 algorithm with your secret key');
  console.log('   - Only Clerk can create valid tokens for your app');
  console.log('   - Cannot be faked or manually created');
  console.log('');
  console.log('3. Missing required claims:');
  console.log('   - sub: User ID from Clerk');
  console.log('   - exp: Expiration timestamp');
  console.log('   - iss: Your Clerk domain');
  console.log('   - sid: Session ID');
  console.log('');
  console.log('4. Backend validation process:');
  console.log('   a. Extracts token from "Authorization: Bearer <token>"');
  console.log('   b. Verifies signature with Clerk\'s public key');
  console.log('   c. Checks expiration and other claims');
  console.log('   d. Validates session with Clerk API');
  console.log('   e. Syncs user data from Clerk');
  console.log('');
  console.log('📌 Solution: Use a real token from Clerk after signing in!');
  console.log('================================\n');
}

// Check if axios is installed
try {
  require('axios');
  testAuthentication();
} catch {
  console.log('📦 Installing axios...');
  require('child_process').execSync('npm install axios', { stdio: 'inherit' });
  console.log('✅ Axios installed. Please run the script again.');
}