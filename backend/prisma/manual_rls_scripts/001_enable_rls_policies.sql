-- =====================================================
-- PostgreSQL Row Level Security (RLS) Implementation
-- =====================================================
-- This migration enables database-level row security policies
-- for the Gloria system tables. It works in conjunction with
-- the application-level RowLevelSecurityService.
--
-- Author: System
-- Date: 2025
-- =====================================================

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS gloria_ops;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get current user context from session
CREATE OR REPLACE FUNCTION gloria_ops.current_user_context() 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    context_json text;
BEGIN
    -- Get context from session variable
    context_json := current_setting('app.user_context', true);
    
    -- Return empty object if no context
    IF context_json IS NULL OR context_json = '' THEN
        RETURN '{}'::jsonb;
    END IF;
    
    RETURN context_json::jsonb;
EXCEPTION
    WHEN OTHERS THEN
        -- Return empty object on any error
        RETURN '{}'::jsonb;
END;
$$;

-- Function to check if user is superadmin
CREATE OR REPLACE FUNCTION gloria_ops.is_superadmin() 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN COALESCE((gloria_ops.current_user_context()->>'isSuperadmin')::boolean, false);
END;
$$;

-- Function to get user's school IDs
CREATE OR REPLACE FUNCTION gloria_ops.user_school_ids() 
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    school_ids jsonb;
BEGIN
    school_ids := gloria_ops.current_user_context()->'schoolIds';
    
    IF school_ids IS NULL OR jsonb_typeof(school_ids) != 'array' THEN
        RETURN ARRAY[]::text[];
    END IF;
    
    RETURN ARRAY(SELECT jsonb_array_elements_text(school_ids));
END;
$$;

-- Function to get user's department IDs
CREATE OR REPLACE FUNCTION gloria_ops.user_department_ids() 
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    dept_ids jsonb;
BEGIN
    dept_ids := gloria_ops.current_user_context()->'departmentIds';
    
    IF dept_ids IS NULL OR jsonb_typeof(dept_ids) != 'array' THEN
        RETURN ARRAY[]::text[];
    END IF;
    
    RETURN ARRAY(SELECT jsonb_array_elements_text(dept_ids));
END;
$$;

-- Function to get user's profile ID
CREATE OR REPLACE FUNCTION gloria_ops.current_user_profile_id() 
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN COALESCE(gloria_ops.current_user_context()->>'userProfileId', '');
END;
$$;

-- Function to get permission scope for a module/action
CREATE OR REPLACE FUNCTION gloria_ops.get_permission_scope(
    p_module text,
    p_action text
) 
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    scopes jsonb;
    scope_key text;
    scope text;
BEGIN
    -- Build the scope key
    scope_key := p_module || ':' || p_action;
    
    -- Get permission scopes from context
    scopes := gloria_ops.current_user_context()->'permissionScopes';
    
    IF scopes IS NULL THEN
        RETURN 'OWN';
    END IF;
    
    -- Get scope for this module:action
    scope := scopes->>scope_key;
    
    RETURN COALESCE(scope, 'OWN');
END;
$$;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on core tables
ALTER TABLE gloria_ops.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE gloria_ops.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gloria_ops.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gloria_ops.user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gloria_ops.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gloria_ops.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gloria_ops.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE gloria_ops.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SCHOOL POLICIES
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS school_select_policy ON gloria_ops.schools;
DROP POLICY IF EXISTS school_insert_policy ON gloria_ops.schools;
DROP POLICY IF EXISTS school_update_policy ON gloria_ops.schools;
DROP POLICY IF EXISTS school_delete_policy ON gloria_ops.schools;

-- SELECT: Users can see schools based on their scope
CREATE POLICY school_select_policy ON gloria_ops.schools
    FOR SELECT
    USING (
        gloria_ops.is_superadmin() 
        OR 
        id = ANY(gloria_ops.user_school_ids())
        OR
        gloria_ops.get_permission_scope('organization', 'read') = 'ALL'
    );

-- INSERT: Only superadmins or users with ALL scope can create schools
CREATE POLICY school_insert_policy ON gloria_ops.schools
    FOR INSERT
    WITH CHECK (
        gloria_ops.is_superadmin() 
        OR 
        gloria_ops.get_permission_scope('organization', 'create') = 'ALL'
    );

-- UPDATE: Users can update their schools or with proper scope
CREATE POLICY school_update_policy ON gloria_ops.schools
    FOR UPDATE
    USING (
        gloria_ops.is_superadmin() 
        OR 
        (
            id = ANY(gloria_ops.user_school_ids())
            AND gloria_ops.get_permission_scope('organization', 'update') IN ('SCHOOL', 'ALL')
        )
    );

