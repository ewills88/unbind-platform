-- Migration: Add Billing System
-- Session 11 Checkpoint 1: Time Tracking, Expenses & Invoice Generation

-- Enum for activity types (create if not exists)
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'client_communication',
    'document_review',
    'document_drafting',
    'court_appearance',
    'research',
    'travel',
    'administrative',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for expense types
DO $$ BEGIN
  CREATE TYPE expense_type AS ENUM (
    'court_filing',
    'service_of_process',
    'expert_witness',
    'copies',
    'travel',
    'postage',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for invoice status
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'draft',
    'sent',
    'viewed',
    'paid',
    'partially_paid',
    'overdue',
    'void'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for invoice line item type
DO $$ BEGIN
  CREATE TYPE invoice_item_type AS ENUM (
    'time_entry',
    'expense',
    'adjustment',
    'retainer_credit',
    'flat_fee'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Invoices table (created first since time_entries and expenses reference it)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Invoice identification
  invoice_number TEXT NOT NULL UNIQUE,

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Status
  status invoice_status NOT NULL DEFAULT 'draft',

  -- Amounts
  subtotal_services NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal_expenses NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Tax
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,

  -- Retainer
  retainer_applied NUMERIC(10,2) DEFAULT 0,

  -- Totals
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  balance_due NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Notes
  notes TEXT,
  payment_instructions TEXT,

  -- Tracking
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- PDF
  pdf_path TEXT, -- Supabase Storage path to generated PDF

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Line Items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Item details
  item_type invoice_item_type NOT NULL,
  line_date DATE,
  description TEXT NOT NULL,

  -- Amounts
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1, -- Hours for time, units for expenses
  rate NUMERIC(10,2) NOT NULL DEFAULT 0, -- Hourly rate or unit price
  amount NUMERIC(10,2) NOT NULL DEFAULT 0, -- quantity * rate

  -- Reference to original entry
  reference_id UUID, -- Points to time_entry or expense

  -- Display order
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  attorney_id UUID NOT NULL REFERENCES auth.users(id),

  -- When the work was done
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,

  -- Duration (can be calculated from start/end or entered manually)
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0),

  -- Activity details
  activity_type activity_type NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,

  -- Billing info
  billable BOOLEAN NOT NULL DEFAULT true,
  hourly_rate NUMERIC(10,2) NOT NULL,
  amount NUMERIC(10,2) NOT NULL, -- duration_minutes / 60 * hourly_rate

  -- Invoice reference
  billed_at TIMESTAMPTZ,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

  -- Timer state (for active timers)
  timer_running BOOLEAN DEFAULT false,
  timer_started_at TIMESTAMPTZ,

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Expense details
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_type expense_type NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  vendor TEXT, -- Optional vendor name

  -- Amount
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),

  -- Receipt
  receipt_path TEXT, -- Supabase Storage path

  -- Billing
  billable BOOLEAN NOT NULL DEFAULT true,
  markup_percentage NUMERIC(5,2) DEFAULT 0,
  billed_amount NUMERIC(10,2), -- amount * (1 + markup_percentage/100)

  -- Invoice reference
  billed_at TIMESTAMPTZ,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attorney billing settings
CREATE TABLE IF NOT EXISTS attorney_billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attorney_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,

  -- Default rates
  default_hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 300.00,
  paralegal_rate NUMERIC(10,2) DEFAULT 150.00,

  -- Timer settings
  minimum_increment_minutes INTEGER DEFAULT 6, -- Bill in 6-minute increments (0.1 hour)
  round_up_time BOOLEAN DEFAULT true,

  -- Invoice settings
  default_payment_terms_days INTEGER DEFAULT 30,
  default_tax_rate NUMERIC(5,2) DEFAULT 0,

  -- Invoice numbering
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,

  -- Firm info for invoices
  firm_name TEXT,
  firm_address TEXT,
  firm_phone TEXT,
  firm_email TEXT,
  bar_number TEXT,
  logo_path TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active timer state (one per user)
