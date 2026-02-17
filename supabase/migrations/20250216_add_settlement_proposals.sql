-- Session 17 Checkpoint 1: Settlement Proposal Builder & Comparison
-- Proposal creation, property division, support terms, custody, negotiation tracking

-- ============================================================================
-- Settlement Proposals
-- ============================================================================
CREATE TABLE IF NOT EXISTS settlement_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  proposal_number INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  created_by_party TEXT NOT NULL DEFAULT 'our_client' CHECK (created_by_party IN (
    'our_client', 'opposing'
  )),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'received', 'countered', 'accepted', 'rejected', 'expired', 'withdrawn'
  )),
  sent_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ,
  response_deadline TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ,
  cover_letter TEXT,
  total_to_husband NUMERIC DEFAULT 0,
  total_to_wife NUMERIC DEFAULT 0,
  equalization_payment NUMERIC DEFAULT 0,
  equalization_payor TEXT,
  monthly_support_husband_pays NUMERIC DEFAULT 0,
  monthly_support_wife_pays NUMERIC DEFAULT 0,
  support_duration_months INTEGER,
  summary TEXT,
  parent_proposal_id UUID REFERENCES settlement_proposals(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settlement_proposals_case ON settlement_proposals(case_id);
CREATE INDEX idx_settlement_proposals_status ON settlement_proposals(status);
CREATE INDEX idx_settlement_proposals_parent ON settlement_proposals(parent_proposal_id);

-- ============================================================================
-- Proposal Property Items (asset/debt allocations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposal_property_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES settlement_proposals(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('asset', 'debt')),
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  debt_id UUID REFERENCES debts(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  category TEXT,
  gross_value NUMERIC NOT NULL DEFAULT 0,
  encumbrance NUMERIC DEFAULT 0,
  net_value NUMERIC NOT NULL DEFAULT 0,
  characterization TEXT DEFAULT 'community' CHECK (characterization IN (
    'community', 'separate_h', 'separate_w', 'mixed'
  )),
  separate_property_trace TEXT,
  allocated_to TEXT NOT NULL DEFAULT 'split' CHECK (allocated_to IN (
    'husband', 'wife', 'sell', 'split'
  )),
  allocation_percentage NUMERIC DEFAULT 50,
  husband_receives NUMERIC DEFAULT 0,
  wife_receives NUMERIC DEFAULT 0,
  notes TEXT,
  display_order INTEGER DEFAULT 0
);

CREATE INDEX idx_proposal_property_proposal ON proposal_property_items(proposal_id);

-- ============================================================================
-- Proposal Spousal Support
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposal_spousal_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES settlement_proposals(id) ON DELETE CASCADE,
  support_type TEXT NOT NULL DEFAULT 'none' CHECK (support_type IN (
    'permanent', 'rehabilitative', 'bridge', 'lump_sum', 'none', 'reserved'
  )),
  payor TEXT DEFAULT 'husband' CHECK (payor IN ('husband', 'wife', 'none')),
  monthly_amount NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  duration_months INTEGER,
  duration_description TEXT,
  step_down_schedule JSONB DEFAULT '[]',
  termination_events TEXT[] DEFAULT '{}',
  cola_provision BOOLEAN DEFAULT FALSE,
  cola_index TEXT,
  tax_treatment TEXT DEFAULT 'non_deductible' CHECK (tax_treatment IN (
    'non_deductible', 'deductible_pre_2019'
  )),
  security_type TEXT DEFAULT 'none' CHECK (security_type IN (
    'none', 'life_insurance', 'bond'
  )),
  security_amount NUMERIC DEFAULT 0,
  security_beneficiary TEXT,
  modifiable BOOLEAN DEFAULT TRUE,
  jurisdiction_retained BOOLEAN DEFAULT TRUE,
  total_npv NUMERIC DEFAULT 0,
  notes TEXT
);

CREATE INDEX idx_proposal_support_proposal ON proposal_spousal_support(proposal_id);

-- ============================================================================
-- Proposal Child Support
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposal_child_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES settlement_proposals(id) ON DELETE CASCADE,
  payor TEXT DEFAULT 'husband' CHECK (payor IN ('husband', 'wife')),
  guideline_amount NUMERIC DEFAULT 0,
  proposed_amount NUMERIC DEFAULT 0,
  deviation_type TEXT DEFAULT 'none' CHECK (deviation_type IN ('none', 'upward', 'downward')),
  deviation_reason TEXT,
  payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly', 'bi_weekly')),
  children_covered JSONB DEFAULT '[]',
  health_insurance_provider TEXT DEFAULT 'husband' CHECK (health_insurance_provider IN ('husband', 'wife', 'split')),
  health_insurance_monthly_cost NUMERIC DEFAULT 0,
  unreimbursed_medical_split TEXT DEFAULT '50/50',
  childcare_provider TEXT DEFAULT 'split' CHECK (childcare_provider IN ('husband', 'wife', 'split')),
  childcare_monthly_cost NUMERIC DEFAULT 0,
  childcare_split TEXT DEFAULT '50/50',
  extracurricular_annual_cap NUMERIC,
  extracurricular_split TEXT DEFAULT '50/50',
  private_school_provisions TEXT,
  college_provisions TEXT,
  tax_exemption_allocation TEXT DEFAULT 'alternate',
  notes TEXT
);

