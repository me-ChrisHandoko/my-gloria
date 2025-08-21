# Authentication Documentation

## Overview

This backend uses **Clerk** for authentication, providing secure session management and user synchronization between Clerk and the local database.

## Architecture

```
Frontend (React + Clerk) → Backend (NestJS + Clerk SDK) → Database (PostgreSQL)
                        ↓
                   Clerk Cloud Service
```

## Key Components

### 1. **AuthModule** (`/src/auth/auth.module.ts`)

- Global module that provides authentication services
- Exports AuthService and Guards for use in other modules

### 2. **AuthService** (`/src/auth/auth.service.ts`)

- Handles user synchronization from Clerk to local database
- Validates sessions with Clerk
- Manages webhook events from Clerk

### 3. **Guards**

#### ClerkAuthGuard (`/src/auth/guards/clerk-auth.guard.ts`)

- Validates Bearer tokens from frontend
- Syncs user data on each request
- Attaches user info to request object

#### ClerkWebhookGuard (`/src/auth/guards/clerk-webhook.guard.ts`)

- Validates webhook signatures using Svix
- Ensures webhook requests are from Clerk

### 4. **Decorators**

- `@CurrentUser()` - Get current user from request
- `@CurrentAuth()` - Get auth context from request

## Authentication Flow

### 1. Frontend Login

```typescript
// Frontend (React)
import { useAuth } from '@clerk/clerk-react';

const { getToken } = useAuth();
const token = await getToken();

// Send to backend
fetch('http://localhost:3001/api/endpoint', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### 2. Backend Validation

```typescript
// Backend endpoint with auth
@Get('protected')
@UseGuards(ClerkAuthGuard)
async protectedEndpoint(@CurrentUser() user: any) {
  // User is authenticated and synced
  return { user };
}
```

### 3. User Synchronization

When a user authenticates, the system:

1. Validates the token with Clerk
2. Fetches user data from Clerk
3. Checks if user exists in local database
4. Creates or updates user profile
5. Links to `data_karyawan` table via NIP

## Configuration

### Environment Variables

Add to `.env`:

```env
# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### Getting Clerk Keys

1. **CLERK_PUBLISHABLE_KEY**:
   - Go to Clerk Dashboard → API Keys
   - Copy "Publishable key"

2. **CLERK_SECRET_KEY**:
   - Go to Clerk Dashboard → API Keys
   - Copy "Secret key"

3. **CLERK_WEBHOOK_SECRET**:
   - Go to Clerk Dashboard → Webhooks
   - Create endpoint: `https://your-domain.com/api/auth/webhook`
   - Copy "Signing secret"

## Webhook Configuration

### Clerk Dashboard Setup

1. Go to Clerk Dashboard → Webhooks
2. Add endpoint URL: `https://your-backend.com/api/auth/webhook`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `session.created`
   - `session.ended`
   - `session.removed`
   - `session.revoked`

### Local Development

For local webhook testing, use ngrok:

```bash
ngrok http 3001
# Use the HTTPS URL for webhook endpoint
```

## NIP Mapping

The system maps Clerk users to employees via NIP (Nomor Induk Pegawai):

### Priority Order:

1. **Public Metadata**: `user.publicMetadata.nip`
2. **Private Metadata**: `user.privateMetadata.nip`
3. **Unsafe Metadata**: `user.unsafeMetadata.nip`
4. **Email Extraction**: If email is `NIP@domain.com`

### Setting NIP in Clerk

#### Via Clerk Dashboard:

1. Go to Users
2. Select user
3. Edit Metadata
4. Add to public_metadata:

```json
{
  "nip": "123456789"
}
```

#### Via Clerk API:

