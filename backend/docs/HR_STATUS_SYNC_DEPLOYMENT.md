# HR Status Synchronization - Deployment Guide

## 📋 Overview

This guide covers the deployment of the HR-driven employee status management system with real-time cache invalidation.

### What Was Implemented

**Solution 1: Auth Logic Update**
- Modified `buildUserProfileInfo()` to check `gloria_master.data_karyawan.status_aktif` as authoritative source
- Reduced cache TTL from 5 minutes to 30 seconds for faster updates
- Added fail-safe logic to deny access when HR data is missing

**Solution 2: Database Trigger**
- Created PostgreSQL trigger that auto-syncs `user_profiles.is_active` when HR updates `data_karyawan.status_aktif`
- Maintains data consistency across tables
- Sends `pg_notify` for real-time application response

**Solution 3: Real-time Listener**
- Implemented LISTEN/NOTIFY for instant cache invalidation (<1 second)
- Automatic logout when HR deactivates user
- Graceful shutdown handling

---

## 🚀 Deployment Steps

### Prerequisites

- [x] PostgreSQL 12+ (for `pg_notify` support)
- [x] Go 1.19+ installed
- [x] Database backup completed
- [x] Backend service can be restarted

### Step 1: Database Backup (CRITICAL)

```bash
# Create backup before any changes
pg_dump -h localhost -p 3479 -U postgres new_gloria_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup size (should be > 0 bytes)
ls -lh backup_*.sql
```

### Step 2: Install Go Dependencies

```bash
cd /Users/christianhandoko/Development/work/my-gloria/backend

# Install pq library for LISTEN/NOTIFY
go get github.com/lib/pq

# Verify dependencies
go mod tidy
go mod vendor  # Optional: if you use vendor
```

### Step 3: Apply Database Migration

```bash
# Connect to database
psql -h localhost -p 3479 -U postgres -d new_gloria_db

# Run migration
\i migrations/20250112_add_hr_status_sync_trigger.sql

# Verify trigger created
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trg_sync_user_status_from_hr';
```

**Expected output:**
```
           trigger_name           | event_object_table | action_timing
----------------------------------+--------------------+---------------
 trg_sync_user_status_from_hr    | data_karyawan      | AFTER
```

### Step 4: Run Test Suite

```bash
# Run comprehensive tests
psql -h localhost -p 3479 -U postgres -d new_gloria_db -f migrations/test_hr_status_sync.sql

# Look for these results:
# ✅ PASS - Both active
# ✅ PASS - Synced correctly (user will be denied access)
# ✅ PASS - Synced correctly (user can access again)
# ✅ PASS - Trigger exists
# ✅ PASS - All records consistent
# ✅ PASS - Performance acceptable
```

### Step 5: Build and Deploy Backend

```bash
# Build backend
cd backend
go build -o bin/api ./cmd/api

# Test compilation
./bin/api --help  # Should not crash

# Stop current backend (if running)
# sudo systemctl stop gloria-backend  # Or your process manager

# Start new backend
./bin/api

# Or with systemd:
# sudo systemctl start gloria-backend
```

### Step 6: Verify Deployment

**Check 1: Backend Logs**

Look for these startup messages:
```
✅ [Startup] HR status listener initialized successfully
   └─ Real-time cache invalidation enabled (instant user logout)
✅ Server ready to accept requests
🔔 HR status changes will trigger instant cache invalidation
```

**Check 2: Test Status Change**

```sql
-- Find a test user
SELECT nip, nama, email, status_aktif
FROM gloria_master.data_karyawan
WHERE email = 'your.test.user@example.com';

-- User should login first via frontend

-- Deactivate
UPDATE gloria_master.data_karyawan
SET status_aktif = 'Tidak'
WHERE email = 'your.test.user@example.com';
```

**Check backend logs** for:
```
🔔 [HR Listener] Employee status changed
   ├─ NIP: ...
   ├─ Status: Aktif → Tidak
✅ [HR Listener] Cache invalidated for clerk_user_id: ...
🚫 [HR Listener] User ... will be DENIED access on next request
   └─ Effect: Immediate logout (within 1 second)
```

**User tests API call** → Should get:
```json
{
  "success": false,
  "error": "user account is inactive"
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Immediate Deactivation

```bash
# Terminal 1: Monitor logs
tail -f /path/to/backend/logs/app.log | grep -E "HR|Auth|Status"

# Terminal 2: User makes API call every 5 seconds
while true; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/me
  sleep 5
done

# Terminal 3: HR deactivates user
psql -c "UPDATE gloria_master.data_karyawan SET status_aktif='Tidak' WHERE nip='123456';"
```

**Expected result**: User gets 403 error within 1-2 seconds

### Scenario 2: Reactivation

```sql
-- Reactivate user
UPDATE gloria_master.data_karyawan
SET status_aktif = 'Aktif'
WHERE nip = '123456';
```

**Expected result**: User can login/access again immediately

### Scenario 3: Bulk Update

```sql
-- Deactivate multiple users
UPDATE gloria_master.data_karyawan
SET status_aktif = 'Tidak'
WHERE bagian_kerja = 'Former Department';
```

**Check**: All affected users should be logged out within 1 second

---

## 📊 Monitoring

### Key Metrics to Monitor

**Backend Logs:**
- `[HR Listener]` messages for notifications received
- `[Auth]` messages for access denials
- Cache invalidation counts

**Database:**
```sql
-- Check sync status
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN (dk.status_aktif = 'Aktif') = up.is_active THEN 1 ELSE 0 END) as synced,
    SUM(CASE WHEN (dk.status_aktif = 'Aktif') != up.is_active THEN 1 ELSE 0 END) as unsynced
