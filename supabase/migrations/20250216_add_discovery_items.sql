-- Session 16 Checkpoint 2: Discovery Items, Responses & Document Generation
-- Individual item tracking, objection templates, change history

-- ============================================================================
-- Discovery Items (individual interrogatories, requests, admissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS discovery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_request_id UUID NOT NULL REFERENCES discovery_requests(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  request_text TEXT NOT NULL DEFAULT '',
  response_text TEXT DEFAULT '',
  objection_text TEXT DEFAULT '',
  objection_type TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'drafted', 'reviewed', 'finalized', 'objected'
  )),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  documents_produced UUID[] DEFAULT '{}',
  privilege_claimed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discovery_items_request ON discovery_items(discovery_request_id);
CREATE INDEX idx_discovery_items_status ON discovery_items(status);
CREATE INDEX idx_discovery_items_assigned ON discovery_items(assigned_to);
CREATE UNIQUE INDEX idx_discovery_items_number ON discovery_items(discovery_request_id, item_number);

-- ============================================================================
-- Discovery Item History (audit trail for changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS discovery_item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_item_id UUID NOT NULL REFERENCES discovery_items(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discovery_item_history_item ON discovery_item_history(discovery_item_id);
CREATE INDEX idx_discovery_item_history_changed_at ON discovery_item_history(changed_at);

-- ============================================================================
-- Discovery Objection Templates (standard objection language by state)
-- ============================================================================
CREATE TABLE IF NOT EXISTS discovery_objection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objection_type TEXT NOT NULL,
  state_code TEXT NOT NULL,
  objection_text TEXT NOT NULL,
  statutory_reference TEXT,
  notes TEXT,
  UNIQUE(state_code, objection_type)
);

CREATE INDEX idx_objection_templates_state ON discovery_objection_templates(state_code);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE discovery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_item_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_objection_templates ENABLE ROW LEVEL SECURITY;

-- Discovery Items: access through parent discovery_requests → cases
CREATE POLICY "Users can view items for their cases"
  ON discovery_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discovery_requests dr
      JOIN cases c ON c.id = dr.case_id
      WHERE dr.id = discovery_items.discovery_request_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM discovery_requests dr
      JOIN case_assignments ca ON ca.case_id = dr.case_id
      WHERE dr.id = discovery_items.discovery_request_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create items for their cases"
  ON discovery_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discovery_requests dr
      JOIN cases c ON c.id = dr.case_id
      WHERE dr.id = discovery_items.discovery_request_id
      AND (c.attorney_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM discovery_requests dr
      JOIN case_assignments ca ON ca.case_id = dr.case_id
      WHERE dr.id = discovery_items.discovery_request_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items for their cases"
  ON discovery_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discovery_requests dr
      JOIN cases c ON c.id = dr.case_id
      WHERE dr.id = discovery_items.discovery_request_id
      AND (c.attorney_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM discovery_requests dr
      JOIN case_assignments ca ON ca.case_id = dr.case_id
      WHERE dr.id = discovery_items.discovery_request_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items for their cases"
  ON discovery_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discovery_requests dr
      JOIN cases c ON c.id = dr.case_id
      WHERE dr.id = discovery_items.discovery_request_id
      AND (c.attorney_id = auth.uid())
    )
  );

-- Discovery Item History: read only through parent item
CREATE POLICY "Users can view history for their items"
  ON discovery_item_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discovery_items di
      JOIN discovery_requests dr ON dr.id = di.discovery_request_id
      JOIN cases c ON c.id = dr.case_id
      WHERE di.id = discovery_item_history.discovery_item_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can create history for their items"
  ON discovery_item_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discovery_items di
      JOIN discovery_requests dr ON dr.id = di.discovery_request_id
      JOIN cases c ON c.id = dr.case_id
      WHERE di.id = discovery_item_history.discovery_item_id
      AND (c.attorney_id = auth.uid())
    )
  );

-- Objection Templates: anyone authenticated can read
CREATE POLICY "Anyone can view objection templates"
  ON discovery_objection_templates FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- Updated_at trigger for discovery_items
-- ============================================================================
CREATE OR REPLACE FUNCTION update_discovery_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_discovery_items_updated_at
  BEFORE UPDATE ON discovery_items
  FOR EACH ROW
  EXECUTE FUNCTION update_discovery_items_updated_at();

-- ============================================================================
-- Seed Objection Templates (CA, TX, FL)
-- ============================================================================

