/**
 * Test API Authentication using CLERK_JWT from .env
 * This script uses the JWT token you've saved in your .env file
 */

const axios = require('axios').default;
require('dotenv').config();

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const JWT_TOKEN = process.env.CLERK_JWT;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function analyzeToken() {
  log('\n🔍 ANALYZING YOUR CLERK JWT TOKEN', 'cyan');
  log('=' .repeat(60));
  
  if (!JWT_TOKEN) {
    log('❌ CLERK_JWT not found in .env file!', 'red');
    log('\nPlease add your JWT token to .env file:', 'yellow');
    log('CLERK_JWT=your_jwt_token_here\n');
    return false;
  }

  // Check if it's a valid JWT format
  const parts = JWT_TOKEN.split('.');
  
  if (parts.length !== 3) {
    log(`❌ Invalid JWT format! Expected 3 parts, got ${parts.length}`, 'red');
    return false;
  }

  log('✅ Valid JWT format detected (3 parts)', 'green');

  try {
    // Decode header
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    log('\n📋 Token Header:', 'blue');
    console.log(header);

    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    log('\n📋 Token Payload:', 'blue');
    console.log(payload);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const exp = payload.exp;
    const expiryDate = new Date(exp * 1000);
    
    if (exp < now) {
      log(`\n⚠️  TOKEN HAS EXPIRED!`, 'red');
      log(`Expired at: ${expiryDate.toLocaleString()}`, 'red');
      log(`Current time: ${new Date().toLocaleString()}`, 'yellow');
      log('\n🔄 You need to get a new token from Clerk', 'yellow');
      return false;
    } else {
      const minutesUntilExpiry = Math.round((exp - now) / 60);
      log(`\n✅ Token is VALID`, 'green');
      log(`Expires: ${expiryDate.toLocaleString()} (in ${minutesUntilExpiry} minutes)`, 'green');
    }

    // Show important claims
    log('\n🔑 Important Claims:', 'cyan');
    log(`  User ID: ${payload.sub}`, 'cyan');
    log(`  Session ID: ${payload.sid}`, 'cyan');
    log(`  Issuer: ${payload.iss}`, 'cyan');
    
    return true;

  } catch (error) {
    log('❌ Failed to decode token: ' + error.message, 'red');
    return false;
  }
}

async function testEndpoint(endpoint, method = 'GET', data = null) {
  log(`\n📡 Testing ${method} ${endpoint}...`, 'blue');
  
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);

    log(`✅ SUCCESS! Status: ${response.status}`, 'green');
    log('\n📦 Response Data:', 'cyan');
    console.log(JSON.stringify(response.data, null, 2));
    
    return true;

  } catch (error) {
    if (error.response) {
      log(`❌ FAILED! Status: ${error.response.status}`, 'red');
      log('\n📦 Error Response:', 'red');
      console.log(error.response.data);
      
      // Provide helpful error messages
      if (error.response.status === 401) {
        log('\n💡 401 Unauthorized - Possible causes:', 'yellow');
        log('  • Token has expired - get a new one from Clerk', 'yellow');
        log('  • Token is invalid or malformed', 'yellow');
        log('  • User email not found in data_karyawan table', 'yellow');
      } else if (error.response.status === 403) {
        log('\n💡 403 Forbidden - User lacks required permissions', 'yellow');
      }
    } else {
      log(`❌ Network error: ${error.message}`, 'red');
      log('\n💡 Make sure your backend is running on ' + API_BASE_URL, 'yellow');
    }
    
    return false;
  }
}

async function runTests() {
  log('\n🚀 CLERK JWT AUTHENTICATION TESTER', 'cyan');
  log('=' .repeat(60));
  log(`Backend URL: ${API_BASE_URL}`, 'blue');
  log(`Token Length: ${JWT_TOKEN ? JWT_TOKEN.length + ' characters' : 'NOT SET'}`, 'blue');
  
  // Step 1: Analyze the token
  const tokenValid = await analyzeToken();
  
  if (!tokenValid) {
    log('\n⚠️  Fix the token issue first before testing API endpoints', 'yellow');
    return;
  }

  // Step 2: Test API endpoints
  log('\n\n🧪 TESTING API ENDPOINTS', 'cyan');
  log('=' .repeat(60));

  // Test /auth/me
  log('\n1️⃣  Testing User Profile Endpoint');
  const meSuccess = await testEndpoint('/auth/me', 'GET');

  // Test /auth/sync
  log('\n2️⃣  Testing User Sync Endpoint');
  const syncSuccess = await testEndpoint('/auth/sync', 'POST');

  // Test /users (if user has permission)
  log('\n3️⃣  Testing Users List Endpoint');
  const usersSuccess = await testEndpoint('/users', 'GET');

  // Summary
  log('\n\n📊 TEST SUMMARY', 'cyan');
  log('=' .repeat(60));
  
  const results = [
    { name: '/auth/me', success: meSuccess },
    { name: '/auth/sync', success: syncSuccess },
    { name: '/users', success: usersSuccess }
  ];

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${icon} ${result.name}: ${result.success ? 'PASSED' : 'FAILED'}`, color);
  });

  const passedCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  log(`\n📈 Results: ${passedCount}/${totalCount} tests passed`, passedCount === totalCount ? 'green' : 'yellow');

  if (passedCount === totalCount) {
    log('\n🎉 All tests passed! Your authentication is working perfectly!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the error messages above.', 'yellow');
  }
}

// Check if axios is installed
async function main() {
  try {
    require('axios');
  } catch {
    log('📦 Installing axios...', 'yellow');
    require('child_process').execSync('npm install axios', { stdio: 'inherit' });
  }
  
  await runTests();
}

main().catch(console.error);