-- Session 20 CP2: Document Portal, Appointment Scheduling & Enhanced Client Tasks

-- ============================================================
-- Shared Documents
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  document_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  share_message TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_download BOOLEAN NOT NULL DEFAULT true,
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  signature_status TEXT CHECK (signature_status IN ('pending', 'signed', 'declined')),
  signed_at TIMESTAMPTZ,
  signature_document_id UUID,
  expires_at TIMESTAMPTZ,
  password_protected BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shared_documents_case ON shared_documents(case_id);
CREATE INDEX idx_shared_documents_client ON shared_documents(client_id);
CREATE INDEX idx_shared_documents_active ON shared_documents(client_id, is_active) WHERE is_active = true;

-- ============================================================
-- Document Requests
-- ============================================================

CREATE TABLE IF NOT EXISTS document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  firm_id UUID REFERENCES firms(id),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  example_document_id UUID,
  accepted_formats TEXT[] DEFAULT '{}',
  max_file_size_mb INTEGER NOT NULL DEFAULT 25,
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'cancelled')),
  fulfilled_document_id UUID,
  rejection_reason TEXT,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  auto_remind BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_document_requests_case ON document_requests(case_id);
CREATE INDEX idx_document_requests_client ON document_requests(client_id, status);
CREATE INDEX idx_document_requests_deadline ON document_requests(deadline) WHERE status = 'pending';

