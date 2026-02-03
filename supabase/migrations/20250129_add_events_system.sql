-- Session 7: Case Timeline & Deadline Management System
-- Checkpoint 1: Event Management Infrastructure
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. EVENT TYPE ENUM
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
    CREATE TYPE event_type AS ENUM (
      'court_date',
      'filing_deadline',
      'milestone',
      'task',
      'meeting',
      'waiting_period',
      'other'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE event_status AS ENUM (
      'upcoming',
      'completed',
      'cancelled'
    );
  END IF;
END $$;

-- ============================================
-- 2. CASE_EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Event details
  event_type event_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,

  -- Date/time
  event_date TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,

  -- Assignment
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Status tracking
  status event_status DEFAULT 'upcoming',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Audit fields
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_case_events_case ON case_events(case_id);
CREATE INDEX IF NOT EXISTS idx_case_events_date ON case_events(event_date);
CREATE INDEX IF NOT EXISTS idx_case_events_status ON case_events(status);
CREATE INDEX IF NOT EXISTS idx_case_events_assigned ON case_events(assigned_to);
CREATE INDEX IF NOT EXISTS idx_case_events_case_date ON case_events(case_id, event_date);
CREATE INDEX IF NOT EXISTS idx_case_events_upcoming ON case_events(status, event_date) WHERE status = 'upcoming';

-- ============================================
-- 3. STATE_DEADLINES LOOKUP TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS state_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code VARCHAR(2) NOT NULL,
  event_type TEXT NOT NULL,
  next_event_type TEXT NOT NULL,
  deadline_days INTEGER NOT NULL,
  is_working_days BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for state + event combination
  CONSTRAINT unique_state_event UNIQUE (state_code, event_type, next_event_type)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_state_deadlines_state ON state_deadlines(state_code);
CREATE INDEX IF NOT EXISTS idx_state_deadlines_event ON state_deadlines(event_type);

-- ============================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_deadlines ENABLE ROW LEVEL SECURITY;

-- Case Events: Users can only see events from their cases
CREATE POLICY "Users can view events in their cases"
  ON case_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_events.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Case Events: Users can create events in their cases
CREATE POLICY "Users can create events in their cases"
  ON case_events FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Case Events: Anyone in case can update event (status, details)
CREATE POLICY "Users can update events in their cases"
  ON case_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_events.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Case Events: Only creator can delete (soft delete via status)
CREATE POLICY "Only creator can delete events"
  ON case_events FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- State Deadlines: Anyone authenticated can read (lookup table)
CREATE POLICY "Anyone can view state deadlines"
  ON state_deadlines FOR SELECT
  TO authenticated
  USING (true);

-- State Deadlines: Only admins can modify (managed by system)
CREATE POLICY "Only admins can modify state deadlines"
  ON state_deadlines FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 5. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_case_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_case_events_updated_at ON case_events;
CREATE TRIGGER trigger_case_events_updated_at
  BEFORE UPDATE ON case_events
  FOR EACH ROW
  EXECUTE FUNCTION update_case_events_updated_at();

-- ============================================
-- 6. SEED STATE DEADLINES DATA
-- ============================================

-- California (CA)
INSERT INTO state_deadlines (state_code, event_type, next_event_type, deadline_days, is_working_days, description)
VALUES
  ('CA', 'petition_filed', 'response_due', 30, FALSE, 'Response to petition due within 30 calendar days of service'),
  ('CA', 'petition_filed', 'waiting_period_end', 183, FALSE, 'California 6-month waiting period (183 days) before divorce can be finalized'),
  ('CA', 'response_filed', 'discovery_due', 60, FALSE, 'Discovery typically due 60 days after response'),
  ('CA', 'trial_date_set', 'trial_brief_due', 5, TRUE, 'Trial brief due 5 court days before trial')
ON CONFLICT (state_code, event_type, next_event_type) DO NOTHING;

-- Texas (TX)
INSERT INTO state_deadlines (state_code, event_type, next_event_type, deadline_days, is_working_days, description)
VALUES
  ('TX', 'petition_filed', 'response_due', 20, FALSE, 'Response due 20 days after service (Monday following 20th day)'),
  ('TX', 'petition_filed', 'waiting_period_end', 60, FALSE, 'Texas 60-day waiting period before divorce can be finalized'),
  ('TX', 'response_filed', 'discovery_due', 30, FALSE, 'Initial discovery requests typically due 30 days after response'),
  ('TX', 'discovery_served', 'discovery_response_due', 30, FALSE, 'Discovery responses due 30 days after service')
ON CONFLICT (state_code, event_type, next_event_type) DO NOTHING;

-- Florida (FL)
INSERT INTO state_deadlines (state_code, event_type, next_event_type, deadline_days, is_working_days, description)
VALUES
  ('FL', 'petition_filed', 'response_due', 20, FALSE, 'Response due 20 calendar days after service'),
  ('FL', 'petition_filed', 'waiting_period_end', 20, FALSE, 'Florida 20-day waiting period (can be waived)'),
  ('FL', 'response_filed', 'financial_affidavit_due', 45, FALSE, 'Financial affidavits due within 45 days'),
  ('FL', 'mediation_ordered', 'mediation_complete', 60, FALSE, 'Mediation must be completed within 60 days of order')
ON CONFLICT (state_code, event_type, next_event_type) DO NOTHING;

-- New York (NY)
INSERT INTO state_deadlines (state_code, event_type, next_event_type, deadline_days, is_working_days, description)
VALUES
  ('NY', 'petition_filed', 'response_due', 20, FALSE, 'Answer due 20 days after personal service, 30 days if served by other means'),
  ('NY', 'petition_filed', 'waiting_period_end', 0, FALSE, 'No mandatory waiting period in New York'),
  ('NY', 'note_of_issue_filed', 'trial_date', 90, FALSE, 'Trial typically scheduled within 90 days of filing note of issue')
ON CONFLICT (state_code, event_type, next_event_type) DO NOTHING;

-- Illinois (IL)
INSERT INTO state_deadlines (state_code, event_type, next_event_type, deadline_days, is_working_days, description)
VALUES
  ('IL', 'petition_filed', 'response_due', 30, FALSE, 'Response due 30 days after service'),
  ('IL', 'petition_filed', 'waiting_period_end', 0, FALSE, 'No mandatory waiting period for dissolution'),
  ('IL', 'separation_date', 'grounds_established', 183, FALSE, '6-month separation period required to establish irreconcilable differences')
ON CONFLICT (state_code, event_type, next_event_type) DO NOTHING;

-- ============================================
-- 7. HELPER FUNCTION FOR UPCOMING EVENTS
-- ============================================
CREATE OR REPLACE FUNCTION get_upcoming_events_for_user(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  event_id UUID,
  case_id UUID,
  case_number TEXT,
  client_name TEXT,
  event_type event_type,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  all_day BOOLEAN,
  status event_status,
  days_until INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id as event_id,
    e.case_id,
    c.case_number,
    c.client_name,
    e.event_type,
    e.title,
    e.description,
    e.event_date,
    e.all_day,
    e.status,
    EXTRACT(DAY FROM (e.event_date - NOW()))::INTEGER as days_until
  FROM case_events e
  JOIN cases c ON c.id = e.case_id
  WHERE e.status = 'upcoming'
    AND e.event_date >= NOW()
    AND (c.attorney_id = p_user_id OR c.client_id = p_user_id)
  ORDER BY e.event_date ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. HELPER FUNCTION FOR OVERDUE EVENTS
-- ============================================
CREATE OR REPLACE FUNCTION get_overdue_events_for_user(p_user_id UUID)
RETURNS TABLE (
  event_id UUID,
  case_id UUID,
  case_number TEXT,
  client_name TEXT,
  event_type event_type,
  title TEXT,
  event_date TIMESTAMPTZ,
  days_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id as event_id,
    e.case_id,
    c.case_number,
    c.client_name,
    e.event_type,
    e.title,
    e.event_date,
    EXTRACT(DAY FROM (NOW() - e.event_date))::INTEGER as days_overdue
  FROM case_events e
  JOIN cases c ON c.id = e.case_id
  WHERE e.status = 'upcoming'
    AND e.event_date < NOW()
    AND (c.attorney_id = p_user_id OR c.client_id = p_user_id)
  ORDER BY e.event_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. TRIGGER TO SYNC CASE UPCOMING_DEADLINES COUNT
-- ============================================

-- Function to update the upcoming_deadlines count on a case
CREATE OR REPLACE FUNCTION update_case_upcoming_deadlines()
RETURNS TRIGGER AS $$
DECLARE
  target_case_id UUID;
  deadline_count INTEGER;
BEGIN
  -- Determine which case_id to update
  IF TG_OP = 'DELETE' THEN
    target_case_id := OLD.case_id;
  ELSE
    target_case_id := NEW.case_id;
  END IF;

  -- Count upcoming events (status = 'upcoming' and date within next 30 days)
  SELECT COUNT(*) INTO deadline_count
  FROM case_events
  WHERE case_id = target_case_id
    AND status = 'upcoming'
    AND event_date >= NOW()
    AND event_date <= NOW() + INTERVAL '30 days';

  -- Update the cases table
  UPDATE cases
  SET upcoming_deadlines = deadline_count
  WHERE id = target_case_id;

  -- If UPDATE changed the case_id, also update the old case
  IF TG_OP = 'UPDATE' AND OLD.case_id != NEW.case_id THEN
    SELECT COUNT(*) INTO deadline_count
    FROM case_events
    WHERE case_id = OLD.case_id
      AND status = 'upcoming'
      AND event_date >= NOW()
      AND event_date <= NOW() + INTERVAL '30 days';

    UPDATE cases
    SET upcoming_deadlines = deadline_count
    WHERE id = OLD.case_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trigger_update_deadlines_on_insert ON case_events;
CREATE TRIGGER trigger_update_deadlines_on_insert
  AFTER INSERT ON case_events
  FOR EACH ROW
  EXECUTE FUNCTION update_case_upcoming_deadlines();

DROP TRIGGER IF EXISTS trigger_update_deadlines_on_update ON case_events;
CREATE TRIGGER trigger_update_deadlines_on_update
  AFTER UPDATE ON case_events
  FOR EACH ROW
  EXECUTE FUNCTION update_case_upcoming_deadlines();

DROP TRIGGER IF EXISTS trigger_update_deadlines_on_delete ON case_events;
CREATE TRIGGER trigger_update_deadlines_on_delete
  AFTER DELETE ON case_events
  FOR EACH ROW
  EXECUTE FUNCTION update_case_upcoming_deadlines();

-- ============================================
-- 10. INITIALIZE EXISTING CASE DEADLINE COUNTS
-- ============================================
-- Run once to sync counts for any existing cases
UPDATE cases c
SET upcoming_deadlines = (
  SELECT COUNT(*)
  FROM case_events e
  WHERE e.case_id = c.id
    AND e.status = 'upcoming'
    AND e.event_date >= NOW()
    AND e.event_date <= NOW() + INTERVAL '30 days'
);