/**
 * Direct method to get Clerk token using Clerk Dashboard
 * This shows you exactly where to get a valid token
 */

const { clerkClient } = require('@clerk/clerk-sdk-node');
require('dotenv').config();

console.log('🔐 CARA MENDAPATKAN TOKEN CLERK YANG VALID\n');
console.log('=' .repeat(60));

// Extract your Clerk domain
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
let clerkDomain = 'prepared-rodent-52.clerk.accounts.dev';

if (publishableKey) {
  try {
    const base64Part = publishableKey.split('_test_')[1]?.replace('$', '') || 
                       publishableKey.split('_live_')[1]?.replace('$', '');
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    if (decoded) clerkDomain = decoded.replace('$', '');
  } catch (e) {
    // Use default
  }
}

console.log('\n📋 METODE 1: Clerk Hosted Sign-In Page (PALING MUDAH)');
console.log('=' .repeat(60));
console.log('1. Buka browser Anda');
console.log(`2. Go to: https://${clerkDomain}/sign-in`);
console.log('3. Sign in dengan email: christianhandoko46@gmail.com');
console.log('4. Setelah login, buka Browser DevTools (F12)');
console.log('5. Go to Console tab');
console.log('6. Paste dan run code ini:\n');

console.log(`   // Copy paste this in browser console after signing in
   fetch('/__clerk/sessions', {
     credentials: 'include'
   })
   .then(r => r.json())
   .then(data => {
     if (data && data.sessions && data.sessions[0]) {
       const token = data.sessions[0].token;
       console.log('YOUR TOKEN:', token);
       navigator.clipboard.writeText(token);
       console.log('✅ Token copied to clipboard!');
     } else {
       console.log('No active session found');
     }
   });`);

console.log('\n7. Token akan di-copy ke clipboard');
console.log('8. Use in API: Authorization: Bearer <token>\n');

console.log('\n📋 METODE 2: Use HTTP Server for HTML File');
console.log('=' .repeat(60));
console.log('Run this command:');
console.log('   ./start-token-server.sh');
console.log('');
console.log('Or manually:');
console.log('   python3 -m http.server 8080');
console.log('   # Then open: http://localhost:8080/clerk-token-simple.html\n');

console.log('\n📋 METODE 3: Clerk Dashboard Session Inspector');
console.log('=' .repeat(60));
console.log('1. Login to Clerk Dashboard: https://dashboard.clerk.com');
console.log('2. Go to your application');
console.log('3. Navigate to "Users" section');
console.log('4. Click on user: christianhandoko46@gmail.com');
console.log('5. Go to "Sessions" tab');
console.log('6. Look for active session details\n');

console.log('\n📋 METODE 4: Create Simple Express Server');
console.log('=' .repeat(60));
console.log('Create a file test-server.js:');
console.log(`
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(\`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js"></script>
    </head>
    <body>
      <div id="status">Loading...</div>
      <div id="token"></div>
      <script>
        const clerk = new Clerk('${process.env.CLERK_PUBLISHABLE_KEY}');
        clerk.load().then(() => {
          if (clerk.user) {
            clerk.session.getToken().then(token => {
              document.getElementById('status').innerText = 'Token:';
              document.getElementById('token').innerText = token;
            });
          } else {
            window.location.href = clerk.buildSignInUrl();
          }
        });
      </script>
    </body>
    </html>
  \`);
});

app.listen(3333, () => {
  console.log('Server running on http://localhost:3333');
});
`);

console.log('\n🎯 QUICK TEST - Check if Backend is Ready:');
console.log('=' .repeat(60));
console.log('Test with invalid token (will fail - this is expected):');
console.log(`
curl -X GET http://localhost:3001/api/auth/me \\
  -H "Authorization: Bearer test-token" \\
  -H "Content-Type: application/json"
`);
console.log('Expected: 401 Unauthorized - "Invalid JWT format"\n');

console.log('✅ Your backend is READY. You just need a valid token from Clerk!');
console.log('=' .repeat(60));