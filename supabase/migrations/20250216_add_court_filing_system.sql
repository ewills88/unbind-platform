-- Session 18 Checkpoint 1: Court Filing System
-- Filing Tracker, Deadlines & Service Records

-- ============================================================
-- 1. COURTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  county TEXT NOT NULL,
  court_name TEXT NOT NULL,
  court_type TEXT NOT NULL DEFAULT 'superior', -- superior, family, district, circuit
  address TEXT,
  city TEXT,
  zip TEXT,
  phone TEXT,
  website TEXT,
  efiling_url TEXT,
  efiling_provider TEXT, -- tyler, fileandserve, odyssey, etc.
  efiling_enabled BOOLEAN NOT NULL DEFAULT false,
  local_rules_url TEXT,
  clerk_email TEXT,
  filing_hours TEXT, -- e.g. "8:00 AM - 4:00 PM"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(state_code, county, court_name)
);

CREATE INDEX IF NOT EXISTS idx_courts_state ON courts(state_code);
CREATE INDEX IF NOT EXISTS idx_courts_county ON courts(state_code, county);

-- ============================================================
-- 2. FILING TYPES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS filing_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  category TEXT NOT NULL, -- petition, response, motion, discovery, financial, custody, settlement, other
  filing_code TEXT NOT NULL, -- state-specific form code (e.g. FL-100, SAPCR)
  filing_name TEXT NOT NULL,
  description TEXT,
  fee_amount NUMERIC(10,2) DEFAULT 0,
  fee_waiver_eligible BOOLEAN NOT NULL DEFAULT false,
  response_days INTEGER, -- days for opposing party to respond
  is_working_days BOOLEAN NOT NULL DEFAULT false,
  requires_service BOOLEAN NOT NULL DEFAULT true,
  service_methods TEXT[] DEFAULT ARRAY['personal', 'mail', 'electronic'],
  requires_hearing BOOLEAN NOT NULL DEFAULT false,
  hearing_days_after INTEGER, -- typical days to schedule hearing after filing
  auto_deadlines JSONB DEFAULT '[]', -- array of {name, days, is_working_days, description}
  form_url TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(state_code, filing_code)
);

CREATE INDEX IF NOT EXISTS idx_filing_types_state ON filing_types(state_code);
CREATE INDEX IF NOT EXISTS idx_filing_types_category ON filing_types(state_code, category);

-- ============================================================
-- 3. CASE FILINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS case_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  filing_type_id UUID REFERENCES filing_types(id),
  court_id UUID REFERENCES courts(id),
  firm_id UUID REFERENCES firms(id),

  -- Filing info
  filing_code TEXT, -- denormalized from filing_type
  filing_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft', -- draft, ready, filed, served, completed, rejected, withdrawn
  filed_date TIMESTAMPTZ,
  filed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,

  -- Court info
  case_number TEXT, -- court case number
  filing_number TEXT, -- court-assigned filing number
  confirmation_number TEXT, -- e-filing confirmation
  filing_method TEXT DEFAULT 'in_person', -- in_person, efiling, mail, drop_box

  -- Fee tracking
  filing_fee NUMERIC(10,2) DEFAULT 0,
  fee_paid BOOLEAN NOT NULL DEFAULT false,
  fee_waiver_requested BOOLEAN NOT NULL DEFAULT false,
  fee_waiver_granted BOOLEAN,

  -- Hearing
  hearing_date TIMESTAMPTZ,
  hearing_location TEXT,
  hearing_notes TEXT,

  -- Metadata
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_filings_case ON case_filings(case_id);
CREATE INDEX IF NOT EXISTS idx_case_filings_status ON case_filings(status);
CREATE INDEX IF NOT EXISTS idx_case_filings_firm ON case_filings(firm_id);
CREATE INDEX IF NOT EXISTS idx_case_filings_filed_date ON case_filings(filed_date);

