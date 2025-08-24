-- Add soft delete columns to modules table if they don't exist
ALTER TABLE gloria_ops.modules 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS delete_reason TEXT;

-- Create index on deleted_at if it doesn't exist
CREATE INDEX IF NOT EXISTS "modules_deleted_at_idx" ON gloria_ops.modules(deleted_at);