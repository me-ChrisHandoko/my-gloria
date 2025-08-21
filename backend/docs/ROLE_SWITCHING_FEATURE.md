# Role Switching / Impersonation Feature

## Overview

The role switching feature allows superadmins to temporarily view the system from the perspective of other users, roles, or positions. This is essential for testing, debugging, and understanding how different user types experience the system.

## Key Features

1. **Three Impersonation Modes**:
   - **User Mode**: Impersonate a specific user with all their permissions
   - **Position Mode**: Impersonate a specific position (e.g., Kepala Sekolah)
   - **Role Mode**: Impersonate a specific role with optional school/department context

2. **Security Features**:
   - Only superadmins can use impersonation
   - All impersonation activities are logged in audit logs
   - Impersonation sessions expire after 1 hour
   - Original user context is preserved

3. **Quick Switch Shortcuts**:
   - Pre-configured quick switches for common roles:
     - Kepala Sekolah (Principal)
     - Kepala Bagian (Department Head)
     - Guru (Teacher)
     - Staff

## API Endpoints

### 1. Start Impersonation
**POST** `/api/auth/impersonate/start`

Request body for User mode:
```json
{
  "mode": "user",
  "userId": "usr_xxx"
}
```

Request body for Position mode:
```json
{
  "mode": "position",
  "positionId": "pos_xxx"
}
```

Request body for Role mode:
```json
{
  "mode": "role",
  "roleId": "role_xxx",
  "schoolId": "sch_xxx",  // optional
  "departmentId": "dept_xxx"  // optional
}
```

Response:
```json
{
  "success": true,
  "impersonationContext": {
    "originalUserId": "usr_superadmin",
    "impersonatedUserId": "usr_target",
    "impersonationMode": "user",
    "startedAt": "2024-01-01T10:00:00Z",
    "expiresAt": "2024-01-01T11:00:00Z"
  },
  "effectiveContext": {
    "userProfileId": "usr_target",
    "isSuperadmin": false,
    "isImpersonating": true,
    "schoolIds": ["sch_001"],
    "departmentIds": ["dept_001"],
    "permissionScopes": {}
  },
  "message": "Successfully started impersonation in user mode"
}
```

### 2. Stop Impersonation
**POST** `/api/auth/impersonate/stop`

Response:
```json
{
  "success": true,
  "message": "Successfully stopped impersonation"
}
```

### 3. Get Impersonation Status
**GET** `/api/auth/impersonate/status`

Response when impersonating:
```json
{
  "isImpersonating": true,
  "impersonationContext": {
    "originalUserId": "usr_superadmin",
    "impersonatedUserId": "usr_target",
    "impersonationMode": "user",
    "startedAt": "2024-01-01T10:00:00Z",
    "expiresAt": "2024-01-01T11:00:00Z"
  },
  "effectiveContext": {
    // Current effective permissions
  },
  "remainingTime": 2400  // seconds
}
```

Response when not impersonating:
```json
{
  "isImpersonating": false,
  "message": "Not currently impersonating"
}
```

### 4. Get Available Targets
**GET** `/api/auth/impersonate/targets`

Response:
```json
{
  "success": true,
  "targets": {
    "roles": [
      {
        "id": "role_001",
        "code": "KEPSEK",
        "name": "Kepala Sekolah",
        "hierarchyLevel": 2
      }
    ],
    "positions": [
      {
        "id": "pos_001",
        "code": "KEPSEK-SD",
        "name": "Kepala Sekolah SD",
        "hierarchyLevel": 2,
        "school": {
          "id": "sch_001",
          "name": "SD Gloria 1"
        }
      }
    ],
    "users": [
      {
        "id": "usr_001",
        "nip": "12345",
        "name": "John Doe",
        "email": "john.doe@gloriaschool.org",
        "department": "SD",
        "location": "Jakarta",
        "currentPosition": "Kepala Sekolah",
        "currentRole": "Principal"
      }
    ]
  }
}
```

### 5. Quick Switch
**POST** `/api/auth/impersonate/quick-switch`

Request:
```json
{
  "target": "kepala_sekolah",  // or "kepala_bagian", "guru", "staff"
  "schoolId": "sch_001",  // optional, for context
  "departmentId": "dept_001"  // optional, for context
}
```

Response:
```json
{
  "success": true,
  "quickSwitchTarget": "kepala_sekolah",
  "impersonationContext": {
    // Impersonation details
  },
  "effectiveContext": {
    // New permissions context
  },
  "message": "Successfully switched to kepala_sekolah view"
}
```

## How It Works

### 1. Architecture

The role switching feature consists of:
- **RoleSwitchingService**: Core service handling impersonation logic
- **RoleSwitchingController**: REST API endpoints
- **RLSContextMiddleware**: Modified to support impersonation context
- **Session Storage**: Stores impersonation state across requests

### 2. Flow

1. **Superadmin initiates impersonation**:
   - Request validated to ensure user is superadmin
   - Target user/role/position is validated
   - Impersonation context created with 1-hour expiry
   - Context stored in session

