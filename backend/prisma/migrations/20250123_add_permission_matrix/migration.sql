-- Create permission matrix table for pre-computed permissions
CREATE TABLE IF NOT EXISTS gloria_ops.permission_matrix (
  id TEXT PRIMARY KEY,
  user_profile_id TEXT NOT NULL,
  permission_key TEXT NOT NULL, -- Format: "resource:action:scope"
  is_allowed BOOLEAN NOT NULL DEFAULT false,
  granted_by TEXT[], -- Array of sources: role names, "direct", "resource-specific"
  computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  priority INT NOT NULL DEFAULT 0, -- For resolving conflicts
  metadata JSONB, -- Additional context
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_permission_matrix_user 
    FOREIGN KEY (user_profile_id) 
    REFERENCES gloria_ops.user_profiles(id) 
    ON DELETE CASCADE
);

-- Create unique constraint for user-permission combination
CREATE UNIQUE INDEX idx_permission_matrix_user_key 
ON gloria_ops.permission_matrix(user_profile_id, permission_key);

-- Create indexes for efficient lookups
CREATE INDEX idx_permission_matrix_user_allowed 
ON gloria_ops.permission_matrix(user_profile_id, is_allowed) 
WHERE is_allowed = true;

CREATE INDEX idx_permission_matrix_expires 
ON gloria_ops.permission_matrix(expires_at);

CREATE INDEX idx_permission_matrix_computed 
ON gloria_ops.permission_matrix(computed_at DESC);

-- Create a table to track active users for permission matrix computation
CREATE TABLE IF NOT EXISTS gloria_ops.active_user_tracking (
  id TEXT PRIMARY KEY,
  user_profile_id TEXT NOT NULL UNIQUE,
  last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  permission_check_count INT NOT NULL DEFAULT 0,
  last_permission_check_at TIMESTAMP,
  is_high_priority BOOLEAN NOT NULL DEFAULT false, -- Users with frequent permission checks
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_active_user_tracking_user 
    FOREIGN KEY (user_profile_id) 
    REFERENCES gloria_ops.user_profiles(id) 
    ON DELETE CASCADE
);

-- Create indexes for active user tracking
CREATE INDEX idx_active_user_tracking_last_active 
ON gloria_ops.active_user_tracking(last_active_at DESC);

CREATE INDEX idx_active_user_tracking_priority 
ON gloria_ops.active_user_tracking(is_high_priority, last_active_at DESC) 
WHERE is_high_priority = true;

-- Add update trigger for updated_at columns
CREATE OR REPLACE FUNCTION gloria_ops.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permission_matrix_updated_at 
BEFORE UPDATE ON gloria_ops.permission_matrix 
FOR EACH ROW EXECUTE FUNCTION gloria_ops.update_updated_at_column();

CREATE TRIGGER update_active_user_tracking_updated_at 
BEFORE UPDATE ON gloria_ops.active_user_tracking 
FOR EACH ROW EXECUTE FUNCTION gloria_ops.update_updated_at_column();