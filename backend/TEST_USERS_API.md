# User Management API Testing Guide

Backend implementation untuk User Management telah selesai.

## Endpoints yang Telah Diimplementasikan

### 1. GET /api/v1/users - List Users dengan Pagination & Filtering

**Query Parameters:**
- `page` (int, default: 1) - Nomor halaman
- `page_size` (int, default: 20) - Jumlah item per halaman
- `search` (string) - Search berdasarkan email atau username
- `role_id` (string) - Filter berdasarkan role ID
- `is_active` (bool) - Filter berdasarkan status aktif
- `sort_by` (string, default: "email") - Kolom sorting: email, username, created_at, last_active, is_active
- `sort_order` (string, default: "asc") - Urutan sorting: asc, desc

**Response Format:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "name": "Full Name",
      "is_active": true,
      "last_active": "2025-01-20T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}
```

**Example cURL:**
```bash
# Basic request
curl -X GET "http://localhost:8080/api/v1/users" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Cookie: access_token=YOUR_COOKIE"

# With filters
curl -X GET "http://localhost:8080/api/v1/users?page=1&page_size=20&search=admin&is_active=true&sort_by=email&sort_order=asc" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Cookie: access_token=YOUR_COOKIE"
```

### 2. GET /api/v1/users/:id - Get Single User

**Response Format:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "is_active": true,
  "last_active": "2025-01-20T10:00:00Z",
  "preferences": {},
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-20T10:00:00Z",
  "roles": [
    {
      "id": "role-uuid",
      "name": "Admin",
      "code": "ADMIN",
      "description": "Administrator Role"
    }
  ],
  "positions": [
    {
      "id": "position-uuid",
      "position_id": "pos-uuid",
      "position": {
        "id": "pos-uuid",
        "code": "MGR",
        "name": "Manager",
        "department": {
          "id": "dept-uuid",
          "code": "IT",
          "name": "IT Department"
        }
      },
      "start_date": "2025-01-01T00:00:00Z",
      "is_active": true,
      "is_plt": false
    }
  ]
}
```

**Example cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/users/USER_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Cookie: access_token=YOUR_COOKIE"
```

### 3. PUT /api/v1/users/:id - Update User

**Request Body:**
```json
{
  "is_active": true,
  "preferences": {
    "theme": "dark",
    "language": "id"
  }
}
```

**Response:** Same as GET /users/:id

**Example cURL:**
```bash
curl -X PUT "http://localhost:8080/api/v1/users/USER_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Cookie: access_token=YOUR_COOKIE" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{
    "is_active": false
  }'
```

### 4. DELETE /api/v1/users/:id - Delete User

**Business Rules:**
- Tidak dapat menghapus akun sendiri
- Tidak dapat menghapus user yang memiliki role aktif
- Tidak dapat menghapus user yang memiliki posisi aktif

**Response:**
```json
{
  "message": "Pengguna berhasil dihapus"
}
```

**Error Responses:**
```json
{
  "error": "Tidak dapat menghapus akun sendiri"
}
```
```json
{
  "error": "Tidak dapat menghapus pengguna yang memiliki role aktif"
}
```
```json
{
  "error": "Tidak dapat menghapus pengguna yang memiliki posisi aktif"
}
```

**Example cURL:**
```bash
curl -X DELETE "http://localhost:8080/api/v1/users/USER_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Cookie: access_token=YOUR_COOKIE" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"
```

## Implementation Details

### Service Layer (`internal/services/user_service.go`)
- **GetUsers**: Pagination, filtering, sorting dengan support search di email dan username
- **GetUserByID**: Ambil detail user dengan relations (roles, positions, data karyawan)
- **UpdateUser**: Update is_active dan preferences
- **DeleteUser**: Delete dengan business rule validation

### Handler Layer (`internal/handlers/user.go`)
- HTTP request parsing dan validation
- Query parameter extraction
- Response formatting
- Error handling dengan status code yang sesuai

### Features
✅ Server-side pagination
✅ Multi-field search (email, username)
✅ Multiple filters (is_active, role_id)
✅ Configurable sorting (multiple columns, asc/desc)
✅ Business rule validation (prevent self-deletion, check active roles/positions)
✅ Automatic name resolution dari data_karyawan
✅ Preload relations (roles, positions, departments)

## Integration dengan Frontend

Frontend (`app/(protected)/users/page.tsx`) sudah siap dan akan otomatis menggunakan endpoint ini melalui:
- RTK Query (`lib/store/services/usersApi.ts`)
- Server-side API helpers (`lib/server/api.ts`)
- Automatic token refresh pattern
- Error handling dengan fallback states

## Next Steps

1. **Test Authentication**: Pastikan token JWT valid
2. **Test CSRF Protection**: Pastikan X-CSRF-Token header disertakan untuk PUT/DELETE
3. **Test Filters**: Test semua kombinasi filter dan sorting
4. **Test Business Rules**: Coba delete user dengan role aktif (harus gagal)
5. **Test Frontend Integration**: Buka http://localhost:3000/users dan pastikan data muncul

## Error Handling

Backend sudah mengimplementasikan error handling untuk:
- `400 Bad Request`: Invalid request body atau business rule violation
- `401 Unauthorized`: Missing atau invalid authentication
- `404 Not Found`: User tidak ditemukan
- `500 Internal Server Error`: Database error atau unexpected error

## Database Schema

Backend menggunakan tabel:
- `public.users` - User data utama
- `public.user_roles` - User role assignments
- `public.user_positions` - User position assignments
- `public.data_karyawan` - Employee data (untuk field `name`)

## Testing Checklist

- [ ] Build backend berhasil
- [ ] Server bisa start tanpa error
- [ ] GET /users mengembalikan list dengan pagination
- [ ] GET /users dengan search parameter
- [ ] GET /users dengan is_active filter
- [ ] GET /users dengan sorting
- [ ] GET /users/:id mengembalikan detail lengkap
- [ ] PUT /users/:id update berhasil
- [ ] DELETE /users/:id dengan validation
- [ ] DELETE tidak bisa hapus akun sendiri
- [ ] Frontend /users page menampilkan data
- [ ] Search di frontend berfungsi (debounced)
- [ ] Filters di frontend berfungsi
- [ ] Pagination di frontend berfungsi
- [ ] Sorting di frontend berfungsi

---

**Status**: ✅ Backend Implementation Complete
**Date**: 2025-01-20
**Developer**: Claude Code
