-- Session 22: Performance Optimization, Caching & Monitoring
-- Adds composite indexes, materialized views, DB functions, and error_logs table

-- ============================================================
-- 1. COMPOSITE INDEXES (all IF NOT EXISTS)
-- ============================================================

-- Cases: common query patterns
CREATE INDEX IF NOT EXISTS idx_cases_attorney_status ON cases(attorney_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_client_status ON cases(client_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);

-- Time entries: billing queries
CREATE INDEX IF NOT EXISTS idx_time_entries_case_date ON time_entries(case_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_attorney_date ON time_entries(attorney_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_billable_unbilled ON time_entries(case_id, billable, billed_at) WHERE billable = true AND billed_at IS NULL;

-- Invoices: financial reporting
CREATE INDEX IF NOT EXISTS idx_invoices_case_status ON invoices(case_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices(status, due_date) WHERE status NOT IN ('paid', 'void');

-- Client tasks: portal queries
CREATE INDEX IF NOT EXISTS idx_client_tasks_case_status ON client_tasks(case_id, status);
CREATE INDEX IF NOT EXISTS idx_client_tasks_client_status ON client_tasks(client_id, status) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_tasks_due_date ON client_tasks(due_date) WHERE status NOT IN ('completed', 'approved', 'cancelled');

-- Delegated tasks: firm workflow
CREATE INDEX IF NOT EXISTS idx_delegated_tasks_firm_status ON delegated_tasks(firm_id, status);
CREATE INDEX IF NOT EXISTS idx_delegated_tasks_assigned_status ON delegated_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_delegated_tasks_due_pending ON delegated_tasks(due_date) WHERE status IN ('pending', 'in_progress');

-- Client notifications: unread queries
CREATE INDEX IF NOT EXISTS idx_client_notifications_user_unread ON client_notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_notifications_user_created ON client_notifications(user_id, created_at DESC);

-- Generated documents: case lookups
CREATE INDEX IF NOT EXISTS idx_generated_documents_case_status ON generated_documents(case_id, status);
CREATE INDEX IF NOT EXISTS idx_generated_documents_case_type ON generated_documents(case_id, document_type);

-- Shared documents: client portal
CREATE INDEX IF NOT EXISTS idx_shared_documents_client_active ON shared_documents(client_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shared_documents_case ON shared_documents(case_id);

-- Filing deadlines: upcoming deadlines
CREATE INDEX IF NOT EXISTS idx_filing_deadlines_upcoming ON filing_deadlines(deadline_date, status) WHERE status IN ('upcoming');
CREATE INDEX IF NOT EXISTS idx_filing_deadlines_case_status ON filing_deadlines(case_id, status);

-- Firm analytics cache: lookups
CREATE INDEX IF NOT EXISTS idx_firm_analytics_cache_firm_type_date ON firm_analytics_cache(firm_id, metric_type, metric_date DESC);

-- ============================================================
-- 2. ERROR_LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id),
  url TEXT,
  method TEXT,
  status_code INTEGER,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(resolved, created_at DESC) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage error_logs"
  ON error_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. DATABASE FUNCTIONS
-- ============================================================

-- Function: Get case statistics with counts
CREATE OR REPLACE FUNCTION get_case_statistics(p_attorney_id UUID)
RETURNS TABLE (
  total_cases BIGINT,
  active_cases BIGINT,
  pending_tasks BIGINT,
  overdue_deadlines BIGINT,
  unbilled_hours NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM cases WHERE attorney_id = p_attorney_id)::BIGINT,
    (SELECT COUNT(*) FROM cases WHERE attorney_id = p_attorney_id AND status = 'active')::BIGINT,
    (SELECT COUNT(*) FROM delegated_tasks WHERE assigned_to = p_attorney_id AND status IN ('pending', 'in_progress'))::BIGINT,
    (SELECT COUNT(*) FROM filing_deadlines fd
      JOIN cases c ON c.id = fd.case_id
      WHERE c.attorney_id = p_attorney_id
        AND fd.status = 'upcoming'
        AND fd.deadline_date < NOW())::BIGINT,
    (SELECT COALESCE(SUM(duration_minutes), 0) / 60.0
      FROM time_entries
      WHERE attorney_id = p_attorney_id
        AND billable = true
        AND billed_at IS NULL);
END;
$$;

-- Function: Get revenue summary for a firm
CREATE OR REPLACE FUNCTION get_revenue_summary(p_firm_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
  total_invoiced NUMERIC,
  total_collected NUMERIC,
  total_outstanding NUMERIC,
  invoice_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(i.total_amount), 0)::NUMERIC,
    COALESCE(SUM(i.amount_paid), 0)::NUMERIC,
    COALESCE(SUM(i.balance_due), 0)::NUMERIC,
    COUNT(*)::BIGINT
  FROM invoices i
  JOIN cases c ON c.id = i.case_id
  JOIN firm_members fm ON fm.user_id = c.attorney_id
  WHERE fm.firm_id = p_firm_id
    AND i.issue_date BETWEEN p_start_date AND p_end_date
    AND i.status != 'void';
END;
$$;

-- ============================================================
-- 4. MATERIALIZED VIEW: Case Summary
-- ============================================================

-- Drop if exists to allow re-creation
DROP MATERIALIZED VIEW IF EXISTS mv_case_summary;

CREATE MATERIALIZED VIEW mv_case_summary AS
SELECT
  c.id AS case_id,
  c.attorney_id,
  c.client_id,
  c.status,
  c.created_at,
  (SELECT COUNT(*) FROM generated_documents gd WHERE gd.case_id = c.id) AS document_count,
  (SELECT COUNT(*) FROM client_tasks ct WHERE ct.case_id = c.id AND ct.status IN ('pending', 'in_progress')) AS pending_tasks,
  (SELECT COUNT(*) FROM filing_deadlines fd WHERE fd.case_id = c.id AND fd.status = 'upcoming' AND fd.deadline_date < NOW()) AS overdue_deadlines,
  (SELECT COALESCE(SUM(te.duration_minutes), 0) FROM time_entries te WHERE te.case_id = c.id) AS total_time_minutes,
  (SELECT COALESCE(SUM(te.amount), 0) FROM time_entries te WHERE te.case_id = c.id AND te.billable = true AND te.billed_at IS NULL) AS unbilled_amount,
  (SELECT COALESCE(SUM(inv.balance_due), 0) FROM invoices inv WHERE inv.case_id = c.id AND inv.status NOT IN ('paid', 'void')) AS outstanding_balance
FROM cases c;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_case_summary_case_id ON mv_case_summary(case_id);
CREATE INDEX IF NOT EXISTS idx_mv_case_summary_attorney ON mv_case_summary(attorney_id);
CREATE INDEX IF NOT EXISTS idx_mv_case_summary_status ON mv_case_summary(status);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_case_summary()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_case_summary;
END;
$$;
