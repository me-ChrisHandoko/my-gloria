-- Migration script for feature_flags table
-- This script creates the feature_flags table in gloria_ops schema

-- Create the feature_flags table if it doesn't exist
CREATE TABLE IF NOT EXISTS gloria_ops.feature_flags (
    id TEXT PRIMARY KEY DEFAULT (replace(gen_random_uuid()::text, '-', '')),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT false,
    allowed_groups JSONB,
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_name_enabled 
    ON gloria_ops.feature_flags (name, enabled);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION gloria_ops.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feature_flags_updated_at 
    BEFORE UPDATE ON gloria_ops.feature_flags 
    FOR EACH ROW 
    EXECUTE FUNCTION gloria_ops.update_updated_at_column();

-- Insert some default feature flags (optional)
INSERT INTO gloria_ops.feature_flags (name, description, enabled, rollout_percentage)
VALUES 
    ('darkMode', 'Enable dark mode UI', false, 100),
    ('betaFeatures', 'Enable beta features for testing', false, 10),
    ('maintenanceMode', 'System maintenance mode', false, 100)
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON gloria_ops.feature_flags TO your_app_user;