-- ============================================================
-- 4. FILING DOCUMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS filing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID NOT NULL REFERENCES case_filings(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'primary', -- primary, exhibit, attachment, proof_of_service, proposed_order
  file_path TEXT, -- storage path
  file_size INTEGER,
  mime_type TEXT,
  page_count INTEGER,
  is_conformed BOOLEAN NOT NULL DEFAULT false, -- court-stamped copy received
  conformed_file_path TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filing_documents_filing ON filing_documents(filing_id);

-- ============================================================
-- 5. SERVICE RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID NOT NULL REFERENCES case_filings(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Who was served
  served_party_name TEXT NOT NULL,
  served_party_role TEXT NOT NULL DEFAULT 'respondent', -- respondent, petitioner, attorney, third_party
  served_party_address TEXT,
  served_party_email TEXT,

  -- Service details
  service_method TEXT NOT NULL DEFAULT 'personal', -- personal, substituted, mail, electronic, publication, posting
  service_status TEXT NOT NULL DEFAULT 'pending', -- pending, attempted, completed, failed
  service_date TIMESTAMPTZ,
  service_attempts INTEGER NOT NULL DEFAULT 0,

  -- Process server info
  server_name TEXT,
  server_company TEXT,
  server_license TEXT,
  server_fee NUMERIC(10,2) DEFAULT 0,

  -- Proof of service
  proof_filed BOOLEAN NOT NULL DEFAULT false,
  proof_file_path TEXT,
  proof_filed_date TIMESTAMPTZ,

  -- Response tracking
  response_due_date TIMESTAMPTZ,
  response_received BOOLEAN NOT NULL DEFAULT false,
  response_date TIMESTAMPTZ,
  default_eligible_date TIMESTAMPTZ, -- when default can be requested

  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_records_filing ON service_records(filing_id);
CREATE INDEX IF NOT EXISTS idx_service_records_case ON service_records(case_id);
CREATE INDEX IF NOT EXISTS idx_service_records_status ON service_records(service_status);

-- ============================================================
-- 6. FILING DEADLINES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS filing_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  filing_id UUID REFERENCES case_filings(id) ON DELETE SET NULL,
  firm_id UUID REFERENCES firms(id),

  -- Deadline info
  deadline_name TEXT NOT NULL,
  description TEXT,
  deadline_date TIMESTAMPTZ NOT NULL,
  deadline_type TEXT NOT NULL DEFAULT 'filing', -- filing, response, hearing, service, court_order, statute
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, critical
  status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming, completed, overdue, waived, extended

  -- Calculation source
  source_type TEXT, -- auto_calculated, manual, court_order
  source_filing_id UUID REFERENCES case_filings(id),
  calculation_rule TEXT, -- description of how deadline was calculated
  is_working_days BOOLEAN NOT NULL DEFAULT false,

  -- Completion
  completed_date TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  completed_filing_id UUID REFERENCES case_filings(id), -- the filing that satisfied this deadline

  -- Reminders
  reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1], -- days before to remind
  last_reminder_sent TIMESTAMPTZ,

  -- Extensions
  original_date TIMESTAMPTZ, -- if extended, store original
  extension_reason TEXT,
  extension_granted_by TEXT,

  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filing_deadlines_case ON filing_deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_filing_deadlines_date ON filing_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_filing_deadlines_status ON filing_deadlines(status);
CREATE INDEX IF NOT EXISTS idx_filing_deadlines_firm ON filing_deadlines(firm_id);
CREATE INDEX IF NOT EXISTS idx_filing_deadlines_filing ON filing_deadlines(filing_id);

-- ============================================================
-- 7. COURT HOLIDAYS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS court_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  court_id UUID REFERENCES courts(id),
  holiday_date DATE NOT NULL,
  holiday_name TEXT NOT NULL,
  is_federal BOOLEAN NOT NULL DEFAULT false,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_court_holidays_state ON court_holidays(state_code, year);
CREATE INDEX IF NOT EXISTS idx_court_holidays_date ON court_holidays(holiday_date);

-- ============================================================
-- 8. TRIGGERS
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_courts_updated_at') THEN
    CREATE TRIGGER update_courts_updated_at
      BEFORE UPDATE ON courts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_filing_types_updated_at') THEN
    CREATE TRIGGER update_filing_types_updated_at
      BEFORE UPDATE ON filing_types
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_case_filings_updated_at') THEN
    CREATE TRIGGER update_case_filings_updated_at
      BEFORE UPDATE ON case_filings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_filing_documents_updated_at') THEN
    CREATE TRIGGER update_filing_documents_updated_at
      BEFORE UPDATE ON filing_documents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_service_records_updated_at') THEN
    CREATE TRIGGER update_service_records_updated_at
      BEFORE UPDATE ON service_records
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_filing_deadlines_updated_at') THEN
    CREATE TRIGGER update_filing_deadlines_updated_at
      BEFORE UPDATE ON filing_deadlines
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- 9. RLS POLICIES
-- ============================================================
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_holidays ENABLE ROW LEVEL SECURITY;

-- Courts: readable by all authenticated users
DROP POLICY IF EXISTS "courts_select" ON courts;
CREATE POLICY "courts_select" ON courts FOR SELECT TO authenticated USING (true);

-- Filing types: readable by all authenticated users
DROP POLICY IF EXISTS "filing_types_select" ON filing_types;
CREATE POLICY "filing_types_select" ON filing_types FOR SELECT TO authenticated USING (true);

-- Court holidays: readable by all authenticated users
DROP POLICY IF EXISTS "court_holidays_select" ON court_holidays;
CREATE POLICY "court_holidays_select" ON court_holidays FOR SELECT TO authenticated USING (true);

-- Case filings: accessible through case ownership
DROP POLICY IF EXISTS "case_filings_select" ON case_filings;
CREATE POLICY "case_filings_select" ON case_filings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_filings.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "case_filings_insert" ON case_filings;
CREATE POLICY "case_filings_insert" ON case_filings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_filings.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "case_filings_update" ON case_filings;
CREATE POLICY "case_filings_update" ON case_filings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_filings.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "case_filings_delete" ON case_filings;
CREATE POLICY "case_filings_delete" ON case_filings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_filings.case_id
      AND cases.attorney_id = auth.uid()
    )
  );

