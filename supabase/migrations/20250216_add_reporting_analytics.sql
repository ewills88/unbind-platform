-- Session 19 Checkpoint 1: Reporting & Analytics Dashboard
-- Enhanced reporting infrastructure with saved reports, KPI targets, and snapshots

-- ============================================================
-- report_configurations: Saved/custom report definitions
-- ============================================================
CREATE TABLE report_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'custom',
  -- report_type: revenue_summary, case_analytics, attorney_performance,
  --   collection_report, client_report, practice_area, custom

  description TEXT,

  -- Configuration
  metrics TEXT[] NOT NULL DEFAULT '{}',
  -- Which metrics to include (e.g., 'revenue', 'billable_hours', 'collection_rate')

  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Saved filters: { date_range, attorneys, case_types, statuses }

  group_by TEXT,
  -- Grouping: attorney, case_type, month, quarter, state

  sort_by TEXT DEFAULT 'date',
  sort_direction TEXT DEFAULT 'desc',

  chart_type TEXT DEFAULT 'bar',
  -- bar, line, pie, table, mixed

  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,

  last_run_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- report_snapshots: Point-in-time report data captures
-- ============================================================
CREATE TABLE report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  report_config_id UUID REFERENCES report_configurations(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  snapshot_name TEXT NOT NULL,
  report_type TEXT NOT NULL,

  -- Snapshot data
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  summary_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- High-level summary metrics

  detail_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Detailed row-level data

  comparison_data JSONB,
  -- Previous period comparison data

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Additional context: filters used, generation time, etc.

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- report_schedules: Automated report generation
-- ============================================================
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  report_config_id UUID NOT NULL REFERENCES report_configurations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  frequency TEXT NOT NULL DEFAULT 'weekly',
  -- daily, weekly, monthly, quarterly

  day_of_week INTEGER,
  -- 0=Sunday for weekly schedules

  day_of_month INTEGER,
  -- 1-28 for monthly schedules

  recipients TEXT[] NOT NULL DEFAULT '{}',
  -- User IDs to notify/email

  is_active BOOLEAN NOT NULL DEFAULT true,

  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- kpi_targets: Configurable KPI goals per firm
-- ============================================================
CREATE TABLE kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  metric_key TEXT NOT NULL,
  -- revenue_monthly, billable_hours_monthly, collection_rate,
  -- cases_opened_monthly, cases_closed_monthly, avg_case_duration_days,
  -- client_satisfaction, utilization_rate

  target_value NUMERIC(12,2) NOT NULL,
  warning_threshold NUMERIC(12,2),
  -- Value at which warning triggers (e.g., 80% of target)

  period TEXT NOT NULL DEFAULT 'monthly',
  -- monthly, quarterly, yearly

  applies_to UUID,
  -- NULL = firm-wide, user_id = attorney-specific target

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(firm_id, metric_key, period, applies_to)
);

-- ============================================================
-- analytics_daily_snapshots: Daily metric snapshots for trend analysis
-- ============================================================
CREATE TABLE analytics_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  -- Case metrics
  active_cases INTEGER NOT NULL DEFAULT 0,
  new_cases INTEGER NOT NULL DEFAULT 0,
  closed_cases INTEGER NOT NULL DEFAULT 0,
  cases_by_stage JSONB NOT NULL DEFAULT '{}'::jsonb,
  cases_by_type JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Financial metrics
  revenue_today NUMERIC(10,2) NOT NULL DEFAULT 0,
  revenue_mtd NUMERIC(10,2) NOT NULL DEFAULT 0,
  revenue_ytd NUMERIC(10,2) NOT NULL DEFAULT 0,
  collected_today NUMERIC(10,2) NOT NULL DEFAULT 0,
  collected_mtd NUMERIC(10,2) NOT NULL DEFAULT 0,
  outstanding_ar NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Billing metrics
  billable_hours_today NUMERIC(8,2) NOT NULL DEFAULT 0,
  billable_hours_mtd NUMERIC(8,2) NOT NULL DEFAULT 0,
  non_billable_hours_today NUMERIC(8,2) NOT NULL DEFAULT 0,
  utilization_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  collection_rate NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Attorney breakdown
  attorney_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Array of { user_id, billable_hours, revenue, active_cases, utilization }

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(firm_id, snapshot_date)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_report_configs_firm ON report_configurations(firm_id);
CREATE INDEX idx_report_configs_created_by ON report_configurations(created_by);
CREATE INDEX idx_report_configs_type ON report_configurations(report_type);
CREATE INDEX idx_report_configs_firm_type ON report_configurations(firm_id, report_type);

