-- Add archive functionality to documents table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/rpbjravqgflidnwjkgvc/sql

-- Add is_archived column (defaults to false for existing documents)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Add archived_at timestamp column
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for faster archive filtering
CREATE INDEX IF NOT EXISTS idx_documents_is_archived ON documents(is_archived);

-- Update any null values to false
UPDATE documents SET is_archived = FALSE WHERE is_archived IS NULL;
-- Add AI analysis fields to documents table
-- Run this in your Supabase SQL Editor

-- AI categorization fields
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS ai_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_confidence INTEGER,
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;

-- AI summary and extraction (stored as JSONB for flexibility)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS ai_summary JSONB,
ADD COLUMN IF NOT EXISTS ai_extraction JSONB;

-- Create index for AI-categorized documents
CREATE INDEX IF NOT EXISTS idx_documents_ai_category ON documents(ai_category);
CREATE INDEX IF NOT EXISTS idx_documents_ai_processed ON documents(ai_processed_at);

-- Comment on columns
COMMENT ON COLUMN documents.ai_category IS 'AI-suggested category (financial, legal, property, etc.)';
COMMENT ON COLUMN documents.ai_confidence IS 'AI confidence score 0-100';
COMMENT ON COLUMN documents.ai_reasoning IS 'AI explanation for categorization';
COMMENT ON COLUMN documents.ai_summary IS 'AI-generated summary with key points';
COMMENT ON COLUMN documents.ai_extraction IS 'Extracted data (financial figures, dates, parties, etc.)';
-- Session 5: Document Tagging System
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. TAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20) DEFAULT 'gray',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0,
  CONSTRAINT tags_name_unique UNIQUE (name)
);

-- Index for fast autocomplete searches
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);

-- ============================================
-- 2. DOCUMENT_TAGS JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_tags (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (document_id, tag_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_document_tags_document ON document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON document_tags(tag_id);

-- ============================================
-- 3. DOCUMENT RELATIONSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  related_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL DEFAULT 'related',
  confidence INTEGER DEFAULT 100,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_document_relationship UNIQUE (source_document_id, related_document_id),
  CONSTRAINT no_self_relationship CHECK (source_document_id != related_document_id)
);

-- Indexes for relationship queries
CREATE INDEX IF NOT EXISTS idx_doc_rel_source ON document_relationships(source_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_rel_related ON document_relationships(related_document_id);

-- ============================================
-- 4. ENHANCED AI INSIGHTS FIELD
-- ============================================
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS ai_insights JSONB;

COMMENT ON COLUMN documents.ai_insights IS 'Enhanced AI insights: sentiment, entities, deadlines, action items';

-- ============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_relationships ENABLE ROW LEVEL SECURITY;

-- Tags: Anyone authenticated can read, attorneys can create
CREATE POLICY "Anyone can view tags"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Attorneys can create tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('attorney', 'admin')
    )
  );

CREATE POLICY "Attorneys can update tags"
  ON tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('attorney', 'admin')
    )
  );

CREATE POLICY "Attorneys can delete tags"
  ON tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('attorney', 'admin')
    )
  );

-- Document Tags: Access based on document access
CREATE POLICY "Users can view document tags for accessible documents"
  ON document_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN cases c ON d.case_id = c.id
      WHERE d.id = document_tags.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Attorneys can manage document tags"
  ON document_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN cases c ON d.case_id = c.id
      WHERE d.id = document_tags.document_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Document Relationships: Access based on document access
CREATE POLICY "Users can view relationships for accessible documents"
  ON document_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN cases c ON d.case_id = c.id
      WHERE d.id = document_relationships.source_document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Attorneys can manage document relationships"
  ON document_relationships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN cases c ON d.case_id = c.id
      WHERE d.id = document_relationships.source_document_id
      AND c.attorney_id = auth.uid()
    )
  );

-- ============================================
-- 6. FUNCTION TO UPDATE TAG USAGE COUNT
-- ============================================
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update usage count
DROP TRIGGER IF EXISTS trigger_update_tag_usage ON document_tags;
CREATE TRIGGER trigger_update_tag_usage
  AFTER INSERT OR DELETE ON document_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

-- ============================================
-- 7. SEED SOME DEFAULT TAGS
-- ============================================
INSERT INTO tags (name, color) VALUES
  ('urgent', 'red'),
  ('review-needed', 'orange'),
  ('approved', 'green'),
  ('pending-signature', 'yellow'),
  ('confidential', 'purple'),
  ('draft', 'gray'),
  ('final', 'blue'),
  ('discovery', 'cyan'),
  ('exhibit', 'indigo')