CREATE INDEX idx_proposal_child_support_proposal ON proposal_child_support(proposal_id);

-- ============================================================================
-- Proposal Custody Terms
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposal_custody (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES settlement_proposals(id) ON DELETE CASCADE,
  legal_custody TEXT DEFAULT 'joint' CHECK (legal_custody IN ('joint', 'sole_husband', 'sole_wife')),
  physical_custody TEXT DEFAULT 'joint' CHECK (physical_custody IN ('joint', 'primary_husband', 'primary_wife')),
  husband_percentage NUMERIC DEFAULT 50,
  wife_percentage NUMERIC DEFAULT 50,
  schedule_type TEXT DEFAULT 'every_other_weekend' CHECK (schedule_type IN (
    'every_other_weekend', '5_2_2_5', 'week_on_week_off', '2_2_3', 'custom'
  )),
  schedule_description TEXT,
  schedule_details JSONB,
  holiday_schedule JSONB,
  summer_schedule TEXT,
  exchange_day TEXT,
  exchange_location TEXT,
  transportation_responsibility TEXT,
  communication_schedule TEXT,
  decision_education TEXT DEFAULT 'joint' CHECK (decision_education IN ('joint', 'husband', 'wife')),
  decision_medical TEXT DEFAULT 'joint' CHECK (decision_medical IN ('joint', 'husband', 'wife')),
  decision_religious TEXT DEFAULT 'joint' CHECK (decision_religious IN ('joint', 'husband', 'wife')),
  decision_extracurricular TEXT DEFAULT 'joint' CHECK (decision_extracurricular IN ('joint', 'husband', 'wife')),
  right_of_first_refusal_hours INTEGER,
  relocation_notice_days INTEGER DEFAULT 60,
  relocation_restriction_miles INTEGER,
  travel_provisions TEXT,
  children_names TEXT[] DEFAULT '{}',
  notes TEXT
);

CREATE INDEX idx_proposal_custody_proposal ON proposal_custody(proposal_id);

-- ============================================================================
-- Proposal Other Terms
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposal_other_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES settlement_proposals(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'name_change', 'tax_filing', 'insurance', 'attorney_fees',
    'debts', 'pets', 'personal_property', 'other'
  )),
  term_title TEXT NOT NULL,
  term_description TEXT,
  responsible_party TEXT DEFAULT 'both' CHECK (responsible_party IN ('husband', 'wife', 'both', 'na')),
  amount NUMERIC,
  notes TEXT,
  display_order INTEGER DEFAULT 0
);

CREATE INDEX idx_proposal_other_terms_proposal ON proposal_other_terms(proposal_id);

-- ============================================================================
-- Negotiation Events (timeline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS negotiation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'proposal_sent', 'proposal_received', 'counter_offer',
    'accepted', 'rejected', 'expired', 'withdrawn',
    'mediation', 'conference', 'settlement_reached'
  )),
  event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proposal_id UUID REFERENCES settlement_proposals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  participants TEXT[] DEFAULT '{}',
  movement_summary TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_negotiation_events_case ON negotiation_events(case_id);
