-- Session 14 Checkpoint 3: Firm Analytics, Performance Reporting & Revenue Management

-- ============================================================
-- Enums
-- ============================================================
DO $$ BEGIN
  CREATE TYPE metric_type AS ENUM (
    'revenue',
    'cases',
    'utilization',
    'collection',
    'client_satisfaction',
    'daily_summary',
    'weekly_summary',
    'monthly_summary'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE metric_period AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'yearly'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE revenue_share_type AS ENUM (
    'time_based',
    'percentage',
    'fixed_amount',
    'referral_fee'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE revenue_applies_to AS ENUM (
    'all_revenue',
    'specific_invoices',
    'specific_time_entries'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- firm_analytics_cache: Cached metrics for dashboard performance
-- ============================================================
CREATE TABLE firm_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_type metric_type NOT NULL,
  metric_period metric_period NOT NULL DEFAULT 'daily',
  metric_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- revenue_shares: Revenue splitting configuration per case
-- ============================================================
CREATE TABLE revenue_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  share_type revenue_share_type NOT NULL DEFAULT 'percentage',
  share_percentage NUMERIC(5,2) DEFAULT 0,
  fixed_amount NUMERIC(10,2) DEFAULT 0,
  applies_to revenue_applies_to NOT NULL DEFAULT 'all_revenue',
  invoice_ids UUID[] DEFAULT '{}',
  total_allocated NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_analytics_cache_firm ON firm_analytics_cache(firm_id);
CREATE INDEX idx_analytics_cache_date ON firm_analytics_cache(metric_date);
CREATE INDEX idx_analytics_cache_type ON firm_analytics_cache(metric_type);
CREATE INDEX idx_analytics_cache_period ON firm_analytics_cache(metric_period);
CREATE INDEX idx_analytics_cache_firm_date ON firm_analytics_cache(firm_id, metric_date DESC);
CREATE INDEX idx_analytics_cache_lookup ON firm_analytics_cache(firm_id, metric_type, metric_period, metric_date DESC);

CREATE INDEX idx_revenue_shares_case ON revenue_shares(case_id);
CREATE INDEX idx_revenue_shares_firm ON revenue_shares(firm_id);
CREATE INDEX idx_revenue_shares_user ON revenue_shares(user_id);
CREATE INDEX idx_revenue_shares_case_firm ON revenue_shares(case_id, firm_id);

-- ============================================================
-- Updated_at trigger for revenue_shares
-- ============================================================
CREATE OR REPLACE FUNCTION update_revenue_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_revenue_shares_updated_at
  BEFORE UPDATE ON revenue_shares
  FOR EACH ROW EXECUTE FUNCTION update_revenue_shares_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE firm_analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_shares ENABLE ROW LEVEL SECURITY;

-- firm_analytics_cache: Only firm members can view
CREATE POLICY "Firm members can view analytics"
  ON firm_analytics_cache FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firm_analytics_cache.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "System can insert analytics"
  ON firm_analytics_cache FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firm_analytics_cache.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Firm owners can delete old analytics"
  ON firm_analytics_cache FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firm_analytics_cache.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND firm_members.role = 'owner'
    )
  );

-- revenue_shares: Firm members with financial access can view, owners/senior can manage
CREATE POLICY "Firm members can view revenue shares"
  ON revenue_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = revenue_shares.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Firm managers can create revenue shares"
  ON revenue_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = revenue_shares.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.role = 'senior_attorney')
    )
  );

CREATE POLICY "Firm managers can update revenue shares"
  ON revenue_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = revenue_shares.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.role = 'senior_attorney')
    )
  );

CREATE POLICY "Firm managers can delete revenue shares"
  ON revenue_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = revenue_shares.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.role = 'senior_attorney')
    )
  );
