-- Session 17 Checkpoint 2: Negotiation Timeline, Scenario Modeling & Mediation
-- Enhance negotiation_events, add scenarios and mediation tracking

-- ============================================================================
-- Enhance Negotiation Events with new columns
-- ============================================================================
ALTER TABLE negotiation_events
  ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS from_party TEXT DEFAULT 'both' CHECK (from_party IN (
    'our_client', 'opposing', 'both', 'mediator'
  )),
  ADD COLUMN IF NOT EXISTS key_changes JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS documents UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS next_steps TEXT,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;

-- Allow more event types: drop and re-add check constraint
ALTER TABLE negotiation_events DROP CONSTRAINT IF EXISTS negotiation_events_event_type_check;
ALTER TABLE negotiation_events ADD CONSTRAINT negotiation_events_event_type_check
  CHECK (event_type IN (
    'proposal_sent', 'proposal_received', 'counter_offer',
    'accepted', 'rejected', 'expired', 'withdrawn',
    'mediation', 'conference', 'settlement_reached',
    'terms_accepted', 'terms_rejected', 'expiration',
    'extension_requested', 'extension_granted',
    'mediation_scheduled', 'mediation_completed',
    'negotiation_stalled', 'attorney_conference', 'client_meeting'
  ));

-- Update/delete policies for negotiation events
CREATE POLICY "Users can update negotiation events"
  ON negotiation_events FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = negotiation_events.case_id AND c.attorney_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM case_assignments ca WHERE ca.case_id = negotiation_events.case_id AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete negotiation events"
  ON negotiation_events FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = negotiation_events.case_id AND c.attorney_id = auth.uid()
    )
  );

-- ============================================================================
-- Settlement Scenarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS settlement_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  scenario_name TEXT NOT NULL,
  scenario_description TEXT,
  base_proposal_id UUID REFERENCES settlement_proposals(id) ON DELETE SET NULL,
  property_allocation JSONB DEFAULT '[]',
  spousal_support JSONB DEFAULT '{}',
  child_support JSONB DEFAULT '{}',
  custody_terms JSONB DEFAULT '{}',
  other_terms JSONB DEFAULT '[]',
  calculated_totals JSONB DEFAULT '{}',
  comparison_notes TEXT,
  pros TEXT[] DEFAULT '{}',
  cons TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scenarios_case ON settlement_scenarios(case_id);
CREATE INDEX idx_scenarios_archived ON settlement_scenarios(is_archived);

-- ============================================================================
-- Mediation Sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS mediation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  session_number INTEGER NOT NULL DEFAULT 1,
  session_date DATE NOT NULL,
  session_start_time TIME,
  session_end_time TIME,
  mediator_name TEXT NOT NULL,
  mediator_company TEXT,
  mediator_email TEXT,
  mediator_phone TEXT,
  location_type TEXT NOT NULL DEFAULT 'video' CHECK (location_type IN (
    'in_person', 'video', 'hybrid'
  )),
  location_address TEXT,
  video_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'continued'
  )),
  cancellation_reason TEXT,
  our_attendees TEXT[] DEFAULT '{}',
  their_attendees TEXT[] DEFAULT '{}',
  pre_session_notes TEXT,
  session_notes TEXT,
  agreements_reached JSONB DEFAULT '[]',
  open_issues JSONB DEFAULT '[]',
  next_steps TEXT,
  follow_up_deadline DATE,
  outcome TEXT CHECK (outcome IN (
    'full_settlement', 'partial_settlement', 'no_agreement', 'continued'
  )),
  total_cost NUMERIC DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mediation_case ON mediation_sessions(case_id);
CREATE INDEX idx_mediation_status ON mediation_sessions(status);
CREATE INDEX idx_mediation_date ON mediation_sessions(session_date);

-- ============================================================================
-- Mediation Positions (issue-by-issue preparation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mediation_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mediation_id UUID NOT NULL REFERENCES mediation_sessions(id) ON DELETE CASCADE,
  issue_category TEXT NOT NULL CHECK (issue_category IN (
    'property', 'spousal_support', 'child_support', 'custody', 'other'
  )),
  issue_name TEXT NOT NULL,
  our_starting_position TEXT,
  our_target TEXT,
  our_bottom_line TEXT,
  their_known_position TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'critical', 'high', 'medium', 'low', 'tradeable'
  )),
  flexibility_notes TEXT,
  batna TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  final_resolution TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_positions_mediation ON mediation_positions(mediation_id);