-- Filing documents: accessible through filing -> case ownership
DROP POLICY IF EXISTS "filing_documents_select" ON filing_documents;
CREATE POLICY "filing_documents_select" ON filing_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM case_filings
      JOIN cases ON cases.id = case_filings.case_id
      WHERE case_filings.id = filing_documents.filing_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "filing_documents_insert" ON filing_documents;
CREATE POLICY "filing_documents_insert" ON filing_documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM case_filings
      JOIN cases ON cases.id = case_filings.case_id
      WHERE case_filings.id = filing_documents.filing_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "filing_documents_update" ON filing_documents;
CREATE POLICY "filing_documents_update" ON filing_documents FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM case_filings
      JOIN cases ON cases.id = case_filings.case_id
      WHERE case_filings.id = filing_documents.filing_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "filing_documents_delete" ON filing_documents;
CREATE POLICY "filing_documents_delete" ON filing_documents FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM case_filings
      JOIN cases ON cases.id = case_filings.case_id
      WHERE case_filings.id = filing_documents.filing_id
      AND cases.attorney_id = auth.uid()
    )
  );

-- Service records: accessible through case ownership
DROP POLICY IF EXISTS "service_records_select" ON service_records;
CREATE POLICY "service_records_select" ON service_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = service_records.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "service_records_insert" ON service_records;
CREATE POLICY "service_records_insert" ON service_records FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = service_records.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "service_records_update" ON service_records;
CREATE POLICY "service_records_update" ON service_records FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = service_records.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "service_records_delete" ON service_records;
CREATE POLICY "service_records_delete" ON service_records FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = service_records.case_id
      AND cases.attorney_id = auth.uid()
    )
  );

-- Filing deadlines: accessible through case ownership
DROP POLICY IF EXISTS "filing_deadlines_select" ON filing_deadlines;
CREATE POLICY "filing_deadlines_select" ON filing_deadlines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = filing_deadlines.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "filing_deadlines_insert" ON filing_deadlines;
CREATE POLICY "filing_deadlines_insert" ON filing_deadlines FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = filing_deadlines.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "filing_deadlines_update" ON filing_deadlines;
CREATE POLICY "filing_deadlines_update" ON filing_deadlines FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = filing_deadlines.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "filing_deadlines_delete" ON filing_deadlines;
CREATE POLICY "filing_deadlines_delete" ON filing_deadlines FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = filing_deadlines.case_id
      AND cases.attorney_id = auth.uid()
    )
  );