-- California
INSERT INTO discovery_objection_templates (objection_type, state_code, objection_text, statutory_reference, notes)
VALUES
  ('overbroad', 'CA', 'Objection. This request is overbroad and unduly burdensome in that it seeks information that is neither relevant to the subject matter of this action nor reasonably calculated to lead to the discovery of admissible evidence. (CCP § 2017.010)', 'CCP § 2017.010', NULL),
  ('vague', 'CA', 'Objection. This request is vague and ambiguous as to the terms used and therefore responding party cannot reasonably determine what information is being sought.', 'CCP § 2030.060(d)', NULL),
  ('attorney_client', 'CA', 'Objection. This request seeks information protected by the attorney-client privilege. (Evidence Code § 954)', 'Evidence Code § 954', NULL),
  ('work_product', 'CA', 'Objection. This request seeks information protected by the attorney work product doctrine. (CCP § 2018.030)', 'CCP § 2018.030', NULL),
  ('compound', 'CA', 'Objection. This interrogatory is compound, containing multiple discrete questions in violation of CCP § 2030.060(f).', 'CCP § 2030.060(f)', NULL),
  ('burdensome', 'CA', 'Objection. This request is unduly burdensome and oppressive in that compliance would require an unreasonable expenditure of time, effort, and expense that outweighs any likely benefit.', 'CCP § 2019.030', NULL),
  ('assumes_facts', 'CA', 'Objection. This request assumes facts not in evidence and is therefore misleading.', NULL, NULL),
  ('not_reasonably_particular', 'CA', 'Objection. This request for production fails to designate the documents with reasonable particularity as required by CCP § 2031.030(c)(1).', 'CCP § 2031.030(c)(1)', 'RFP-specific objection')
ON CONFLICT (state_code, objection_type) DO NOTHING;

-- Texas
INSERT INTO discovery_objection_templates (objection_type, state_code, objection_text, statutory_reference, notes)
VALUES
  ('overbroad', 'TX', 'Objection. This request is overly broad and unduly burdensome and is not reasonably tailored to obtain relevant, non-privileged information.', 'TRCP 192.4', NULL),
  ('vague', 'TX', 'Objection. This request is vague, ambiguous, and unintelligible such that responding party cannot determine with reasonable certainty what information is requested.', NULL, NULL),
  ('attorney_client', 'TX', 'Objection. This request seeks information protected by the attorney-client privilege under Texas Rule of Evidence 503.', 'TRE 503', NULL),
  ('work_product', 'TX', 'Objection. This request seeks core work product of counsel protected under TRCP 192.5(b).', 'TRCP 192.5(b)', NULL),
  ('burdensome', 'TX', 'Objection. This request is unduly burdensome in that the burden of producing the requested information substantially outweighs the likely benefit.', 'TRCP 192.4', NULL),
  ('assumes_facts', 'TX', 'Objection. This request assumes facts not in evidence and is therefore misleading and argumentative.', NULL, NULL)
ON CONFLICT (state_code, objection_type) DO NOTHING;

-- Florida
INSERT INTO discovery_objection_templates (objection_type, state_code, objection_text, statutory_reference, notes)
VALUES
  ('overbroad', 'FL', 'Objection. This request is overbroad, unduly burdensome, and seeks information beyond the scope of permissible discovery under Florida Rule of Civil Procedure 1.280(b).', 'Fla. R. Civ. P. 1.280(b)', NULL),
  ('vague', 'FL', 'Objection. This request is vague and ambiguous such that responding party cannot determine with reasonable certainty the information sought.', NULL, NULL),
  ('attorney_client', 'FL', 'Objection. This request seeks information protected by the attorney-client privilege under Florida Statute § 90.502.', 'Fla. Stat. § 90.502', NULL),
  ('work_product', 'FL', 'Objection. This request seeks attorney work product protected under Florida Rule of Civil Procedure 1.280(b)(4).', 'Fla. R. Civ. P. 1.280(b)(4)', NULL),
  ('burdensome', 'FL', 'Objection. This request is unduly burdensome and the burden of producing the requested information substantially outweighs the likely benefit under the proportionality analysis.', 'Fla. R. Civ. P. 1.280(b)', NULL),
  ('assumes_facts', 'FL', 'Objection. This request assumes facts not established in this proceeding and is therefore misleading.', NULL, NULL)
ON CONFLICT (state_code, objection_type) DO NOTHING;
