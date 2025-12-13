# Backend Integration - Quick Test Guide

**Quick verification dalam 5 menit** ⚡

---

## 🚀 Quick Start (5 Menit)

### 1. Start Backend (1 menit)
```bash
cd /Users/christianhandoko/Development/work/my-gloria/backend
./api
```

✅ Backend running di: `http://localhost:8080`

### 2. Start Frontend (1 menit)
```bash
cd /Users/christianhandoko/Development/work/my-gloria/frontend
npm run dev
```

✅ Frontend running di: `http://localhost:3000`

### 3. Test Login (3 menit)

#### A. Buka Browser DevTools
- Tekan `F12`
- Pilih tab **Network**
- Enable **"Preserve log"**

#### B. Login
1. Buka: `http://localhost:3000`
2. Sign in dengan Clerk
3. **Perhatikan Network tab**

#### C. Verifikasi Request
Cari request dengan:
- **URL:** `http://localhost:8080/api/v1/me`
- **Method:** `GET`
- **Status:** `200 OK`

Klik request tersebut, cek:

**Headers Tab:**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```
✅ Token Clerk terkirim ke backend

**Response Tab:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "employee": { ... },
    "roles": [ ... ],
    "permissions": [ ... ],
    "modules": [ ... ]
  }
}
```
✅ Backend mengembalikan user context

#### D. Verifikasi Redux (Optional)

Install Redux DevTools extension, lalu:

1. Buka tab **Redux** di DevTools
2. Lihat **State → auth**
3. Pastikan:
   - `userContext` ≠ null
   - `isInitialized` = true
   - `isLoading` = false

---

## ✅ Checklist Cepat

### Sukses Jika:

- [ ] Request `/api/v1/me` muncul di Network tab
- [ ] Response status `200 OK`
- [ ] Response body berisi user data
- [ ] Header Authorization ada
- [ ] Dashboard terbuka (tidak stuck di loading)

### Gagal Jika:

- [ ] ❌ Tidak ada request ke `/api/v1/me`
  → **Solusi:** Cek apakah AuthInitializer sudah di layout.tsx

- [ ] ❌ Status `401 Unauthorized`
  → **Solusi:** Cek backend JWT validation, pastikan Clerk secret key benar

- [ ] ❌ Status `404 Not Found`
  → **Solusi:** User belum ada di database backend, perlu create user

- [ ] ❌ CORS error
  → **Solusi:** Backend belum enable CORS untuk localhost:3000

- [ ] ❌ Infinite loading screen
  → **Solusi:** Cek Redux DevTools, lihat error di Console

---

## 🐛 Debugging Singkat

### Console Error?
```bash
# Buka Console tab di DevTools
# Copy error message
# Paste ke chat untuk bantuan
```

### Network Error?
```bash
# Klik request yang error di Network tab
# Screenshot Response tab
# Paste ke chat untuk bantuan
```

### Redux Error?
```bash
# Buka Redux DevTools
# Screenshot State → auth
# Paste ke chat untuk bantuan
```

---

## 📞 Quick Help

**Backend tidak running:**
```bash
cd backend
./api
# Atau: go run cmd/api/main.go
```

**Frontend error:**
```bash
cd frontend
rm -rf .next
npm run dev
```

**Clerk error:**
```bash
# Cek .env.local:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

---

## 🎯 Expected Result

**SEBELUM (Masalah):**
```
Login → Dashboard → Redux userContext = null ❌
No backend call ❌
RBAC tidak berfungsi ❌
```

**SESUDAH (Berhasil):**
```
Login → Backend /me called ✅
Response 200 OK ✅
Redux userContext populated ✅
Dashboard dengan user data ✅
RBAC berfungsi ✅
```

---

## 📝 Test Log Template

Copy template ini untuk dokumentasi:

```
=== Backend Integration Test ===
Date: ___________
Tester: ___________

[ ] Backend running: http://localhost:8080
[ ] Frontend running: http://localhost:3000
[ ] Login berhasil
[ ] Request /api/v1/me muncul
[ ] Response status: _____
[ ] Authorization header ada: _____ (yes/no)
[ ] Response body valid: _____ (yes/no)
[ ] Redux userContext populated: _____ (yes/no)
[ ] Dashboard terbuka normal: _____ (yes/no)

Issues (jika ada):
_________________________
_________________________

Screenshot:
- Network tab: _________
- Redux state: _________
```
