-- Session 16 Checkpoint 1: Discovery Management System
-- Discovery request tracking, state-specific deadline calculation, extensions

-- ============================================================================
-- Discovery Requests (sets of interrogatories, RFPs, RFAs, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS discovery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  discovery_type TEXT NOT NULL CHECK (discovery_type IN (
    'interrogatory_form', 'interrogatory_special', 'rfp', 'rfa', 'subpoena', 'deposition_notice'
  )),
  direction TEXT NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
  set_number TEXT NOT NULL DEFAULT 'Set One',
  title TEXT NOT NULL,
  propounding_party TEXT,
  responding_party TEXT,
  served_date DATE,
  service_method TEXT CHECK (service_method IN ('personal', 'mail', 'electronic', 'email')),
  response_due_date DATE,
  extended_due_date DATE,
  actual_response_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'responded', 'overdue', 'objected', 'motion_filed'
  )),
  item_count INTEGER DEFAULT 0,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discovery_requests_case ON discovery_requests(case_id);
CREATE INDEX idx_discovery_requests_firm ON discovery_requests(firm_id);
CREATE INDEX idx_discovery_requests_status ON discovery_requests(status);
CREATE INDEX idx_discovery_requests_due_date ON discovery_requests(response_due_date);
CREATE INDEX idx_discovery_requests_type ON discovery_requests(discovery_type);

-- ============================================================================
-- State Discovery Rules (deadline calculation parameters by state)
-- ============================================================================
CREATE TABLE IF NOT EXISTS state_discovery_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  discovery_type TEXT NOT NULL,
  base_response_days INTEGER NOT NULL DEFAULT 30,
  mail_additional_days INTEGER DEFAULT 0,
  electronic_additional_days INTEGER DEFAULT 0,
  personal_service_days INTEGER DEFAULT 0,
  deemed_admitted BOOLEAN DEFAULT FALSE,
  max_interrogatories INTEGER,
  statutory_reference TEXT,
  notes TEXT,
  UNIQUE(state_code, discovery_type)
);

CREATE INDEX idx_state_discovery_rules_state ON state_discovery_rules(state_code);
CREATE INDEX idx_state_discovery_rules_type ON state_discovery_rules(discovery_type);

