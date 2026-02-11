-- Migration: State-Specific Divorce Law Database
-- Session 12 Checkpoint 1: State Law Database & Form Selection

-- Enum for law categories
DO $$ BEGIN
  CREATE TYPE law_category AS ENUM (
    'residency',
    'waiting_period',
    'property_division',
    'custody',
    'child_support',
    'spousal_support',
    'grounds',
    'filing_procedure'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for form types
DO $$ BEGIN
  CREATE TYPE form_type AS ENUM (
    'petition',
    'summons',
    'response',
    'financial_disclosure',
    'custody',
    'support',
    'property',
    'judgment',
    'service',
    'discovery',
    'motion',
    'declaration',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- State Laws table
CREATE TABLE IF NOT EXISTS state_laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  law_category law_category NOT NULL,
  law_name TEXT NOT NULL,
  law_value JSONB NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  source_citation TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(state_code, law_category, law_name)
);

-- State Forms table
CREATE TABLE IF NOT EXISTS state_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  form_number TEXT NOT NULL,
  form_name TEXT NOT NULL,
  form_type form_type NOT NULL,
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  required_when JSONB NOT NULL DEFAULT '{"always": true}',
  order_in_process INTEGER NOT NULL DEFAULT 0,
  court_fee NUMERIC(10,2) DEFAULT 0,
  instructions_url TEXT,
  sample_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(state_code, form_number)
);

-- State Counties table
CREATE TABLE IF NOT EXISTS state_counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  county_name TEXT NOT NULL,
  court_name TEXT NOT NULL,
  court_address TEXT,
  court_phone TEXT,
  efiling_system TEXT,
  efiling_url TEXT,
  local_rules_url TEXT,
  filing_fees JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(state_code, county_name)
);

-- Residency Checks table (per-case verification records)
CREATE TABLE IF NOT EXISTS residency_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  state_code TEXT NOT NULL,

  -- Results
  state_residency_days INTEGER NOT NULL DEFAULT 0,
  county_residency_days INTEGER NOT NULL DEFAULT 0,
  meets_state_requirement BOOLEAN NOT NULL DEFAULT false,
  meets_county_requirement BOOLEAN NOT NULL DEFAULT false,
  can_file_on DATE,

  -- Evidence
  evidence JSONB DEFAULT '[]',
  missing_documents JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',

  -- Audit
  checked_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_state_laws_state ON state_laws(state_code);
CREATE INDEX IF NOT EXISTS idx_state_laws_category ON state_laws(state_code, law_category);
CREATE INDEX IF NOT EXISTS idx_state_laws_active ON state_laws(state_code) WHERE expiration_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_state_forms_state ON state_forms(state_code);
CREATE INDEX IF NOT EXISTS idx_state_forms_type ON state_forms(state_code, form_type);
CREATE INDEX IF NOT EXISTS idx_state_forms_order ON state_forms(state_code, order_in_process);

CREATE INDEX IF NOT EXISTS idx_state_counties_state ON state_counties(state_code);

CREATE INDEX IF NOT EXISTS idx_residency_checks_case ON residency_checks(case_id);

-- Enable RLS
ALTER TABLE state_laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE residency_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- State laws: everyone can read
DROP POLICY IF EXISTS state_laws_read ON state_laws;
CREATE POLICY state_laws_read ON state_laws
  FOR SELECT USING (true);

-- State forms: everyone can read
DROP POLICY IF EXISTS state_forms_read ON state_forms;
CREATE POLICY state_forms_read ON state_forms
  FOR SELECT USING (true);

-- State counties: everyone can read
DROP POLICY IF EXISTS state_counties_read ON state_counties;
CREATE POLICY state_counties_read ON state_counties
  FOR SELECT USING (true);

-- Residency checks: attorneys on their cases
DROP POLICY IF EXISTS residency_checks_attorney ON residency_checks;
CREATE POLICY residency_checks_attorney ON residency_checks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = residency_checks.case_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Triggers
DROP TRIGGER IF EXISTS state_laws_updated_at ON state_laws;
CREATE TRIGGER state_laws_updated_at
  BEFORE UPDATE ON state_laws
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();
