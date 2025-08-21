// Test Clerk publishable key decoding

const publishableKey = 'pk_test_cHJlcGFyZWQtcm9kZW50LTUyLmNsZXJrLmFjY291bnRzLmRldiQ';

// Remove prefix and suffix
const base64Part = publishableKey
  .replace('pk_test_', '')
  .replace('pk_live_', '')
  .replace('$', '');

console.log('Base64 part:', base64Part);

// Decode from base64
const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
console.log('Decoded domain:', decoded);
console.log('Expected JWKS URL:', `https://${decoded}/.well-known/jwks.json`);