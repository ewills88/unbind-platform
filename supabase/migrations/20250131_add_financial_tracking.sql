-- Session 8: Financial Tracking & Asset Management System
-- Checkpoint 1: Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. ENUMS FOR FINANCIAL TRACKING
-- ============================================

-- Asset categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_category') THEN
    CREATE TYPE asset_category AS ENUM (
      'real_estate',
      'vehicle',
      'bank_account',
      'retirement',
      'investment',
      'business',
      'personal_property',
      'other'
    );
  END IF;
END $$;

-- Debt categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'debt_category') THEN
    CREATE TYPE debt_category AS ENUM (
      'mortgage',
      'auto_loan',
      'credit_card',
      'student_loan',
      'personal_loan',
      'tax_obligation',
      'other'
    );
  END IF;
END $$;

-- Ownership type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ownership_type') THEN
    CREATE TYPE ownership_type AS ENUM (
      'community',
      'separate_husband',
      'separate_wife',
      'disputed'
    );
  END IF;
END $$;

-- Division proposal
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'division_proposal') THEN
    CREATE TYPE division_proposal AS ENUM (
      'to_husband',
      'to_wife',
      'sell_and_split',
      'split_in_kind',
      'undecided'
    );
  END IF;
END $$;

-- Income source types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'income_source_type') THEN
    CREATE TYPE income_source_type AS ENUM (
      'salary',
      'bonus',
      'self_employment',
      'rental',
      'investment',
      'retirement',
      'spousal_support',
      'child_support',
      'other'
    );
  END IF;
END $$;

-- Expense categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category') THEN
    CREATE TYPE expense_category AS ENUM (
      'housing',
      'utilities',
      'transportation',
      'food',
      'childcare',
      'education',
      'healthcare',
      'insurance',
      'debt_payment',
      'personal',
      'entertainment',
      'other'
    );
  END IF;
END $$;

-- Spouse identifier
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'spouse_identifier') THEN
    CREATE TYPE spouse_identifier AS ENUM (
      'husband',
      'wife',
      'joint'
    );
  END IF;
END $$;

-- Payment frequency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_frequency') THEN
    CREATE TYPE payment_frequency AS ENUM (
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'annually',
      'one_time'
    );
  END IF;
END $$;

-- ============================================
-- 2. ASSETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  category asset_category NOT NULL DEFAULT 'other',

  -- Ownership & division
  ownership ownership_type NOT NULL DEFAULT 'community',
  division_proposal division_proposal DEFAULT 'undecided',

  -- Valuation
  current_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  original_value DECIMAL(15, 2),
  acquired_date DATE,
  valuation_date DATE,
  valuation_method TEXT, -- 'appraisal', 'estimate', 'statement', 'market'

  -- Real estate specific
  property_address TEXT,

  -- Vehicle specific
  vehicle_year INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_vin TEXT,

  -- Account specific
  institution_name TEXT,
  account_number_last4 VARCHAR(4),

  -- Documentation
  supporting_document_ids UUID[] DEFAULT '{}',

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_case ON assets(case_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_ownership ON assets(ownership);

-- ============================================
-- 3. DEBTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Basic info
  creditor_name TEXT NOT NULL,
  description TEXT,
  category debt_category NOT NULL DEFAULT 'other',
  account_number_last4 VARCHAR(4),

  -- Amounts
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  original_balance DECIMAL(15, 2),
  monthly_payment DECIMAL(15, 2),
  interest_rate DECIMAL(5, 2),

  -- Responsibility & division
  responsibility ownership_type NOT NULL DEFAULT 'community',
  division_proposal division_proposal DEFAULT 'undecided',

  -- Dates
  opened_date DATE,
  maturity_date DATE,

  -- Documentation
  supporting_document_ids UUID[] DEFAULT '{}',

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_debts_case ON debts(case_id);
CREATE INDEX IF NOT EXISTS idx_debts_category ON debts(category);
CREATE INDEX IF NOT EXISTS idx_debts_responsibility ON debts(responsibility);

-- ============================================
-- 4. INCOME SOURCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Who
  spouse spouse_identifier NOT NULL,

  -- Source details
  source_type income_source_type NOT NULL DEFAULT 'other',
  source_name TEXT, -- Employer name, property address, etc.
  description TEXT,

  -- Amounts
  gross_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15, 2),
  frequency payment_frequency NOT NULL DEFAULT 'monthly',

  -- For employment income
  employer_name TEXT,
  job_title TEXT,
  start_date DATE,

  -- Documentation
  supporting_document_ids UUID[] DEFAULT '{}',

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_income_case ON income_sources(case_id);
CREATE INDEX IF NOT EXISTS idx_income_spouse ON income_sources(spouse);
CREATE INDEX IF NOT EXISTS idx_income_type ON income_sources(source_type);

