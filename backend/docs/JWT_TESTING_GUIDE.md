# 📋 JWT Testing Guide for My Gloria Backend

## ✅ Setup Complete!

You've added `CLERK_JWT` to your `.env` file. Now you can easily test your API authentication.

## ⚠️ Current Status

Your JWT token has **EXPIRED** (expired at 4:52 PM, current time 4:58 PM).
You need to get a new token from Clerk.

## 🔄 How to Get a New Token

### Option 1: Use Clerk Hosted Page (Easiest)
```bash
# 1. Open browser
https://prepared-rodent-52.clerk.accounts.dev/sign-in

# 2. Sign in with: christianhandoko46@gmail.com

# 3. Open DevTools Console (F12) and run:
fetch('/__clerk/sessions', {credentials: 'include'})
  .then(r => r.json())
  .then(data => {
    const token = data.sessions[0].token;
    console.log('TOKEN:', token);
    navigator.clipboard.writeText(token);
    console.log('✅ Copied to clipboard!');
  });

# 4. Update .env file:
CLERK_JWT=<paste_new_token_here>
```

### Option 2: Use HTTP Server
```bash
# Start server
./start-token-server.sh

# Open browser
http://localhost:8080/clerk-token-simple.html

# Copy token and update .env
```

## 🧪 Testing Your API

### Method 1: Node.js Test Script
```bash
# Run comprehensive test
node test-auth-with-jwt.js
```

This script will:
- ✅ Analyze your JWT token
- ✅ Check expiration
- ✅ Test multiple endpoints
- ✅ Provide detailed error messages

### Method 2: Quick Bash Script
```bash
# Run quick test
./quick-test-api.sh
```

### Method 3: Manual cURL
```bash
# Load your token from .env
source .env

# Test API
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $CLERK_JWT" \
  -H "Content-Type: application/json" | jq
```

## 📊 Test Results Interpretation

### ✅ Success (200 OK)
```json
{
  "id": "...",
  "clerkUserId": "user_31HVaizFgna3kjsZig9Wnflbqpp",
  "name": "Christian Handoko",
  "email": "christianhandoko46@gmail.com",
  ...
}
```
Your authentication is working!

### ❌ Token Expired (401 Unauthorized)
```json
{
  "message": "Token has expired",
  "error": "Unauthorized",
  "statusCode": 401
}
```
**Solution**: Get a new token from Clerk

### ❌ Invalid Token Format (401 Unauthorized)
```json
{
  "message": "Invalid JWT format",
  "error": "Unauthorized",
  "statusCode": 401
}
```
**Solution**: Make sure you copied the complete token

### ❌ Backend Not Running
```
Network error: connect ECONNREFUSED 127.0.0.1:3001
```
**Solution**: Start your backend with `npm run start:dev`

## 🔐 Token Management Best Practices

1. **Token Expiration**: Clerk tokens typically expire after 60 minutes
2. **Auto-refresh**: In production, use Clerk SDK to auto-refresh tokens
3. **Security**: Never commit tokens to git (`.env` is in `.gitignore`)
4. **Testing**: Always use fresh tokens for testing

## 📝 Environment Variables

Your `.env` file should have:
```env
# Clerk Configuration
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT=eyJhbGciOiJSUzI1NiI...  # Your JWT token for testing
```

## 🚀 Quick Commands Reference

```bash
# Get new token (use browser method above)
# Then update .env

# Test with Node.js
node test-auth-with-jwt.js

# Test with Bash
./quick-test-api.sh

# Test specific endpoint
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $(grep CLERK_JWT .env | cut -d '=' -f2)" \
  -H "Content-Type: application/json" | jq
```

## ⚡ Troubleshooting

| Issue | Solution |
|-------|----------|
| Token expired | Get new token from Clerk |
| Invalid JWT format | Check token has 3 parts separated by dots |
| Backend not running | Run `npm run start:dev` |
| User not found | Check email exists in `data_karyawan` table |
| Network error | Check backend is on port 3001 |

## 📚 Related Files

- `test-auth-with-jwt.js` - Comprehensive JWT testing script
- `quick-test-api.sh` - Quick bash testing script
- `get-token-direct.js` - Instructions for getting tokens
- `.env` - Your environment variables (including CLERK_JWT)