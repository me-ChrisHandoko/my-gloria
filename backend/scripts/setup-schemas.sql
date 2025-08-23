-- Create schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS gloria_master;
CREATE SCHEMA IF NOT EXISTS gloria_ops;

-- Grant permissions to the database user
GRANT ALL ON SCHEMA gloria_master TO CURRENT_USER;
GRANT ALL ON SCHEMA gloria_ops TO CURRENT_USER;