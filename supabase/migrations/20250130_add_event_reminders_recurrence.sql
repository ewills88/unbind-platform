-- Session 7 Checkpoint 3: Event Reminders & Recurrence
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. RECURRENCE PATTERN ENUM
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrence_pattern') THEN
    CREATE TYPE recurrence_pattern AS ENUM (
      'none',
      'daily',
      'weekly',
      'biweekly',
      'monthly',
      'yearly'
    );
  END IF;
END $$;

-- ============================================
-- 2. ADD RECURRENCE FIELDS TO CASE_EVENTS
-- ============================================
ALTER TABLE case_events
ADD COLUMN IF NOT EXISTS recurrence recurrence_pattern DEFAULT 'none',
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES case_events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS recurrence_index INTEGER DEFAULT 0;

-- Index for finding recurring event instances
CREATE INDEX IF NOT EXISTS idx_case_events_parent ON case_events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_case_events_recurrence ON case_events(recurrence) WHERE recurrence != 'none';

-- ============================================
-- 3. EVENT REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES case_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Reminder timing (minutes before event)
  remind_before_minutes INTEGER NOT NULL DEFAULT 1440, -- 24 hours = 1440 minutes

  -- Reminder delivery
  remind_via_email BOOLEAN DEFAULT TRUE,
  remind_via_app BOOLEAN DEFAULT TRUE,

  -- Tracking
  reminder_sent_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one reminder per timing per user per event
  CONSTRAINT unique_reminder UNIQUE (event_id, user_id, remind_before_minutes)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_reminders_event ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_user ON event_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_pending ON event_reminders(reminder_sent_at)
  WHERE reminder_sent_at IS NULL AND is_dismissed = FALSE;

-- ============================================
-- 4. USER NOTIFICATION PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- Default reminder settings for new events
  default_remind_1_day BOOLEAN DEFAULT TRUE,
  default_remind_3_days BOOLEAN DEFAULT FALSE,
  default_remind_1_week BOOLEAN DEFAULT FALSE,

  -- Delivery preferences
  email_enabled BOOLEAN DEFAULT TRUE,
  app_notifications_enabled BOOLEAN DEFAULT TRUE,

  -- Quiet hours (don't send during these times)
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'America/Los_Angeles',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON user_notification_preferences(user_id);

-- ============================================
-- 5. IN-APP NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'reminder', -- reminder, system, message, document

  -- Related entities
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  event_id UUID REFERENCES case_events(id) ON DELETE CASCADE,

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Action URL
  action_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Event Reminders RLS
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders"
  ON event_reminders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create reminders for events in their cases"
  ON event_reminders FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM case_events e
      JOIN cases c ON c.id = e.case_id
      WHERE e.id = event_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own reminders"
  ON event_reminders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reminders"
  ON event_reminders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- User Notification Preferences RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON user_notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own preferences"
  ON user_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON user_notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 7. HELPER FUNCTION: GET PENDING REMINDERS
-- ============================================
CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE (
  reminder_id UUID,
  event_id UUID,
  user_id UUID,
  user_email TEXT,
  event_title TEXT,
  event_date TIMESTAMPTZ,
  case_id UUID,
  case_number TEXT,
  client_name TEXT,
  remind_via_email BOOLEAN,
  remind_via_app BOOLEAN,
  minutes_until_event INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id as reminder_id,
    r.event_id,
    r.user_id,
    p.email as user_email,
    e.title as event_title,
    e.event_date,
    e.case_id,
    c.case_number,
    c.client_name,
    r.remind_via_email,
    r.remind_via_app,
    EXTRACT(EPOCH FROM (e.event_date - NOW()) / 60)::INTEGER as minutes_until_event
  FROM event_reminders r
  JOIN case_events e ON e.id = r.event_id
  JOIN cases c ON c.id = e.case_id
  JOIN profiles p ON p.id = r.user_id
  WHERE r.reminder_sent_at IS NULL
    AND r.is_dismissed = FALSE
    AND e.status = 'upcoming'
    AND e.event_date > NOW()
    AND EXTRACT(EPOCH FROM (e.event_date - NOW()) / 60) <= r.remind_before_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. HELPER FUNCTION: CREATE DEFAULT REMINDERS
-- ============================================
CREATE OR REPLACE FUNCTION create_default_reminders()
RETURNS TRIGGER AS $$
DECLARE
  prefs user_notification_preferences%ROWTYPE;
BEGIN
  -- Get user preferences
  SELECT * INTO prefs
  FROM user_notification_preferences
  WHERE user_id = NEW.created_by;

  -- If no preferences, use defaults
  IF prefs IS NULL THEN
    -- Create 1-day reminder by default
    INSERT INTO event_reminders (event_id, user_id, remind_before_minutes)
    VALUES (NEW.id, NEW.created_by, 1440)
    ON CONFLICT DO NOTHING;
  ELSE
    -- Create reminders based on preferences
    IF prefs.default_remind_1_day THEN
      INSERT INTO event_reminders (event_id, user_id, remind_before_minutes, remind_via_email, remind_via_app)
      VALUES (NEW.id, NEW.created_by, 1440, prefs.email_enabled, prefs.app_notifications_enabled)
      ON CONFLICT DO NOTHING;
    END IF;

    IF prefs.default_remind_3_days THEN
      INSERT INTO event_reminders (event_id, user_id, remind_before_minutes, remind_via_email, remind_via_app)
      VALUES (NEW.id, NEW.created_by, 4320, prefs.email_enabled, prefs.app_notifications_enabled)
      ON CONFLICT DO NOTHING;
    END IF;

    IF prefs.default_remind_1_week THEN
      INSERT INTO event_reminders (event_id, user_id, remind_before_minutes, remind_via_email, remind_via_app)
      VALUES (NEW.id, NEW.created_by, 10080, prefs.email_enabled, prefs.app_notifications_enabled)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-creating reminders
DROP TRIGGER IF EXISTS trigger_create_default_reminders ON case_events;
CREATE TRIGGER trigger_create_default_reminders
  AFTER INSERT ON case_events
  FOR EACH ROW
  WHEN (NEW.status = 'upcoming')
  EXECUTE FUNCTION create_default_reminders();

-- ============================================
-- 9. HELPER FUNCTION: GET USER NOTIFICATIONS
-- ============================================
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  notification_type TEXT,
  case_id UUID,
  event_id UUID,
  is_read BOOLEAN,
  action_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.message,
    n.notification_type,
    n.case_id,
    n.event_id,
    n.is_read,
    n.action_url,
    n.created_at
  FROM notifications n
  WHERE n.user_id = p_user_id
    AND (NOT p_unread_only OR n.is_read = FALSE)
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