-- DELETE: Only superadmins can delete schools
CREATE POLICY school_delete_policy ON gloria_ops.schools
    FOR DELETE
    USING (
        gloria_ops.is_superadmin()
        OR
        gloria_ops.get_permission_scope('organization', 'delete') = 'ALL'
    );

-- =====================================================
-- DEPARTMENT POLICIES
-- =====================================================

DROP POLICY IF EXISTS department_select_policy ON gloria_ops.departments;
DROP POLICY IF EXISTS department_insert_policy ON gloria_ops.departments;
DROP POLICY IF EXISTS department_update_policy ON gloria_ops.departments;
DROP POLICY IF EXISTS department_delete_policy ON gloria_ops.departments;

-- SELECT: Users can see departments based on scope
CREATE POLICY department_select_policy ON gloria_ops.departments
    FOR SELECT
    USING (
        gloria_ops.is_superadmin()
        OR
        id = ANY(gloria_ops.user_department_ids())
        OR
        school_id = ANY(gloria_ops.user_school_ids())
        OR
        gloria_ops.get_permission_scope('organization', 'read') IN ('SCHOOL', 'ALL')
    );

-- INSERT: Users can create departments in their schools
CREATE POLICY department_insert_policy ON gloria_ops.departments
    FOR INSERT
    WITH CHECK (
        gloria_ops.is_superadmin()
        OR
        (
            school_id = ANY(gloria_ops.user_school_ids())
            AND gloria_ops.get_permission_scope('organization', 'create') IN ('SCHOOL', 'ALL')
        )
    );

-- UPDATE: Users can update their departments
CREATE POLICY department_update_policy ON gloria_ops.departments
    FOR UPDATE
    USING (
        gloria_ops.is_superadmin()
        OR
        (
            id = ANY(gloria_ops.user_department_ids())
            AND gloria_ops.get_permission_scope('organization', 'update') IN ('DEPARTMENT', 'SCHOOL', 'ALL')
        )
    );

-- DELETE: Restricted to superadmins and school admins
CREATE POLICY department_delete_policy ON gloria_ops.departments
    FOR DELETE
    USING (
        gloria_ops.is_superadmin()
        OR
        (
            school_id = ANY(gloria_ops.user_school_ids())
            AND gloria_ops.get_permission_scope('organization', 'delete') IN ('SCHOOL', 'ALL')
        )
    );

-- =====================================================
-- POSITION POLICIES
-- =====================================================

DROP POLICY IF EXISTS position_select_policy ON gloria_ops.positions;
DROP POLICY IF EXISTS position_insert_policy ON gloria_ops.positions;
DROP POLICY IF EXISTS position_update_policy ON gloria_ops.positions;
DROP POLICY IF EXISTS position_delete_policy ON gloria_ops.positions;

-- SELECT: Users can see positions based on scope
CREATE POLICY position_select_policy ON gloria_ops.positions
    FOR SELECT
    USING (
        gloria_ops.is_superadmin()
        OR
        department_id = ANY(gloria_ops.user_department_ids())
        OR
        school_id = ANY(gloria_ops.user_school_ids())
        OR
        gloria_ops.get_permission_scope('organization', 'read') IN ('SCHOOL', 'ALL')
    );

-- INSERT: Department heads and above can create positions
CREATE POLICY position_insert_policy ON gloria_ops.positions
    FOR INSERT
    WITH CHECK (
        gloria_ops.is_superadmin()
        OR
        (
            department_id = ANY(gloria_ops.user_department_ids())
            AND gloria_ops.get_permission_scope('organization', 'create') IN ('DEPARTMENT', 'SCHOOL', 'ALL')
        )
    );

-- UPDATE: Department heads can update positions
CREATE POLICY position_update_policy ON gloria_ops.positions
    FOR UPDATE
    USING (
        gloria_ops.is_superadmin()
        OR
        (
            department_id = ANY(gloria_ops.user_department_ids())
            AND gloria_ops.get_permission_scope('organization', 'update') IN ('DEPARTMENT', 'SCHOOL', 'ALL')
        )
    );

-- DELETE: Restricted to higher levels
CREATE POLICY position_delete_policy ON gloria_ops.positions
    FOR DELETE
    USING (
        gloria_ops.is_superadmin()
        OR
        gloria_ops.get_permission_scope('organization', 'delete') IN ('SCHOOL', 'ALL')
    );

-- =====================================================
-- USER POSITION POLICIES
-- =====================================================

