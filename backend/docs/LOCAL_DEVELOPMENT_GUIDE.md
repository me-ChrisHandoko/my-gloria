# Local Development Guide - Authentication Setup

## ✅ Quick Start for Local Testing

### 1. Required Configuration

You only need **TWO** Clerk keys for local development:

```env
# .env file
CLERK_PUBLISHABLE_KEY=pk_test_cHJlcGFyZWQtcm9kZW50LTUyLmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_RacDyEyuX3gh1MITKHWr1FCAJjCZbsHTSk5aoyPl2v

# Webhook secret is NOT required for local testing
# CLERK_WEBHOOK_SECRET=whsec_xxxxx  # Optional - only for production
```

### 2. What Works Without Webhooks

✅ **Authentication** - Token validation works perfectly
✅ **User Login** - Users can authenticate via frontend
✅ **API Protection** - Guards work to protect endpoints
✅ **User Sync** - Happens on each login automatically
✅ **Role/Permission Check** - All authorization works

### 3. What Doesn't Work Without Webhooks

❌ **Real-time Updates** - User changes in Clerk Dashboard won't sync automatically
❌ **User Deletion Events** - Soft delete won't trigger automatically
❌ **Audit Logs** - Session events won't be logged

**Note:** This is totally fine for local development! 

## 🚀 Testing Authentication Locally

### Step 1: Start Backend

```bash
npm run start:dev
```

You should see:
```
✅ Database connected successfully
🚀 Application is running on: http://0.0.0.0:3001/api
⚠️ CLERK_WEBHOOK_SECRET is not defined - webhooks will be disabled
```

The warning is normal for local development.

### Step 2: Test Without Auth (Should Work)

```bash
# Health check - no auth required
curl http://localhost:3001/api/health
# Response: {"status":"ok",...}

# Auth service health
curl http://localhost:3001/api/auth/health
# Response: {"status":"ok","service":"auth",...}
```

### Step 3: Test With Auth (Should Fail Without Token)

```bash
# Try to get current user without token
curl http://localhost:3001/api/auth/me
# Response: {"statusCode":401,"message":"No authorization header"}
```

### Step 4: Test With Valid Token

First, get a token from your frontend or Clerk Dashboard:

```javascript
// In your React frontend
import { useAuth } from '@clerk/clerk-react';

const { getToken } = useAuth();
const token = await getToken();
console.log('Token:', token);
```

Then test with the token:

```bash
TOKEN="your-actual-token-here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me
```

## 📝 Important Notes for Local Development

### 1. User Mapping via NIP

For authentication to work, users need a NIP (Nomor Induk Pegawai) mapping. 

**Option A: Set in Clerk Dashboard**
1. Go to Clerk Dashboard → Users
2. Select your test user
3. Edit → Public metadata
4. Add: `{ "nip": "123456" }`

**Option B: Use Email as NIP**
- If user email is `123456@gloria.com`, the system will extract `123456` as NIP

### 2. Database Setup

Make sure you have:
1. Created a test employee in `data_karyawan` table
2. The NIP matches your Clerk user's metadata

```sql
-- Example: Insert test employee
INSERT INTO gloria_master.data_karyawan (nip, nama, email, status_aktif) 
VALUES ('123456', 'Test User', 'test@gloria.com', 'ACTIVE');
```

### 3. Testing Without Frontend

You can test using Clerk Dashboard's JWT generator:

1. Go to Clerk Dashboard → Sessions
2. Find an active session
3. Click "Copy JWT Template"
4. Use the token in your API calls

## 🔄 When You Need Webhooks (Production)

Webhooks become important when:

1. **Production Environment** - For real-time user sync
2. **Multi-Admin System** - When admins update users via Clerk Dashboard
3. **Audit Requirements** - Need to track all login/logout events
4. **User Lifecycle** - Auto-disable users when deleted in Clerk

### How to Set Up Webhooks Later

1. **For Local Testing with Webhooks:**
```bash
# Use ngrok to expose local server
ngrok http 3001

# You'll get a URL like: https://abc123.ngrok.io
# Use this in Clerk Dashboard → Webhooks
```

2. **Add to Clerk Dashboard:**
- Endpoint: `https://your-domain.com/api/auth/webhook`
- Events: Select all user.* and session.* events
- Copy the signing secret

3. **Update .env:**
```env
CLERK_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

## 🐛 Troubleshooting

### Issue: "Employee data not found for NIP"

**Solution:**
1. Check user has NIP in Clerk metadata
2. Ensure NIP exists in `data_karyawan` table
3. Verify NIP format matches

### Issue: "Invalid token"

**Solution:**
1. Token might be expired (get fresh one)
2. Check CLERK_SECRET_KEY is correct
3. Ensure frontend and backend use same Clerk app

### Issue: "Cannot read property 'sub' of undefined"

**Solution:**
1. Token format is wrong
2. Make sure you're sending: `Authorization: Bearer TOKEN`
3. Not just: `Authorization: TOKEN`

## 📚 Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [Testing with Postman](https://www.postman.com/downloads/)
- [ngrok for Webhooks](https://ngrok.com/)

## 🎉 Success Checklist

- [ ] Backend starts without errors
- [ ] `/api/health` returns ok
- [ ] `/api/auth/health` returns ok
- [ ] `/api/auth/me` returns 401 without token
- [ ] `/api/auth/me` returns user data with valid token
- [ ] User data includes NIP and employee info

If all checks pass, your local authentication is working! 🚀