-- ============================================================================
-- Mediation Offers (real-time offer tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mediation_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mediation_id UUID NOT NULL REFERENCES mediation_sessions(id) ON DELETE CASCADE,
  offer_number INTEGER NOT NULL DEFAULT 1,
  offered_by TEXT NOT NULL CHECK (offered_by IN ('our_client', 'opposing')),
  offer_time TIMESTAMPTZ DEFAULT NOW(),
  offer_summary TEXT NOT NULL,
  offer_details JSONB DEFAULT '{}',
  response TEXT DEFAULT 'pending' CHECK (response IN (
    'pending', 'accepted', 'rejected', 'countered'
  )),
  response_time TIMESTAMPTZ,
  response_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_mediation ON mediation_offers(mediation_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE settlement_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediation_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediation_offers ENABLE ROW LEVEL SECURITY;

-- Settlement Scenarios: access through cases
CREATE POLICY "Users can view scenarios for their cases"
  ON settlement_scenarios FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = settlement_scenarios.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    ) OR EXISTS (
      SELECT 1 FROM case_assignments ca WHERE ca.case_id = settlement_scenarios.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scenarios for their cases"
  ON settlement_scenarios FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = settlement_scenarios.case_id AND c.attorney_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM case_assignments ca WHERE ca.case_id = settlement_scenarios.case_id AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update scenarios for their cases"
  ON settlement_scenarios FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = settlement_scenarios.case_id AND c.attorney_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM case_assignments ca WHERE ca.case_id = settlement_scenarios.case_id AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete scenarios for their cases"
  ON settlement_scenarios FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = settlement_scenarios.case_id AND c.attorney_id = auth.uid()
    )
  );

-- Mediation Sessions: access through cases
CREATE POLICY "Users can view mediation sessions for their cases"
  ON mediation_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = mediation_sessions.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    ) OR EXISTS (
      SELECT 1 FROM case_assignments ca WHERE ca.case_id = mediation_sessions.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mediation sessions for their cases"
  ON mediation_sessions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = mediation_sessions.case_id AND c.attorney_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM case_assignments ca WHERE ca.case_id = mediation_sessions.case_id AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update mediation sessions for their cases"
  ON mediation_sessions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = mediation_sessions.case_id AND c.attorney_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM case_assignments ca WHERE ca.case_id = mediation_sessions.case_id AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete mediation sessions for their cases"
  ON mediation_sessions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = mediation_sessions.case_id AND c.attorney_id = auth.uid()
    )
  );

-- Mediation Positions: access through mediation → cases
CREATE POLICY "Users can view mediation positions"
  ON mediation_positions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mediation_sessions ms JOIN cases c ON c.id = ms.case_id
    WHERE ms.id = mediation_positions.mediation_id
    AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM mediation_sessions ms JOIN case_assignments ca ON ca.case_id = ms.case_id
    WHERE ms.id = mediation_positions.mediation_id AND ca.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage mediation positions"
  ON mediation_positions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mediation_sessions ms JOIN cases c ON c.id = ms.case_id
    WHERE ms.id = mediation_positions.mediation_id AND c.attorney_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM mediation_sessions ms JOIN case_assignments ca ON ca.case_id = ms.case_id
    WHERE ms.id = mediation_positions.mediation_id AND ca.user_id = auth.uid()
  ));

-- Mediation Offers: access through mediation → cases
CREATE POLICY "Users can view mediation offers"
  ON mediation_offers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mediation_sessions ms JOIN cases c ON c.id = ms.case_id
    WHERE ms.id = mediation_offers.mediation_id
    AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM mediation_sessions ms JOIN case_assignments ca ON ca.case_id = ms.case_id
    WHERE ms.id = mediation_offers.mediation_id AND ca.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage mediation offers"
  ON mediation_offers FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mediation_sessions ms JOIN cases c ON c.id = ms.case_id
    WHERE ms.id = mediation_offers.mediation_id AND c.attorney_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM mediation_sessions ms JOIN case_assignments ca ON ca.case_id = ms.case_id
    WHERE ms.id = mediation_offers.mediation_id AND ca.user_id = auth.uid()
  ));

-- ============================================================================
-- Updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_scenarios_updated_at
  BEFORE UPDATE ON settlement_scenarios
  FOR EACH ROW EXECUTE FUNCTION update_scenarios_updated_at();

CREATE OR REPLACE FUNCTION update_mediation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_mediation_sessions_updated_at
  BEFORE UPDATE ON mediation_sessions
  FOR EACH ROW EXECUTE FUNCTION update_mediation_sessions_updated_at();
