-- Migration: Add Payment Plans, Reminders & Financial Reporting
-- Session 11 Checkpoint 3: Payment Plans, Reminders & Financial Reporting

-- Enum for payment plan frequency
DO $$ BEGIN
  CREATE TYPE payment_plan_frequency AS ENUM (
    'weekly',
    'biweekly',
    'monthly'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for payment plan status
DO $$ BEGIN
  CREATE TYPE payment_plan_status AS ENUM (
    'active',
    'completed',
    'cancelled',
    'defaulted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for reminder type
DO $$ BEGIN
  CREATE TYPE reminder_type AS ENUM (
    'upcoming',
    'due_today',
    'past_due_7',
    'past_due_30',
    'final_notice'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for reminder status
DO $$ BEGIN
  CREATE TYPE reminder_status AS ENUM (
    'pending',
    'sent',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payment Plans table
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Plan details
  total_amount NUMERIC(10,2) NOT NULL,
  installment_count INTEGER NOT NULL CHECK (installment_count > 0),
  installment_amount NUMERIC(10,2) NOT NULL,
  frequency payment_plan_frequency NOT NULL DEFAULT 'monthly',

  -- Dates
  first_payment_date DATE NOT NULL,
  next_payment_date DATE,
  last_payment_date DATE,

  -- Progress
  payments_made INTEGER NOT NULL DEFAULT 0,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Status
  status payment_plan_status NOT NULL DEFAULT 'active',

  -- Auto-charge
  auto_charge BOOLEAN NOT NULL DEFAULT false,
  saved_payment_method_id UUID REFERENCES saved_payment_methods(id) ON DELETE SET NULL,

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Reminder details
  reminder_type reminder_type NOT NULL,
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  status reminder_status NOT NULL DEFAULT 'pending',

  -- Error tracking
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Reconciliations table
CREATE TABLE IF NOT EXISTS trust_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period
  reconciliation_month DATE NOT NULL, -- first day of month

  -- Bank statement values
  bank_beginning_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  bank_ending_balance NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Register values (calculated from trust transactions)
  register_beginning_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  register_ending_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_deposits NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_withdrawals NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Client ledger sum
  sum_client_balances NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Result
  is_reconciled BOOLEAN NOT NULL DEFAULT false,
  discrepancy NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,

  -- Bank statement upload
  bank_statement_path TEXT,

  -- Audit
  reconciled_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_plans_invoice ON payment_plans(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_case ON payment_plans(case_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_payment_plans_next_date ON payment_plans(next_payment_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_payment_plans_auto_charge ON payment_plans(auto_charge, next_payment_date) WHERE status = 'active' AND auto_charge = true;

CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_status ON payment_reminders(status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_scheduled ON payment_reminders(scheduled_date) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_trust_reconciliations_month ON trust_reconciliations(reconciliation_month);

-- Enable RLS
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_reconciliations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Payment Plans: Attorneys can manage, clients can view/create for their invoices
DROP POLICY IF EXISTS payment_plans_attorney_all ON payment_plans;
CREATE POLICY payment_plans_attorney_all ON payment_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = payment_plans.case_id
      AND c.attorney_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS payment_plans_client_select ON payment_plans;
CREATE POLICY payment_plans_client_select ON payment_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = payment_plans.case_id
      AND c.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS payment_plans_client_insert ON payment_plans;
CREATE POLICY payment_plans_client_insert ON payment_plans
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = payment_plans.case_id
      AND c.client_id = auth.uid()
    )
  );

-- Payment Reminders: Attorneys only
DROP POLICY IF EXISTS payment_reminders_attorney_all ON payment_reminders;
CREATE POLICY payment_reminders_attorney_all ON payment_reminders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN cases c ON c.id = i.case_id
      WHERE i.id = payment_reminders.invoice_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Trust Reconciliations: Attorneys only
DROP POLICY IF EXISTS trust_reconciliations_attorney_all ON trust_reconciliations;
CREATE POLICY trust_reconciliations_attorney_all ON trust_reconciliations
  FOR ALL
  USING (reconciled_by = auth.uid());

-- Triggers
DROP TRIGGER IF EXISTS payment_plans_updated_at ON payment_plans;
CREATE TRIGGER payment_plans_updated_at
  BEFORE UPDATE ON payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

DROP TRIGGER IF EXISTS trust_reconciliations_updated_at ON trust_reconciliations;
CREATE TRIGGER trust_reconciliations_updated_at
  BEFORE UPDATE ON trust_reconciliations
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

-- Function to create payment reminders when invoice is sent
CREATE OR REPLACE FUNCTION create_invoice_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create reminders when status changes to 'sent'
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    -- 3 days before due: upcoming
    INSERT INTO payment_reminders (invoice_id, reminder_type, scheduled_date)
    VALUES (NEW.id, 'upcoming', NEW.due_date - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;

    -- Due date: due_today
    INSERT INTO payment_reminders (invoice_id, reminder_type, scheduled_date)
    VALUES (NEW.id, 'due_today', NEW.due_date)
    ON CONFLICT DO NOTHING;

    -- 7 days after due: past_due_7
    INSERT INTO payment_reminders (invoice_id, reminder_type, scheduled_date)
    VALUES (NEW.id, 'past_due_7', NEW.due_date + INTERVAL '7 days')
    ON CONFLICT DO NOTHING;

    -- 30 days after due: past_due_30
    INSERT INTO payment_reminders (invoice_id, reminder_type, scheduled_date)
    VALUES (NEW.id, 'past_due_30', NEW.due_date + INTERVAL '30 days')
    ON CONFLICT DO NOTHING;

    -- 60 days after due: final_notice
    INSERT INTO payment_reminders (invoice_id, reminder_type, scheduled_date)
    VALUES (NEW.id, 'final_notice', NEW.due_date + INTERVAL '60 days')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Cancel pending reminders if invoice is paid
  IF NEW.status IN ('paid', 'void') AND OLD.status != NEW.status THEN
    UPDATE payment_reminders
    SET status = 'failed'
    WHERE invoice_id = NEW.id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS invoice_reminder_trigger ON invoices;
CREATE TRIGGER invoice_reminder_trigger
  AFTER UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION create_invoice_reminders();

-- Function to calculate next payment date
CREATE OR REPLACE FUNCTION calculate_next_payment_date(
  p_current_date DATE,
  p_frequency payment_plan_frequency
)
RETURNS DATE AS $$
BEGIN
  CASE p_frequency
    WHEN 'weekly' THEN RETURN p_current_date + INTERVAL '7 days';
    WHEN 'biweekly' THEN RETURN p_current_date + INTERVAL '14 days';
    WHEN 'monthly' THEN RETURN p_current_date + INTERVAL '1 month';
  END CASE;
END;
$$ LANGUAGE plpgsql;
