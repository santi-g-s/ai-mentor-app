-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  transcript TEXT,
  profile TEXT NOT NULL,
  duration INTEGER DEFAULT 0
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS sessions_timestamp_idx ON sessions (timestamp);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- By default, no policies means no access
-- You can add policies here once you have authentication set up
-- For example:
-- CREATE POLICY "Users can view their own sessions" ON sessions
--   FOR SELECT USING (auth.uid() = user_id); 