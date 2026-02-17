-- Session 19 Checkpoint 2: Report Templates & Report Runs

-- ============================================================
-- report_templates: Saved report definitions
-- ============================================================
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  -- NULL firm_id = system template

  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'custom',
  -- financial, attorney, case, client, deadline, discovery, settlement, custom

  report_category TEXT,
  description TEXT,

  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { fields, filters, grouping, charts, columns }

  default_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { date_range, attorneys, case_types, statuses }

  is_system BOOLEAN NOT NULL DEFAULT false,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_favorite BOOLEAN NOT NULL DEFAULT false,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- report_runs: Historical report execution records
-- ============================================================
CREATE TABLE report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  report_name TEXT NOT NULL,
  filters_used JSONB NOT NULL DEFAULT '{}'::jsonb,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,

  row_count INTEGER NOT NULL DEFAULT 0,
  data_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  export_format TEXT,
  -- csv, pdf, xlsx

  file_path TEXT,
  file_url TEXT,

  run_by UUID NOT NULL REFERENCES auth.users(id),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_duration_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_report_templates_firm ON report_templates(firm_id);
CREATE INDEX idx_report_templates_type ON report_templates(report_type);
CREATE INDEX idx_report_templates_system ON report_templates(is_system) WHERE is_system = true;
CREATE INDEX idx_report_templates_created_by ON report_templates(created_by);

CREATE INDEX idx_report_runs_firm ON report_runs(firm_id);
CREATE INDEX idx_report_runs_template ON report_runs(template_id);
CREATE INDEX idx_report_runs_type ON report_runs(report_type);
CREATE INDEX idx_report_runs_run_by ON report_runs(run_by);
CREATE INDEX idx_report_runs_run_at ON report_runs(firm_id, run_at DESC);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE TRIGGER trigger_report_templates_updated_at
  BEFORE UPDATE ON report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;

-- report_templates: system templates visible to all, firm templates to members
CREATE POLICY "Anyone can view system templates"
  ON report_templates FOR SELECT
  USING (
    is_system = true AND firm_id IS NULL
  );

CREATE POLICY "Firm members can view firm templates"
  ON report_templates FOR SELECT
  USING (
    firm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_templates.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Firm members can create templates"
  ON report_templates FOR INSERT
  WITH CHECK (
    firm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_templates.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Template creators and managers can update"
  ON report_templates FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_templates.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role IN ('owner', 'senior_attorney')
    )
  );

CREATE POLICY "Template creators and managers can delete"
  ON report_templates FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_templates.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role = 'owner'
    )
  );

-- report_runs: firm members can view, anyone can create for their firm
CREATE POLICY "Firm members can view report runs"
  ON report_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_runs.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Firm members can create report runs"
  ON report_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_runs.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Run creators and managers can delete"
  ON report_runs FOR DELETE
  USING (
    run_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_runs.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role IN ('owner', 'senior_attorney')
    )
  );

-- ============================================================
-- Seed system report templates
-- ============================================================
INSERT INTO report_templates (report_name, report_type, report_category, description, config, is_system) VALUES
  ('Revenue Summary', 'financial', 'Financial', 'Revenue, collections, and realization rates by period',
   '{"sub_type": "revenue", "charts": ["bar", "pie"], "groupBy": ["month", "attorney", "case_type"]}'::jsonb, true),
  ('AR Aging Report', 'financial', 'Financial', 'Outstanding accounts receivable by aging bucket',
   '{"sub_type": "ar_aging", "charts": ["bar"], "groupBy": ["client"]}'::jsonb, true),
  ('Collections Report', 'financial', 'Financial', 'Payment collections by method and period',
   '{"sub_type": "collections", "charts": ["bar", "pie"], "groupBy": ["month", "method"]}'::jsonb, true),
  ('Profitability Analysis', 'financial', 'Financial', 'Case profitability with hours and effective rates',
   '{"sub_type": "profitability", "charts": ["bar"], "groupBy": ["case_type"]}'::jsonb, true),
  ('Trust Account Summary', 'financial', 'Financial', 'Client trust balances and recent transactions',
   '{"sub_type": "trust", "charts": ["table"]}'::jsonb, true),
  ('Attorney Performance', 'attorney', 'Team', 'Individual attorney productivity and billing metrics',
   '{"sub_type": "individual", "charts": ["bar", "line"], "groupBy": ["task_type"]}'::jsonb, true),
  ('Team Comparison', 'attorney', 'Team', 'Side-by-side attorney performance comparison',
   '{"sub_type": "team", "charts": ["bar", "table"], "groupBy": ["attorney"]}'::jsonb, true),
  ('Productivity Trends', 'attorney', 'Team', 'Billable hours and revenue trends over time',
   '{"sub_type": "trends", "charts": ["line"], "groupBy": ["month"]}'::jsonb, true),
  ('Case Lifecycle', 'case', 'Cases', 'Average time in each case phase',
   '{"sub_type": "lifecycle", "charts": ["bar"], "groupBy": ["phase", "case_type"]}'::jsonb, true),
  ('Case Outcomes', 'case', 'Cases', 'Settlement vs trial rates and case disposition',
   '{"sub_type": "outcomes", "charts": ["pie", "table"], "groupBy": ["case_type"]}'::jsonb, true),
  ('Workload Distribution', 'case', 'Cases', 'Case assignments and attorney capacity',
   '{"sub_type": "workload", "charts": ["bar", "pie"], "groupBy": ["attorney", "phase"]}'::jsonb, true);
