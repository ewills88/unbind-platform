-- Session 19 Checkpoint 3: Scheduled Reports & Report Deliveries

-- ============================================================
-- scheduled_reports: Automated report generation schedules
-- ============================================================
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,

  report_type TEXT NOT NULL,
  schedule_name TEXT NOT NULL,
  description TEXT,

  frequency TEXT NOT NULL DEFAULT 'weekly',
  -- daily, weekly, biweekly, monthly, quarterly

  day_of_week INTEGER DEFAULT 1,
  -- 0=Sun, 1=Mon, ..., 6=Sat (for weekly/biweekly)

  day_of_month INTEGER DEFAULT 1,
  -- 1-31 (for monthly/quarterly)

  time_of_day TIME NOT NULL DEFAULT '08:00',
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',

  recipients TEXT[] NOT NULL DEFAULT '{}',
  export_format TEXT NOT NULL DEFAULT 'pdf',
  -- pdf, excel, csv

  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { date_range, attorneys, case_types, etc. }

  include_charts BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,

  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- report_deliveries: Email delivery tracking for scheduled reports
-- ============================================================
CREATE TABLE report_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  run_id UUID REFERENCES report_runs(id) ON DELETE SET NULL,

  delivered_at TIMESTAMPTZ,
  recipients TEXT[] NOT NULL DEFAULT '{}',

  delivery_status TEXT NOT NULL DEFAULT 'pending',
  -- pending, sent, failed, bounced

  file_path TEXT,
  file_url TEXT,
  file_size INTEGER,

  error_message TEXT,
  email_message_id TEXT,
  opened_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_scheduled_reports_firm ON scheduled_reports(firm_id);
CREATE INDEX idx_scheduled_reports_active ON scheduled_reports(is_active, next_run_at) WHERE is_active = true;
CREATE INDEX idx_scheduled_reports_created_by ON scheduled_reports(created_by);
CREATE INDEX idx_scheduled_reports_type ON scheduled_reports(report_type);

CREATE INDEX idx_report_deliveries_schedule ON report_deliveries(scheduled_report_id);
CREATE INDEX idx_report_deliveries_run ON report_deliveries(run_id);
CREATE INDEX idx_report_deliveries_status ON report_deliveries(delivery_status);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE TRIGGER trigger_scheduled_reports_updated_at
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_deliveries ENABLE ROW LEVEL SECURITY;

-- Firm members can view schedules
CREATE POLICY "Firm members can view scheduled reports"
  ON scheduled_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = scheduled_reports.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

-- Firm members can create schedules
CREATE POLICY "Firm members can create scheduled reports"
  ON scheduled_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = scheduled_reports.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

-- Creators and managers can update
CREATE POLICY "Schedule creators and managers can update"
  ON scheduled_reports FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = scheduled_reports.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role IN ('owner', 'senior_attorney')
    )
  );

-- Creators and owners can delete
CREATE POLICY "Schedule creators and owners can delete"
  ON scheduled_reports FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = scheduled_reports.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role = 'owner'
    )
  );

-- Report deliveries: firm members can view
CREATE POLICY "Firm members can view report deliveries"
  ON report_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_reports sr
      JOIN firm_members fm ON fm.firm_id = sr.firm_id
      WHERE sr.id = report_deliveries.scheduled_report_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'active'
    )
  );

-- Service role handles delivery inserts (system creates them)
CREATE POLICY "Service can create report deliveries"
  ON report_deliveries FOR INSERT
  WITH CHECK (true);
