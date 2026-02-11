-- Session 12 Checkpoint 2: Property Division & Support Calculators
-- Migration for property division scenarios and support calculations

-- Division method enum
DO $$ BEGIN
  CREATE TYPE division_method AS ENUM ('community_property', 'equitable_distribution');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Property division scenarios table
CREATE TABLE IF NOT EXISTS property_division_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL DEFAULT 'Initial Proposal',
  state_code TEXT NOT NULL,
  division_method division_method NOT NULL,
  assets_classification JSONB NOT NULL DEFAULT '{}',
  division_percentages JSONB NOT NULL DEFAULT '{}',
  justification TEXT,
  calculations JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support calculations table (stores child support & spousal support results)
CREATE TABLE IF NOT EXISTS support_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('child_support', 'spousal_support')),
  state_code TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}',
  results JSONB NOT NULL DEFAULT '{}',
  overrides JSONB DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_division_case ON property_division_scenarios(case_id);
CREATE INDEX IF NOT EXISTS idx_support_calculations_case ON support_calculations(case_id);
CREATE INDEX IF NOT EXISTS idx_support_calculations_type ON support_calculations(case_id, calculation_type);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_property_division_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_property_division_updated_at ON property_division_scenarios;
CREATE TRIGGER trigger_property_division_updated_at
  BEFORE UPDATE ON property_division_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_property_division_updated_at();

DROP TRIGGER IF EXISTS trigger_support_calculations_updated_at ON support_calculations;
CREATE TRIGGER trigger_support_calculations_updated_at
  BEFORE UPDATE ON support_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_property_division_updated_at();

-- RLS policies
ALTER TABLE property_division_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_calculations ENABLE ROW LEVEL SECURITY;

-- Attorneys can manage all scenarios for their cases
CREATE POLICY "Attorneys can manage property division scenarios"
  ON property_division_scenarios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Attorneys can manage support calculations"
  ON support_calculations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Clients can view scenarios for their cases
CREATE POLICY "Clients can view property division scenarios"
  ON property_division_scenarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = property_division_scenarios.case_id
      AND cases.client_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view support calculations"
  ON support_calculations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = support_calculations.case_id
      AND cases.client_id = auth.uid()
    )
  );
