-- =====================================================
-- Migration: HR Status Synchronization Trigger
-- Purpose: Auto-sync user_profiles.is_active when HR updates data_karyawan.status_aktif
-- Authoritative Source: gloria_master.data_karyawan (HR data)
-- Created: 2025-01-12
-- =====================================================

-- =====================================================
-- Function: Sync user_profiles.is_active with data_karyawan.status_aktif
--
-- DATA TYPE VERIFICATION (matches GORM schema):
-- ✅ status_aktif: VARCHAR(8) nullable (*string in GORM)
-- ✅ nip: VARCHAR(15) not null (string in GORM)
-- ✅ clerk_user_id: VARCHAR(100) not null (string in GORM)
-- ✅ is_active: BOOLEAN default true (bool in GORM)
-- ✅ nama: VARCHAR(109) nullable (*string in GORM)
-- ✅ email: VARCHAR(100) nullable (*string in GORM)
--
-- NULL HANDLING BEHAVIOR:
-- ⚠️  If status_aktif IS NULL → is_active = FALSE (fail-safe: deny access)
-- ✅ If status_aktif = 'Aktif' → is_active = TRUE (grant access)
-- ✅ If status_aktif = 'Tidak' → is_active = FALSE (deny access)
-- =====================================================
CREATE OR REPLACE FUNCTION gloria_ops.sync_user_profile_status_from_hr()
RETURNS TRIGGER AS $$
DECLARE
    affected_rows INT;
    clerk_user_id_var VARCHAR(100);  -- Matches GORM: type:varchar(100)
BEGIN
    -- Only process if status_aktif changed (NULL-safe comparison)
    IF OLD.status_aktif IS DISTINCT FROM NEW.status_aktif THEN

        -- Update user_profiles.is_active based on HR data (authoritative source)
        -- NULL-safe: (NEW.status_aktif = 'Aktif') returns FALSE if NULL
        UPDATE gloria_ops.user_profiles
        SET
            is_active = (NEW.status_aktif = 'Aktif'),  -- Fail-safe: NULL → FALSE
            updated_at = CURRENT_TIMESTAMP
        WHERE nip = NEW.nip
        RETURNING clerk_user_id INTO clerk_user_id_var;

        GET DIAGNOSTICS affected_rows = ROW_COUNT;

        IF affected_rows > 0 THEN
            RAISE NOTICE '[HR Sync] ✅ Updated user_profiles for NIP %: status_aktif=% → is_active=%',
                NEW.nip,
                NEW.status_aktif,
                (NEW.status_aktif = 'Aktif');

            -- 🔔 Send notification to application for real-time cache invalidation
            -- JSON fields handle NULLs correctly (nama, email, old_status, new_status can be NULL)
            IF clerk_user_id_var IS NOT NULL THEN
                PERFORM pg_notify(
                    'hr_status_changed',
                    json_build_object(
                        'clerk_user_id', clerk_user_id_var,           -- NOT NULL (required)
                        'nip', NEW.nip,                               -- NOT NULL (required)
                        'nama', NEW.nama,                             -- Nullable: *string in GORM
                        'email', NEW.email,                           -- Nullable: *string in GORM
                        'old_status', OLD.status_aktif,               -- Nullable: *string in GORM
                        'new_status', NEW.status_aktif,               -- Nullable: *string in GORM
                        'is_active', (NEW.status_aktif = 'Aktif'),    -- BOOLEAN (NULL → FALSE)
                        'changed_at', CURRENT_TIMESTAMP,
                        'changed_by', current_user
                    )::text
                );

                RAISE NOTICE '[HR Sync] 🔔 Notification sent for clerk_user_id: % (instant cache invalidation)', clerk_user_id_var;
            ELSE
                RAISE NOTICE '[HR Sync] ⚠️  No clerk_user_id found for NIP % (user not yet registered)', NEW.nip;
            END IF;
        ELSE
            RAISE NOTICE '[HR Sync] ℹ️  No user_profiles record found for NIP % (no action needed)', NEW.nip;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Trigger: Auto-sync on status_aktif changes
-- =====================================================
DROP TRIGGER IF EXISTS trg_sync_user_status_from_hr ON gloria_master.data_karyawan;

CREATE TRIGGER trg_sync_user_status_from_hr
    AFTER UPDATE OF status_aktif ON gloria_master.data_karyawan
    FOR EACH ROW
    EXECUTE FUNCTION gloria_ops.sync_user_profile_status_from_hr();

-- =====================================================
-- Documentation Comments
-- =====================================================
COMMENT ON FUNCTION gloria_ops.sync_user_profile_status_from_hr() IS
'Automatically syncs user_profiles.is_active when HR updates data_karyawan.status_aktif.
Ensures data consistency across tables with HR data as authoritative source.
Also sends pg_notify for real-time cache invalidation in application layer.
Created: 2025-01-12';

COMMENT ON TRIGGER trg_sync_user_status_from_hr ON gloria_master.data_karyawan IS
'Maintains user access control based on HR employee status changes.
Triggers on UPDATE of status_aktif column only for performance.
Sends notification to application for instant cache invalidation.';

-- =====================================================
-- Grant necessary permissions (adjust as needed)
-- =====================================================
-- GRANT EXECUTE ON FUNCTION gloria_ops.sync_user_profile_status_from_hr() TO your_app_user;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify trigger was created successfully:
-- SELECT
--     trigger_name,
--     event_manipulation,
--     event_object_table,
--     action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'trg_sync_user_status_from_hr';

-- =====================================================
-- Initial Data Sync (Run Once After Trigger Creation)
--
-- Purpose: Syncs existing user_profiles with HR data to ensure consistency
-- NULL Handling: (dk.status_aktif = 'Aktif') returns FALSE if NULL (fail-safe)
-- =====================================================
DO $$
DECLARE
    sync_count INT;
BEGIN
    -- Sync all existing user profiles with HR authoritative status
    -- NULL-safe: If status_aktif IS NULL, user becomes inactive (fail-safe)
    UPDATE gloria_ops.user_profiles up
    SET
        is_active = (dk.status_aktif = 'Aktif'),  -- NULL → FALSE, 'Aktif' → TRUE, others → FALSE
        updated_at = CURRENT_TIMESTAMP
    FROM gloria_master.data_karyawan dk
    WHERE up.nip = dk.nip
    AND up.is_active != (dk.status_aktif = 'Aktif');  -- Only update mismatched records

    GET DIAGNOSTICS sync_count = ROW_COUNT;

    RAISE NOTICE '[Initial Sync] ✅ Synced % user_profiles records with HR data', sync_count;
END $$;
