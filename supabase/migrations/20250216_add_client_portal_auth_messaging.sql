-- Session 20 CP1: Client Portal Authentication, Dashboard & Messaging
-- Magic link auth, session tracking, portal conversations & message templates

-- ============================================================
-- Portal Access Tokens (Magic Links)
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL DEFAULT 'magic_link' CHECK (token_type IN ('magic_link', 'invite', 'reset')),
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_access_tokens_hash ON portal_access_tokens(token_hash);
CREATE INDEX idx_portal_access_tokens_user ON portal_access_tokens(user_id);
CREATE INDEX idx_portal_access_tokens_email ON portal_access_tokens(email);

-- ============================================================
-- Client Sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS client_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_sessions_user ON client_sessions(user_id);
CREATE INDEX idx_client_sessions_token ON client_sessions(session_token);
CREATE INDEX idx_client_sessions_active ON client_sessions(is_active, expires_at);

-- ============================================================
-- Client Login History
-- ============================================================

CREATE TABLE IF NOT EXISTS client_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_method TEXT NOT NULL DEFAULT 'magic_link' CHECK (login_method IN ('magic_link', 'password', 'oauth', 'invite_link')),
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  location_info JSONB DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT,
  session_id UUID REFERENCES client_sessions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_login_history_user ON client_login_history(user_id);
CREATE INDEX idx_client_login_history_created ON client_login_history(created_at DESC);

-- ============================================================
-- Portal Conversations
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  conversation_type TEXT NOT NULL DEFAULT 'general' CHECK (conversation_type IN ('general', 'billing', 'document_request', 'scheduling', 'legal_question', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  started_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  client_unread_count INTEGER NOT NULL DEFAULT 0,
  attorney_unread_count INTEGER NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_conversations_case ON portal_conversations(case_id);
CREATE INDEX idx_portal_conversations_status ON portal_conversations(status, last_message_at DESC);
CREATE INDEX idx_portal_conversations_started_by ON portal_conversations(started_by);
CREATE INDEX idx_portal_conversations_assigned_to ON portal_conversations(assigned_to);

-- ============================================================
-- Portal Messages
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES portal_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'attorney', 'staff', 'system')),
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'rich_text', 'system')),
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_messages_conversation ON portal_messages(conversation_id, created_at);
CREATE INDEX idx_portal_messages_sender ON portal_messages(sender_id);
CREATE INDEX idx_portal_messages_unread ON portal_messages(conversation_id, is_read) WHERE NOT is_read;

-- ============================================================
-- Message Templates
-- ============================================================

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'billing', 'scheduling', 'legal', 'onboarding', 'closing')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_templates_firm ON message_templates(firm_id);
CREATE INDEX idx_message_templates_category ON message_templates(category, is_active);

-- ============================================================
-- Case Activity Log
-- ============================================================

CREATE TABLE IF NOT EXISTS case_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'message_sent', 'document_uploaded', 'document_signed', 'task_completed',
    'task_assigned', 'status_changed', 'payment_received', 'invoice_sent',
    'appointment_scheduled', 'form_submitted', 'note_added', 'deadline_approaching',
    'portal_login', 'conversation_opened', 'conversation_closed'
  )),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  is_visible_to_client BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_case_activity_log_case ON case_activity_log(case_id, created_at DESC);
CREATE INDEX idx_case_activity_log_user ON case_activity_log(user_id);
CREATE INDEX idx_case_activity_log_type ON case_activity_log(activity_type);
CREATE INDEX idx_case_activity_log_client_visible ON case_activity_log(case_id, is_visible_to_client, created_at DESC);

-- ============================================================
-- Triggers
-- ============================================================

CREATE TRIGGER update_portal_conversations_updated_at
  BEFORE UPDATE ON portal_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE portal_conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    client_unread_count = CASE
      WHEN NEW.sender_role != 'client' AND NOT NEW.is_internal THEN client_unread_count + 1
      ELSE client_unread_count
    END,
    attorney_unread_count = CASE
      WHEN NEW.sender_role = 'client' THEN attorney_unread_count + 1
      ELSE attorney_unread_count
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON portal_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE portal_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_activity_log ENABLE ROW LEVEL SECURITY;

-- Portal access tokens: users see own, attorneys see their clients'
CREATE POLICY "Users can view own access tokens"
  ON portal_access_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR created_by = auth.uid());

-- Client sessions: users see own
CREATE POLICY "Users can view own sessions"
  ON client_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Login history: users see own
CREATE POLICY "Users can view own login history"
  ON client_login_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Portal conversations: case participants can view
