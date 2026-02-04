-- Migration: Add Division Scenarios for Property Division Planner
-- Session 8 Checkpoint 3

-- Division Scenarios table
CREATE TABLE IF NOT EXISTS division_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- JSON mapping of asset/debt assignments
  -- Format: { "asset_id": "client" | "spouse" | "sell" }
  asset_assignments JSONB DEFAULT '{}'::jsonb,
  debt_assignments JSONB DEFAULT '{}'::jsonb,

  -- Calculated totals (denormalized for quick access)
  client_asset_total DECIMAL(15,2) DEFAULT 0,
  client_debt_total DECIMAL(15,2) DEFAULT 0,
  spouse_asset_total DECIMAL(15,2) DEFAULT 0,
  spouse_debt_total DECIMAL(15,2) DEFAULT 0,

  -- Net values
  client_net_total DECIMAL(15,2) GENERATED ALWAYS AS (client_asset_total - client_debt_total) STORED,
  spouse_net_total DECIMAL(15,2) GENERATED ALWAYS AS (spouse_asset_total - spouse_debt_total) STORED,

  -- Equalization
  equalization_amount DECIMAL(15,2) DEFAULT 0,
  equalization_payer VARCHAR(20) CHECK (equalization_payer IN ('client', 'spouse', 'none')),

  -- Status
  is_preferred BOOLEAN DEFAULT false,
  is_final BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one preferred scenario per case
CREATE UNIQUE INDEX idx_division_scenarios_preferred
ON division_scenarios(case_id)
WHERE is_preferred = true;

-- Index for case lookups
CREATE INDEX idx_division_scenarios_case ON division_scenarios(case_id);

-- RLS Policies
ALTER TABLE division_scenarios ENABLE ROW LEVEL SECURITY;

-- Attorneys can manage all scenarios for their cases
CREATE POLICY division_scenarios_attorney_all ON division_scenarios
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = division_scenarios.case_id
      AND cases.attorney_id = auth.uid()
    )
  );

-- Clients can view scenarios for their cases
CREATE POLICY division_scenarios_client_select ON division_scenarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = division_scenarios.case_id
      AND cases.client_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_division_scenario_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER division_scenarios_updated_at
  BEFORE UPDATE ON division_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_division_scenario_timestamp();

-- Function to calculate scenario totals
CREATE OR REPLACE FUNCTION calculate_division_totals(scenario_id UUID)
RETURNS void AS $$
DECLARE
  v_client_assets DECIMAL(15,2) := 0;
  v_client_debts DECIMAL(15,2) := 0;
  v_spouse_assets DECIMAL(15,2) := 0;
  v_spouse_debts DECIMAL(15,2) := 0;
  v_scenario RECORD;
  v_asset RECORD;
  v_debt RECORD;
  v_assignment TEXT;
BEGIN
  -- Get scenario
  SELECT * INTO v_scenario FROM division_scenarios WHERE id = scenario_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate asset totals
  FOR v_asset IN SELECT id, estimated_value FROM assets WHERE case_id = v_scenario.case_id
  LOOP
    v_assignment := v_scenario.asset_assignments->>v_asset.id::text;
    IF v_assignment = 'client' THEN
      v_client_assets := v_client_assets + COALESCE(v_asset.estimated_value, 0);
    ELSIF v_assignment = 'spouse' THEN
      v_spouse_assets := v_spouse_assets + COALESCE(v_asset.estimated_value, 0);
    END IF;
  END LOOP;

  -- Calculate debt totals
  FOR v_debt IN SELECT id, current_balance FROM debts WHERE case_id = v_scenario.case_id
  LOOP
    v_assignment := v_scenario.debt_assignments->>v_debt.id::text;
    IF v_assignment = 'client' THEN
      v_client_debts := v_client_debts + COALESCE(v_debt.current_balance, 0);
    ELSIF v_assignment = 'spouse' THEN
      v_spouse_debts := v_spouse_debts + COALESCE(v_debt.current_balance, 0);
    END IF;
  END LOOP;

  -- Update scenario
  UPDATE division_scenarios
  SET
    client_asset_total = v_client_assets,
    client_debt_total = v_client_debts,
    spouse_asset_total = v_spouse_assets,
    spouse_debt_total = v_spouse_debts,
    equalization_amount = ABS((v_client_assets - v_client_debts) - (v_spouse_assets - v_spouse_debts)) / 2,
    equalization_payer = CASE
      WHEN (v_client_assets - v_client_debts) > (v_spouse_assets - v_spouse_debts) THEN 'client'
      WHEN (v_spouse_assets - v_spouse_debts) > (v_client_assets - v_client_debts) THEN 'spouse'
      ELSE 'none'
    END
  WHERE id = scenario_id;
END;
$$ LANGUAGE plpgsql;
