-- CreateTable for System Configuration
CREATE TABLE IF NOT EXISTS gloria_ops.system_configs (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "key" VARCHAR(255) NOT NULL UNIQUE,
    "value" JSONB NOT NULL,
    "category" VARCHAR(50),
    "description" TEXT,
    "is_encrypted" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(255),
    "updated_by" VARCHAR(255)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON gloria_ops.system_configs(key);
CREATE INDEX IF NOT EXISTS idx_system_configs_category ON gloria_ops.system_configs(category);
CREATE INDEX IF NOT EXISTS idx_system_configs_updated_at ON gloria_ops.system_configs(updated_at DESC);

-- Insert default configurations
INSERT INTO gloria_ops.system_configs (key, value, category, description) VALUES
('system:feature_flags', '[]', 'feature', 'Feature flags configuration'),
('system:maintenance_mode', '{"enabled": false}', 'maintenance', 'Maintenance mode configuration'),
('system:backups', '[]', 'backup', 'Backup records')
ON CONFLICT (key) DO NOTHING;

-- Add comments
COMMENT ON TABLE gloria_ops.system_configs IS 'System configuration storage for feature flags, maintenance mode, and other settings';
COMMENT ON COLUMN gloria_ops.system_configs.key IS 'Unique configuration key';
COMMENT ON COLUMN gloria_ops.system_configs.value IS 'Configuration value stored as JSONB';
COMMENT ON COLUMN gloria_ops.system_configs.category IS 'Configuration category for grouping';
COMMENT ON COLUMN gloria_ops.system_configs.is_encrypted IS 'Whether the value is encrypted';