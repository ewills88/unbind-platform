-- Session 15 Checkpoint 3: Webhooks, QuickBooks Export & Automated Workflows
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. ENUMS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_delivery_status') THEN
    CREATE TYPE webhook_delivery_status AS ENUM ('pending', 'success', 'failed', 'retrying');
  END IF;
END $$;

-- ============================================
-- 2. WEBHOOKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  headers JSONB DEFAULT '{}',
  retry_count INTEGER DEFAULT 3,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_firm ON webhooks(firm_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(firm_id, is_active) WHERE is_active = TRUE;

-- ============================================
-- 3. WEBHOOK DELIVERIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  duration_ms INTEGER,
  attempt_number INTEGER DEFAULT 1,
  status webhook_delivery_status DEFAULT 'pending',
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);

-- ============================================
-- 4. ACCOUNTING EXPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  export_type TEXT NOT NULL, -- csv, iif, qbo
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  include_invoices BOOLEAN DEFAULT TRUE,
  include_payments BOOLEAN DEFAULT TRUE,
  include_time_entries BOOLEAN DEFAULT TRUE,
  record_count INTEGER DEFAULT 0,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounting_exports_user ON accounting_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_exports_firm ON accounting_exports(firm_id);

-- ============================================
-- 5. AUTOMATION LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id TEXT NOT NULL,
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  trigger_event TEXT NOT NULL,
  result TEXT NOT NULL, -- success, error
  error_message TEXT,
  trigger_data JSONB DEFAULT '{}',
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_firm ON automation_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_triggered ON automation_logs(triggered_at DESC);

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Webhooks RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view their firm webhooks"
  ON webhooks FOR SELECT
  TO authenticated
  USING (
    firm_id IN (
      SELECT firm_id FROM firm_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Firm members can manage their firm webhooks"
  ON webhooks FOR INSERT
  TO authenticated
  WITH CHECK (
    firm_id IN (
      SELECT firm_id FROM firm_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Firm members can update their firm webhooks"
  ON webhooks FOR UPDATE
  TO authenticated
  USING (
    firm_id IN (
      SELECT firm_id FROM firm_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Firm members can delete their firm webhooks"
  ON webhooks FOR DELETE
  TO authenticated
  USING (
    firm_id IN (
      SELECT firm_id FROM firm_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Webhook Deliveries RLS
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view deliveries for their webhooks"
  ON webhook_deliveries FOR SELECT
  TO authenticated
  USING (
    webhook_id IN (
      SELECT w.id FROM webhooks w
      JOIN firm_members fm ON fm.firm_id = w.firm_id
      WHERE fm.user_id = auth.uid() AND fm.status = 'active'
    )
  );

-- Accounting Exports RLS
ALTER TABLE accounting_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exports"
  ON accounting_exports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create exports"
  ON accounting_exports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Automation Logs RLS
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view automation logs"
  ON automation_logs FOR SELECT
  TO authenticated
  USING (
    firm_id IN (
      SELECT firm_id FROM firm_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================
-- 7. UPDATED_AT TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS trigger_webhooks_updated_at ON webhooks;
CREATE TRIGGER trigger_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
