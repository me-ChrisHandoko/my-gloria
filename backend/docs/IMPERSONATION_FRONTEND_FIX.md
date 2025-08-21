# Frontend Impersonation API Fix

## Problem
Frontend was calling wrong endpoint:
```
GET /api/v1/admin/impersonation/session
```

Error: `404 - Cannot GET /api/v1/admin/impersonation/session`

## Solution Implemented

Created alias controller to support both old and new routes:

### New Routes Available

#### 1. Original Routes (Recommended)
```
/api/auth/impersonate/start    - POST - Start impersonation
/api/auth/impersonate/stop     - POST - Stop impersonation  
/api/auth/impersonate/status   - GET  - Get status
/api/auth/impersonate/targets  - GET  - Get available targets
/api/auth/impersonate/quick-switch - POST - Quick role switch
```

#### 2. Admin Alias Routes (For Frontend Compatibility)
```
/api/v1/admin/impersonation/session - GET    - Get session status
/api/v1/admin/impersonation/session - DELETE - End session
/api/v1/admin/impersonation/start   - POST   - Start impersonation
/api/v1/admin/impersonation/targets - GET    - Get targets
```

## Frontend API Usage

### Check Session Status
```javascript
// Using admin route
const response = await fetch('/api/v1/admin/impersonation/session', {
  headers: {
    'Authorization': `Bearer ${clerkToken}`
  }
});

// Response
{
  "active": true,
  "session": {
    "mode": "role",
    "targetRoleId": "role_xxx",
    "startedAt": "2024-01-01T10:00:00Z",
    "expiresAt": "2024-01-01T11:00:00Z",
    "remainingSeconds": 2400
  },
  "effectivePermissions": {...}
}
```

### Start Impersonation
```javascript
const response = await fetch('/api/v1/admin/impersonation/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mode: 'role', // or 'user' or 'position'
    targetId: 'role_kepala_sekolah',
    schoolId: 'sch_001' // optional for role mode
  })
});
```

### End Impersonation
```javascript
const response = await fetch('/api/v1/admin/impersonation/session', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${clerkToken}`
  }
});
```

### Get Available Targets
```javascript
const response = await fetch('/api/v1/admin/impersonation/targets', {
  headers: {
    'Authorization': `Bearer ${clerkToken}`
  }
});
```

## Frontend Service Class

```typescript
class ImpersonationService {
  private baseUrl = '/api/v1/admin/impersonation';
  
  async getSession() {
    const response = await fetch(`${this.baseUrl}/session`, {
      headers: this.getHeaders()
    });
    return response.json();
  }
  
  async startImpersonation(mode: string, targetId: string, context?: any) {
    const response = await fetch(`${this.baseUrl}/start`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        mode,
        targetId,
        ...context
      })
    });
    return response.json();
  }
  
  async endImpersonation() {
    const response = await fetch(`${this.baseUrl}/session`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return response.json();
  }
  
  async getTargets() {
    const response = await fetch(`${this.baseUrl}/targets`, {
      headers: this.getHeaders()
    });
    return response.json();
  }
  
  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getClerkToken()}`,
      'Content-Type': 'application/json'
    };
  }
  
  private getClerkToken() {
    // Get from your auth provider
    return window.Clerk?.session?.getToken();
  }
}
```

## React Component Example

```tsx
const ImpersonationManager = () => {
  const [session, setSession] = useState(null);
  const impersonationService = new ImpersonationService();
  
  useEffect(() => {
    checkSession();
  }, []);
  
  const checkSession = async () => {
    const data = await impersonationService.getSession();
    setSession(data);
  };
  
  const startAs = async (mode, targetId) => {
    await impersonationService.startImpersonation(mode, targetId);
    await checkSession();
    window.location.reload(); // Reload to apply new permissions
  };
  
  const endSession = async () => {
    await impersonationService.endImpersonation();
    window.location.reload();
  };
  
  if (!session?.active) {
    return (
      <div>
        <button onClick={() => startAs('role', 'role_kepala_sekolah')}>
          View as Kepala Sekolah
        </button>
        <button onClick={() => startAs('role', 'role_guru')}>
          View as Guru
        </button>
      </div>
    );
  }
  
  return (
    <div className="impersonation-active">
      <p>Viewing as: {session.session.mode}</p>
      <p>Expires in: {session.session.remainingSeconds}s</p>
      <button onClick={endSession}>End Impersonation</button>
    </div>
  );
};
```

## Important Notes

1. **Session Management**: Uses server-side sessions with 1-hour expiry
2. **Security**: Only superadmins can impersonate
3. **Auto-expire**: Sessions expire after 1 hour
4. **Cookies**: Must have cookies enabled for session persistence
5. **Page Reload**: Reload page after starting/stopping to apply new permissions

## Testing

Test the endpoints:

```bash
# Check session
curl http://localhost:3001/api/v1/admin/impersonation/session \
  -H "Authorization: Bearer YOUR_TOKEN"

# Start impersonation
curl -X POST http://localhost:3001/api/v1/admin/impersonation/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"role","targetId":"role_kepala_sekolah"}'

# End session  
curl -X DELETE http://localhost:3001/api/v1/admin/impersonation/session \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Migration Path

1. **Immediate**: Use the admin alias routes that now work
2. **Future**: Consider migrating to the cleaner `/api/auth/impersonate/*` routes
3. **Both work**: Both route sets are fully functional and interchangeable