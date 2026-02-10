-- Migration: Add Payment Processing & Trust Accounts
-- Session 11 Checkpoint 2: Payment Processing & Trust Account Management

-- Enum for payment methods
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'credit_card',
    'ach',
    'check',
    'cash',
    'wire',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for payment status
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'refunded',
    'partially_refunded',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for trust transaction types
DO $$ BEGIN
  CREATE TYPE trust_transaction_type AS ENUM (
    'deposit',
    'withdrawal',
    'adjustment',
    'interest',
    'refund',
    'fee'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Payment details
  payment_method payment_method NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,

  -- Status
  status payment_status NOT NULL DEFAULT 'pending',
  failure_reason TEXT,

  -- Refund tracking
  refund_amount NUMERIC(10,2) DEFAULT 0,
  refunded_at TIMESTAMPTZ,

  -- Fee tracking
  transaction_fee NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(10,2), -- amount - transaction_fee

  -- Check/ACH specific
  check_number TEXT,
  bank_name TEXT,

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved payment methods (for returning clients)
CREATE TABLE IF NOT EXISTS saved_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe reference
  stripe_payment_method_id TEXT NOT NULL,
  stripe_customer_id TEXT,

  -- Card details (non-sensitive, for display)
  card_brand TEXT, -- 'visa', 'mastercard', 'amex', etc.
  card_last_four TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Settings
  is_default BOOLEAN DEFAULT false,
  nickname TEXT, -- User-friendly name like "Personal Visa"

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Accounts (one per case)
CREATE TABLE IF NOT EXISTS trust_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE UNIQUE,

  -- Balance tracking
  opening_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Aggregate tracking
  total_deposits NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_withdrawals NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_interest NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Status
  last_transaction_date TIMESTAMPTZ,
  last_reconciled_at TIMESTAMPTZ,
  last_reconciled_by UUID REFERENCES auth.users(id),

  -- Minimum balance requirement (if any)
  minimum_balance NUMERIC(10,2) DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Transactions (ledger entries)
CREATE TABLE IF NOT EXISTS trust_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id UUID NOT NULL REFERENCES trust_accounts(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type trust_transaction_type NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  balance_after NUMERIC(10,2) NOT NULL, -- Running balance after this transaction

  -- Timing
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Description
  description TEXT NOT NULL,

  -- References
  reference_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  reference_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

  -- Approval workflow (for withdrawals)
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment receipts (for email/PDF generation)
CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,

  receipt_number TEXT NOT NULL UNIQUE,
  pdf_path TEXT, -- Supabase Storage path

  sent_at TIMESTAMPTZ,
  sent_to_email TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_user ON saved_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_stripe ON saved_payment_methods(stripe_payment_method_id);

CREATE INDEX IF NOT EXISTS idx_trust_accounts_case ON trust_accounts(case_id);

CREATE INDEX IF NOT EXISTS idx_trust_transactions_account ON trust_transactions(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_trust_transactions_case ON trust_transactions(case_id);
CREATE INDEX IF NOT EXISTS idx_trust_transactions_date ON trust_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_trust_transactions_type ON trust_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment ON payment_receipts(payment_id);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Payments: Attorneys can manage, clients can view their payments
DROP POLICY IF EXISTS payments_attorney_all ON payments;
CREATE POLICY payments_attorney_all ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN cases c ON c.id = i.case_id
      WHERE i.id = payments.invoice_id
      AND c.attorney_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS payments_client_view ON payments;
CREATE POLICY payments_client_view ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN cases c ON c.id = i.case_id
      WHERE i.id = payments.invoice_id
      AND c.client_id = auth.uid()
    )
  );

-- Clients can insert payments (make payments)
DROP POLICY IF EXISTS payments_client_insert ON payments;
CREATE POLICY payments_client_insert ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN cases c ON c.id = i.case_id
      WHERE i.id = payments.invoice_id
      AND c.client_id = auth.uid()
    )
  );

-- Saved Payment Methods: Users can only manage their own
DROP POLICY IF EXISTS saved_payment_methods_owner ON saved_payment_methods;
CREATE POLICY saved_payment_methods_owner ON saved_payment_methods
  FOR ALL
  USING (user_id = auth.uid());

-- Trust Accounts: Only attorneys
DROP POLICY IF EXISTS trust_accounts_attorney ON trust_accounts;
CREATE POLICY trust_accounts_attorney ON trust_accounts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = trust_accounts.case_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Trust Transactions: Only attorneys
DROP POLICY IF EXISTS trust_transactions_attorney ON trust_transactions;
CREATE POLICY trust_transactions_attorney ON trust_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = trust_transactions.case_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Payment Receipts: Attorneys and clients
DROP POLICY IF EXISTS payment_receipts_attorney ON payment_receipts;
CREATE POLICY payment_receipts_attorney ON payment_receipts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      JOIN cases c ON c.id = i.case_id
      WHERE p.id = payment_receipts.payment_id
      AND c.attorney_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS payment_receipts_client ON payment_receipts;