-- ============================================
-- 5. EXPENSE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Who pays
  spouse spouse_identifier NOT NULL,

  -- Expense details
  category expense_category NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,

  -- Amounts
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  frequency payment_frequency NOT NULL DEFAULT 'monthly',

  -- Documentation
  supporting_document_ids UUID[] DEFAULT '{}',

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_case ON expense_items(case_id);
CREATE INDEX IF NOT EXISTS idx_expenses_spouse ON expense_items(spouse);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expense_items(category);

-- ============================================
-- 6. DIVISION SCENARIOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS division_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Scenario info
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE, -- Mark the preferred scenario

  -- Division allocations (JSON for flexibility)
  asset_allocations JSONB NOT NULL DEFAULT '{}',
  debt_allocations JSONB NOT NULL DEFAULT '{}',

  -- Calculated totals (stored for quick access)
  husband_assets_total DECIMAL(15, 2) DEFAULT 0,
  wife_assets_total DECIMAL(15, 2) DEFAULT 0,
  husband_debts_total DECIMAL(15, 2) DEFAULT 0,
  wife_debts_total DECIMAL(15, 2) DEFAULT 0,
  husband_net_total DECIMAL(15, 2) DEFAULT 0,
  wife_net_total DECIMAL(15, 2) DEFAULT 0,
  equalization_payment DECIMAL(15, 2) DEFAULT 0,
  equalization_from spouse_identifier,

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scenarios_case ON division_scenarios(case_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_active ON division_scenarios(case_id, is_active) WHERE is_active = TRUE;

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE division_scenarios ENABLE ROW LEVEL SECURITY;

-- Assets policies
CREATE POLICY "Users can view assets in their cases"
  ON assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = assets.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can create assets in their cases"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update assets in their cases"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = assets.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete assets in their cases"
  ON assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = assets.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Debts policies
CREATE POLICY "Users can view debts in their cases"
  ON debts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = debts.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can create debts in their cases"
  ON debts FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update debts in their cases"
  ON debts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = debts.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete debts in their cases"
  ON debts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = debts.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Income sources policies
CREATE POLICY "Users can view income in their cases"
  ON income_sources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = income_sources.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can create income in their cases"
  ON income_sources FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update income in their cases"
  ON income_sources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = income_sources.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete income in their cases"
  ON income_sources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = income_sources.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Expense items policies
CREATE POLICY "Users can view expenses in their cases"
  ON expense_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = expense_items.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can create expenses in their cases"
  ON expense_items FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update expenses in their cases"
  ON expense_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = expense_items.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete expenses in their cases"
  ON expense_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = expense_items.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Division scenarios policies
CREATE POLICY "Users can view scenarios in their cases"
  ON division_scenarios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = division_scenarios.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can create scenarios in their cases"
  ON division_scenarios FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update scenarios in their cases"
  ON division_scenarios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = division_scenarios.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete scenarios in their cases"
  ON division_scenarios FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = division_scenarios.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- ============================================
-- 8. UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_financial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assets_updated_at ON assets;
CREATE TRIGGER trigger_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_updated_at();

DROP TRIGGER IF EXISTS trigger_debts_updated_at ON debts;
CREATE TRIGGER trigger_debts_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_updated_at();

DROP TRIGGER IF EXISTS trigger_income_updated_at ON income_sources;
CREATE TRIGGER trigger_income_updated_at
  BEFORE UPDATE ON income_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_updated_at();

DROP TRIGGER IF EXISTS trigger_expenses_updated_at ON expense_items;
CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON expense_items
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_updated_at();

DROP TRIGGER IF EXISTS trigger_scenarios_updated_at ON division_scenarios;
CREATE TRIGGER trigger_scenarios_updated_at
  BEFORE UPDATE ON division_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_updated_at();

-- ============================================
-- 9. FINANCIAL SUMMARY FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_financial_summary(p_case_id UUID)
RETURNS TABLE (
  -- Asset totals
  total_assets DECIMAL(15, 2),
  community_assets DECIMAL(15, 2),
  husband_separate_assets DECIMAL(15, 2),
  wife_separate_assets DECIMAL(15, 2),
  disputed_assets DECIMAL(15, 2),

  -- Debt totals
  total_debts DECIMAL(15, 2),
  community_debts DECIMAL(15, 2),
  husband_separate_debts DECIMAL(15, 2),
  wife_separate_debts DECIMAL(15, 2),
  disputed_debts DECIMAL(15, 2),

  -- Net values
  net_community_estate DECIMAL(15, 2),

  -- Income totals (monthly)
  husband_monthly_income DECIMAL(15, 2),
  wife_monthly_income DECIMAL(15, 2),
  total_monthly_income DECIMAL(15, 2),

  -- Expense totals (monthly)
  husband_monthly_expenses DECIMAL(15, 2),
  wife_monthly_expenses DECIMAL(15, 2),
  total_monthly_expenses DECIMAL(15, 2),

  -- Counts
  asset_count INTEGER,
  debt_count INTEGER,
  income_count INTEGER,
  expense_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH asset_totals AS (
    SELECT
      COALESCE(SUM(current_value), 0) as total,
      COALESCE(SUM(CASE WHEN ownership = 'community' THEN current_value ELSE 0 END), 0) as community,
      COALESCE(SUM(CASE WHEN ownership = 'separate_husband' THEN current_value ELSE 0 END), 0) as husband,
      COALESCE(SUM(CASE WHEN ownership = 'separate_wife' THEN current_value ELSE 0 END), 0) as wife,
      COALESCE(SUM(CASE WHEN ownership = 'disputed' THEN current_value ELSE 0 END), 0) as disputed,
      COUNT(*) as cnt
    FROM assets WHERE case_id = p_case_id
  ),
  debt_totals AS (
    SELECT
      COALESCE(SUM(current_balance), 0) as total,
      COALESCE(SUM(CASE WHEN responsibility = 'community' THEN current_balance ELSE 0 END), 0) as community,
      COALESCE(SUM(CASE WHEN responsibility = 'separate_husband' THEN current_balance ELSE 0 END), 0) as husband,
      COALESCE(SUM(CASE WHEN responsibility = 'separate_wife' THEN current_balance ELSE 0 END), 0) as wife,
      COALESCE(SUM(CASE WHEN responsibility = 'disputed' THEN current_balance ELSE 0 END), 0) as disputed,
      COUNT(*) as cnt
    FROM debts WHERE case_id = p_case_id
  ),
  income_totals AS (
    SELECT
      COALESCE(SUM(CASE
        WHEN spouse = 'husband' THEN
          CASE frequency
            WHEN 'weekly' THEN gross_amount * 4.33
            WHEN 'biweekly' THEN gross_amount * 2.17
            WHEN 'monthly' THEN gross_amount
            WHEN 'quarterly' THEN gross_amount / 3
            WHEN 'annually' THEN gross_amount / 12
            ELSE gross_amount
          END
        ELSE 0
      END), 0) as husband_monthly,
      COALESCE(SUM(CASE
        WHEN spouse = 'wife' THEN
          CASE frequency
            WHEN 'weekly' THEN gross_amount * 4.33
            WHEN 'biweekly' THEN gross_amount * 2.17
            WHEN 'monthly' THEN gross_amount
            WHEN 'quarterly' THEN gross_amount / 3
            WHEN 'annually' THEN gross_amount / 12
            ELSE gross_amount
          END
        ELSE 0
      END), 0) as wife_monthly,
      COUNT(*) as cnt
    FROM income_sources WHERE case_id = p_case_id
  ),
  expense_totals AS (
    SELECT
      COALESCE(SUM(CASE
        WHEN spouse = 'husband' THEN
          CASE frequency
            WHEN 'weekly' THEN amount * 4.33
            WHEN 'biweekly' THEN amount * 2.17
            WHEN 'monthly' THEN amount
            WHEN 'quarterly' THEN amount / 3
            WHEN 'annually' THEN amount / 12
            ELSE amount
          END
        ELSE 0
      END), 0) as husband_monthly,
      COALESCE(SUM(CASE
        WHEN spouse = 'wife' THEN
          CASE frequency
            WHEN 'weekly' THEN amount * 4.33
            WHEN 'biweekly' THEN amount * 2.17
            WHEN 'monthly' THEN amount
            WHEN 'quarterly' THEN amount / 3
            WHEN 'annually' THEN amount / 12
            ELSE amount
          END
        ELSE 0
      END), 0) as wife_monthly,
      COUNT(*) as cnt
    FROM expense_items WHERE case_id = p_case_id
  )
  SELECT
    a.total::DECIMAL(15,2),
    a.community::DECIMAL(15,2),
    a.husband::DECIMAL(15,2),
    a.wife::DECIMAL(15,2),
    a.disputed::DECIMAL(15,2),
    d.total::DECIMAL(15,2),
    d.community::DECIMAL(15,2),
    d.husband::DECIMAL(15,2),
    d.wife::DECIMAL(15,2),
    d.disputed::DECIMAL(15,2),
    (a.community - d.community)::DECIMAL(15,2),
    i.husband_monthly::DECIMAL(15,2),
    i.wife_monthly::DECIMAL(15,2),
    (i.husband_monthly + i.wife_monthly)::DECIMAL(15,2),
    e.husband_monthly::DECIMAL(15,2),
    e.wife_monthly::DECIMAL(15,2),
    (e.husband_monthly + e.wife_monthly)::DECIMAL(15,2),
    a.cnt::INTEGER,
    d.cnt::INTEGER,
    i.cnt::INTEGER,
    e.cnt::INTEGER
  FROM asset_totals a, debt_totals d, income_totals i, expense_totals e;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. UPDATE CASES TABLE FOR FINANCIAL TOTALS
-- ============================================

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS total_assets_disclosed DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_debts_disclosed DECIMAL(15, 2) DEFAULT 0;
