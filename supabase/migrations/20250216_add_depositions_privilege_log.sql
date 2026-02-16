-- Session 16 Checkpoint 3: Depositions, Privilege Log & Discovery Dashboard
-- Deposition scheduling, exhibits, topics, testimony notes; privilege log entries

-- ============================================================================
-- Depositions (scheduling and logistics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS depositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  discovery_request_id UUID REFERENCES discovery_requests(id) ON DELETE SET NULL,
  deponent_name TEXT NOT NULL,
  deponent_type TEXT NOT NULL DEFAULT 'party' CHECK (deponent_type IN (
    'party', 'expert', 'fact_witness', 'corporate_representative'
  )),
  deponent_role TEXT,
  scheduled_date TIMESTAMPTZ,
  scheduled_end_time TIMESTAMPTZ,
  location TEXT,
  location_type TEXT DEFAULT 'in_person' CHECK (location_type IN (
    'in_person', 'remote', 'hybrid'
  )),
  video_link TEXT,
  court_reporter TEXT,
  court_reporter_contact TEXT,
  videographer TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed'
  )),
  cancellation_reason TEXT,
  duration_hours NUMERIC(4,2),
  transcript_received BOOLEAN DEFAULT FALSE,
  transcript_date DATE,
  summary TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_depositions_case ON depositions(case_id);
CREATE INDEX idx_depositions_date ON depositions(scheduled_date);
CREATE INDEX idx_depositions_status ON depositions(status);
CREATE INDEX idx_depositions_discovery ON depositions(discovery_request_id);

-- ============================================================================
-- Deposition Exhibits (documents marked during deposition)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deposition_exhibits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposition_id UUID NOT NULL REFERENCES depositions(id) ON DELETE CASCADE,
  exhibit_number TEXT NOT NULL,
  description TEXT NOT NULL,
  document_id UUID,
  marked_by TEXT,
  page_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deposition_exhibits_deposition ON deposition_exhibits(deposition_id);
CREATE UNIQUE INDEX idx_deposition_exhibits_number ON deposition_exhibits(deposition_id, exhibit_number);

