# External API Integration Guide

**Tanggal**: 26 November 2025
**Status**: ✅ ACTIVE
**Target Audience**: External web applications integrating with Gloria Backend

---

## Overview

Panduan ini menjelaskan cara external web applications (aplikasi web lain) mengintegrasikan dengan Gloria Backend API untuk mengakses data karyawan, khususnya untuk pengecekan email karyawan aktif.

**Use Case**: External system perlu memverifikasi apakah email tertentu terdaftar sebagai karyawan aktif di sistem Gloria.

---

## Authentication Flow

### 1. JWT Authentication

External API menggunakan **JWT (JSON Web Token)** authentication untuk security:

- ✅ Stateless authentication (tidak perlu session)
- ✅ Token contains user/system identity dan permissions
- ✅ Token expiration untuk security
- ✅ Signature verification untuk integrity

### 2. Token Exchange Flow

```
External System
    ↓
[1] Request JWT Token (POST /api/v1/public/auth/token)
    → Send: client_id, client_secret
    ← Receive: JWT access_token
    ↓
[2] Call Protected Endpoint (GET /api/v1/external/employees/email/:email)
    → Send: Authorization: Bearer <jwt_token>
    ← Receive: Employee data
```

---

## Step-by-Step Integration

### Step 1: Obtain API Credentials

Contact Gloria Backend administrator to receive:
- `client_id`: Unique identifier for your system
- `client_secret`: Secret key for authentication
- Assigned permissions: `["employee:read"]`

**Example credentials** (will be provided by admin):
```json
{
  "client_id": "external_hr_system_001",
  "client_secret": "secret_key_here_do_not_share",
  "permissions": ["employee:read"]
}
```

### Step 2: Exchange Credentials for JWT Token

**Endpoint**: `POST /api/v1/public/auth/token`

**Request**:
```bash
curl -X POST "http://localhost:8080/api/v1/public/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "external_hr_system_001",
    "client_secret": "secret_key_here_do_not_share",
    "grant_type": "client_credentials",
    "scope": "employee:read"
  }'
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**JWT Token Structure**:
```json
{
  "sub": "external_hr_system_001",
  "permissions": ["employee:read"],
  "iat": 1732617600,
  "exp": 1732621200
}
```

### Step 3: Call Protected Endpoint

**Endpoint**: `GET /api/v1/external/employees/email/:email`

**Request**:
```bash
curl -X GET "http://localhost:8080/api/v1/external/employees/email/john.doe@school.edu" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "nip": "202301000001",
    "nama": "John Doe",
    "jenis_kelamin": "L",
    "email": "john.doe@school.edu",
    "status_aktif": "AKTIF",
    "bagian_kerja": "IT Department",
    "lokasi": "Jakarta",
    "no_ponsel": "081234567890",
    "tgl_mulai_bekerja": "2023-01-01T00:00:00Z"
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": "active employee not found with this email"
}
```

---

## Implementation Examples

### Node.js / JavaScript Example

```javascript
const axios = require('axios');

