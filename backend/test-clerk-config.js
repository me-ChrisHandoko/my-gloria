/**
 * Test Clerk Configuration
 * This script tests if Clerk is properly configured in the backend
 */

require('dotenv').config();

console.log('Checking Clerk Configuration...\n');

// Check environment variables
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
const secretKey = process.env.CLERK_SECRET_KEY;

console.log('1. Environment Variables:');
console.log('   CLERK_PUBLISHABLE_KEY:', publishableKey ? '✅ Set' : '❌ Not set');
console.log('   CLERK_SECRET_KEY:', secretKey ? '✅ Set' : '❌ Not set');

if (publishableKey) {
  console.log('\n2. Decoding Publishable Key:');
  
  try {
    // The publishable key format: pk_test_<base64-encoded-domain>$ or pk_live_<base64-encoded-domain>$
    if (publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_')) {
      const prefix = publishableKey.startsWith('pk_test_') ? 'pk_test_' : 'pk_live_';
      const base64Part = publishableKey.substring(prefix.length).replace(/\$$/, '');
      
      // Decode from base64
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
      
      console.log('   Environment:', prefix.includes('test') ? 'Test/Development' : 'Live/Production');
      console.log('   Decoded domain:', decoded);
      
      // Construct full issuer URL
      let issuer = decoded;
      if (!decoded.includes('.clerk.accounts.')) {
        issuer = `${decoded}.clerk.accounts.dev`;
      }
      console.log('   Full issuer URL:', `https://${issuer}`);
    } else {
      console.log('   ⚠️ Unexpected publishable key format');
    }
  } catch (error) {
    console.error('   ❌ Error decoding publishable key:', error.message);
  }
}

if (secretKey) {
  console.log('\n3. Secret Key Format:');
  console.log('   Starts with sk_test_:', secretKey.startsWith('sk_test_') ? '✅ Yes (Test)' : '❌ No');
  console.log('   Starts with sk_live_:', secretKey.startsWith('sk_live_') ? '✅ Yes (Live)' : '❌ No');
  console.log('   Length:', secretKey.length, 'characters');
}

console.log('\n4. Testing Clerk SDK:');
try {
  const { clerkClient } = require('@clerk/clerk-sdk-node');
  
  // Set the API key
  process.env.CLERK_API_KEY = secretKey;
  
  console.log('   Clerk SDK loaded: ✅');
  
  // Try to get users (this will fail if the key is invalid)
  clerkClient.users.getUserList({ limit: 1 })
    .then(users => {
      console.log('   API Connection: ✅ Successfully connected to Clerk');
      console.log('   Total users:', users.totalCount);
    })
    .catch(error => {
      console.error('   API Connection: ❌ Failed to connect to Clerk');
      console.error('   Error:', error.message);
      
      if (error.message.includes('401')) {
        console.error('   → Check that your CLERK_SECRET_KEY is correct');
      } else if (error.message.includes('network')) {
        console.error('   → Check your internet connection');
      }
    });
} catch (error) {
  console.error('   ❌ Error loading Clerk SDK:', error.message);
  console.error('   → Make sure @clerk/clerk-sdk-node is installed');
}

console.log('\n5. Recommendations:');
console.log('   - Ensure both frontend and backend use the same Clerk application');
console.log('   - The publishable key should match between frontend and backend');
console.log('   - The secret key should only be used in the backend');
console.log('   - Check that the Clerk dashboard shows your application as active');