DROP POLICY IF EXISTS user_position_select_policy ON gloria_ops.user_positions;
DROP POLICY IF EXISTS user_position_insert_policy ON gloria_ops.user_positions;
DROP POLICY IF EXISTS user_position_update_policy ON gloria_ops.user_positions;

-- SELECT: Users can see positions based on scope
CREATE POLICY user_position_select_policy ON gloria_ops.user_positions
    FOR SELECT
    USING (
        gloria_ops.is_superadmin()
        OR
        user_profile_id = gloria_ops.current_user_profile_id()
        OR
        CASE gloria_ops.get_permission_scope('organization', 'read')
            WHEN 'ALL' THEN true
            WHEN 'SCHOOL' THEN EXISTS (
                SELECT 1 FROM gloria_ops.positions p
                WHERE p.id = position_id
                AND p.school_id = ANY(gloria_ops.user_school_ids())
            )
            WHEN 'DEPARTMENT' THEN EXISTS (
                SELECT 1 FROM gloria_ops.positions p
                WHERE p.id = position_id
                AND p.department_id = ANY(gloria_ops.user_department_ids())
            )
            ELSE false
        END
    );

-- INSERT: HR and above can assign positions
CREATE POLICY user_position_insert_policy ON gloria_ops.user_positions
    FOR INSERT
    WITH CHECK (
        gloria_ops.is_superadmin()
        OR
        gloria_ops.get_permission_scope('organization', 'assign') IN ('DEPARTMENT', 'SCHOOL', 'ALL')
    );

-- UPDATE: HR and above can update positions
CREATE POLICY user_position_update_policy ON gloria_ops.user_positions
    FOR UPDATE
    USING (
        gloria_ops.is_superadmin()
        OR
        gloria_ops.get_permission_scope('organization', 'update') IN ('DEPARTMENT', 'SCHOOL', 'ALL')
    );

-- =====================================================
-- USER PROFILE POLICIES
-- =====================================================

DROP POLICY IF EXISTS user_profile_select_policy ON gloria_ops.user_profiles;
DROP POLICY IF EXISTS user_profile_update_policy ON gloria_ops.user_profiles;

-- SELECT: Users can see profiles based on scope
CREATE POLICY user_profile_select_policy ON gloria_ops.user_profiles
    FOR SELECT
    USING (
        gloria_ops.is_superadmin()
        OR
        id = gloria_ops.current_user_profile_id()
        OR
        CASE gloria_ops.get_permission_scope('users', 'read')
            WHEN 'ALL' THEN true
            WHEN 'SCHOOL' THEN EXISTS (
                SELECT 1 FROM gloria_ops.user_positions up
                JOIN gloria_ops.positions p ON up.position_id = p.id
                WHERE up.user_profile_id = user_profiles.id
                AND p.school_id = ANY(gloria_ops.user_school_ids())
            )
            WHEN 'DEPARTMENT' THEN EXISTS (
                SELECT 1 FROM gloria_ops.user_positions up
                JOIN gloria_ops.positions p ON up.position_id = p.id
                WHERE up.user_profile_id = user_profiles.id
                AND p.department_id = ANY(gloria_ops.user_department_ids())
            )
            ELSE false
        END
    );

-- UPDATE: Users can update own profile, HR can update others
CREATE POLICY user_profile_update_policy ON gloria_ops.user_profiles
    FOR UPDATE
    USING (
        gloria_ops.is_superadmin()
        OR
        id = gloria_ops.current_user_profile_id()
        OR
        gloria_ops.get_permission_scope('users', 'update') IN ('DEPARTMENT', 'SCHOOL', 'ALL')
    );

-- =====================================================
-- REQUEST POLICIES
-- =====================================================

DROP POLICY IF EXISTS request_select_policy ON gloria_ops.requests;
DROP POLICY IF EXISTS request_insert_policy ON gloria_ops.requests;
DROP POLICY IF EXISTS request_update_policy ON gloria_ops.requests;

-- SELECT: Users can see requests based on scope
CREATE POLICY request_select_policy ON gloria_ops.requests
    FOR SELECT
    USING (
        gloria_ops.is_superadmin()
        OR
        requester_profile_id = gloria_ops.current_user_profile_id()
        OR
        EXISTS (
            SELECT 1 FROM gloria_ops.approval_steps
            WHERE request_id = requests.id
            AND approver_profile_id = gloria_ops.current_user_profile_id()
        )
        OR
        CASE gloria_ops.get_permission_scope(module, 'read')
            WHEN 'ALL' THEN true
            WHEN 'SCHOOL' THEN EXISTS (
                SELECT 1 FROM gloria_ops.user_profiles up
                JOIN gloria_ops.user_positions upos ON up.id = upos.user_profile_id
                JOIN gloria_ops.positions p ON upos.position_id = p.id
                WHERE up.id = requester_profile_id
                AND p.school_id = ANY(gloria_ops.user_school_ids())
            )
            WHEN 'DEPARTMENT' THEN EXISTS (
                SELECT 1 FROM gloria_ops.user_profiles up
                JOIN gloria_ops.user_positions upos ON up.id = upos.user_profile_id
                JOIN gloria_ops.positions p ON upos.position_id = p.id
                WHERE up.id = requester_profile_id
                AND p.department_id = ANY(gloria_ops.user_department_ids())
            )
            ELSE false
        END
    );