class GloriaAPIClient {
  constructor(clientId, clientSecret, baseURL = 'http://localhost:8080') {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseURL = baseURL;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Step 1: Get JWT token
  async authenticate() {
    try {
      const response = await axios.post(`${this.baseURL}/api/v1/public/auth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        scope: 'employee:read'
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      console.log('✅ Authentication successful');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      throw error;
    }
  }

  // Check if token is still valid
  isTokenValid() {
    return this.accessToken && Date.now() < this.tokenExpiry;
  }

  // Step 2: Check employee by email
  async checkEmployeeByEmail(email) {
    // Refresh token if expired
    if (!this.isTokenValid()) {
      await this.authenticate();
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/external/employees/email/${encodeURIComponent(email)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        found: true,
        employee: response.data.data
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return { found: false, employee: null };
      }
      throw error;
    }
  }
}

// Usage Example
async function main() {
  const client = new GloriaAPIClient(
    'external_hr_system_001',
    'secret_key_here_do_not_share'
  );

  // Check if employee exists
  const result = await client.checkEmployeeByEmail('john.doe@school.edu');

  if (result.found) {
    console.log('✅ Employee found:', result.employee.nama);
    console.log('   NIP:', result.employee.nip);
    console.log('   Status:', result.employee.status_aktif);
  } else {
    console.log('❌ Employee not found or not active');
  }
}

main();
```

### Python Example

```python
import requests
from datetime import datetime, timedelta

class GloriaAPIClient:
    def __init__(self, client_id, client_secret, base_url='http://localhost:8080'):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url
        self.access_token = None
        self.token_expiry = None

    def authenticate(self):
        """Step 1: Get JWT token"""
        try:
            response = requests.post(
                f'{self.base_url}/api/v1/public/auth/token',
                json={
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'grant_type': 'client_credentials',
                    'scope': 'employee:read'
                }
            )
            response.raise_for_status()

            data = response.json()
            self.access_token = data['access_token']
            self.token_expiry = datetime.now() + timedelta(seconds=data['expires_in'])

            print('✅ Authentication successful')
            return self.access_token
        except requests.exceptions.RequestException as e:
            print(f'❌ Authentication failed: {e}')
            raise

    def is_token_valid(self):
        """Check if token is still valid"""
        return self.access_token and datetime.now() < self.token_expiry

    def check_employee_by_email(self, email):
        """Step 2: Check employee by email"""
        # Refresh token if expired
        if not self.is_token_valid():
            self.authenticate()

        try:
            response = requests.get(
                f'{self.base_url}/api/v1/external/employees/email/{email}',
                headers={'Authorization': f'Bearer {self.access_token}'}
            )

            if response.status_code == 200:
                return {'found': True, 'employee': response.json()['data']}
            elif response.status_code == 404:
                return {'found': False, 'employee': None}
            else:
                response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f'❌ Request failed: {e}')
            raise

# Usage Example
if __name__ == '__main__':
    client = GloriaAPIClient(
        'external_hr_system_001',
        'secret_key_here_do_not_share'
    )

    # Check if employee exists
    result = client.check_employee_by_email('john.doe@school.edu')

    if result['found']:
        emp = result['employee']
        print(f"✅ Employee found: {emp['nama']}")
        print(f"   NIP: {emp['nip']}")
        print(f"   Status: {emp['status_aktif']}")
    else:
        print('❌ Employee not found or not active')
```

### PHP Example

```php
<?php

class GloriaAPIClient {
    private $clientId;
    private $clientSecret;
    private $baseURL;
    private $accessToken;
    private $tokenExpiry;

    public function __construct($clientId, $clientSecret, $baseURL = 'http://localhost:8080') {
        $this->clientId = $clientId;
        $this->clientSecret = $clientSecret;
        $this->baseURL = $baseURL;
    }

    // Step 1: Get JWT token
    public function authenticate() {
        $ch = curl_init($this->baseURL . '/api/v1/public/auth/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'grant_type' => 'client_credentials',
            'scope' => 'employee:read'
        ]));

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $data = json_decode($response, true);
            $this->accessToken = $data['access_token'];
            $this->tokenExpiry = time() + $data['expires_in'];
            echo "✅ Authentication successful\n";
            return $this->accessToken;
        } else {
            throw new Exception("Authentication failed: HTTP $httpCode");
        }
    }

    // Check if token is still valid
    public function isTokenValid() {
        return $this->accessToken && time() < $this->tokenExpiry;
    }

    // Step 2: Check employee by email
    public function checkEmployeeByEmail($email) {
        // Refresh token if expired
        if (!$this->isTokenValid()) {
            $this->authenticate();
        }

        $url = $this->baseURL . '/api/v1/external/employees/email/' . urlencode($email);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $this->accessToken
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $data = json_decode($response, true);
            return ['found' => true, 'employee' => $data['data']];
        } elseif ($httpCode === 404) {
            return ['found' => false, 'employee' => null];
        } else {
            throw new Exception("Request failed: HTTP $httpCode");
        }
    }
}

// Usage Example
$client = new GloriaAPIClient(
    'external_hr_system_001',
    'secret_key_here_do_not_share'
);

$result = $client->checkEmployeeByEmail('john.doe@school.edu');

if ($result['found']) {
    $emp = $result['employee'];
    echo "✅ Employee found: {$emp['nama']}\n";
    echo "   NIP: {$emp['nip']}\n";
    echo "   Status: {$emp['status_aktif']}\n";
} else {
    echo "❌ Employee not found or not active\n";
}
```

---

## Error Handling

### Common HTTP Status Codes

| Status Code | Meaning | Action |
|-------------|---------|--------|
| **200 OK** | Employee found | Process employee data |
| **400 Bad Request** | Empty email parameter | Validate input before sending |
| **401 Unauthorized** | Missing/invalid JWT token | Re-authenticate to get new token |
| **403 Forbidden** | Insufficient permissions | Check JWT claims for "employee:read" |
| **404 Not Found** | Employee not found or inactive | Handle as "not found" scenario |
| **429 Too Many Requests** | Rate limit exceeded | Implement exponential backoff |
| **500 Internal Server Error** | Server error | Retry with exponential backoff |

### Rate Limiting

**Limits**: 200 requests/hour per JWT subject

**Response Headers** (when rate limited):
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1732621200
Retry-After: 60
```

**Best Practices**:
1. Cache employee verification results locally
2. Implement exponential backoff for retries
3. Monitor rate limit headers in responses
4. Batch requests when possible

---

## Security Best Practices

### 1. Credential Management
- ✅ Store `client_secret` in environment variables, NEVER in code
- ✅ Use different credentials for dev/staging/production
- ✅ Rotate credentials regularly (recommend: every 90 days)
- ❌ Never commit credentials to version control
- ❌ Never expose credentials in client-side code

### 2. Token Handling
- ✅ Store tokens in memory, NOT in localStorage or cookies (if client-side)
- ✅ Refresh token before expiry (recommend: 5 minutes before)
- ✅ Clear tokens on logout or session end
- ❌ Never log tokens in production logs
- ❌ Never pass tokens in URL query parameters

### 3. Transport Security
- ✅ Always use HTTPS in production
- ✅ Validate SSL certificates
- ✅ Implement request timeout (recommend: 10 seconds)
- ❌ Never use HTTP in production

### 4. Data Caching
- ✅ Cache employee verification results with TTL
- ✅ Invalidate cache when employee data changes
- ✅ Store minimal data needed (don't cache sensitive info)

---

## Monitoring & Logging

### Request Logging Template

```javascript
// Log successful requests
logger.info('Employee email check', {
  email: 'j***@school.edu', // Masked for privacy
  found: true,
  nip: '202301000001',
  response_time_ms: 45,
  timestamp: new Date().toISOString()
});

// Log failed requests
logger.error('Employee email check failed', {
  email: 'j***@school.edu', // Masked
  error: 'Not Found',
  status_code: 404,
  response_time_ms: 30,
  timestamp: new Date().toISOString()
});
```

### Metrics to Track

1. **Request Metrics**:
   - Total requests per hour
   - Success rate (200 responses / total requests)
   - Error rate by status code
   - Average response time

2. **Authentication Metrics**:
   - Token refresh frequency
   - Authentication failures
   - Token expiration incidents

3. **Business Metrics**:
   - Employee found vs not found ratio
   - Most frequently checked emails
   - Peak usage hours

---

## Testing

### Test Cases

```bash
# Test 1: Valid active employee
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_URL/api/v1/external/employees/email/john.doe@school.edu"
# Expected: 200 OK with employee data

# Test 2: Non-existent email
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_URL/api/v1/external/employees/email/nonexistent@school.edu"
# Expected: 404 Not Found

# Test 3: Inactive employee
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_URL/api/v1/external/employees/email/inactive@school.edu"
# Expected: 404 Not Found

# Test 4: Case insensitive
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_URL/api/v1/external/employees/email/JOHN.DOE@SCHOOL.EDU"
# Expected: 200 OK (matches lowercase email)

# Test 5: Unauthorized (no token)
curl "$API_URL/api/v1/external/employees/email/test@school.edu"
# Expected: 401 Unauthorized

# Test 6: Invalid token
curl -H "Authorization: Bearer invalid_token" \
  "$API_URL/api/v1/external/employees/email/test@school.edu"
# Expected: 401 Unauthorized

# Test 7: Expired token
curl -H "Authorization: Bearer $EXPIRED_TOKEN" \
  "$API_URL/api/v1/external/employees/email/test@school.edu"
# Expected: 401 Unauthorized
```

---

## FAQ

### Q: Berapa lama JWT token valid?
**A**: Default 1 jam (3600 seconds). Setelah expired, harus request token baru.

### Q: Apakah bisa menggunakan satu token untuk multiple requests?
**A**: Ya, gunakan token yang sama sampai expired. Implement token refresh logic.

### Q: Bagaimana cara mendapat client_id dan client_secret?
**A**: Hubungi Gloria Backend administrator untuk pendaftaran external system.

### Q: Apakah rate limit bersifat global atau per-system?
**A**: Per-system (berdasarkan JWT "sub" claim). Setiap system punya quota sendiri.

### Q: Bagaimana jika rate limit exceeded?
**A**: Tunggu sesuai "Retry-After" header, atau implement exponential backoff.

### Q: Apakah endpoint ini return inactive employees?
**A**: Tidak. Endpoint hanya return employees dengan `status_aktif = 'AKTIF'`.

### Q: Case sensitive untuk email?
**A**: Tidak. Email matching bersifat case-insensitive.

---

## Support & Contact

**Questions or Issues?**
- Backend Team: backend@school.edu
- API Documentation: https://api.gloria.edu/docs
- Technical Support: support@gloria.edu

**Report Security Issues**:
- Email: security@gloria.edu
- Response Time: Within 24 hours

---

**Document Version**: 1.0
**Last Updated**: 26 November 2025
**Next Review**: January 2026
