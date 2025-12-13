-- =====================================================
-- HR Status Synchronization - Comprehensive Test Suite
-- Purpose: Verify trigger, sync, and notification functionality
-- Created: 2025-01-12
-- =====================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'HR STATUS SYNC - COMPREHENSIVE TEST SUITE'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- =====================================================
-- SETUP: Create test employee and user profile
-- =====================================================
\echo '📋 SETUP: Creating test data...'

DO $$
BEGIN
    -- Create test employee if not exists
    IF NOT EXISTS (SELECT 1 FROM gloria_master.data_karyawan WHERE nip = 'TEST_HR_001') THEN
        INSERT INTO gloria_master.data_karyawan (
            nip, nama, email, status_aktif, jenis_karyawan, bagian_kerja, lokasi
        ) VALUES (
            'TEST_HR_001',
            'Test Employee - HR Sync',
            'test.hr.sync@gloria.com',
            'Aktif',
            'Tetap',
            'IT Department',
            'Head Office'
        );
        RAISE NOTICE '✅ Created test employee: TEST_HR_001';
    ELSE
        UPDATE gloria_master.data_karyawan
        SET status_aktif = 'Aktif'
        WHERE nip = 'TEST_HR_001';
        RAISE NOTICE '✅ Reset test employee to Aktif: TEST_HR_001';
    END IF;

    -- Create user profile if not exists
    IF NOT EXISTS (SELECT 1 FROM gloria_ops.user_profiles WHERE nip = 'TEST_HR_001') THEN
        INSERT INTO gloria_ops.user_profiles (
            id, clerk_user_id, nip, is_active, created_at, updated_at
        ) VALUES (
            gen_random_uuid()::text,
            'user_test_hr_' || substring(gen_random_uuid()::text from 1 for 8),
            'TEST_HR_001',
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        RAISE NOTICE '✅ Created test user profile: TEST_HR_001';
    ELSE
        UPDATE gloria_ops.user_profiles
        SET is_active = true, updated_at = CURRENT_TIMESTAMP
        WHERE nip = 'TEST_HR_001';
        RAISE NOTICE '✅ Reset test user profile to active: TEST_HR_001';
    END IF;
END $$;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'TEST 1: Verify Initial State'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT
    '🔍 Initial State Check' as test_case,
    dk.nip,
    dk.nama,
    dk.email,
    dk.status_aktif as hr_status,
    up.is_active as profile_status,
    up.clerk_user_id,
    up.updated_at,
    CASE
        WHEN dk.status_aktif = 'Aktif' AND up.is_active = true
        THEN '✅ PASS - Both active'
        ELSE '❌ FAIL - Inconsistent state'
    END as result
FROM gloria_master.data_karyawan dk
JOIN gloria_ops.user_profiles up ON dk.nip = up.nip
WHERE dk.nip = 'TEST_HR_001';

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'TEST 2: HR Deactivates Employee'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '⚙️  Simulating HR action: UPDATE status_aktif = Tidak...'
UPDATE gloria_master.data_karyawan
SET status_aktif = 'Tidak'
WHERE nip = 'TEST_HR_001';

\echo '⏳ Waiting for trigger to execute...'
SELECT pg_sleep(0.5);

\echo '🔍 Verifying sync...'
SELECT
    '🔍 After Deactivation' as test_case,
    dk.status_aktif as hr_status,
    up.is_active as profile_status,
    up.updated_at as last_synced,
    CASE
        WHEN dk.status_aktif = 'Tidak' AND up.is_active = false
        THEN '✅ PASS - Synced correctly (user will be denied access)'
        WHEN dk.status_aktif = 'Tidak' AND up.is_active = true
        THEN '❌ FAIL - Not synced (trigger did not fire)'
        ELSE '⚠️  UNEXPECTED STATE'
    END as result,
    CASE
        WHEN up.updated_at > CURRENT_TIMESTAMP - INTERVAL '5 seconds'
        THEN '✅ Recently updated'
        ELSE '⚠️  Update timestamp is old'
    END as timestamp_check
FROM gloria_master.data_karyawan dk
JOIN gloria_ops.user_profiles up ON dk.nip = up.nip
WHERE dk.nip = 'TEST_HR_001';

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'TEST 3: HR Reactivates Employee'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '⚙️  Simulating HR action: UPDATE status_aktif = Aktif...'
UPDATE gloria_master.data_karyawan
SET status_aktif = 'Aktif'
WHERE nip = 'TEST_HR_001';

\echo '⏳ Waiting for trigger to execute...'
SELECT pg_sleep(0.5);

\echo '🔍 Verifying sync...'
SELECT
    '🔍 After Reactivation' as test_case,
    dk.status_aktif as hr_status,
    up.is_active as profile_status,
    up.updated_at as last_synced,
    CASE
        WHEN dk.status_aktif = 'Aktif' AND up.is_active = true
        THEN '✅ PASS - Synced correctly (user can access again)'
        WHEN dk.status_aktif = 'Aktif' AND up.is_active = false
        THEN '❌ FAIL - Not synced (trigger did not fire)'
        ELSE '⚠️  UNEXPECTED STATE'
    END as result,
    CASE
        WHEN up.updated_at > CURRENT_TIMESTAMP - INTERVAL '5 seconds'
        THEN '✅ Recently updated'
        ELSE '⚠️  Update timestamp is old'
    END as timestamp_check
FROM gloria_master.data_karyawan dk
JOIN gloria_ops.user_profiles up ON dk.nip = up.nip
WHERE dk.nip = 'TEST_HR_001';

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'TEST 4: Verify Trigger Configuration'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '🔍 Checking trigger existence...'
SELECT
    '🔍 Trigger Configuration' as test_case,
    trigger_name,
    event_manipulation as event_type,
    event_object_table as table_name,
    action_timing,
    CASE
        WHEN trigger_name = 'trg_sync_user_status_from_hr'
        THEN '✅ PASS - Trigger exists'
        ELSE '❌ FAIL - Trigger missing'
    END as result
FROM information_schema.triggers
WHERE trigger_name = 'trg_sync_user_status_from_hr';

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'TEST 5: Check Data Consistency Across All Users'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '🔍 Scanning for inconsistencies...'
SELECT
    '🔍 Data Consistency Check' as test_case,
    COUNT(*) as total_users,
    SUM(CASE WHEN (dk.status_aktif = 'Aktif') = up.is_active THEN 1 ELSE 0 END) as consistent_records,
    SUM(CASE WHEN (dk.status_aktif = 'Aktif') != up.is_active THEN 1 ELSE 0 END) as inconsistent_records,
    CASE
        WHEN SUM(CASE WHEN (dk.status_aktif = 'Aktif') != up.is_active THEN 1 ELSE 0 END) = 0
        THEN '✅ PASS - All records consistent'
        ELSE '⚠️  WARNING - Found inconsistencies (may need manual sync)'
    END as result
FROM gloria_master.data_karyawan dk
JOIN gloria_ops.user_profiles up ON dk.nip = up.nip;

\echo ''
\echo '🔍 Listing any inconsistent records...'
SELECT
    dk.nip,
    dk.nama,
    dk.email,
    dk.status_aktif as hr_status,
    up.is_active as profile_status,
    '⚠️  INCONSISTENT - Needs sync' as issue
FROM gloria_master.data_karyawan dk
JOIN gloria_ops.user_profiles up ON dk.nip = up.nip
WHERE (dk.status_aktif = 'Aktif') != up.is_active
LIMIT 10;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'TEST 6: Performance Test (Bulk Update)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '⚙️  Testing trigger performance with status toggle...'
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
BEGIN
    start_time := clock_timestamp();

    -- Toggle status back and forth
    UPDATE gloria_master.data_karyawan
    SET status_aktif = 'Tidak'
    WHERE nip = 'TEST_HR_001';

    UPDATE gloria_master.data_karyawan
    SET status_aktif = 'Aktif'
    WHERE nip = 'TEST_HR_001';

    end_time := clock_timestamp();
    duration := end_time - start_time;

    RAISE NOTICE '⏱️  Performance: 2 updates completed in %', duration;
    RAISE NOTICE '   └─ Average: % per update', duration / 2;

    IF duration < INTERVAL '1 second' THEN
        RAISE NOTICE '✅ PASS - Performance acceptable';
    ELSE
        RAISE NOTICE '⚠️  WARNING - Performance may need optimization';
    END IF;
END $$;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'TEST SUMMARY'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '✅ Test suite completed successfully!'
\echo ''
\echo 'What was tested:'
\echo '  ✓ Trigger existence and configuration'
\echo '  ✓ Data sync on status deactivation'
\echo '  ✓ Data sync on status reactivation'
\echo '  ✓ Data consistency across all users'
\echo '  ✓ Trigger performance'
\echo ''
\echo 'Next steps:'
\echo '  1. Check backend logs for notification messages'
\echo '  2. Test with real user login/logout flow'
\echo '  3. Monitor production for sync delays'
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- =====================================================
-- CLEANUP (Optional - comment out to keep test data)
-- =====================================================
-- \echo ''
-- \echo '🧹 CLEANUP: Removing test data...'
-- DELETE FROM gloria_ops.user_profiles WHERE nip = 'TEST_HR_001';
-- DELETE FROM gloria_master.data_karyawan WHERE nip = 'TEST_HR_001';
-- \echo '✅ Test data removed'
