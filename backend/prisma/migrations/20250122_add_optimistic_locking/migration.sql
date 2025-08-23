-- Add version field to requests table for optimistic locking
ALTER TABLE "gloria_ops"."requests" 
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

-- Add version field to approval_steps table for optimistic locking
ALTER TABLE "gloria_ops"."approval_steps" 
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

-- Create indexes for optimistic locking queries
CREATE INDEX IF NOT EXISTS "requests_id_version_idx" 
ON "gloria_ops"."requests" ("id", "version");

CREATE INDEX IF NOT EXISTS "approval_steps_id_version_idx" 
ON "gloria_ops"."approval_steps" ("id", "version");

-- Add comment for documentation
COMMENT ON COLUMN "gloria_ops"."requests"."version" 
IS 'Version number for optimistic locking to prevent concurrent update conflicts';

COMMENT ON COLUMN "gloria_ops"."approval_steps"."version" 
IS 'Version number for optimistic locking to prevent concurrent update conflicts';