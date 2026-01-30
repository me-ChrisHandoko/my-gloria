# API Key Testing Guide

Panduan lengkap untuk testing API key yang telah digenerate di sistem YPK Gloria.

## Daftar Isi

- [Overview](#overview)
- [Endpoint yang Tersedia](#endpoint-yang-tersedia)
- [Format API Key](#format-api-key)
- [Cara Testing](#cara-testing)
  - [1. cURL](#1-curl)
  - [2. Postman](#2-postman)
  - [3. n8n](#3-n8n)
  - [4. JavaScript/Fetch](#4-javascriptfetch)
  - [5. Python](#5-python)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

API key digunakan untuk mengakses data sistem YPK Gloria dari aplikasi eksternal seperti n8n, webhook, atau integrasi third-party lainnya. API key menggunakan autentikasi yang berbeda dari JWT (user login) dan dirancang khusus untuk akses machine-to-machine.

**Base URL**: `http://localhost:8080/api/v1/external`

**Authentication Method**: API Key via HTTP Header

---

## Endpoint yang Tersedia

Semua endpoint di bawah memerlukan autentikasi API key dan menggunakan prefix `/api/v1/external`.

### Schools (Sekolah)

| Endpoint | Method | Deskripsi | Query Parameters |
|----------|--------|-----------|------------------|
| `/external/schools` | GET | List semua sekolah | `page`, `page_size`, `search`, `is_active` |
| `/external/schools/:id` | GET | Detail sekolah berdasarkan ID | - |

### Employees (Karyawan)

| Endpoint | Method | Deskripsi | Query Parameters |
|----------|--------|-----------|------------------|
| `/external/employees` | GET | List karyawan | `page`, `page_size`, `search`, `jenis_karyawan` |
| `/external/employees/filter-options` | GET | Filter options untuk karyawan | - |
| `/external/employees/:nip` | GET | Detail karyawan berdasarkan NIP | - |

### Departments (Departemen)

| Endpoint | Method | Deskripsi | Query Parameters |
|----------|--------|-----------|------------------|
| `/external/departments` | GET | List departemen | `page`, `page_size`, `search` |
| `/external/departments/tree` | GET | Tree struktur departemen | - |
| `/external/departments/:id` | GET | Detail departemen berdasarkan ID | - |

### Positions (Jabatan)

| Endpoint | Method | Deskripsi | Query Parameters |
|----------|--------|-----------|------------------|
| `/external/positions` | GET | List posisi/jabatan | `page`, `page_size`, `search` |
| `/external/positions/:id` | GET | Detail posisi berdasarkan ID | - |

---

## Format API Key

API key di sistem YPK Gloria menggunakan format:

```
gla_<random_characters>
```

**Contoh**:
```
gla_1a2b3c4d5e6f7g8h9i0j
```

**Karakteristik**:
- Prefix: `gla_` (Gloria API)
- Panjang: Minimum 20 karakter setelah prefix
- Karakter: Alphanumeric (a-z, A-Z, 0-9)

---

## Cara Testing

### 1. cURL

cURL adalah command-line tool untuk HTTP requests. Tersedia di Linux, macOS, dan Windows.

#### Opsi A: Header `X-API-Key` (Recommended)

```bash
curl -X GET "http://localhost:8080/api/v1/external/schools" \
  -H "X-API-Key: gla_YOUR_API_KEY_HERE"
```

#### Opsi B: Header `Authorization`

```bash
curl -X GET "http://localhost:8080/api/v1/external/schools" \
  -H "Authorization: ApiKey gla_YOUR_API_KEY_HERE"
```

#### Dengan Query Parameters

```bash
curl -X GET "http://localhost:8080/api/v1/external/schools?page=1&page_size=10&is_active=true" \
  -H "X-API-Key: gla_YOUR_API_KEY_HERE"
```

#### Dengan Pretty Print (jq)

```bash
curl -X GET "http://localhost:8080/api/v1/external/schools" \
  -H "X-API-Key: gla_YOUR_API_KEY_HERE" | jq
```

#### Testing Semua Endpoint

```bash
# Schools
curl -H "X-API-Key: gla_YOUR_KEY" http://localhost:8080/api/v1/external/schools

# Employees
curl -H "X-API-Key: gla_YOUR_KEY" http://localhost:8080/api/v1/external/employees

# Departments
curl -H "X-API-Key: gla_YOUR_KEY" http://localhost:8080/api/v1/external/departments

# Positions
curl -H "X-API-Key: gla_YOUR_KEY" http://localhost:8080/api/v1/external/positions
```

---

### 2. Postman

Postman adalah GUI tool untuk API testing.

#### Setup

1. **Buat Request Baru**:
   - Klik `New` → `HTTP Request`
   - Method: `GET`
   - URL: `http://localhost:8080/api/v1/external/schools`

2. **Tambahkan Header**:
   - Tab **Headers**
   - Key: `X-API-Key`
   - Value: `gla_YOUR_API_KEY_HERE`
   - ✓ Centang untuk enable

3. **Query Parameters** (Optional):
   - Tab **Params**
   - Key: `page`, Value: `1`
   - Key: `page_size`, Value: `10`

4. **Send Request**:
   - Klik tombol **Send**
   - Response akan muncul di bagian bawah

#### Membuat Collection

1. **Buat Collection Baru**: `YPK Gloria - External API`

2. **Tambahkan Environment Variable**:
   - Klik Settings (⚙️) → Environments
   - Buat environment: `Local`
   - Variable: `api_key`, Value: `gla_YOUR_KEY`
   - Variable: `base_url`, Value: `http://localhost:8080/api/v1/external`

3. **Gunakan Variable di Request**:
   - URL: `{{base_url}}/schools`
   - Header `X-API-Key`: `{{api_key}}`

#### Pre-request Script untuk Tracking

```javascript
// Log request details
console.log('Testing API Key:', pm.environment.get('api_key').substring(0, 10) + '...');
console.log('Endpoint:', pm.request.url.toString());
```

#### Test Script untuk Validation

```javascript
// Validate status code
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Validate response has data
pm.test("Response has data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('data');
});

// Validate API key was accepted
pm.test("API key accepted", function () {
    pm.response.to.not.have.jsonBody('error', 'API key required');
});
```

---

### 3. n8n

n8n adalah workflow automation tool yang populer untuk integrasi.

#### Setup HTTP Request Node

1. **Tambah Node**: HTTP Request

2. **Authentication**:
   - Authentication: `Generic Credential Type`
   - Generic Auth Type: `Header Auth`
   - Create New Credential

3. **Header Auth Credential**:
   - Name: `YPK Gloria API Key`
   - Header Name: `X-API-Key`
   - Header Value: `gla_YOUR_API_KEY_HERE`

4. **Request Configuration**:
   - Method: `GET`
   - URL: `http://localhost:8080/api/v1/external/schools`

5. **Query Parameters** (Optional):
   - Add Parameter
   - Name: `page`, Value: `1`
   - Name: `page_size`, Value: `10`

#### Example Workflow: Sync Schools to Database

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Schedule   │ --> │  HTTP Req   │ --> │  PostgreSQL │
│  (Daily)    │     │  (Schools)  │     │  (Insert)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

#### Example Expression untuk Pagination

```javascript
// Get page from previous node or start from 1
{{ $json.page || 1 }}

// Calculate offset for SQL
{{ ($json.page - 1) * $json.page_size }}
```

---

### 4. JavaScript/Fetch

Untuk web applications atau Node.js scripts.

#### Browser Fetch API

```javascript
// Simple GET request
fetch('http://localhost:8080/api/v1/external/schools', {
  method: 'GET',
  headers: {
    'X-API-Key': 'gla_YOUR_API_KEY_HERE'
  }
})
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Schools:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

#### Dengan Query Parameters

```javascript
const params = new URLSearchParams({
  page: '1',
  page_size: '10',
  is_active: 'true'
});

fetch(`http://localhost:8080/api/v1/external/schools?${params}`, {
  headers: {
    'X-API-Key': 'gla_YOUR_API_KEY_HERE'
  }
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

#### Async/Await Pattern

```javascript
async function getSchools() {
  try {
    const response = await fetch('http://localhost:8080/api/v1/external/schools', {
      headers: {
        'X-API-Key': 'gla_YOUR_API_KEY_HERE'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Schools:', data);
    return data;
  } catch (error) {
    console.error('Error fetching schools:', error);
    throw error;
  }
}

// Usage
getSchools();
```

#### Reusable API Client Class

```javascript
class GloriaAPIClient {
  constructor(apiKey, baseURL = 'http://localhost:8080/api/v1/external') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Schools
  async getSchools(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/schools${query ? '?' + query : ''}`);
  }

  async getSchoolById(id) {
    return this.request(`/schools/${id}`);
  }

  // Employees
  async getEmployees(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/employees${query ? '?' + query : ''}`);
  }

  async getEmployeeByNIP(nip) {
    return this.request(`/employees/${nip}`);
  }

  // Departments
  async getDepartments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/departments${query ? '?' + query : ''}`);
  }

  async getDepartmentTree() {
    return this.request('/departments/tree');
  }

  // Positions
  async getPositions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/positions${query ? '?' + query : ''}`);
  }
}

// Usage
const client = new GloriaAPIClient('gla_YOUR_API_KEY_HERE');

// Get all schools
const schools = await client.getSchools({ page: 1, page_size: 10 });

// Get specific school
const school = await client.getSchoolById('school-id-123');

// Get employees with filters
const employees = await client.getEmployees({
  jenis_karyawan: 'Guru',
  page: 1
});
```

---

### 5. Python

Untuk Python scripts dan data processing.

#### Menggunakan `requests` Library

```python
import requests

# API Configuration
API_KEY = 'gla_YOUR_API_KEY_HERE'
BASE_URL = 'http://localhost:8080/api/v1/external'

# Headers
headers = {
    'X-API-Key': API_KEY
}

# Simple GET request
response = requests.get(f'{BASE_URL}/schools', headers=headers)

if response.status_code == 200:
    data = response.json()
    print('Schools:', data)
else:
    print(f'Error: {response.status_code}')
    print(response.json())
```

#### Dengan Query Parameters

```python
import requests

API_KEY = 'gla_YOUR_API_KEY_HERE'
BASE_URL = 'http://localhost:8080/api/v1/external'

headers = {'X-API-Key': API_KEY}
params = {
    'page': 1,
    'page_size': 10,
    'is_active': True
}

response = requests.get(f'{BASE_URL}/schools', headers=headers, params=params)
data = response.json()
print(data)
```

#### Reusable API Client Class

```python
import requests
from typing import Dict, Optional, Any
from urllib.parse import urljoin

class GloriaAPIClient:
    """
    Client for YPK Gloria External API

    Usage:
        client = GloriaAPIClient('gla_YOUR_API_KEY')
        schools = client.get_schools(page=1, page_size=10)
    """

    def __init__(self, api_key: str, base_url: str = 'http://localhost:8080/api/v1/external'):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, endpoint: str, params: Optional[Dict] = None,
                 data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = urljoin(self.base_url, endpoint)

        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error: {e}")
            print(f"Response: {response.text}")
            raise
        except requests.exceptions.RequestException as e:
            print(f"Request Error: {e}")
            raise

    # Schools
    def get_schools(self, **params) -> Dict[str, Any]:
        """Get list of schools"""
        return self._request('GET', '/schools', params=params)

    def get_school_by_id(self, school_id: str) -> Dict[str, Any]:
        """Get school by ID"""
        return self._request('GET', f'/schools/{school_id}')

    # Employees
    def get_employees(self, **params) -> Dict[str, Any]:
        """Get list of employees"""
        return self._request('GET', '/employees', params=params)

    def get_employee_by_nip(self, nip: str) -> Dict[str, Any]:
        """Get employee by NIP"""
        return self._request('GET', f'/employees/{nip}')

    def get_filter_options(self) -> Dict[str, Any]:
        """Get employee filter options"""
        return self._request('GET', '/employees/filter-options')

    # Departments
    def get_departments(self, **params) -> Dict[str, Any]:
        """Get list of departments"""
        return self._request('GET', '/departments', params=params)

    def get_department_tree(self) -> Dict[str, Any]:
        """Get department tree structure"""
        return self._request('GET', '/departments/tree')

    def get_department_by_id(self, dept_id: str) -> Dict[str, Any]:
        """Get department by ID"""
        return self._request('GET', f'/departments/{dept_id}')

    # Positions
    def get_positions(self, **params) -> Dict[str, Any]:
        """Get list of positions"""
        return self._request('GET', '/positions', params=params)

    def get_position_by_id(self, position_id: str) -> Dict[str, Any]:
        """Get position by ID"""
        return self._request('GET', f'/positions/{position_id}')


# Usage Example
if __name__ == '__main__':
    # Initialize client
    client = GloriaAPIClient('gla_YOUR_API_KEY_HERE')

    # Get schools
    schools = client.get_schools(page=1, page_size=10)
    print('Total schools:', schools['total'])

    # Get employees
    employees = client.get_employees(jenis_karyawan='Guru', page=1)
    print('Total employees:', employees['total'])

    # Get department tree
    dept_tree = client.get_department_tree()
    print('Department structure:', dept_tree)
```

#### Pandas Integration untuk Data Analysis

```python
import pandas as pd
from gloria_api_client import GloriaAPIClient

# Initialize client
client = GloriaAPIClient('gla_YOUR_API_KEY_HERE')

# Get all employees (with pagination)
all_employees = []
page = 1
page_size = 100

while True:
    response = client.get_employees(page=page, page_size=page_size)
    all_employees.extend(response['data'])

    if page >= response['total_pages']:
        break
    page += 1

# Create DataFrame
df = pd.DataFrame(all_employees)

# Analysis
print('Total employees:', len(df))
print('\nEmployees by type:')
print(df['jenis_karyawan'].value_counts())

print('\nEmployees by department:')
print(df['departemen'].value_counts())

# Export to CSV
df.to_csv('employees_export.csv', index=False)
```

---

## Response Format

### Success Response

**Status Code**: `200 OK`

```json
{
  "data": [
    {
      "id": "uuid-here",
      "name": "Resource Name",
      "created_at": "2024-01-01T00:00:00Z",
      ...
    }
  ],
  "page": 1,
  "page_size": 10,
  "total": 100,
  "total_pages": 10
}
```

### Single Resource Response

**Status Code**: `200 OK`

```json
{
  "id": "uuid-here",
  "name": "Resource Name",
  "created_at": "2024-01-01T00:00:00Z",
  ...
}
```

---

## Error Handling

### API Key Required

**Status Code**: `401 Unauthorized`

```json
{
  "error": "API key required",
  "message": "Please provide API key via X-API-Key header or Authorization: ApiKey <key>"
}
```

### Invalid API Key Format

**Status Code**: `401 Unauthorized`

```json
{
  "error": "Invalid API key format",
  "message": "API key must be in format: gla_xxxxx"
}
```

### Invalid API Key

**Status Code**: `401 Unauthorized`

```json
{
  "error": "Invalid API key"
}
```

### API Key Expired

**Status Code**: `401 Unauthorized`

```json
{
  "error": "API key expired"
}
```

### API Key Revoked/Inactive

**Status Code**: `401 Unauthorized`

```json
{
  "error": "API key is not active"
}
```

### Resource Not Found

**Status Code**: `404 Not Found`

```json
{
  "error": "Resource not found"
}
```

### Server Error

**Status Code**: `500 Internal Server Error`

```json
{
  "error": "Internal server error",
  "message": "Error description"
}
```

---

## Best Practices

### Security

1. **Jangan Commit API Key ke Git**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   api_keys.txt
   ```

2. **Gunakan Environment Variables**
   ```bash
   # .env
   GLORIA_API_KEY=gla_your_key_here
   ```

   ```javascript
   const apiKey = process.env.GLORIA_API_KEY;
   ```

3. **Rotate API Keys Secara Berkala**
   - Set expiry date saat membuat key
   - Generate key baru sebelum yang lama expired
   - Revoke key yang tidak digunakan

4. **Monitor Usage**
   - Cek usage count dan last_used_at
   - Alert jika ada unusual activity
   - Track which integration uses which key

### Performance

1. **Gunakan Pagination**
   ```javascript
   // Good
   fetch('/schools?page=1&page_size=100')

   // Bad - may timeout or use too much memory
   fetch('/schools?page_size=10000')
   ```

2. **Cache Response**
   ```javascript
   // Cache for 5 minutes
   const cache = new Map();
   const CACHE_TTL = 5 * 60 * 1000;

   async function getCachedSchools() {
     const cached = cache.get('schools');
     if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
       return cached.data;
     }

     const data = await fetchSchools();
     cache.set('schools', { data, timestamp: Date.now() });
     return data;
   }
   ```

3. **Rate Limiting**
   - Implementasi retry logic dengan exponential backoff
   - Jangan overwhelm server dengan concurrent requests

### Error Handling

1. **Retry Logic**
   ```javascript
   async function fetchWithRetry(url, options, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const response = await fetch(url, options);
         if (response.ok) return response;

         // Don't retry on 4xx errors
         if (response.status >= 400 && response.status < 500) {
           throw new Error(`HTTP ${response.status}`);
         }

         // Wait before retry (exponential backoff)
         await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
       } catch (error) {
         if (i === maxRetries - 1) throw error;
       }
     }
   }
   ```

2. **Logging**
   ```javascript
   function logApiCall(endpoint, status, duration) {
     console.log({
       timestamp: new Date().toISOString(),
       endpoint,
       status,
       duration: `${duration}ms`,
       apiKeyPrefix: apiKey.substring(0, 10)
     });
   }
   ```

### Monitoring

1. **Track API Key Usage**
   - Monitor `usage_count` via UI
   - Alert when approaching limits
   - Check `last_used_at` for inactive keys

2. **Log Failed Requests**
   ```python
   import logging

   logging.basicConfig(level=logging.INFO)
   logger = logging.getLogger(__name__)

   try:
       response = client.get_schools()
   except Exception as e:
       logger.error(f"API call failed: {e}", exc_info=True)
   ```

---

## Troubleshooting

### API Key Not Working

**Checklist**:
- [ ] API key format benar (dimulai dengan `gla_`)
- [ ] Header name benar (`X-API-Key` atau `Authorization: ApiKey`)
- [ ] API key is_active = true
- [ ] API key belum expired
- [ ] Server backend running
- [ ] Network connectivity OK

### 401 Unauthorized

**Possible Causes**:
1. API key salah atau typo
2. API key expired atau revoked
3. Header tidak dikirim dengan benar
4. Middleware ApiKeyAuth tidak active

**Debug**:
```bash
# Test dengan curl verbose
curl -v -H "X-API-Key: gla_YOUR_KEY" http://localhost:8080/api/v1/external/schools

# Check response headers
# Check if X-API-Key header was sent
```

### Connection Refused

**Possible Causes**:
1. Backend server tidak running
2. Port 8080 tidak available
3. Firewall blocking

**Solution**:
```bash
# Check if server running
curl http://localhost:8080/health

# Check port
netstat -an | grep 8080

# Start server if not running
cd backend && go run cmd/server/main.go
```

---

## Support

Jika mengalami masalah atau butuh bantuan:

1. **Check Logs**: Lihat backend console untuk error messages
2. **Verify API Key**: Cek di UI `/settings/api-keys` untuk status key
3. **Test dengan cURL**: Gunakan cURL untuk isolate masalah
4. **Contact Admin**: Hubungi administrator sistem

---

**Last Updated**: January 2026
**Version**: 1.0