FROM gloria_master.data_karyawan dk
JOIN gloria_ops.user_profiles up ON dk.nip = up.nip;
```

**Expected**: `unsynced = 0`

### Health Check Endpoint (Optional)

Add to your monitoring:
```bash
# Check if listener is running
curl http://localhost:8080/api/v1/health
# Look for: hr_listener_running: true
```

---

## 🔧 Troubleshooting

### Issue 1: Trigger Not Firing

**Symptom**: Status changes don't sync to user_profiles

**Check**:
```sql
-- Verify trigger exists
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trg_sync_user_status_from_hr';

-- Check trigger is enabled
SELECT tgenabled FROM pg_trigger
WHERE tgname = 'trg_sync_user_status_from_hr';
```

**Fix**:
```sql
-- Re-run migration
\i migrations/20250112_add_hr_status_sync_trigger.sql
```

### Issue 2: Listener Not Starting

**Symptom**: No `[HR Listener]` logs at startup

**Check backend logs** for:
```
⚠️  [Startup] Failed to start HR listener: ...
```

**Common causes**:
- Database connection string incorrect
- PostgreSQL permissions issue
- Port already in use

**Fix**:
```bash
# Check database connectivity
psql -h localhost -p 3479 -U postgres new_gloria_db -c "SELECT 1"

# Check Go dependencies
go mod download
go mod verify
```

### Issue 3: Cache Not Invalidating

**Symptom**: User still can access after >1 minute

**Check**:
1. Is listener running? Check logs for `[HR Listener] Started`
2. Is notification sent? Check logs after status change
3. Is cache key correct? Check `clerk_user_id` in notification

**Debug**:
```sql
-- Manually test notification
SELECT pg_notify('hr_status_changed', '{"clerk_user_id":"test123","nip":"123456","new_status":"Tidak","is_active":false}'::text);
```

**Check backend logs** for: `🔔 [HR Listener] Employee status changed`

### Issue 4: Performance Degradation

**Symptom**: Slow updates or high CPU usage

**Check**:
```sql
-- Check trigger execution time
EXPLAIN ANALYZE
UPDATE gloria_master.data_karyawan
SET status_aktif = 'Tidak'
WHERE nip = 'TEST001';
```

**Optimize**:
```sql
-- Add index on nip if not exists
CREATE INDEX IF NOT EXISTS idx_user_profiles_nip
ON gloria_ops.user_profiles(nip);
```

---

## 🔄 Rollback Plan

If issues occur, follow this rollback procedure:

### Step 1: Stop Backend
```bash
sudo systemctl stop gloria-backend
```

### Step 2: Remove Trigger
```sql
DROP TRIGGER IF EXISTS trg_sync_user_status_from_hr ON gloria_master.data_karyawan;
DROP FUNCTION IF EXISTS gloria_ops.sync_user_profile_status_from_hr();
```

### Step 3: Restore Database Backup (if needed)
```bash
# Stop all connections
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='new_gloria_db' AND pid <> pg_backend_pid();"

# Restore
psql -h localhost -p 3479 -U postgres new_gloria_db < backup_YYYYMMDD_HHMMSS.sql
```

### Step 4: Redeploy Previous Backend Version
```bash
git checkout <previous-commit>
go build -o bin/api ./cmd/api
sudo systemctl start gloria-backend
```

---

## ✅ Post-Deployment Checklist

- [ ] Database backup verified and accessible
- [ ] Migration applied successfully
- [ ] Test suite passed (all ✅ PASS)
- [ ] Backend started without errors
- [ ] HR listener shows as running in logs
- [ ] Test status change with real user (deactivate → 403 within 1s)
- [ ] Test reactivation (activate → can access)
- [ ] Monitoring dashboards updated
- [ ] Team notified of new behavior
- [ ] Documentation updated

---

## 📞 Support

For issues or questions:
- Check logs: `/var/log/gloria-backend/app.log`
- Check database: Run consistency query above
- Review this guide's troubleshooting section
- Contact: [Your team's contact info]

---

## 📝 Notes

**Performance Impact:**
- Minimal (<5ms per status change)
- One additional database query per auth request (cached for 30s)
- Network overhead: ~100 bytes per notification

**Security Considerations:**
- HR data (`data_karyawan`) is now authoritative
- Users cannot bypass status checks
- Cached data expires in 30 seconds max
- Real-time invalidation provides <1 second response

**Future Enhancements:**
- Add monitoring dashboard for listener statistics
- Implement health check endpoint
- Add metrics export (Prometheus/Grafana)
- Consider webhook for external systems