-- ============================================================
-- 10. SEED: CALIFORNIA FILING TYPES
-- ============================================================
INSERT INTO filing_types (state_code, category, filing_code, filing_name, description, fee_amount, fee_waiver_eligible, response_days, is_working_days, requires_service, service_methods, requires_hearing, hearing_days_after, auto_deadlines, display_order)
VALUES
  -- Petitions
  ('CA', 'petition', 'FL-100', 'Petition for Dissolution of Marriage',
   'Initial petition to dissolve marriage. Must be served on respondent.',
   435.00, true, 30, false, true, ARRAY['personal', 'mail', 'electronic'],
   false, NULL,
   '[{"name":"Response Due","days":30,"is_working_days":false,"description":"Respondent must file response within 30 calendar days of service"},{"name":"6-Month Waiting Period","days":180,"is_working_days":false,"description":"California 6-month waiting period from date of service"}]'::jsonb,
   1),

  ('CA', 'petition', 'FL-110', 'Summons (Family Law)',
   'Required summons to accompany dissolution petition.',
   0, false, NULL, false, true, ARRAY['personal', 'mail'],
   false, NULL, '[]'::jsonb, 2),

  ('CA', 'petition', 'FL-105', 'Declaration Under UCCJEA',
   'Uniform Child Custody Jurisdiction and Enforcement Act declaration. Required when minor children are involved.',
   0, false, NULL, false, false, ARRAY[]::text[],
   false, NULL, '[]'::jsonb, 3),

  -- Responses
  ('CA', 'response', 'FL-120', 'Response to Petition',
   'Respondent''s answer to the dissolution petition. Due 30 days after service.',
   435.00, true, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 10),

  ('CA', 'response', 'FL-123', 'Request for Default',
   'Filed when respondent fails to respond within 30 days of service.',
   0, false, NULL, false, false, ARRAY[]::text[],
   false, NULL, '[]'::jsonb, 11),

  -- Financial
  ('CA', 'financial', 'FL-150', 'Income and Expense Declaration',
   'Detailed declaration of income, expenses, and financial obligations.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 20),

  ('CA', 'financial', 'FL-142', 'Schedule of Assets and Debts',
   'Community and separate property disclosure.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 21),

  ('CA', 'financial', 'FL-140', 'Declaration of Disclosure',
   'Preliminary declaration of disclosure. Must be served within 60 days of filing petition.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL,
   '[{"name":"Disclosure Due","days":60,"is_working_days":false,"description":"Preliminary disclosure must be served within 60 days of filing petition"}]'::jsonb,
   22),

  ('CA', 'financial', 'FL-141', 'Final Declaration of Disclosure',
   'Final declaration of disclosure. Must be served before or at time of settlement.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 23),

  -- Motions
  ('CA', 'motion', 'FL-300', 'Request for Order (RFO)',
   'Motion for temporary orders including custody, support, property restraint.',
   60.00, true, 16, false, true, ARRAY['personal', 'mail', 'electronic'],
   true, 25,
   '[{"name":"Hearing Date","days":25,"is_working_days":false,"description":"Hearing typically scheduled 25 days after filing"},{"name":"Service Due","days":16,"is_working_days":false,"description":"Must be served at least 16 days before hearing"}]'::jsonb,
   30),

  ('CA', 'motion', 'FL-301', 'Responsive Declaration to RFO',
   'Response to Request for Order. Due before hearing.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 31),

  ('CA', 'motion', 'FL-310', 'Application for Order and Supporting Declaration',
   'Request for order shortening time for hearing.',
   0, false, NULL, false, true, ARRAY['personal'],
   true, 10, '[]'::jsonb, 32),

  -- Custody
  ('CA', 'custody', 'FL-311', 'Child Custody and Visitation Application',
   'Application for custody and visitation orders.',
   0, false, NULL, false, true, ARRAY['personal', 'mail', 'electronic'],
   true, 25, '[]'::jsonb, 40),

  ('CA', 'custody', 'FL-341', 'Child Custody and Visitation Order Attachment',
   'Detailed custody and visitation schedule.',
   0, false, NULL, false, false, ARRAY[]::text[],
   false, NULL, '[]'::jsonb, 41),

  -- Settlement
  ('CA', 'settlement', 'FL-180', 'Judgment (Family Law)',
   'Final judgment of dissolution. Filed after MSA signed or trial.',
   0, false, NULL, false, true, ARRAY['mail'],
   false, NULL, '[]'::jsonb, 50),

  ('CA', 'settlement', 'FL-190', 'Notice of Entry of Judgment',
   'Official notice that judgment has been entered by the court.',
   0, false, NULL, false, true, ARRAY['mail'],
   false, NULL, '[]'::jsonb, 51),

  ('CA', 'settlement', 'MSA', 'Marital Settlement Agreement',
   'Comprehensive agreement covering property division, support, custody.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 52),

  -- Discovery
  ('CA', 'discovery', 'DISC-001', 'Form Interrogatories (Family Law)',
   'Standard form interrogatories. Responses due 30 days after service.',
   0, false, 30, false, true, ARRAY['mail', 'electronic'],
   false, NULL,
   '[{"name":"Response Due","days":30,"is_working_days":false,"description":"Responses to interrogatories due within 30 days of service"}]'::jsonb,
   60),

  ('CA', 'discovery', 'DISC-002', 'Request for Production of Documents',
   'Request to produce documents. Responses due 30 days after service.',
   0, false, 30, false, true, ARRAY['mail', 'electronic'],
   false, NULL,
   '[{"name":"Response Due","days":30,"is_working_days":false,"description":"Responses to production requests due within 30 days of service"}]'::jsonb,
   61),

  -- Other
  ('CA', 'other', 'FL-170', 'Declaration for Default or Uncontested Dissolution',
   'Declaration for processing dissolution without trial.',
   0, false, NULL, false, false, ARRAY[]::text[],
   false, NULL, '[]'::jsonb, 70),

  ('CA', 'other', 'POS-040', 'Proof of Service (Mail)',
   'Proof of service by mail.',
   0, false, NULL, false, false, ARRAY[]::text[],
   false, NULL, '[]'::jsonb, 71),

  ('CA', 'other', 'POS-030', 'Proof of Personal Service',
   'Proof of personal service on respondent.',
   0, false, NULL, false, false, ARRAY[]::text[],
   false, NULL, '[]'::jsonb, 72)
ON CONFLICT (state_code, filing_code) DO NOTHING;

-- ============================================================
-- 11. SEED: TEXAS FILING TYPES
-- ============================================================
INSERT INTO filing_types (state_code, category, filing_code, filing_name, description, fee_amount, fee_waiver_eligible, response_days, is_working_days, requires_service, service_methods, requires_hearing, hearing_days_after, auto_deadlines, display_order)
VALUES
  ('TX', 'petition', 'DIVORCE-PET', 'Original Petition for Divorce',
   'Initial petition to dissolve marriage in Texas. 60-day waiting period.',
   300.00, true, 20, true, true, ARRAY['personal', 'mail', 'electronic'],
   false, NULL,
   '[{"name":"Answer Due","days":20,"is_working_days":true,"description":"Monday following 20 days after service (TX Rule 99)"},{"name":"60-Day Waiting Period","days":60,"is_working_days":false,"description":"Texas 60-day waiting period from date petition filed"}]'::jsonb,
   1),

  ('TX', 'petition', 'SAPCR', 'Suit Affecting Parent-Child Relationship',
   'Petition for custody, visitation, and child support orders.',
   300.00, true, 20, true, true, ARRAY['personal', 'mail', 'electronic'],
   false, NULL,
   '[{"name":"Answer Due","days":20,"is_working_days":true,"description":"Monday following 20 days after service"}]'::jsonb,
   2),

  ('TX', 'response', 'TX-ANSWER', 'Original Answer',
   'Respondent''s answer to the divorce petition. Due by Monday following 20 days after service.',
   300.00, true, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 10),

  ('TX', 'response', 'TX-COUNTER', 'Counter-Petition for Divorce',
   'Counter-petition filed with answer.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 11),

  ('TX', 'financial', 'TX-INVENTORY', 'Sworn Inventory and Appraisement',
   'Inventory of community and separate property under oath.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL,
   '[{"name":"Inventory Exchange","days":30,"is_working_days":false,"description":"Typically exchanged within 30 days of request"}]'::jsonb,
   20),

  ('TX', 'motion', 'TX-TRO', 'Temporary Restraining Order',
   'Application for temporary restraining order and temporary orders hearing.',
   0, false, 14, false, true, ARRAY['personal'],
   true, 14,
   '[{"name":"TRO Hearing","days":14,"is_working_days":false,"description":"TRO hearing must be set within 14 days"},{"name":"Service Required","days":3,"is_working_days":false,"description":"Must be served at least 3 days before hearing"}]'::jsonb,
   30),

  ('TX', 'motion', 'TX-MOTION', 'Motion for Temporary Orders',
   'Motion for temporary custody, support, and property orders.',
   0, false, NULL, false, true, ARRAY['personal', 'mail', 'electronic'],
   true, 21,
   '[{"name":"Hearing Date","days":21,"is_working_days":false,"description":"Hearing typically set 21 days after filing"}]'::jsonb,
   31),

  ('TX', 'settlement', 'TX-DECREE', 'Final Decree of Divorce',
   'Final decree incorporating agreed settlement or court orders.',
   0, false, NULL, false, true, ARRAY['mail'],
   false, NULL, '[]'::jsonb, 50),

  ('TX', 'settlement', 'TX-MSA', 'Mediated Settlement Agreement',
   'Settlement agreement reached through mediation (binding under TX Fam Code 6.602).',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 51),

  ('TX', 'discovery', 'TX-INTERROG', 'Interrogatories',
   'Written questions to opposing party. 30-day response deadline.',
   0, false, 30, false, true, ARRAY['mail', 'electronic'],
   false, NULL,
   '[{"name":"Response Due","days":30,"is_working_days":false,"description":"Responses due within 30 days of service"}]'::jsonb,
   60),

  ('TX', 'discovery', 'TX-PRODUCTION', 'Request for Production',
   'Request for production of documents. 30-day response deadline.',
   0, false, 30, false, true, ARRAY['mail', 'electronic'],
   false, NULL,
   '[{"name":"Response Due","days":30,"is_working_days":false,"description":"Responses due within 30 days of service"}]'::jsonb,
   61),

  ('TX', 'other', 'TX-WAIVER', 'Waiver of Service',
   'Respondent waives formal service of citation.',
   0, false, NULL, false, false, ARRAY[]::text[],
   false, NULL, '[]'::jsonb, 70)
ON CONFLICT (state_code, filing_code) DO NOTHING;

-- ============================================================
-- 12. SEED: FLORIDA FILING TYPES
-- ============================================================
INSERT INTO filing_types (state_code, category, filing_code, filing_name, description, fee_amount, fee_waiver_eligible, response_days, is_working_days, requires_service, service_methods, requires_hearing, hearing_days_after, auto_deadlines, display_order)
VALUES
  ('FL', 'petition', 'FL-PETITION', 'Petition for Dissolution of Marriage',
   'Initial petition for dissolution. 20-day response period after service.',
   408.00, true, 20, false, true, ARRAY['personal', 'mail', 'electronic'],
   false, NULL,
   '[{"name":"Response Due","days":20,"is_working_days":false,"description":"Respondent has 20 calendar days to respond after service"},{"name":"Financial Affidavit Due","days":45,"is_working_days":false,"description":"Mandatory disclosure due within 45 days of service of petition"}]'::jsonb,
   1),

  ('FL', 'petition', 'FL-SUMMONS', 'Summons: Personal Service on Individual',
   'Summons accompanying petition for personal service.',
   0, false, NULL, false, true, ARRAY['personal'],
   false, NULL, '[]'::jsonb, 2),

  ('FL', 'petition', 'FL-UCCJEA', 'UCCJEA Affidavit',
   'Uniform Child Custody Jurisdiction affidavit. Required when children involved.',
   0, false, NULL, false, false, ARRAY[]::text[],
   false, NULL, '[]'::jsonb, 3),

  ('FL', 'response', 'FL-ANSWER', 'Answer to Petition and Counterpetition',
   'Respondent''s answer, may include counterpetition. Due 20 days after service.',
   300.00, true, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 10),

  ('FL', 'financial', 'FL-AFFIDAVIT', 'Financial Affidavit (Long Form)',
   'Mandatory financial affidavit. Long form required if income > $50k/year.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL,
   '[{"name":"Filing Deadline","days":45,"is_working_days":false,"description":"Must be filed within 45 days of service of initial petition"}]'::jsonb,
   20),

  ('FL', 'financial', 'FL-AFFIDAVIT-SHORT', 'Financial Affidavit (Short Form)',
   'Short form for income under $50k/year.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL,
   '[{"name":"Filing Deadline","days":45,"is_working_days":false,"description":"Must be filed within 45 days of service of initial petition"}]'::jsonb,
   21),

  ('FL', 'motion', 'FL-MOTION-TMP', 'Motion for Temporary Relief',
   'Motion for temporary custody, support, or injunction.',
   50.00, true, 15, false, true, ARRAY['personal', 'mail', 'electronic'],
   true, 15,
   '[{"name":"Hearing Date","days":15,"is_working_days":false,"description":"Hearing on temporary relief"},{"name":"Service Required","days":5,"is_working_days":false,"description":"Must be served at least 5 days before hearing"}]'::jsonb,
   30),

  ('FL', 'motion', 'FL-MOTION-ENFORCE', 'Motion for Contempt/Enforcement',
   'Motion to enforce court orders or hold party in contempt.',
   50.00, true, NULL, false, true, ARRAY['personal'],
   true, 21, '[]'::jsonb, 31),

  ('FL', 'custody', 'FL-PARENTING', 'Parenting Plan',
   'Required parenting plan for time-sharing with minor children.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 40),

  ('FL', 'settlement', 'FL-MSA', 'Marital Settlement Agreement',
   'Comprehensive settlement agreement for property, support, and custody.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 50),

  ('FL', 'settlement', 'FL-JUDGMENT', 'Final Judgment of Dissolution',
   'Final judgment dissolving the marriage.',
   0, false, NULL, false, true, ARRAY['mail'],
   false, NULL, '[]'::jsonb, 51),

  ('FL', 'discovery', 'FL-INTERROG', 'Interrogatories',
   'Standard and custom interrogatories. 30-day response period.',
   0, false, 30, false, true, ARRAY['mail', 'electronic'],
   false, NULL,
   '[{"name":"Response Due","days":30,"is_working_days":false,"description":"Responses due within 30 days of service"}]'::jsonb,
   60),

  ('FL', 'other', 'FL-MEDIATION', 'Notice of Mediation',
   'Notice scheduling mediation. Required in most Florida family cases.',
   0, false, NULL, false, true, ARRAY['mail', 'electronic'],
   false, NULL, '[]'::jsonb, 70),

  ('FL', 'other', 'FL-PARENTING-CLASS', 'Parenting Course Certificate',
   'Proof of completion of mandatory parenting course.',
   0, false, NULL, false, false, ARRAY[]::text[],
   false, NULL, '[]'::jsonb, 71)
ON CONFLICT (state_code, filing_code) DO NOTHING;

-- ============================================================
-- 13. SEED: COURT HOLIDAYS (2025-2027, CA/TX/FL)
-- ============================================================
INSERT INTO court_holidays (state_code, holiday_date, holiday_name, is_federal, year)
VALUES
  -- 2025 Federal (all states)
  ('CA', '2025-01-01', 'New Year''s Day', true, 2025),
  ('CA', '2025-01-20', 'Martin Luther King Jr. Day', true, 2025),
  ('CA', '2025-02-17', 'Presidents'' Day', true, 2025),
  ('CA', '2025-05-26', 'Memorial Day', true, 2025),
  ('CA', '2025-06-19', 'Juneteenth', true, 2025),
  ('CA', '2025-07-04', 'Independence Day', true, 2025),
  ('CA', '2025-09-01', 'Labor Day', true, 2025),
  ('CA', '2025-11-11', 'Veterans Day', true, 2025),
  ('CA', '2025-11-27', 'Thanksgiving', true, 2025),
  ('CA', '2025-12-25', 'Christmas Day', true, 2025),
  -- CA state holidays
  ('CA', '2025-03-31', 'Cesar Chavez Day', false, 2025),

  ('TX', '2025-01-01', 'New Year''s Day', true, 2025),
  ('TX', '2025-01-20', 'Martin Luther King Jr. Day', true, 2025),
  ('TX', '2025-02-17', 'Presidents'' Day', true, 2025),
  ('TX', '2025-03-02', 'Texas Independence Day', false, 2025),
  ('TX', '2025-05-26', 'Memorial Day', true, 2025),
  ('TX', '2025-06-19', 'Juneteenth', true, 2025),
  ('TX', '2025-07-04', 'Independence Day', true, 2025),
  ('TX', '2025-09-01', 'Labor Day', true, 2025),
  ('TX', '2025-11-11', 'Veterans Day', true, 2025),
  ('TX', '2025-11-27', 'Thanksgiving', true, 2025),
  ('TX', '2025-12-25', 'Christmas Day', true, 2025),

  ('FL', '2025-01-01', 'New Year''s Day', true, 2025),
  ('FL', '2025-01-20', 'Martin Luther King Jr. Day', true, 2025),
  ('FL', '2025-02-17', 'Presidents'' Day', true, 2025),
  ('FL', '2025-05-26', 'Memorial Day', true, 2025),
  ('FL', '2025-06-19', 'Juneteenth', true, 2025),
  ('FL', '2025-07-04', 'Independence Day', true, 2025),
  ('FL', '2025-09-01', 'Labor Day', true, 2025),
  ('FL', '2025-11-11', 'Veterans Day', true, 2025),
  ('FL', '2025-11-27', 'Thanksgiving', true, 2025),
  ('FL', '2025-12-25', 'Christmas Day', true, 2025),

  -- 2026 Federal (all states)
  ('CA', '2026-01-01', 'New Year''s Day', true, 2026),
  ('CA', '2026-01-19', 'Martin Luther King Jr. Day', true, 2026),
  ('CA', '2026-02-16', 'Presidents'' Day', true, 2026),
  ('CA', '2026-05-25', 'Memorial Day', true, 2026),
  ('CA', '2026-06-19', 'Juneteenth', true, 2026),
  ('CA', '2026-07-03', 'Independence Day (Observed)', true, 2026),
  ('CA', '2026-09-07', 'Labor Day', true, 2026),
  ('CA', '2026-11-11', 'Veterans Day', true, 2026),
  ('CA', '2026-11-26', 'Thanksgiving', true, 2026),
  ('CA', '2026-12-25', 'Christmas Day', true, 2026),
  ('CA', '2026-03-31', 'Cesar Chavez Day', false, 2026),

  ('TX', '2026-01-01', 'New Year''s Day', true, 2026),
  ('TX', '2026-01-19', 'Martin Luther King Jr. Day', true, 2026),
  ('TX', '2026-02-16', 'Presidents'' Day', true, 2026),
  ('TX', '2026-03-02', 'Texas Independence Day', false, 2026),
  ('TX', '2026-05-25', 'Memorial Day', true, 2026),
  ('TX', '2026-06-19', 'Juneteenth', true, 2026),
  ('TX', '2026-07-03', 'Independence Day (Observed)', true, 2026),
  ('TX', '2026-09-07', 'Labor Day', true, 2026),
  ('TX', '2026-11-11', 'Veterans Day', true, 2026),
  ('TX', '2026-11-26', 'Thanksgiving', true, 2026),
  ('TX', '2026-12-25', 'Christmas Day', true, 2026),

  ('FL', '2026-01-01', 'New Year''s Day', true, 2026),
  ('FL', '2026-01-19', 'Martin Luther King Jr. Day', true, 2026),
  ('FL', '2026-02-16', 'Presidents'' Day', true, 2026),
  ('FL', '2026-05-25', 'Memorial Day', true, 2026),
  ('FL', '2026-06-19', 'Juneteenth', true, 2026),
  ('FL', '2026-07-03', 'Independence Day (Observed)', true, 2026),
  ('FL', '2026-09-07', 'Labor Day', true, 2026),
  ('FL', '2026-11-11', 'Veterans Day', true, 2026),
  ('FL', '2026-11-26', 'Thanksgiving', true, 2026),
  ('FL', '2026-12-25', 'Christmas Day', true, 2026)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 14. SEED: SAMPLE COURTS
-- ============================================================
INSERT INTO courts (state_code, county, court_name, court_type, address, city, zip, phone, efiling_enabled, efiling_provider, filing_hours)
VALUES
  ('CA', 'Los Angeles', 'Los Angeles Superior Court - Stanley Mosk', 'superior',
   '111 N. Hill St.', 'Los Angeles', '90012', '(213) 830-0800',
   true, 'tyler', '8:30 AM - 4:30 PM'),
  ('CA', 'Los Angeles', 'Los Angeles Superior Court - Chatsworth', 'superior',
   '9425 Penfield Ave.', 'Chatsworth', '91311', '(818) 407-2200',
   true, 'tyler', '8:30 AM - 4:30 PM'),
  ('CA', 'San Francisco', 'San Francisco Superior Court - Family Law', 'superior',
   '400 McAllister St.', 'San Francisco', '94102', '(415) 551-3838',
   true, 'tyler', '8:30 AM - 4:00 PM'),
  ('CA', 'San Diego', 'San Diego Superior Court - Central', 'superior',
   '1100 Union St.', 'San Diego', '92101', '(619) 844-2500',
   true, 'tyler', '8:00 AM - 4:00 PM'),
  ('CA', 'Orange', 'Orange County Superior Court - Lamoreaux Justice Center', 'superior',
   '341 The City Dr. S.', 'Orange', '92868', '(657) 622-5600',
   true, 'tyler', '8:00 AM - 4:00 PM'),

  ('TX', 'Harris', 'Harris County District Court', 'district',
   '201 Caroline St.', 'Houston', '77002', '(713) 755-6395',
   true, 'fileandserve', '8:00 AM - 5:00 PM'),
  ('TX', 'Dallas', 'Dallas County District Court', 'district',
   '600 Commerce St.', 'Dallas', '75202', '(214) 653-7301',
   true, 'fileandserve', '8:00 AM - 5:00 PM'),
  ('TX', 'Bexar', 'Bexar County District Court', 'district',
   '100 Dolorosa St.', 'San Antonio', '78205', '(210) 335-2011',
   true, 'fileandserve', '8:00 AM - 5:00 PM'),
  ('TX', 'Travis', 'Travis County District Court', 'district',
   '1000 Guadalupe St.', 'Austin', '78701', '(512) 854-9457',
   true, 'fileandserve', '8:00 AM - 5:00 PM'),

  ('FL', 'Miami-Dade', 'Miami-Dade County Circuit Court - Family Division', 'circuit',
   '175 NW 1st Ave.', 'Miami', '33128', '(305) 349-7001',
   true, 'odyssey', '8:00 AM - 4:00 PM'),
  ('FL', 'Broward', 'Broward County Circuit Court - Family Division', 'circuit',
   '201 SE 6th St.', 'Fort Lauderdale', '33301', '(954) 831-6565',
   true, 'odyssey', '8:00 AM - 4:00 PM'),
  ('FL', 'Hillsborough', 'Hillsborough County Circuit Court - Family Law', 'circuit',
   '800 E. Twiggs St.', 'Tampa', '33602', '(813) 276-8100',
   true, 'odyssey', '8:00 AM - 5:00 PM'),
  ('FL', 'Orange', 'Orange County Circuit Court - Family Division', 'circuit',
   '425 N. Orange Ave.', 'Orlando', '32801', '(407) 836-2000',
   true, 'odyssey', '8:00 AM - 5:00 PM')
ON CONFLICT (state_code, county, court_name) DO NOTHING;