CREATE POLICY "Case participants can view conversations"
  ON portal_conversations FOR SELECT
  TO authenticated
  USING (
    started_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = portal_conversations.case_id
      AND (cases.client_id = auth.uid() OR cases.attorney_id = auth.uid())
    )
  );

CREATE POLICY "Case participants can create conversations"
  ON portal_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_id
      AND (cases.client_id = auth.uid() OR cases.attorney_id = auth.uid())
    )
  );

CREATE POLICY "Case participants can update conversations"
  ON portal_conversations FOR UPDATE
  TO authenticated
  USING (
    started_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = portal_conversations.case_id
      AND (cases.client_id = auth.uid() OR cases.attorney_id = auth.uid())
    )
  );

-- Portal messages: conversation participants
CREATE POLICY "Conversation participants can view messages"
  ON portal_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_conversations pc
      JOIN cases c ON c.id = pc.case_id
      WHERE pc.id = portal_messages.conversation_id
      AND (c.client_id = auth.uid() OR c.attorney_id = auth.uid())
    )
    AND (NOT is_internal OR sender_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('attorney', 'admin')
    ))
  );

CREATE POLICY "Conversation participants can send messages"
  ON portal_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portal_conversations pc
      JOIN cases c ON c.id = pc.case_id
      WHERE pc.id = conversation_id
      AND (c.client_id = auth.uid() OR c.attorney_id = auth.uid())
    )
  );

-- Message templates: firm members can view
CREATE POLICY "Firm members can view templates"
  ON message_templates FOR SELECT
  TO authenticated
  USING (
    firm_id IS NULL
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.current_firm_id = message_templates.firm_id
    )
  );

CREATE POLICY "Attorneys can manage templates"
  ON message_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('attorney', 'admin')
      AND (message_templates.firm_id IS NULL OR profiles.current_firm_id = message_templates.firm_id)
    )
  );

-- Case activity log: case participants can view client-visible entries
CREATE POLICY "Case participants can view activity log"
  ON case_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_activity_log.case_id
      AND (cases.client_id = auth.uid() OR cases.attorney_id = auth.uid())
    )
    AND (
      is_visible_to_client = true
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('attorney', 'admin')
      )
    )
  );

CREATE POLICY "Authenticated users can insert activity log"
  ON case_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_id
      AND (cases.client_id = auth.uid() OR cases.attorney_id = auth.uid())
    )
  );

-- ============================================================
-- Seed Default Message Templates (system-wide, firm_id = NULL)
-- ============================================================

INSERT INTO message_templates (firm_id, category, title, content, variables) VALUES
  (NULL, 'onboarding', 'Welcome to Your Portal', 'Welcome to your client portal! Here you can track your case progress, communicate with your legal team, review documents, and manage tasks. If you have any questions, don''t hesitate to reach out through this messaging system.', '{}'),
  (NULL, 'general', 'Thank You for the Update', 'Thank you for the update. I''ve reviewed the information you provided and will follow up with next steps shortly.', '{}'),
  (NULL, 'general', 'Document Request', 'We need the following documents for your case: {{document_list}}. Please upload them through the Documents section of your portal at your earliest convenience.', '{document_list}'),
  (NULL, 'scheduling', 'Appointment Confirmation', 'Your appointment has been scheduled for {{date}} at {{time}}. Please make sure to {{preparation_notes}}. Let me know if you need to reschedule.', '{date,time,preparation_notes}'),
  (NULL, 'scheduling', 'Rescheduling Request', 'I understand you need to reschedule. Please suggest a few alternative times that work for you, and I''ll get back to you with availability.', '{}'),
  (NULL, 'billing', 'Invoice Reminder', 'This is a friendly reminder that invoice #{{invoice_number}} for ${{amount}} is due on {{due_date}}. You can make a payment through the Payments section of your portal.', '{invoice_number,amount,due_date}'),
  (NULL, 'billing', 'Payment Received', 'We''ve received your payment of ${{amount}}. Thank you! Your updated account balance will be reflected in the Finances section of your portal.', '{amount}'),
  (NULL, 'legal', 'Court Date Reminder', 'Your court date is scheduled for {{date}} at {{time}} at {{location}}. Please arrive at least 30 minutes early. Dress professionally and bring a valid photo ID.', '{date,time,location}'),
  (NULL, 'legal', 'Case Status Update', 'I wanted to provide you with an update on your case. {{update_details}} Please review and let me know if you have any questions.', '{update_details}'),
  (NULL, 'closing', 'Case Closing Summary', 'Your case has been finalized. Here''s a summary of the final outcome: {{summary}}. Please keep copies of all final documents for your records. It has been a pleasure working with you.', '{summary}')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Enable Realtime for portal messages
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE portal_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE portal_conversations;
