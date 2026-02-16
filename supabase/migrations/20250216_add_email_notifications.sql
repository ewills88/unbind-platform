-- Session 15 Checkpoint 1: Email Notifications & Preferences
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. ALTER user_notification_preferences
-- ============================================
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'instant';

-- ============================================
-- 2. EMAIL TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_firm_template UNIQUE (firm_id, template_type)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);

-- ============================================
-- 3. EMAIL QUEUE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  message_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_user ON email_queue(user_id);

-- ============================================
-- 4. EMAIL EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_queue_id UUID NOT NULL REFERENCES email_queue(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_queue ON email_events(email_queue_id);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- Email Templates RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view system and own firm templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    firm_id IS NULL
    OR firm_id IN (
      SELECT firm_id FROM firm_members WHERE user_id = auth.uid()
    )
  );

-- Email Queue RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queued emails"
  ON email_queue FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Email Events RLS
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their own emails"
  ON email_events FOR SELECT
  TO authenticated
  USING (
    email_queue_id IN (
      SELECT id FROM email_queue WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_email_templates_updated_at ON email_templates;
CREATE TRIGGER trigger_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_email_queue_updated_at ON email_queue;
CREATE TRIGGER trigger_email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. SEED DEFAULT EMAIL TEMPLATES
-- ============================================
INSERT INTO email_templates (firm_id, template_type, subject, html_content, text_content) VALUES
(NULL, 'new_message', 'New message from {{sender_name}} - {{case_name}}',
  '<p>Hi {{recipient_name}},</p><p><strong>{{sender_name}}</strong> sent you a new message regarding <strong>{{case_name}}</strong>:</p><blockquote style="border-left:3px solid #e5e7eb;padding-left:12px;color:#6b7280;">{{message_preview}}</blockquote><p>View and reply to this message in your Unbind dashboard.</p>',
  'Hi {{recipient_name}},\n\n{{sender_name}} sent you a new message regarding {{case_name}}:\n\n"{{message_preview}}"\n\nView and reply at: {{action_url}}'),

(NULL, 'document_uploaded', 'New document uploaded - {{case_name}}',
  '<p>Hi {{recipient_name}},</p><p><strong>{{uploader_name}}</strong> uploaded a new document to <strong>{{case_name}}</strong>:</p><p style="font-weight:600;">{{document_name}}</p><p>Review the document in your Unbind dashboard.</p>',
  'Hi {{recipient_name}},\n\n{{uploader_name}} uploaded a new document to {{case_name}}:\n\n{{document_name}}\n\nReview at: {{action_url}}'),

(NULL, 'task_assigned', 'New task assigned to you - {{case_name}}',
  '<p>Hi {{recipient_name}},</p><p><strong>{{assigner_name}}</strong> assigned you a new task in <strong>{{case_name}}</strong>:</p><p style="font-weight:600;">{{task_title}}</p><p>Due: {{due_date}}</p><p>View the task details in your dashboard.</p>',
  'Hi {{recipient_name}},\n\n{{assigner_name}} assigned you a new task in {{case_name}}:\n\n{{task_title}}\nDue: {{due_date}}\n\nView at: {{action_url}}'),

(NULL, 'task_overdue', 'Overdue task: {{task_title}} - {{case_name}}',
  '<p>Hi {{recipient_name}},</p><p>Your task <strong>{{task_title}}</strong> in <strong>{{case_name}}</strong> is now <strong>{{days_overdue}} days overdue</strong>.</p><p>Original due date: {{due_date}}</p><p>Please complete this task as soon as possible.</p>',
  'Hi {{recipient_name}},\n\nYour task "{{task_title}}" in {{case_name}} is now {{days_overdue}} days overdue.\n\nOriginal due date: {{due_date}}\n\nView at: {{action_url}}'),

(NULL, 'deadline_reminder', 'Upcoming deadline: {{event_title}} in {{days_until}} days',
  '<p>Hi {{recipient_name}},</p><p>You have an upcoming deadline in <strong>{{case_name}}</strong>:</p><p style="font-weight:600;">{{event_title}}</p><p>Date: {{event_date}} ({{days_until}} days away)</p><p>Make sure you''re prepared for this deadline.</p>',
  'Hi {{recipient_name}},\n\nUpcoming deadline in {{case_name}}:\n\n{{event_title}}\nDate: {{event_date}} ({{days_until}} days away)\n\nView at: {{action_url}}'),

(NULL, 'invoice_sent', 'Invoice #{{invoice_number}} from {{firm_name}}',
  '<p>Hi {{recipient_name}},</p><p>A new invoice has been issued for your case <strong>{{case_name}}</strong>:</p><p>Invoice #{{invoice_number}}<br/>Amount: <strong>{{amount}}</strong><br/>Due Date: {{due_date}}</p><p>You can view and pay this invoice online through your dashboard.</p>',
  'Hi {{recipient_name}},\n\nA new invoice has been issued for {{case_name}}:\n\nInvoice #{{invoice_number}}\nAmount: {{amount}}\nDue Date: {{due_date}}\n\nView at: {{action_url}}'),

(NULL, 'payment_received', 'Payment received for Invoice #{{invoice_number}}',
  '<p>Hi {{recipient_name}},</p><p>A payment of <strong>{{amount}}</strong> has been received for Invoice #{{invoice_number}} in case <strong>{{case_name}}</strong>.</p><p>Thank you for the prompt payment.</p>',
  'Hi {{recipient_name}},\n\nA payment of {{amount}} has been received for Invoice #{{invoice_number}} in {{case_name}}.\n\nView at: {{action_url}}'),

(NULL, 'case_update', 'Case update - {{case_name}}',
  '<p>Hi {{recipient_name}},</p><p>There has been an update to your case <strong>{{case_name}}</strong>:</p><p>{{update_description}}</p><p>View the full details in your dashboard.</p>',
  'Hi {{recipient_name}},\n\nCase update for {{case_name}}:\n\n{{update_description}}\n\nView at: {{action_url}}'),

(NULL, 'intake_submitted', 'New intake form submitted by {{client_name}}',
  '<p>Hi {{recipient_name}},</p><p><strong>{{client_name}}</strong> has submitted a new intake form.</p><p>Please review the submission and follow up as needed.</p>',
  'Hi {{recipient_name}},\n\n{{client_name}} has submitted a new intake form.\n\nReview at: {{action_url}}'),

(NULL, 'welcome', 'Welcome to Unbind, {{recipient_name}}!',
  '<p>Hi {{recipient_name}},</p><p>Welcome to <strong>Unbind</strong> - your divorce collaboration platform.</p><p>Your account has been set up and you''re ready to get started. Here''s what you can do:</p><ul><li>View your case dashboard</li><li>Communicate securely with your legal team</li><li>Upload and manage documents</li><li>Track deadlines and tasks</li></ul><p>If you have any questions, don''t hesitate to reach out to your legal team.</p>',
  'Hi {{recipient_name}},\n\nWelcome to Unbind - your divorce collaboration platform.\n\nYour account has been set up. Log in to get started:\n{{action_url}}')

ON CONFLICT ON CONSTRAINT unique_firm_template DO NOTHING;