-- ============================================================================
-- Discovery Extensions
-- ============================================================================
CREATE TABLE IF NOT EXISTS discovery_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_request_id UUID NOT NULL REFERENCES discovery_requests(id) ON DELETE CASCADE,
  original_due_date DATE NOT NULL,
  requested_extension_days INTEGER NOT NULL,
  new_due_date DATE NOT NULL,
  requested_date DATE,
  granted_date DATE,
  granted_by TEXT,
  reason TEXT,
  stipulation_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discovery_extensions_request ON discovery_extensions(discovery_request_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE discovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_discovery_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_extensions ENABLE ROW LEVEL SECURITY;

-- Discovery Requests: Users can view discovery for cases they're on
CREATE POLICY "Users can view discovery for their cases"
  ON discovery_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = discovery_requests.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = discovery_requests.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create discovery for their cases"
  ON discovery_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = discovery_requests.case_id
      AND (c.attorney_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = discovery_requests.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update discovery for their cases"
  ON discovery_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = discovery_requests.case_id
      AND (c.attorney_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = discovery_requests.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete discovery for their cases"
  ON discovery_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = discovery_requests.case_id
      AND (c.attorney_id = auth.uid())
    )
  );

-- State Discovery Rules: Anyone authenticated can read
CREATE POLICY "Anyone can view state discovery rules"
  ON state_discovery_rules FOR SELECT
  TO authenticated
  USING (true);

-- Discovery Extensions: Same access as parent discovery_requests
CREATE POLICY "Users can view extensions for their cases"
  ON discovery_extensions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discovery_requests dr
      JOIN cases c ON c.id = dr.case_id
      WHERE dr.id = discovery_extensions.discovery_request_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM discovery_requests dr
      JOIN case_assignments ca ON ca.case_id = dr.case_id
      WHERE dr.id = discovery_extensions.discovery_request_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create extensions for their cases"
  ON discovery_extensions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discovery_requests dr
      JOIN cases c ON c.id = dr.case_id
      WHERE dr.id = discovery_extensions.discovery_request_id
      AND (c.attorney_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM discovery_requests dr
      JOIN case_assignments ca ON ca.case_id = dr.case_id
      WHERE dr.id = discovery_extensions.discovery_request_id
      AND ca.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_discovery_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_discovery_requests_updated_at
  BEFORE UPDATE ON discovery_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_discovery_requests_updated_at();

-- ============================================================================
-- Seed State Discovery Rules (CA, TX, FL)
-- ============================================================================

-- California
INSERT INTO state_discovery_rules (state_code, discovery_type, base_response_days, mail_additional_days, electronic_additional_days, personal_service_days, deemed_admitted, max_interrogatories, statutory_reference, notes)
VALUES
  ('CA', 'interrogatory_form', 30, 5, 2, 0, false, 35, 'CCP § 2030.260', 'Form interrogatories limited to 35. Special interrogatories limited to 35 without declaration.'),
  ('CA', 'interrogatory_special', 30, 5, 2, 0, false, 35, 'CCP § 2030.030', 'May propound more than 35 with declaration of necessity.'),
  ('CA', 'rfp', 30, 5, 2, 0, false, NULL, 'CCP § 2031.260', 'No limit on number of requests.'),
  ('CA', 'rfa', 30, 5, 2, 0, true, 35, 'CCP § 2033.250', 'CRITICAL: Deemed admitted if no response. Limited to 35 without declaration.'),
  ('CA', 'subpoena', 15, 5, 2, 0, false, NULL, 'CCP § 2020.410', 'Consumer/employee records require additional notice to consumer.'),
  ('CA', 'deposition_notice', 10, 5, 2, 0, false, NULL, 'CCP § 2025.270', 'Minimum 10 days notice for deposition.')
ON CONFLICT (state_code, discovery_type) DO NOTHING;

-- Texas
INSERT INTO state_discovery_rules (state_code, discovery_type, base_response_days, mail_additional_days, electronic_additional_days, personal_service_days, deemed_admitted, max_interrogatories, statutory_reference, notes)
VALUES
  ('TX', 'interrogatory_form', 30, 3, 0, 0, false, 25, 'TRCP 197.1', 'Limited to 25 interrogatories including subparts.'),
  ('TX', 'interrogatory_special', 30, 3, 0, 0, false, 25, 'TRCP 197.1', 'Limited to 25 interrogatories including subparts.'),
  ('TX', 'rfp', 30, 3, 0, 0, false, NULL, 'TRCP 196', 'No limit on number of requests.'),
  ('TX', 'rfa', 30, 3, 0, 0, true, NULL, 'TRCP 198.2', 'CRITICAL: Deemed admitted if no timely response.'),
  ('TX', 'subpoena', 0, 3, 0, 0, false, NULL, 'TRCP 176', 'Reasonable time to comply required.'),
  ('TX', 'deposition_notice', 10, 3, 0, 0, false, NULL, 'TRCP 199.2', 'Reasonable notice required, typically 10+ days.')
ON CONFLICT (state_code, discovery_type) DO NOTHING;

-- Florida
INSERT INTO state_discovery_rules (state_code, discovery_type, base_response_days, mail_additional_days, electronic_additional_days, personal_service_days, deemed_admitted, max_interrogatories, statutory_reference, notes)
VALUES
  ('FL', 'interrogatory_form', 30, 5, 2, 0, false, 30, 'Fla. R. Civ. P. 1.340', 'Standard interrogatories limited to 30 including subparts.'),
  ('FL', 'interrogatory_special', 30, 5, 2, 0, false, 30, 'Fla. R. Civ. P. 1.340', 'Standard interrogatories limited to 30 including subparts.'),
  ('FL', 'rfp', 30, 5, 2, 0, false, NULL, 'Fla. R. Civ. P. 1.350', 'No limit on number of requests.'),
  ('FL', 'rfa', 30, 5, 2, 0, true, NULL, 'Fla. R. Civ. P. 1.370', 'CRITICAL: Deemed admitted if no timely response.'),
  ('FL', 'subpoena', 0, 5, 2, 0, false, NULL, 'Fla. R. Civ. P. 1.410', 'Reasonable time to comply required.'),
  ('FL', 'deposition_notice', 10, 5, 2, 0, false, NULL, 'Fla. R. Civ. P. 1.310', 'Reasonable notice required, typically 10+ days.')
ON CONFLICT (state_code, discovery_type) DO NOTHING;

-- New York
INSERT INTO state_discovery_rules (state_code, discovery_type, base_response_days, mail_additional_days, electronic_additional_days, personal_service_days, deemed_admitted, max_interrogatories, statutory_reference, notes)
VALUES
  ('NY', 'interrogatory_form', 20, 5, 0, 0, false, NULL, 'CPLR 3133', 'Response within 20 days of service.'),
  ('NY', 'interrogatory_special', 20, 5, 0, 0, false, NULL, 'CPLR 3133', 'Response within 20 days of service.'),
  ('NY', 'rfp', 20, 5, 0, 0, false, NULL, 'CPLR 3122', 'Response within 20 days of service.'),
  ('NY', 'rfa', 20, 5, 0, 0, true, NULL, 'CPLR 3123', 'Deemed admitted if no timely response.'),
  ('NY', 'subpoena', 0, 5, 0, 0, false, NULL, 'CPLR 2301', 'Reasonable time to comply required.'),
  ('NY', 'deposition_notice', 20, 5, 0, 0, false, NULL, 'CPLR 3107', '20 days notice required.')
ON CONFLICT (state_code, discovery_type) DO NOTHING;

-- Illinois
INSERT INTO state_discovery_rules (state_code, discovery_type, base_response_days, mail_additional_days, electronic_additional_days, personal_service_days, deemed_admitted, max_interrogatories, statutory_reference, notes)
VALUES
  ('IL', 'interrogatory_form', 28, 3, 0, 0, false, 30, 'Ill. Sup. Ct. R. 213', 'Limited to 30 interrogatories including subparts.'),
  ('IL', 'interrogatory_special', 28, 3, 0, 0, false, 30, 'Ill. Sup. Ct. R. 213', 'Limited to 30 interrogatories including subparts.'),
  ('IL', 'rfp', 28, 3, 0, 0, false, NULL, 'Ill. Sup. Ct. R. 214', 'Response within 28 days of service.'),
  ('IL', 'rfa', 28, 3, 0, 0, true, NULL, 'Ill. Sup. Ct. R. 216', 'Deemed admitted if no timely response.'),
  ('IL', 'subpoena', 0, 3, 0, 0, false, NULL, 'Ill. Sup. Ct. R. 204', 'Reasonable time to comply.'),
  ('IL', 'deposition_notice', 14, 3, 0, 0, false, NULL, 'Ill. Sup. Ct. R. 206', 'Reasonable notice required.')
ON CONFLICT (state_code, discovery_type) DO NOTHING;