CREATE POLICY payment_receipts_client ON payment_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      JOIN cases c ON c.id = i.case_id
      WHERE p.id = payment_receipts.payment_id
      AND c.client_id = auth.uid()
    )
  );

-- Triggers

-- Update timestamp triggers
DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

DROP TRIGGER IF EXISTS saved_payment_methods_updated_at ON saved_payment_methods;
CREATE TRIGGER saved_payment_methods_updated_at
  BEFORE UPDATE ON saved_payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

DROP TRIGGER IF EXISTS trust_accounts_updated_at ON trust_accounts;
CREATE TRIGGER trust_accounts_updated_at
  BEFORE UPDATE ON trust_accounts
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

-- Calculate net amount on payment
CREATE OR REPLACE FUNCTION calculate_payment_net_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_amount = NEW.amount - COALESCE(NEW.transaction_fee, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_calculate_net ON payments;
CREATE TRIGGER payment_calculate_net
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION calculate_payment_net_amount();

-- Ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE saved_payment_methods
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_payment ON saved_payment_methods;
CREATE TRIGGER ensure_single_default_payment
  AFTER INSERT OR UPDATE ON saved_payment_methods
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- Prevent negative trust balance
CREATE OR REPLACE FUNCTION validate_trust_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_balance < 0 THEN
    RAISE EXCEPTION 'Trust account balance cannot be negative';
  END IF;

  IF NEW.current_balance < NEW.minimum_balance THEN
    RAISE WARNING 'Trust account balance is below minimum required balance';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_trust_balance_trigger ON trust_accounts;
CREATE TRIGGER validate_trust_balance_trigger
  BEFORE UPDATE ON trust_accounts
  FOR EACH ROW EXECUTE FUNCTION validate_trust_balance();

-- Function to create trust account for a case (idempotent)
CREATE OR REPLACE FUNCTION get_or_create_trust_account(p_case_id UUID)
RETURNS UUID AS $$
DECLARE
  v_trust_id UUID;
BEGIN
  SELECT id INTO v_trust_id FROM trust_accounts WHERE case_id = p_case_id;

  IF NOT FOUND THEN
    INSERT INTO trust_accounts (case_id, opening_balance, current_balance)
    VALUES (p_case_id, 0, 0)
    RETURNING id INTO v_trust_id;
  END IF;

  RETURN v_trust_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record trust transaction and update balance
CREATE OR REPLACE FUNCTION record_trust_transaction(
  p_case_id UUID,
  p_transaction_type trust_transaction_type,
  p_amount NUMERIC(10,2),
  p_description TEXT,
  p_created_by UUID,
  p_reference_invoice_id UUID DEFAULT NULL,
  p_reference_payment_id UUID DEFAULT NULL,
  p_requires_approval BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_trust_account_id UUID;
  v_current_balance NUMERIC(10,2);
  v_new_balance NUMERIC(10,2);
  v_transaction_id UUID;
BEGIN
  -- Get or create trust account
  v_trust_account_id := get_or_create_trust_account(p_case_id);

  -- Get current balance
  SELECT current_balance INTO v_current_balance
  FROM trust_accounts WHERE id = v_trust_account_id FOR UPDATE;

  -- Calculate new balance
  IF p_transaction_type IN ('deposit', 'interest') THEN
    v_new_balance := v_current_balance + p_amount;
  ELSIF p_transaction_type IN ('withdrawal', 'refund', 'fee') THEN
    v_new_balance := v_current_balance - p_amount;

    -- Prevent negative balance
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient trust balance. Current: %, Requested: %', v_current_balance, p_amount;
    END IF;
  ELSE -- adjustment
    v_new_balance := v_current_balance + p_amount; -- Can be positive or negative
  END IF;

  -- Insert transaction
  INSERT INTO trust_transactions (
    trust_account_id, case_id, transaction_type, amount,
    balance_after, description, reference_invoice_id, reference_payment_id,
    requires_approval, created_by
  ) VALUES (
    v_trust_account_id, p_case_id, p_transaction_type, p_amount,
    v_new_balance, p_description, p_reference_invoice_id, p_reference_payment_id,
    p_requires_approval, p_created_by
  ) RETURNING id INTO v_transaction_id;

  -- Update trust account
  UPDATE trust_accounts SET
    current_balance = v_new_balance,
    total_deposits = CASE WHEN p_transaction_type = 'deposit' THEN total_deposits + p_amount ELSE total_deposits END,
    total_withdrawals = CASE WHEN p_transaction_type = 'withdrawal' THEN total_withdrawals + p_amount ELSE total_withdrawals END,
    total_interest = CASE WHEN p_transaction_type = 'interest' THEN total_interest + p_amount ELSE total_interest END,
    last_transaction_date = NOW()
  WHERE id = v_trust_account_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'RCP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
         LPAD(nextval('receipt_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create sequence for receipt numbers if not exists
DO $$ BEGIN
  CREATE SEQUENCE receipt_number_seq START 1;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