CREATE TABLE IF NOT EXISTS active_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  accumulated_seconds INTEGER DEFAULT 0, -- Time accumulated before current start

  activity_type activity_type DEFAULT 'other',
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_case ON time_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_attorney ON time_entries(attorney_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_unbilled ON time_entries(billed_at) WHERE billed_at IS NULL AND billable = true;
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice ON time_entries(invoice_id);

CREATE INDEX IF NOT EXISTS idx_expenses_case ON expenses(case_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_unbilled ON expenses(billed_at) WHERE billed_at IS NULL AND billable = true;
CREATE INDEX IF NOT EXISTS idx_expenses_invoice ON expenses(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoices_case ON invoices(case_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_active_timers_user ON active_timers(user_id);
CREATE INDEX IF NOT EXISTS idx_active_timers_case ON active_timers(case_id);

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attorney_billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_timers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists for idempotency)

-- Time Entries: Attorneys can manage, clients can view their case's entries
DROP POLICY IF EXISTS time_entries_attorney_all ON time_entries;
CREATE POLICY time_entries_attorney_all ON time_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = time_entries.case_id
      AND c.attorney_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS time_entries_client_view ON time_entries;
CREATE POLICY time_entries_client_view ON time_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = time_entries.case_id
      AND c.client_id = auth.uid()
    )
    AND billed_at IS NOT NULL -- Clients only see billed entries
  );

-- Expenses: Same pattern as time entries
DROP POLICY IF EXISTS expenses_attorney_all ON expenses;
CREATE POLICY expenses_attorney_all ON expenses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = expenses.case_id
      AND c.attorney_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS expenses_client_view ON expenses;
CREATE POLICY expenses_client_view ON expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = expenses.case_id
      AND c.client_id = auth.uid()
    )
    AND billed_at IS NOT NULL
  );

-- Invoices: Attorneys can manage, clients can view
DROP POLICY IF EXISTS invoices_attorney_all ON invoices;
CREATE POLICY invoices_attorney_all ON invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = invoices.case_id
      AND c.attorney_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS invoices_client_view ON invoices;
CREATE POLICY invoices_client_view ON invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = invoices.case_id
      AND c.client_id = auth.uid()
    )
    AND status != 'draft' -- Clients can't see drafts
  );

-- Invoice Line Items: Follow invoice access
DROP POLICY IF EXISTS invoice_items_attorney ON invoice_line_items;
CREATE POLICY invoice_items_attorney ON invoice_line_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN cases c ON c.id = i.case_id
      WHERE i.id = invoice_line_items.invoice_id
      AND c.attorney_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS invoice_items_client ON invoice_line_items;
CREATE POLICY invoice_items_client ON invoice_line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN cases c ON c.id = i.case_id
      WHERE i.id = invoice_line_items.invoice_id
      AND c.client_id = auth.uid()
      AND i.status != 'draft'
    )
  );

-- Billing Settings: Only the attorney
DROP POLICY IF EXISTS billing_settings_owner ON attorney_billing_settings;
CREATE POLICY billing_settings_owner ON attorney_billing_settings
  FOR ALL
  USING (attorney_id = auth.uid());

-- Active Timers: Only the user's own timer
DROP POLICY IF EXISTS active_timers_owner ON active_timers;
CREATE POLICY active_timers_owner ON active_timers
  FOR ALL
  USING (user_id = auth.uid());

-- Triggers (drop if exists for idempotency)

-- Update timestamp trigger
DROP TRIGGER IF EXISTS time_entries_updated_at ON time_entries;
CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

DROP TRIGGER IF EXISTS billing_settings_updated_at ON attorney_billing_settings;
CREATE TRIGGER billing_settings_updated_at
  BEFORE UPDATE ON attorney_billing_settings
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

DROP TRIGGER IF EXISTS active_timers_updated_at ON active_timers;
CREATE TRIGGER active_timers_updated_at
  BEFORE UPDATE ON active_timers
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

-- Function to calculate expense billed amount
CREATE OR REPLACE FUNCTION calculate_expense_billed_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.billed_amount = NEW.amount * (1 + COALESCE(NEW.markup_percentage, 0) / 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expense_calculate_billed ON expenses;
CREATE TRIGGER expense_calculate_billed
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION calculate_expense_billed_amount();

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_attorney_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_settings attorney_billing_settings;
  v_number TEXT;
BEGIN
  -- Get or create settings
  SELECT * INTO v_settings FROM attorney_billing_settings WHERE attorney_id = p_attorney_id;

  IF NOT FOUND THEN
    INSERT INTO attorney_billing_settings (attorney_id)
    VALUES (p_attorney_id)
    RETURNING * INTO v_settings;
  END IF;

  -- Generate number
  v_number := COALESCE(v_settings.invoice_prefix, 'INV') || '-' ||
              TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
              LPAD(v_settings.next_invoice_number::TEXT, 5, '0');

  -- Increment next number
  UPDATE attorney_billing_settings
  SET next_invoice_number = next_invoice_number + 1
  WHERE attorney_id = p_attorney_id;

  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to round time to increment
CREATE OR REPLACE FUNCTION round_time_to_increment(
  p_minutes INTEGER,
  p_increment INTEGER DEFAULT 6,
  p_round_up BOOLEAN DEFAULT true
)
RETURNS INTEGER AS $$
BEGIN
  IF p_round_up THEN
    RETURN CEIL(p_minutes::DECIMAL / p_increment) * p_increment;
  ELSE
    RETURN ROUND(p_minutes::DECIMAL / p_increment) * p_increment;
  END IF;
END;
$$ LANGUAGE plpgsql;
