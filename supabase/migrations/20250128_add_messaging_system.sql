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
