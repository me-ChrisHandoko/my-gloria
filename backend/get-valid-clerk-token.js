/**
 * Script to obtain a valid Clerk JWT token for API testing
 * 
 * IMPORTANT: This uses Clerk's actual authentication system.
 * You cannot create fake tokens - they must be issued by Clerk.
 */

const { clerkClient } = require('@clerk/clerk-sdk-node');
require('dotenv').config();

// Set Clerk API key
process.env.CLERK_API_KEY = process.env.CLERK_SECRET_KEY;

async function getValidToken() {
  console.log('📋 Understanding Clerk JWT Token Requirements:\n');
  console.log('================================');
  console.log('✅ Valid Clerk JWT Token Format:');
  console.log('   header.payload.signature');
  console.log('');
  console.log('✅ Required JWT Claims:');
  console.log('   - sub: User ID (e.g., user_31J9dUIUA6vhBXFRXksPg4szcim)');
  console.log('   - sid: Session ID');
  console.log('   - exp: Expiration timestamp');
  console.log('   - iat: Issued at timestamp');
  console.log('   - iss: Issuer (your Clerk domain)');
  console.log('');
  console.log('✅ Token must be:');
  console.log('   - Signed with your Clerk secret key');
  console.log('   - Not expired');
  console.log('   - From an active session');
  console.log('================================\n');

  console.log('❌ Why "test-token" doesn\'t work:');
  console.log('   - It\'s not a JWT (no header.payload.signature structure)');
  console.log('   - Not signed by Clerk');
  console.log('   - No valid claims\n');

  console.log('🔍 Checking your Clerk setup...\n');

  try {
    // Get users from Clerk
    const users = await clerkClient.users.getUserList({ limit: 1 });
    
    if (users.length === 0) {
      console.log('❌ No users found in Clerk.');
      console.log('\n📝 To get a valid token:');
      console.log('   1. Create a user in Clerk Dashboard');
      console.log('   2. Use the HTML file to sign in and get token');
      return;
    }

    const user = users[0];
    console.log('✅ Found user in Clerk:');
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Email: ${user.emailAddresses[0]?.emailAddress}`);
    console.log('');

    // Get active sessions for the user
    const sessions = await clerkClient.sessions.getSessionList({ userId: user.id });
    const activeSessions = sessions.filter(s => s.status === 'active');

    if (activeSessions.length > 0) {
      console.log(`✅ Found ${activeSessions.length} active session(s)`);
      console.log('\n⚠️  Note: Clerk doesn\'t provide direct access to session tokens via SDK.');
      console.log('   Tokens must be obtained from the client-side after authentication.\n');
    } else {
      console.log('❌ No active sessions found for this user.');
      console.log('   User needs to sign in first.\n');
    }

    console.log('📚 HOW TO GET A VALID TOKEN:\n');
    console.log('================================');
    console.log('Option 1: Use the HTML Test Page');
    console.log('--------------------------------');
    console.log('1. Open get-clerk-token.html in browser');
    console.log('2. Sign in with your Clerk account');
    console.log('3. Copy the displayed JWT token');
    console.log('');
    console.log('Option 2: Use Clerk\'s Hosted Pages');
    console.log('------------------------------------');
    console.log(`1. Visit: https://${extractDomain()}/sign-in`);
    console.log('2. Sign in with your credentials');
    console.log('3. Use browser DevTools to inspect the session');
    console.log('');
    console.log('Option 3: Frontend Integration');
    console.log('-------------------------------');
    console.log('// In your React/Vue/Angular app:');
    console.log('const { getToken } = useAuth(); // Clerk hook');
    console.log('const token = await getToken();');
    console.log('// Use token in API calls');
    console.log('================================\n');

    // Show example of what a valid token looks like
    console.log('📄 EXAMPLE OF VALID CLERK JWT STRUCTURE:');
    console.log('========================================');
    console.log('Header:');
    console.log(JSON.stringify({
      "alg": "RS256",
      "typ": "JWT",
      "kid": "ins_2abc..."
    }, null, 2));
    console.log('\nPayload:');
    console.log(JSON.stringify({
      "azp": "https://prepared-rodent-52.clerk.accounts.dev",
      "exp": Math.floor(Date.now() / 1000) + 3600,
      "iat": Math.floor(Date.now() / 1000),
      "iss": "https://prepared-rodent-52.clerk.accounts.dev",
      "nbf": Math.floor(Date.now() / 1000) - 30,
      "sid": "sess_2abc...",
      "sub": "user_31J9dUIUA6vhBXFRXksPg4szcim"
    }, null, 2));
    console.log('\nSignature: [256-bit RS256 signature]');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function extractDomain() {
  const key = process.env.CLERK_PUBLISHABLE_KEY;
  if (!key) return 'your-domain.clerk.accounts.dev';
  
  try {
    const base64Part = key.split('_test_')[1]?.replace('$', '') || 
                       key.split('_live_')[1]?.replace('$', '');
    return Buffer.from(base64Part, 'base64').toString('utf-8');
  } catch {
    return 'your-domain.clerk.accounts.dev';
  }
}

// Run the script
getValidToken();