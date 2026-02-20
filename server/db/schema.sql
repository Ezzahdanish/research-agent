-- Deep Research Application Schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Default anonymous user
INSERT INTO users (id, email) VALUES (
  '00000000-0000-0000-0000-000000000001', 'anonymous@local'
) ON CONFLICT DO NOTHING;

-- Research sessions
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  query TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('quick','standard','deep')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  total_latency_ms INT,
  total_tokens INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Research phases (for deep mode pipeline tracking)
CREATE TABLE IF NOT EXISTS research_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  duration_ms INT,
  tokens_used INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Generated reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'
);

-- Error logs
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES research_sessions(id) ON DELETE SET NULL,
  error_message TEXT,
  error_stack TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON research_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phases_session ON research_phases(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_session ON reports(session_id);