-- ============================================================
-- Document Views (audit trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS document_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_document_id UUID NOT NULL REFERENCES shared_documents(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  duration_seconds INTEGER
);

CREATE INDEX idx_document_views_shared ON document_views(shared_document_id);

-- ============================================================
-- Appointment Types
-- ============================================================

CREATE TABLE IF NOT EXISTS appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  color TEXT DEFAULT '#6366f1',
  allow_video BOOLEAN NOT NULL DEFAULT true,
  allow_phone BOOLEAN NOT NULL DEFAULT true,
  allow_in_person BOOLEAN NOT NULL DEFAULT true,
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes INTEGER NOT NULL DEFAULT 15,
  max_daily INTEGER,
  advance_booking_days INTEGER NOT NULL DEFAULT 30,
  min_notice_hours INTEGER NOT NULL DEFAULT 24,
  cancellation_notice_hours INTEGER NOT NULL DEFAULT 24,
  intake_form_required BOOLEAN NOT NULL DEFAULT false,
  intake_form_fields JSONB DEFAULT '[]',
  confirmation_email BOOLEAN NOT NULL DEFAULT true,
  reminder_email BOOLEAN NOT NULL DEFAULT true,
  reminder_hours_before INTEGER NOT NULL DEFAULT 24,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointment_types_firm ON appointment_types(firm_id, is_active);

-- ============================================================
-- Availability Windows
-- ============================================================

CREATE TABLE IF NOT EXISTS availability_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  appointment_type_ids UUID[] DEFAULT '{}',
  location_types TEXT[] DEFAULT '{in_person,video,phone}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_availability_windows_user ON availability_windows(user_id, is_active);

-- ============================================================
-- Availability Overrides
-- ============================================================

CREATE TABLE IF NOT EXISTS availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_availability_overrides_user ON availability_overrides(user_id, override_date);

-- ============================================================
-- Client Appointments
-- ============================================================

CREATE TABLE IF NOT EXISTS client_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  firm_id UUID REFERENCES firms(id),
  attorney_id UUID NOT NULL REFERENCES auth.users(id),
  appointment_type_id UUID REFERENCES appointment_types(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  location_type TEXT NOT NULL DEFAULT 'video' CHECK (location_type IN ('in_person', 'video', 'phone')),
  location_address TEXT,
  video_link TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  confirmation_sent BOOLEAN NOT NULL DEFAULT false,
  confirmation_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  intake_form_completed BOOLEAN NOT NULL DEFAULT false,
  intake_form_data JSONB,
  client_notes TEXT,
  attorney_notes TEXT,
  outcome_notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  rescheduled_from_id UUID REFERENCES client_appointments(id),
  rescheduled_to_id UUID REFERENCES client_appointments(id),
  calendar_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_appointments_case ON client_appointments(case_id);
CREATE INDEX idx_client_appointments_client ON client_appointments(client_id, status);
CREATE INDEX idx_client_appointments_attorney ON client_appointments(attorney_id, start_time);
CREATE INDEX idx_client_appointments_time ON client_appointments(start_time, status);

-- ============================================================
-- Extend existing client_tasks table
-- ============================================================

-- Add new columns to existing client_tasks table
DO $$
BEGIN
  -- Add client_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'client_id') THEN
    ALTER TABLE client_tasks ADD COLUMN client_id UUID REFERENCES auth.users(id);
  END IF;

  -- Add firm_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'firm_id') THEN
    ALTER TABLE client_tasks ADD COLUMN firm_id UUID REFERENCES firms(id);
  END IF;

  -- Add requires_upload
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'requires_upload') THEN
    ALTER TABLE client_tasks ADD COLUMN requires_upload BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add requires_form
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'requires_form') THEN
    ALTER TABLE client_tasks ADD COLUMN requires_form BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add form_fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'form_fields') THEN
    ALTER TABLE client_tasks ADD COLUMN form_fields JSONB DEFAULT '[]';
  END IF;

  -- Add form_data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'form_data') THEN
    ALTER TABLE client_tasks ADD COLUMN form_data JSONB;
  END IF;

  -- Add submission_notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'submission_notes') THEN
    ALTER TABLE client_tasks ADD COLUMN submission_notes TEXT;
  END IF;

  -- Add submitted_files
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'submitted_files') THEN
    ALTER TABLE client_tasks ADD COLUMN submitted_files JSONB DEFAULT '[]';
  END IF;

  -- Add reviewed_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'reviewed_by') THEN
    ALTER TABLE client_tasks ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
  END IF;

  -- Add review_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'review_status') THEN
    ALTER TABLE client_tasks ADD COLUMN review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected'));
  END IF;

  -- Add review_notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'review_notes') THEN
    ALTER TABLE client_tasks ADD COLUMN review_notes TEXT;
  END IF;

  -- Add reviewed_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'reviewed_at') THEN
    ALTER TABLE client_tasks ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;

  -- Add reminder_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'reminder_count') THEN
    ALTER TABLE client_tasks ADD COLUMN reminder_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add last_reminder_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'last_reminder_at') THEN
    ALTER TABLE client_tasks ADD COLUMN last_reminder_at TIMESTAMPTZ;
  END IF;

  -- Add auto_remind
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'auto_remind') THEN
    ALTER TABLE client_tasks ADD COLUMN auto_remind BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- Add linked_document_request_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'linked_document_request_id') THEN
    ALTER TABLE client_tasks ADD COLUMN linked_document_request_id UUID;
  END IF;

  -- Add linked_appointment_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_tasks' AND column_name = 'linked_appointment_id') THEN
    ALTER TABLE client_tasks ADD COLUMN linked_appointment_id UUID;
  END IF;
END $$;

-- Add new task status values to enum if possible
-- (status enum is client_task_status: pending, in_progress, completed, approved)
-- We add 'submitted', 'rejected', 'cancelled', 'overdue' via text fallback
-- Since ALTER TYPE ... ADD VALUE cannot run in a transaction block easily,
-- we add them individually outside transaction
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'submitted' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_task_status')) THEN
    ALTER TYPE client_task_status ADD VALUE IF NOT EXISTS 'submitted';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_task_status')) THEN
    ALTER TYPE client_task_status ADD VALUE IF NOT EXISTS 'rejected';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_task_status')) THEN
    ALTER TYPE client_task_status ADD VALUE IF NOT EXISTS 'cancelled';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add new task type values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'signature' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_task_type')) THEN
    ALTER TYPE client_task_type ADD VALUE IF NOT EXISTS 'signature';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'other' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'client_task_type')) THEN
    ALTER TYPE client_task_type ADD VALUE IF NOT EXISTS 'other';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- Triggers
-- ============================================================

CREATE TRIGGER update_shared_documents_updated_at
  BEFORE UPDATE ON shared_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_appointments_updated_at
  BEFORE UPDATE ON client_appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function for incrementing download count