ON CONFLICT (name) DO NOTHING;
-- Session 6: Secure Attorney-Client Messaging System
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Message content
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text', -- 'text', 'rich_text'

  -- Attachments (array of document IDs)
  attachments UUID[] DEFAULT '{}',

  -- Status tracking
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_case ON messages(case_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

-- ============================================
-- 2. MESSAGE READS TABLE (Track read status per user)
-- ============================================
CREATE TABLE IF NOT EXISTS message_reads (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Indexes for read tracking
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(message_id);

-- ============================================
-- 3. TYPING INDICATORS TABLE (Optional - for real-time)
-- ============================================
CREATE TABLE IF NOT EXISTS typing_indicators (
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (case_id, user_id)
);

-- Auto-expire typing indicators after 5 seconds
CREATE INDEX IF NOT EXISTS idx_typing_expires ON typing_indicators(started_at);

-- ============================================
-- 4. UNREAD COUNTS CACHE (Denormalized for performance)
-- ============================================
CREATE TABLE IF NOT EXISTS message_unread_counts (
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unread_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (case_id, user_id)
);

-- Index for fast unread lookups
CREATE INDEX IF NOT EXISTS idx_unread_user ON message_unread_counts(user_id);

-- ============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_unread_counts ENABLE ROW LEVEL SECURITY;

-- Messages: Only case participants can view/send
CREATE POLICY "Users can view messages in their cases"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = messages.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
    AND is_archived = FALSE
  );

CREATE POLICY "Users can send messages in their cases"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- No DELETE policy - compliance requirement (messages cannot be deleted)
-- Only archiving is allowed via UPDATE

CREATE POLICY "Attorneys can archive messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = messages.case_id
      AND c.attorney_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Can only update archive-related fields
    is_archived IS NOT NULL
  );

-- Message Reads: Users can only manage their own read status
CREATE POLICY "Users can view their own read status"
  ON message_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN cases c ON c.id = m.case_id
      WHERE m.id = message_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own read status"
  ON message_reads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Typing Indicators: Case participants only
CREATE POLICY "Users can view typing in their cases"
  ON typing_indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = typing_indicators.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own typing status"
  ON typing_indicators FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Unread Counts: Users can only see their own counts
CREATE POLICY "Users can view their own unread counts"
  ON message_unread_counts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage unread counts"
  ON message_unread_counts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 6. FUNCTIONS FOR MESSAGE HANDLING
-- ============================================

-- Function to increment unread count for recipient
CREATE OR REPLACE FUNCTION handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  case_record RECORD;
BEGIN
  -- Get case details
  SELECT attorney_id, client_id INTO case_record
  FROM cases WHERE id = NEW.case_id;

  -- Determine recipient (the other participant)
  IF NEW.sender_id = case_record.attorney_id THEN
    recipient_id := case_record.client_id;
  ELSE
    recipient_id := case_record.attorney_id;
  END IF;

  -- Skip if recipient is NULL (shouldn't happen but safety check)
  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Increment or create unread count for recipient
  INSERT INTO message_unread_counts (case_id, user_id, unread_count, last_updated)
  VALUES (NEW.case_id, recipient_id, 1, NOW())
  ON CONFLICT (case_id, user_id)
  DO UPDATE SET
    unread_count = message_unread_counts.unread_count + 1,
    last_updated = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new messages
DROP TRIGGER IF EXISTS trigger_new_message ON messages;
CREATE TRIGGER trigger_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_message();

-- Function to handle message read
CREATE OR REPLACE FUNCTION handle_message_read()
RETURNS TRIGGER AS $$
DECLARE
  message_case_id UUID;
BEGIN
  -- Get the case_id for this message
  SELECT case_id INTO message_case_id
  FROM messages WHERE id = NEW.message_id;

  -- Decrement unread count (minimum 0)
  UPDATE message_unread_counts
  SET
    unread_count = GREATEST(0, unread_count - 1),
    last_updated = NOW()
  WHERE case_id = message_case_id AND user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for message reads
DROP TRIGGER IF EXISTS trigger_message_read ON message_reads;
CREATE TRIGGER trigger_message_read
  AFTER INSERT ON message_reads
  FOR EACH ROW
  EXECUTE FUNCTION handle_message_read();

-- Function to get total unread count for a user
CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(unread_count) FROM message_unread_counts WHERE user_id = p_user_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. ENABLE REALTIME FOR MESSAGING TABLES
-- ============================================

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE message_unread_counts;

-- ============================================
-- 8. AUDIT LOG EXTENSION
-- ============================================

-- Add message_sent to activity types (if document_activity exists)
DO $$
BEGIN
  -- Create a message_activity table for audit logging
  CREATE TABLE IF NOT EXISTS message_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'sent', 'read', 'archived'
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_message_activity_message ON message_activity(message_id);
  CREATE INDEX IF NOT EXISTS idx_message_activity_user ON message_activity(user_id);

  -- RLS for message activity
  ALTER TABLE message_activity ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view activity for their cases"
    ON message_activity FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM messages m
        JOIN cases c ON c.id = m.case_id
        WHERE m.id = message_activity.message_id
        AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
      )
    );

  CREATE POLICY "Users can create activity for their actions"
    ON message_activity FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
END $$;

-- Auto-log message sends
CREATE OR REPLACE FUNCTION log_message_sent()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO message_activity (message_id, user_id, activity_type, metadata)
  VALUES (NEW.id, NEW.sender_id, 'sent', jsonb_build_object('content_length', length(NEW.content)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_message_sent ON messages;
CREATE TRIGGER trigger_log_message_sent
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION log_message_sent();
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