CREATE INDEX idx_negotiation_events_date ON negotiation_events(event_date);
CREATE INDEX idx_negotiation_events_proposal ON negotiation_events(proposal_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE settlement_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_property_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_spousal_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_child_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_custody ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_other_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_events ENABLE ROW LEVEL SECURITY;

-- Settlement Proposals: access through cases
CREATE POLICY "Users can view proposals for their cases"
  ON settlement_proposals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = settlement_proposals.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = settlement_proposals.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create proposals for their cases"
  ON settlement_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = settlement_proposals.case_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = settlement_proposals.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update proposals for their cases"
  ON settlement_proposals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = settlement_proposals.case_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = settlement_proposals.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete proposals for their cases"
  ON settlement_proposals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = settlement_proposals.case_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Proposal sub-tables: access through proposal → case
CREATE POLICY "Users can view proposal property items"
  ON proposal_property_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_property_items.proposal_id
    AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN case_assignments ca ON ca.case_id = sp.case_id
    WHERE sp.id = proposal_property_items.proposal_id AND ca.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage proposal property items"
  ON proposal_property_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_property_items.proposal_id AND c.attorney_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN case_assignments ca ON ca.case_id = sp.case_id
    WHERE sp.id = proposal_property_items.proposal_id AND ca.user_id = auth.uid()
  ));

CREATE POLICY "Users can update proposal property items"
  ON proposal_property_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_property_items.proposal_id AND c.attorney_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN case_assignments ca ON ca.case_id = sp.case_id
    WHERE sp.id = proposal_property_items.proposal_id AND ca.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete proposal property items"
  ON proposal_property_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_property_items.proposal_id AND c.attorney_id = auth.uid()
  ));

-- Spousal support policies
CREATE POLICY "Users can view proposal spousal support"
  ON proposal_spousal_support FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_spousal_support.proposal_id
    AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN case_assignments ca ON ca.case_id = sp.case_id
    WHERE sp.id = proposal_spousal_support.proposal_id AND ca.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage proposal spousal support"
  ON proposal_spousal_support FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_spousal_support.proposal_id AND c.attorney_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN case_assignments ca ON ca.case_id = sp.case_id
    WHERE sp.id = proposal_spousal_support.proposal_id AND ca.user_id = auth.uid()
  ));

-- Child support policies
CREATE POLICY "Users can view proposal child support"
  ON proposal_child_support FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_child_support.proposal_id
    AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN case_assignments ca ON ca.case_id = sp.case_id
    WHERE sp.id = proposal_child_support.proposal_id AND ca.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage proposal child support"
  ON proposal_child_support FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_child_support.proposal_id AND c.attorney_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN case_assignments ca ON ca.case_id = sp.case_id
    WHERE sp.id = proposal_child_support.proposal_id AND ca.user_id = auth.uid()
  ));

-- Custody policies
CREATE POLICY "Users can view proposal custody"
  ON proposal_custody FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_custody.proposal_id
    AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN case_assignments ca ON ca.case_id = sp.case_id
    WHERE sp.id = proposal_custody.proposal_id AND ca.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage proposal custody"
  ON proposal_custody FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_custody.proposal_id AND c.attorney_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN case_assignments ca ON ca.case_id = sp.case_id
    WHERE sp.id = proposal_custody.proposal_id AND ca.user_id = auth.uid()
  ));

-- Other terms policies
CREATE POLICY "Users can view proposal other terms"
  ON proposal_other_terms FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_other_terms.proposal_id
    AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN case_assignments ca ON ca.case_id = sp.case_id
    WHERE sp.id = proposal_other_terms.proposal_id AND ca.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage proposal other terms"
  ON proposal_other_terms FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN cases c ON c.id = sp.case_id
    WHERE sp.id = proposal_other_terms.proposal_id AND c.attorney_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM settlement_proposals sp JOIN case_assignments ca ON ca.case_id = sp.case_id
    WHERE sp.id = proposal_other_terms.proposal_id AND ca.user_id = auth.uid()
  ));

-- Negotiation events: access through cases
CREATE POLICY "Users can view negotiation events"
  ON negotiation_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = negotiation_events.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    ) OR EXISTS (
      SELECT 1 FROM case_assignments ca WHERE ca.case_id = negotiation_events.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create negotiation events"
  ON negotiation_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = negotiation_events.case_id AND c.attorney_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM case_assignments ca WHERE ca.case_id = negotiation_events.case_id AND ca.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_settlement_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_settlement_proposals_updated_at
  BEFORE UPDATE ON settlement_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_settlement_proposals_updated_at();
