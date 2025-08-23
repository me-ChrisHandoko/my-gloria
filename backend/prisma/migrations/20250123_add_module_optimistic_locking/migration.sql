-- Add version field to modules table for optimistic locking
ALTER TABLE "gloria_ops"."modules" 
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

-- Add version field to role_module_access table for optimistic locking
ALTER TABLE "gloria_ops"."role_module_access" 
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

-- Add version field to user_module_access table for optimistic locking
ALTER TABLE "gloria_ops"."user_module_access" 
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

-- Add version field to user_overrides table for optimistic locking
ALTER TABLE "gloria_ops"."user_overrides" 
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

-- Create indexes for optimistic locking queries
CREATE INDEX IF NOT EXISTS "modules_id_version_idx" 
ON "gloria_ops"."modules" ("id", "version");

CREATE INDEX IF NOT EXISTS "role_module_access_id_version_idx" 
ON "gloria_ops"."role_module_access" ("id", "version");

CREATE INDEX IF NOT EXISTS "user_module_access_id_version_idx" 
ON "gloria_ops"."user_module_access" ("id", "version");

CREATE INDEX IF NOT EXISTS "user_overrides_id_version_idx" 
ON "gloria_ops"."user_overrides" ("id", "version");

-- Add comments for documentation
COMMENT ON COLUMN "gloria_ops"."modules"."version" 
IS 'Version number for optimistic locking to prevent concurrent update conflicts';

COMMENT ON COLUMN "gloria_ops"."role_module_access"."version" 
IS 'Version number for optimistic locking to prevent concurrent update conflicts';

COMMENT ON COLUMN "gloria_ops"."user_module_access"."version" 
IS 'Version number for optimistic locking to prevent concurrent update conflicts';

COMMENT ON COLUMN "gloria_ops"."user_overrides"."version" 
IS 'Version number for optimistic locking to prevent concurrent update conflicts';