-- INSERT: Users can create their own requests
CREATE POLICY request_insert_policy ON gloria_ops.requests
    FOR INSERT
    WITH CHECK (
        requester_profile_id = gloria_ops.current_user_profile_id()
        OR
        gloria_ops.is_superadmin()
    );

-- UPDATE: Users can update their own requests or if they're approvers
CREATE POLICY request_update_policy ON gloria_ops.requests
    FOR UPDATE
    USING (
        gloria_ops.is_superadmin()
        OR
        requester_profile_id = gloria_ops.current_user_profile_id()
        OR
        EXISTS (
            SELECT 1 FROM gloria_ops.approval_steps
            WHERE request_id = requests.id
            AND approver_profile_id = gloria_ops.current_user_profile_id()
            AND status = 'PENDING'
        )
    );

-- =====================================================
-- NOTIFICATION POLICIES
-- =====================================================

DROP POLICY IF EXISTS notification_select_policy ON gloria_ops.notifications;
DROP POLICY IF EXISTS notification_update_policy ON gloria_ops.notifications;

-- SELECT: Users can only see their own notifications
CREATE POLICY notification_select_policy ON gloria_ops.notifications
    FOR SELECT
    USING (
        user_profile_id = gloria_ops.current_user_profile_id()
        OR
        gloria_ops.is_superadmin()
    );

-- UPDATE: Users can only update their own notifications (mark as read)
CREATE POLICY notification_update_policy ON gloria_ops.notifications
    FOR UPDATE
    USING (
        user_profile_id = gloria_ops.current_user_profile_id()
    );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Create application role if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gloria_app') THEN
        CREATE ROLE gloria_app;
    END IF;
END$$;

-- Grant usage on schema
GRANT USAGE ON SCHEMA gloria_ops TO gloria_app;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA gloria_ops TO gloria_app;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA gloria_ops TO gloria_app;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION gloria_ops.current_user_context() TO gloria_app;
GRANT EXECUTE ON FUNCTION gloria_ops.is_superadmin() TO gloria_app;
GRANT EXECUTE ON FUNCTION gloria_ops.user_school_ids() TO gloria_app;
GRANT EXECUTE ON FUNCTION gloria_ops.user_department_ids() TO gloria_app;
GRANT EXECUTE ON FUNCTION gloria_ops.current_user_profile_id() TO gloria_app;
GRANT EXECUTE ON FUNCTION gloria_ops.get_permission_scope(text, text) TO gloria_app;

-- =====================================================
-- PERFORMANCE INDEXES FOR RLS
-- =====================================================

-- Add indexes to improve RLS query performance
CREATE INDEX IF NOT EXISTS idx_user_positions_user_profile_active 
    ON gloria_ops.user_positions(user_profile_id, is_active);

CREATE INDEX IF NOT EXISTS idx_positions_school_dept 
    ON gloria_ops.positions(school_id, department_id);

CREATE INDEX IF NOT EXISTS idx_departments_school 
    ON gloria_ops.departments(school_id);

CREATE INDEX IF NOT EXISTS idx_requests_requester 
    ON gloria_ops.requests(requester_profile_id);

CREATE INDEX IF NOT EXISTS idx_approval_steps_approver 
    ON gloria_ops.approval_steps(approver_profile_id, status);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION gloria_ops.current_user_context() IS 
    'Returns the current user context from session variables for RLS policies';

COMMENT ON FUNCTION gloria_ops.is_superadmin() IS 
    'Checks if the current user is a superadmin';

COMMENT ON FUNCTION gloria_ops.user_school_ids() IS 
    'Returns array of school IDs the current user has access to';

COMMENT ON FUNCTION gloria_ops.user_department_ids() IS 
    'Returns array of department IDs the current user has access to';

COMMENT ON FUNCTION gloria_ops.current_user_profile_id() IS 
    'Returns the current user profile ID';

COMMENT ON FUNCTION gloria_ops.get_permission_scope(text, text) IS 
    'Returns the permission scope for a given module and action';