```typescript
await clerkClient.users.updateUser(userId, {
  publicMetadata: {
    nip: '123456789',
  },
});
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint            | Description            | Auth Required     |
| ------ | ------------------- | ---------------------- | ----------------- |
| GET    | `/api/auth/me`      | Get current user       | Yes               |
| POST   | `/api/auth/sync`    | Force sync user data   | Yes               |
| POST   | `/api/auth/webhook` | Clerk webhook endpoint | Webhook signature |
| GET    | `/api/auth/health`  | Auth service health    | No                |

### Example Responses

#### GET /api/auth/me

```json
{
  "id": "cm123...",
  "clerkUserId": "user_2abc...",
  "nip": "123456789",
  "name": "John Doe",
  "email": "john@example.com",
  "isSuperadmin": false,
  "isActive": true,
  "employee": {
    "department": "IT",
    "location": "Jakarta",
    "position": "Developer",
    "status": "ACTIVE"
  },
  "roles": [
    {
      "id": "role1",
      "code": "STAFF",
      "name": "Staff"
    }
  ],
  "positions": [
    {
      "id": "pos1",
      "code": "DEV",
      "name": "Developer",
      "department": "IT",
      "school": "Gloria 1"
    }
  ],
  "permissions": ["role:STAFF", "position:DEV"]
}
```

## Security Best Practices

### 1. Token Validation

- Always validate tokens on backend
- Never trust frontend-only validation
- Tokens expire automatically (Clerk handles this)

### 2. User Synchronization

- Sync on every authenticated request
- Use webhooks for real-time updates
- Soft delete users (don't hard delete)

### 3. Permission Checks

```typescript
// Example permission check
@UseGuards(ClerkAuthGuard)
async adminOnly(@CurrentUser() user: any) {
  if (!user.isSuperadmin) {
    throw new ForbiddenException('Admin access required');
  }
  // Admin logic
}
```

### 4. Rate Limiting

- Already configured in main.ts
- 100 requests per minute per IP
- Adjust in .env if needed

## Troubleshooting

### Common Issues

#### 1. "CLERK_SECRET_KEY is not defined"

- Ensure `.env` file exists
- Check key format (should start with `sk_`)
- Restart the application

#### 2. "Employee data not found for NIP"

- Ensure NIP exists in `data_karyawan` table
- Check NIP format and mapping
- Verify Clerk metadata

#### 3. "Invalid webhook signature"

- Check `CLERK_WEBHOOK_SECRET` in .env
- Ensure webhook URL is correct in Clerk
- Verify ngrok is running for local dev

#### 4. "Invalid token"

- Token may be expired
- Check frontend is sending correct header format
- Verify Clerk keys match between frontend/backend

## Testing

### Manual Testing with cURL

```bash
# 1. Get token from Clerk (use frontend or Clerk dashboard)
TOKEN="your-clerk-session-token"

# 2. Test authentication
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/auth/me

# 3. Test webhook (for development)
curl -X POST http://localhost:3001/api/auth/webhook \
  -H "Content-Type: application/json" \
  -H "svix-id: test" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: test_signature" \
  -d '{"type":"user.created","data":{}}'
```

### Integration Testing

```typescript
// Example test file
describe('AuthController', () => {
  it('should return user when authenticated', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('nip');
  });
});
```

## Migration from JWT

If migrating from JWT to Clerk:

### Advantages of Clerk:

✅ **Security**: Automatic token rotation and revocation
✅ **Session Management**: Built-in session handling
✅ **User Management**: Complete user lifecycle management
✅ **Webhooks**: Real-time user updates
✅ **Social Login**: Easy OAuth integration
✅ **MFA**: Built-in multi-factor authentication
✅ **Compliance**: SOC 2 Type II certified

### Migration Steps:

1. Install Clerk SDK
2. Configure environment variables
3. Replace JWT middleware with ClerkAuthGuard
4. Update frontend to use Clerk
5. Map existing users via NIP
6. Test thoroughly
7. Deploy with confidence

## Support

For issues or questions:

1. Check Clerk documentation: https://clerk.com/docs
2. Review this guide
3. Check application logs
4. Contact system administrator
