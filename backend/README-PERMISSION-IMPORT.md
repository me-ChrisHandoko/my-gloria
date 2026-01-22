# Permission Import Guide

## File yang tersedia:
- **Source**: `../frontend/claudedocs/permission-insert-script.sql` (original tanpa UUID - deprecated)
- **Legacy**: `backend/permissions-import.sql` (dengan UUID, timestamps, action lama - deprecated)
- **Current**: `backend/permissions-updated.sql` (dengan UUID, timestamps, backend enum actions - USE THIS)

## Cara Update Manual dengan Find & Replace di VS Code/Text Editor:

### Langkah 1: Copy file original
```bash
cp ../frontend/claudedocs/permission-insert-script.sql ./permissions-full.sql
```

### Langkah 2: Tambahkan UUID extension di awal (setelah header comments, sebelum section DASHBOARD)
Tambahkan baris berikut:
```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Langkah 3: Find & Replace dengan Regex (di VS Code: Ctrl+H, aktifkan .*  regex mode)

#### Replace 1: Update INSERT statement header
**Find:**
```regex
INSERT INTO permissions \(code,
```

**Replace with:**
```
INSERT INTO permissions (id, code,
```

#### Replace 2: Update closing parenthesis di header
**Find:**
```regex
group_sort_order\)
```

**Replace with:**
```
group_sort_order, created_at, updated_at)
```

#### Replace 3: Add gen_random_uuid() di awal setiap value row
**Find:**
```regex
^(\s+)\('
```

**Replace with:**
```
$1(gen_random_uuid(), '
```

#### Replace 4: Add NOW(), NOW() di akhir setiap value row (yang end dengan angka dan comma)
**Find:**
```regex
, (\d+),(\s*)$
```

**Replace with:**
```
, $1, NOW(), NOW()),$2
```

#### Replace 5: Add NOW(), NOW() di akhir setiap value row (yang end dengan angka dan semicolon)
**Find:**
```regex
, (\d+)\);(\s*)$
```

**Replace with:**
```
, $1, NOW(), NOW());$2
```

## Cara Cepat dengan sed (Linux/Git Bash):

```bash
cd backend

# Backup original
cp ../frontend/claudedocs/permission-insert-script.sql ./permissions-original.sql

# Transform using sed
sed -i \
  -e '/-- 1\. DASHBOARD/i -- Enable UUID extension if not already enabled\nCREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n' \
  -e 's/^INSERT INTO permissions (code,/INSERT INTO permissions (id, code,/' \
  -e 's/group_sort_order)/group_sort_order, created_at, updated_at)/' \
  -e 's/^    ('\''/'    (gen_random_uuid(), '\''/' \
  -e 's/, \([0-9]\+\),$/&, NOW(), NOW()),/' \
  -e 's/, \([0-9]\+\);$/, \1, NOW(), NOW());/' \
  permissions-original.sql

mv permissions-original.sql permissions-full.sql
```

## Cara Import ke Database:

```bash
# Dari backend directory
psql -U postgres -d gloria_db -f permissions-updated.sql

# Atau jika menggunakan .env file
psql $(cat .env | grep DATABASE_URL | cut -d '=' -f2) -f permissions-updated.sql

# Clear existing permissions first (jika perlu)
psql -U postgres -d gloria_db -c "DELETE FROM permissions WHERE is_system_permission = true;"
```

## Verifikasi:

```sql
-- Check jumlah permissions yang di-insert (expected: 117)
SELECT COUNT(*) FROM permissions;

-- Check sample data
SELECT id, code, resource, action, scope, created_at
FROM permissions
ORDER BY created_at DESC
LIMIT 10;

-- Check grouping
SELECT group_name, COUNT(*) as permission_count
FROM permissions
GROUP BY group_name
ORDER BY group_sort_order;

-- Verify actions (expected: 10 unique actions)
SELECT DISTINCT action FROM permissions ORDER BY action;
-- Expected: APPROVE, ASSIGN, CLOSE, CREATE, DELETE, EXPORT, IMPORT, PRINT, READ, UPDATE

-- Verify scopes (expected: 4 unique scopes)
SELECT DISTINCT scope FROM permissions ORDER BY scope;
-- Expected: ALL, DEPARTMENT, OWN, SCHOOL
```

## Expected Results:
- Total permissions: 117 records (updated with backend enum actions)
- Groups: 8 main groups (Dashboard, Karyawan, Pengguna, Organisasi, Akses & Roles, Delegasi, Workflow, Audit Logs)
- All records should have UUIDs and timestamps
- Valid actions: **CREATE**, **READ**, **UPDATE**, **DELETE**, **APPROVE**, **EXPORT**, **IMPORT**, **PRINT**, **ASSIGN**, **CLOSE** (matched with backend enum)
- Valid scopes: **OWN**, **DEPARTMENT**, **SCHOOL**, **ALL** (matched with backend enum)

## ⚠️ Important Notes:

### Action & Scope Consistency Fixed:

**Actions** (Backend Enum):
- **Valid**: CREATE, READ, UPDATE, DELETE, APPROVE, EXPORT, IMPORT, PRINT, ASSIGN, CLOSE
- **Removed**: LIST, REVOKE, EXECUTE, MANAGE (tidak ada di backend enum)

**Scopes** (Backend Enum):
- **Valid**: OWN, DEPARTMENT, SCHOOL, ALL
- **Removed**: organization, global (tidak ada di backend enum)

### Frontend Update Status:
✅ **TypeScript types** (`lib/types/permission.ts`) - Updated dengan backend enum
✅ **Permission forms** (`create/edit page`) - Updated untuk tidak lowercase value
✅ **Action enum** - Sesuai dengan backend (10 actions)
✅ **Scope enum** - Sesuai dengan backend (4 scopes)

### Backend Update Required:
⚠️ **Restart backend server** untuk menerapkan perubahan label scope di handler `permission.go`

## Troubleshooting:

### Error: "null value in column 'id'"
✅ Solution: Pastikan semua baris VALUES dimulai dengan `gen_random_uuid()`

### Error: "extension uuid-ossp does not exist"
✅ Solution: Run sebagai superuser atau pastikan extension di-enable:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "duplicate key value violates unique constraint"
✅ Solution: Permission code sudah ada. Clear dulu atau gunakan ON CONFLICT:
```sql
-- Option 1: Clear existing
DELETE FROM permissions WHERE is_system_permission = true;

-- Option 2: Use ON CONFLICT (add to each INSERT)
ON CONFLICT (code) DO NOTHING;
```
