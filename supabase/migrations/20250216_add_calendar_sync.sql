-- Session 15 Checkpoint 2: Google Calendar Integration (Two-Way Sync)
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. ENUMS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_provider') THEN
    CREATE TYPE calendar_provider AS ENUM ('google', 'outlook');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_sync_status') THEN
    CREATE TYPE calendar_sync_status AS ENUM ('active', 'error', 'disconnected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_direction') THEN
    CREATE TYPE sync_direction AS ENUM ('to_external', 'from_external', 'bidirectional');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_sync_status') THEN
    CREATE TYPE event_sync_status AS ENUM ('synced', 'pending', 'error', 'deleted');
  END IF;
END $$;

-- ============================================
-- 2. CALENDAR CONNECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  provider calendar_provider NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT,
  calendar_name TEXT,
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  sync_status calendar_sync_status DEFAULT 'active',
  error_message TEXT,
  settings JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_sync ON calendar_connections(sync_enabled, sync_status);

-- ============================================
-- 3. OAUTH STATE TABLE (for CSRF protection)
-- ============================================
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  provider calendar_provider NOT NULL DEFAULT 'google',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);

-- ============================================
-- 4. SYNCED EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS synced_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unbind_event_id UUID NOT NULL REFERENCES case_events(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  provider calendar_provider NOT NULL DEFAULT 'google',
  sync_direction sync_direction NOT NULL DEFAULT 'to_external',
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_status event_sync_status DEFAULT 'synced',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_synced_event UNIQUE (unbind_event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_synced_events_user ON synced_events(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_unbind ON synced_events(unbind_event_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_external ON synced_events(external_event_id);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- Calendar Connections RLS
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar connections"
  ON calendar_connections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own calendar connections"
  ON calendar_connections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own calendar connections"
  ON calendar_connections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own calendar connections"
  ON calendar_connections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- OAuth States RLS
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own oauth states"
  ON oauth_states FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Synced Events RLS
ALTER TABLE synced_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own synced events"
  ON synced_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own synced events"
  ON synced_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own synced events"
  ON synced_events FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own synced events"
  ON synced_events FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS trigger_calendar_connections_updated_at ON calendar_connections;
CREATE TRIGGER trigger_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
