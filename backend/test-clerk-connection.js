const { clerkClient } = require('@clerk/clerk-sdk-node');
require('dotenv').config();

async function testClerkConnection() {
  console.log('🔍 Testing Clerk Connection...\n');
  
  // Check environment variables
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  
  console.log('📋 Environment Check:');
  console.log(`  ✅ CLERK_PUBLISHABLE_KEY: ${publishableKey ? 'Set (starts with ' + publishableKey.substring(0, 10) + '...)' : '❌ Not set'}`);
  console.log(`  ✅ CLERK_SECRET_KEY: ${secretKey ? 'Set (starts with ' + secretKey.substring(0, 10) + '...)' : '❌ Not set'}\n`);
  
  if (!secretKey) {
    console.error('❌ CLERK_SECRET_KEY is not set in .env file');
    process.exit(1);
  }
  
  // Set the API key for Clerk
  process.env.CLERK_API_KEY = secretKey;
  
  try {
    console.log('🔄 Attempting to connect to Clerk API...\n');
    
    // Try to list users (will work even with 0 users)
    const users = await clerkClient.users.getUserList({ limit: 1 });
    
    console.log('✅ Successfully connected to Clerk!');
    console.log(`📊 Total users in Clerk: ${users.length}`);
    
    if (users.length > 0) {
      const user = users[0];
      console.log('\n👤 Sample User Info:');
      console.log(`  - ID: ${user.id}`);
      console.log(`  - Email: ${user.emailAddresses[0]?.emailAddress || 'No email'}`);
      console.log(`  - Created: ${new Date(user.createdAt).toLocaleString()}`);
    } else {
      console.log('\n📝 No users found in Clerk. You need to:');
      console.log('  1. Go to your Clerk Dashboard');
      console.log('  2. Create a test user or sign up through your app');
      console.log('  3. Then you can get a valid session token');
    }
    
    // Extract domain from publishable key for reference
    if (publishableKey && publishableKey.includes('_test_')) {
      const base64Part = publishableKey.split('_test_')[1].replace('$', '');
      try {
        const domain = Buffer.from(base64Part, 'base64').toString('utf-8');
        console.log(`\n🌐 Your Clerk Domain: https://${domain}`);
        console.log(`📱 Your Clerk Dashboard: https://dashboard.clerk.com/apps/`);
      } catch (e) {
        // Ignore decoding errors
      }
    }
    
    console.log('\n✨ Next Steps to Get a Valid Token:');
    console.log('  1. Create a simple test page with Clerk\'s SignIn component');
    console.log('  2. Sign in with a valid user');
    console.log('  3. Use clerk.session.getToken() to get the JWT token');
    console.log('  4. Use that token in your API calls as: Authorization: Bearer <token>');
    
  } catch (error) {
    console.error('❌ Failed to connect to Clerk:');
    console.error(`  Error: ${error.message}`);
    
    if (error.message.includes('401') || error.message.includes('Invalid')) {
      console.error('\n⚠️  Your CLERK_SECRET_KEY might be invalid.');
      console.error('  Please check your Clerk Dashboard for the correct key.');
    }
    
    process.exit(1);
  }
}

testClerkConnection();