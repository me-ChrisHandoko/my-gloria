-- Create schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS gloria_master;
CREATE SCHEMA IF NOT EXISTS gloria_ops;

-- Check if modules table exists, if not skip the alter
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'gloria_ops' 
        AND table_name = 'modules'
    ) THEN
        -- Add soft delete columns to modules table if they don't exist
        ALTER TABLE gloria_ops.modules 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS delete_reason TEXT;

        -- Create index on deleted_at if it doesn't exist
        CREATE INDEX IF NOT EXISTS "modules_deleted_at_idx" ON gloria_ops.modules(deleted_at);
    END IF;
END $$;