CREATE OR REPLACE FUNCTION increment_download_count(shared_doc_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE shared_documents
  SET download_count = download_count + 1
  WHERE id = shared_doc_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE shared_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_appointments ENABLE ROW LEVEL SECURITY;

-- Shared documents: client sees own, attorney sees case docs
CREATE POLICY "Clients can view own shared documents"
  ON shared_documents FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR shared_by = auth.uid() OR EXISTS (
    SELECT 1 FROM cases WHERE cases.id = shared_documents.case_id AND cases.attorney_id = auth.uid()
  ));

CREATE POLICY "Attorneys can share documents"
  ON shared_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM cases WHERE cases.id = case_id AND cases.attorney_id = auth.uid()
  ));

CREATE POLICY "Attorneys can update shared documents"
  ON shared_documents FOR UPDATE TO authenticated
  USING (shared_by = auth.uid() OR EXISTS (
    SELECT 1 FROM cases WHERE cases.id = shared_documents.case_id AND cases.attorney_id = auth.uid()
  ));

-- Document requests
CREATE POLICY "Clients can view own document requests"
  ON document_requests FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR requested_by = auth.uid() OR EXISTS (
    SELECT 1 FROM cases WHERE cases.id = document_requests.case_id AND cases.attorney_id = auth.uid()
  ));

CREATE POLICY "Attorneys can create document requests"
  ON document_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM cases WHERE cases.id = case_id AND cases.attorney_id = auth.uid()
  ));

CREATE POLICY "Case participants can update document requests"
  ON document_requests FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR requested_by = auth.uid());

-- Document views
CREATE POLICY "Case participants can view document views"
  ON document_views FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR EXISTS (
    SELECT 1 FROM shared_documents sd
    JOIN cases c ON c.id = sd.case_id
    WHERE sd.id = document_views.shared_document_id AND c.attorney_id = auth.uid()
  ));

CREATE POLICY "Clients can insert document views"
  ON document_views FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Appointment types: firm members can view
CREATE POLICY "Authenticated users can view appointment types"
  ON appointment_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Firm admins can manage appointment types"
  ON appointment_types FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND current_firm_id = appointment_types.firm_id AND role IN ('attorney', 'admin')
  ));

-- Availability windows
CREATE POLICY "Authenticated users can view availability"
  ON availability_windows FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own availability"
  ON availability_windows FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Availability overrides
CREATE POLICY "Authenticated users can view overrides"
  ON availability_overrides FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own overrides"
  ON availability_overrides FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Client appointments
CREATE POLICY "Case participants can view appointments"
  ON client_appointments FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR attorney_id = auth.uid() OR EXISTS (
    SELECT 1 FROM cases WHERE cases.id = client_appointments.case_id AND (cases.client_id = auth.uid() OR cases.attorney_id = auth.uid())
  ));

CREATE POLICY "Authenticated users can create appointments"
  ON client_appointments FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() OR EXISTS (
    SELECT 1 FROM cases WHERE cases.id = case_id AND cases.attorney_id = auth.uid()
  ));

CREATE POLICY "Appointment participants can update"
  ON client_appointments FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR attorney_id = auth.uid());

-- ============================================================
-- Seed default appointment types for existing firms
-- ============================================================

-- This will be run by individual firms, but we add a helper
CREATE OR REPLACE FUNCTION seed_default_appointment_types(p_firm_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO appointment_types (firm_id, type_name, description, duration_minutes, color, display_order) VALUES
    (p_firm_id, 'Initial Consultation', 'First meeting to discuss your case', 60, '#3b82f6', 1),
    (p_firm_id, 'Follow-up Meeting', 'Regular check-in on case progress', 30, '#8b5cf6', 2),
    (p_firm_id, 'Document Review', 'Review and sign important documents', 30, '#10b981', 3),
    (p_firm_id, 'Mediation Preparation', 'Prepare for upcoming mediation session', 45, '#f59e0b', 4),
    (p_firm_id, 'Court Preparation', 'Prepare for court appearance', 60, '#ef4444', 5),
    (p_firm_id, 'Quick Question', 'Brief call for a quick question', 15, '#6366f1', 6)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