-- ============================================================================
-- Deposition Topics (prep topics / areas of inquiry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deposition_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposition_id UUID NOT NULL REFERENCES depositions(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  estimated_minutes INTEGER,
  key_documents TEXT,
  sample_questions TEXT,
  covered BOOLEAN DEFAULT FALSE,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deposition_topics_deposition ON deposition_topics(deposition_id);

-- ============================================================================
-- Deposition Testimony Notes (real-time notes during deposition)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deposition_testimony_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposition_id UUID NOT NULL REFERENCES depositions(id) ON DELETE CASCADE,
  timestamp_marker TEXT,
  page_line TEXT,
  note_text TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN (
    'general', 'key_admission', 'impeachment', 'follow_up', 'objection', 'exhibit_reference'
  )),
  importance TEXT DEFAULT 'normal' CHECK (importance IN ('high', 'normal', 'low')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deposition_notes_deposition ON deposition_testimony_notes(deposition_id);
CREATE INDEX idx_deposition_notes_type ON deposition_testimony_notes(note_type);

-- ============================================================================
-- Privilege Log Entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS privilege_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  discovery_request_id UUID REFERENCES discovery_requests(id) ON DELETE SET NULL,
  discovery_item_id UUID REFERENCES discovery_items(id) ON DELETE SET NULL,
  entry_number INTEGER NOT NULL,
  document_date DATE,
  document_description TEXT NOT NULL,
  document_type TEXT,
  author TEXT,
  recipients TEXT,
  privilege_type TEXT NOT NULL CHECK (privilege_type IN (
    'attorney_client', 'work_product', 'joint_defense', 'spousal',
    'therapist_patient', 'other'
  )),
  privilege_basis TEXT NOT NULL,
  redacted BOOLEAN DEFAULT FALSE,
  produced_in_redacted_form BOOLEAN DEFAULT FALSE,
  bates_begin TEXT,
  bates_end TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_privilege_log_case ON privilege_log_entries(case_id);
CREATE INDEX idx_privilege_log_discovery ON privilege_log_entries(discovery_request_id);
CREATE INDEX idx_privilege_log_type ON privilege_log_entries(privilege_type);
CREATE INDEX idx_privilege_log_number ON privilege_log_entries(case_id, entry_number);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE depositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposition_exhibits ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposition_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposition_testimony_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE privilege_log_entries ENABLE ROW LEVEL SECURITY;

-- Depositions: access through cases
CREATE POLICY "Users can view depositions for their cases"
  ON depositions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = depositions.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = depositions.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create depositions for their cases"
  ON depositions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = depositions.case_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = depositions.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update depositions for their cases"
  ON depositions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = depositions.case_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = depositions.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete depositions for their cases"
  ON depositions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = depositions.case_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Deposition Exhibits: access through depositions → cases
CREATE POLICY "Users can view exhibits for their depositions"
  ON deposition_exhibits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_exhibits.deposition_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN case_assignments ca ON ca.case_id = d.case_id
      WHERE d.id = deposition_exhibits.deposition_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage exhibits for their depositions"
  ON deposition_exhibits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_exhibits.deposition_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN case_assignments ca ON ca.case_id = d.case_id
      WHERE d.id = deposition_exhibits.deposition_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update exhibits for their depositions"
  ON deposition_exhibits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_exhibits.deposition_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN case_assignments ca ON ca.case_id = d.case_id
      WHERE d.id = deposition_exhibits.deposition_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete exhibits for their depositions"
  ON deposition_exhibits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_exhibits.deposition_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Deposition Topics: access through depositions → cases
CREATE POLICY "Users can view topics for their depositions"
  ON deposition_topics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_topics.deposition_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN case_assignments ca ON ca.case_id = d.case_id
      WHERE d.id = deposition_topics.deposition_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage topics for their depositions"
  ON deposition_topics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_topics.deposition_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN case_assignments ca ON ca.case_id = d.case_id
      WHERE d.id = deposition_topics.deposition_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update topics for their depositions"
  ON deposition_topics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_topics.deposition_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN case_assignments ca ON ca.case_id = d.case_id
      WHERE d.id = deposition_topics.deposition_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete topics for their depositions"
  ON deposition_topics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_topics.deposition_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Deposition Testimony Notes: access through depositions → cases
CREATE POLICY "Users can view notes for their depositions"
  ON deposition_testimony_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_testimony_notes.deposition_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN case_assignments ca ON ca.case_id = d.case_id
      WHERE d.id = deposition_testimony_notes.deposition_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes for their depositions"
  ON deposition_testimony_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_testimony_notes.deposition_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN case_assignments ca ON ca.case_id = d.case_id
      WHERE d.id = deposition_testimony_notes.deposition_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update notes for their depositions"
  ON deposition_testimony_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_testimony_notes.deposition_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN case_assignments ca ON ca.case_id = d.case_id
      WHERE d.id = deposition_testimony_notes.deposition_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete notes for their depositions"
  ON deposition_testimony_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions d
      JOIN cases c ON c.id = d.case_id
      WHERE d.id = deposition_testimony_notes.deposition_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Privilege Log Entries: access through cases
CREATE POLICY "Users can view privilege log for their cases"
  ON privilege_log_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = privilege_log_entries.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = privilege_log_entries.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create privilege log entries for their cases"
  ON privilege_log_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = privilege_log_entries.case_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = privilege_log_entries.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update privilege log entries for their cases"
  ON privilege_log_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = privilege_log_entries.case_id
      AND c.attorney_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM case_assignments ca
      WHERE ca.case_id = privilege_log_entries.case_id
      AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete privilege log entries for their cases"
  ON privilege_log_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = privilege_log_entries.case_id
      AND c.attorney_id = auth.uid()
    )
  );

-- ============================================================================
-- Updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_depositions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_depositions_updated_at
  BEFORE UPDATE ON depositions
  FOR EACH ROW
  EXECUTE FUNCTION update_depositions_updated_at();

CREATE OR REPLACE FUNCTION update_privilege_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_privilege_log_updated_at
  BEFORE UPDATE ON privilege_log_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_privilege_log_updated_at();