CREATE INDEX idx_report_snapshots_firm ON report_snapshots(firm_id);
CREATE INDEX idx_report_snapshots_config ON report_snapshots(report_config_id);
CREATE INDEX idx_report_snapshots_period ON report_snapshots(period_start, period_end);
CREATE INDEX idx_report_snapshots_firm_date ON report_snapshots(firm_id, created_at DESC);

CREATE INDEX idx_report_schedules_firm ON report_schedules(firm_id);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;

CREATE INDEX idx_kpi_targets_firm ON kpi_targets(firm_id);
CREATE INDEX idx_kpi_targets_firm_metric ON kpi_targets(firm_id, metric_key);

CREATE INDEX idx_daily_snapshots_firm ON analytics_daily_snapshots(firm_id);
CREATE INDEX idx_daily_snapshots_date ON analytics_daily_snapshots(snapshot_date DESC);
CREATE INDEX idx_daily_snapshots_firm_date ON analytics_daily_snapshots(firm_id, snapshot_date DESC);

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE TRIGGER trigger_report_configurations_updated_at
  BEFORE UPDATE ON report_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_report_schedules_updated_at
  BEFORE UPDATE ON report_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_kpi_targets_updated_at
  BEFORE UPDATE ON kpi_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE report_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_snapshots ENABLE ROW LEVEL SECURITY;

-- report_configurations: Firm members can view, creators/managers can modify
CREATE POLICY "Firm members can view reports"
  ON report_configurations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_configurations.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Firm members can create reports"
  ON report_configurations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_configurations.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Report creators can update their reports"
  ON report_configurations FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_configurations.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role IN ('owner', 'senior_attorney')
    )
  );

CREATE POLICY "Report creators can delete their reports"
  ON report_configurations FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_configurations.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role = 'owner'
    )
  );

-- report_snapshots
CREATE POLICY "Firm members can view snapshots"
  ON report_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_snapshots.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Firm members can create snapshots"
  ON report_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_snapshots.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Managers can delete snapshots"
  ON report_snapshots FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_snapshots.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role IN ('owner', 'senior_attorney')
    )
  );

-- report_schedules
CREATE POLICY "Firm members can view schedules"
  ON report_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_schedules.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Firm members can create schedules"
  ON report_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_schedules.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Schedule creators can update"
  ON report_schedules FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_schedules.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role IN ('owner', 'senior_attorney')
    )
  );

CREATE POLICY "Schedule creators can delete"
  ON report_schedules FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = report_schedules.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role = 'owner'
    )
  );

-- kpi_targets
CREATE POLICY "Firm members can view KPI targets"
  ON kpi_targets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = kpi_targets.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Managers can manage KPI targets"
  ON kpi_targets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = kpi_targets.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role IN ('owner', 'senior_attorney')
    )
  );

CREATE POLICY "Managers can update KPI targets"
  ON kpi_targets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = kpi_targets.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role IN ('owner', 'senior_attorney')
    )
  );

CREATE POLICY "Managers can delete KPI targets"
  ON kpi_targets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = kpi_targets.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role IN ('owner', 'senior_attorney')
    )
  );

-- analytics_daily_snapshots
CREATE POLICY "Firm members can view daily snapshots"
  ON analytics_daily_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = analytics_daily_snapshots.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "System can insert daily snapshots"
  ON analytics_daily_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = analytics_daily_snapshots.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

-- ============================================================
-- Seed default report configurations (system reports)
-- ============================================================
-- These will be created per-firm when they first access reporting
-- No seed data needed - system reports are defined in code