2. **Subsequent requests use impersonated context**:
   - RLSContextMiddleware checks for impersonation in session
   - If present and not expired, uses impersonated context
   - All database queries respect the impersonated permissions

3. **Impersonation ends**:
   - Either explicitly stopped by user
   - Or automatically expires after 1 hour
   - Session cleared, returns to normal permissions

### 3. Security Measures

- **Superadmin Only**: Only users with `isSuperadmin: true` can impersonate
- **Audit Logging**: All start/stop actions logged in `audit_logs` table
- **Time Limited**: Sessions expire after 1 hour
- **No Privilege Escalation**: Impersonated context never has superadmin privileges
- **Session Isolated**: Each session is independent and secure

## Usage Examples

### Example 1: Testing as Kepala Sekolah

For christian_handoko@gloriaschool.org to test as a Kepala Sekolah:

```bash
# Quick switch to Kepala Sekolah view
curl -X POST http://localhost:3001/api/auth/impersonate/quick-switch \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "kepala_sekolah",
    "schoolId": "sch_gloria_sd_1"
  }'

# Now all subsequent requests will be filtered as if you were a Kepala Sekolah
# You'll only see data for the specified school

# Check current status
curl http://localhost:3001/api/auth/impersonate/status \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Stop impersonation
curl -X POST http://localhost:3001/api/auth/impersonate/stop \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

### Example 2: Testing as Specific User

```bash
# Get list of available users
curl http://localhost:3001/api/auth/impersonate/targets \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Impersonate specific user
curl -X POST http://localhost:3001/api/auth/impersonate/start \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "user",
    "userId": "usr_teacher_001"
  }'
```

### Example 3: Testing Different Department Head

```bash
# Quick switch to Kepala Bagian for specific department
curl -X POST http://localhost:3001/api/auth/impersonate/quick-switch \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "kepala_bagian",
    "departmentId": "dept_keuangan"
  }'
```

## Frontend Integration

For frontend applications, you can:

1. **Check impersonation status on page load**:
```javascript
const checkImpersonation = async () => {
  const response = await fetch('/api/auth/impersonate/status', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  const data = await response.json();
  
  if (data.isImpersonating) {
    // Show impersonation banner
    showImpersonationBanner(data.impersonationContext);
  }
};
```

2. **Provide UI for quick switching**:
```javascript
const quickSwitch = async (target) => {
  const response = await fetch('/api/auth/impersonate/quick-switch', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ target })
  });
  
  if (response.ok) {
    // Refresh the page to load with new permissions
    window.location.reload();
  }
};
```

3. **Display impersonation indicator**:
```javascript
// Show banner when impersonating
if (isImpersonating) {
  return (
    <div className="impersonation-banner">
      <span>Viewing as: {impersonationMode}</span>
      <button onClick={stopImpersonation}>Stop Impersonation</button>
      <span>Expires in: {formatTime(remainingTime)}</span>
    </div>
  );
}
```

## Troubleshooting

### Common Issues

1. **"Only superadmins can impersonate" error**:
   - Ensure the user has `isSuperadmin: true` in the database
   - Check that christian_handoko@gloriaschool.org is properly marked as superadmin

2. **Impersonation not working**:
   - Check session configuration is enabled
   - Verify cookies are being sent with requests
   - Check session hasn't expired (1 hour timeout)

3. **Data not filtered correctly**:
   - Ensure RLS policies are properly configured
   - Check that RLSContextMiddleware is applied to routes
   - Verify the impersonated context has correct permissions

### Debug Mode

Enable debug logging to see impersonation details:

```bash
NODE_ENV=development npm run start:dev
```

This will log:
- Impersonation context creation
- Context switching in middleware
- Permission scope calculations
- RLS filter applications

## Best Practices

1. **Always test critical operations** as different user types before deployment
2. **Document which roles were tested** for each feature
3. **Use quick switch** for common testing scenarios
4. **Monitor audit logs** for impersonation usage
5. **Set up automated tests** using impersonation API for regression testing
6. **Implement UI indicators** to clearly show when impersonation is active
7. **Train superadmins** on proper use of impersonation features

## Security Considerations

1. **Limit Superadmin Access**: Only grant superadmin to trusted users
2. **Regular Audit Reviews**: Check audit logs for unusual impersonation patterns
3. **Session Security**: Use secure session configuration in production
4. **Network Security**: Always use HTTPS in production
5. **Timeout Configuration**: Consider shorter timeouts for sensitive environments
6. **Notification System**: Consider notifying users when their account is impersonated

## Future Enhancements

Potential improvements to consider:

1. **Reason Tracking**: Require reason for impersonation
2. **Approval Workflow**: Require approval for certain impersonations
3. **Activity Recording**: Record all actions taken during impersonation
4. **Notification System**: Notify users when impersonated
5. **Fine-grained Permissions**: Allow partial permission impersonation
6. **Impersonation History**: View history of impersonations
7. **Scheduled Impersonation**: Schedule impersonation for testing
8. **Team Impersonation**: Allow team-based impersonation for support