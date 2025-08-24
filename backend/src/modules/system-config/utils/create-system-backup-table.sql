-- Create system_backups table in gloria_ops schema
CREATE TABLE IF NOT EXISTS gloria_ops.system_backups (
    id VARCHAR(30) PRIMARY KEY DEFAULT 'clj' || substr(md5(random()::text || clock_timestamp()::text), 1, 25),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    metadata JSONB,
    error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_backups_status_created_at ON gloria_ops.system_backups(status, created_at);
CREATE INDEX IF NOT EXISTS idx_system_backups_created_by ON gloria_ops.system_backups(created_by);