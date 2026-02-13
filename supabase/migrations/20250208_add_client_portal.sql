-- Session 13 Checkpoint 1: Client Portal - Progress, Tasks & Notifications

-- Case stage enum
CREATE TYPE case_stage AS ENUM (
  'getting_started',
  'filed',
  'discovery',
  'negotiation',
  'final',
  'complete'
);

-- Task type enum
CREATE TYPE client_task_type AS ENUM (
  'upload_document',
  'review_form',
  'complete_questionnaire',
  'attend_appointment',
  'make_payment',
  'review_settlement'
);

-- Task priority enum
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Task status enum
CREATE TYPE client_task_status AS ENUM ('pending', 'in_progress', 'completed', 'approved');

-- Notification type enum
CREATE TYPE client_notification_type AS ENUM (
  'task_assigned',
  'message_received',
  'document_request',
  'payment_due',
  'appointment_reminder',
  'milestone_reached'
);

-- Notification priority enum
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high');

-- ============================================================
-- client_progress: Tracks case progress for client portal
-- ============================================================
CREATE TABLE client_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  current_stage case_stage NOT NULL DEFAULT 'getting_started',
  stage_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (overall_completion_percentage >= 0 AND overall_completion_percentage <= 100),
  milestones_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_completion_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_case_progress UNIQUE (case_id)
);

-- ============================================================
-- client_tasks: Tasks assigned to clients
-- ============================================================
CREATE TABLE client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  task_type client_task_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date DATE,
  priority task_priority NOT NULL DEFAULT 'medium',
  estimated_minutes INTEGER,
  status client_task_status NOT NULL DEFAULT 'pending',
  completed_by_client_at TIMESTAMPTZ,
  approved_by_attorney_at TIMESTAMPTZ,
  related_document_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- client_notifications: In-app notifications for clients
-- ============================================================
CREATE TABLE client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type client_notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  priority notification_priority NOT NULL DEFAULT 'normal',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_client_progress_case ON client_progress(case_id);
CREATE INDEX idx_client_tasks_case ON client_tasks(case_id);
CREATE INDEX idx_client_tasks_status ON client_tasks(status);
CREATE INDEX idx_client_tasks_due_date ON client_tasks(due_date);
CREATE INDEX idx_client_notifications_user ON client_notifications(user_id);
CREATE INDEX idx_client_notifications_unread ON client_notifications(user_id) WHERE read_at IS NULL;

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_client_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_client_progress_updated_at
  BEFORE UPDATE ON client_progress
  FOR EACH ROW EXECUTE FUNCTION update_client_updated_at();

CREATE TRIGGER trigger_client_tasks_updated_at
  BEFORE UPDATE ON client_tasks
  FOR EACH ROW EXECUTE FUNCTION update_client_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE client_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- client_progress: Clients can read their own case progress
CREATE POLICY "Clients can view own case progress"
  ON client_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = client_progress.case_id
      AND cases.client_id = auth.uid()
    )
  );

-- client_progress: Attorneys can manage progress for their cases
CREATE POLICY "Attorneys can manage case progress"
  ON client_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = client_progress.case_id
      AND cases.attorney_id = auth.uid()
    )
  );

-- client_tasks: Clients can view and update tasks for their case
CREATE POLICY "Clients can view own tasks"
  ON client_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = client_tasks.case_id
      AND cases.client_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update own tasks"
  ON client_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = client_tasks.case_id
      AND cases.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = client_tasks.case_id
      AND cases.client_id = auth.uid()
    )
  );

-- client_tasks: Attorneys can fully manage tasks for their cases
CREATE POLICY "Attorneys can manage tasks"
  ON client_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = client_tasks.case_id
      AND cases.attorney_id = auth.uid()
    )
  );

-- client_notifications: Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON client_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON client_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System/attorneys can create notifications for anyone
CREATE POLICY "Attorneys can create notifications"
  ON client_notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
