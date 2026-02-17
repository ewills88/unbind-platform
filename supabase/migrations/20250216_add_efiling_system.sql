-- Session 18 Checkpoint 2: E-Filing Integration
-- Credentials, Submissions, Code Mappings, Payment Accounts

-- ============================================================
-- 1. E-FILING CREDENTIALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS efiling_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- tyler, file_serve, odyssey, one_legal
  environment TEXT NOT NULL DEFAULT 'production', -- production, staging, sandbox
  display_name TEXT,
  username_encrypted TEXT,
  password_encrypted TEXT,
  client_token_encrypted TEXT,
  api_key_encrypted TEXT,
  firm_id_at_provider TEXT,
  attorney_id_at_provider TEXT,
  default_payment_account_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  last_error TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_efiling_credentials_firm ON efiling_credentials(firm_id);
CREATE INDEX IF NOT EXISTS idx_efiling_credentials_provider ON efiling_credentials(provider);

-- ============================================================
-- 2. E-FILING SUBMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS efiling_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  filing_id UUID NOT NULL REFERENCES case_filings(id) ON DELETE CASCADE,
  credential_id UUID NOT NULL REFERENCES efiling_credentials(id),
  provider TEXT NOT NULL,

  -- Envelope info
  envelope_id TEXT,
  envelope_number TEXT,
  submission_timestamp TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, processing, accepted, partially_accepted, rejected, error, cancelled
  status_message TEXT,
  status_timestamp TIMESTAMPTZ,

  -- Court info
  court_location_code TEXT,
  case_number_at_court TEXT,
  case_category_code TEXT,
  case_type_code TEXT,
  filing_code TEXT,
  filing_description TEXT,

  -- Documents
  documents_submitted JSONB DEFAULT '[]',

  -- Fees
  filing_fee_amount NUMERIC(10,2) DEFAULT 0,
  convenience_fee NUMERIC(10,2) DEFAULT 0,
  total_charged NUMERIC(10,2) DEFAULT 0,
  payment_account_id TEXT,
  transaction_id TEXT,

  -- Acceptance
  accepted_timestamp TIMESTAMPTZ,
  filing_number TEXT,
  stamped_documents JSONB,

  -- Rejection
  rejected_timestamp TIMESTAMPTZ,
  rejection_reason TEXT,
  rejection_codes JSONB,

  -- Raw data
  raw_request JSONB,
  raw_response JSONB,

  -- Webhook
  webhook_received BOOLEAN NOT NULL DEFAULT false,
  webhook_payload JSONB,

  -- Retry
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_efiling_submissions_case ON efiling_submissions(case_id);
CREATE INDEX IF NOT EXISTS idx_efiling_submissions_filing ON efiling_submissions(filing_id);
CREATE INDEX IF NOT EXISTS idx_efiling_submissions_status ON efiling_submissions(status);
CREATE INDEX IF NOT EXISTS idx_efiling_submissions_envelope ON efiling_submissions(envelope_id);

-- ============================================================
-- 3. E-FILING CODE MAPPINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS efiling_code_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  state_code TEXT NOT NULL,
  county TEXT,
  court_location_code TEXT,
  unbind_filing_type_code TEXT,
  efiling_code TEXT NOT NULL,
  efiling_category TEXT,
  efiling_description TEXT,
  document_type_codes JSONB DEFAULT '[]',
  filing_component_codes JSONB DEFAULT '[]',
  party_type_codes JSONB DEFAULT '[]',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_efiling_code_mappings_provider ON efiling_code_mappings(provider, state_code);
CREATE INDEX IF NOT EXISTS idx_efiling_code_mappings_code ON efiling_code_mappings(unbind_filing_type_code);

-- ============================================================
-- 4. E-FILING PAYMENT ACCOUNTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS efiling_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES efiling_credentials(id) ON DELETE CASCADE,
  account_id_at_provider TEXT NOT NULL,
  account_name TEXT,
  account_type TEXT NOT NULL DEFAULT 'credit_card', -- credit_card, ach, waiver, firm_account
  last_four TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_efiling_payment_accounts_credential ON efiling_payment_accounts(credential_id);

-- ============================================================
-- 5. TRIGGERS
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_efiling_credentials_updated_at') THEN
    CREATE TRIGGER update_efiling_credentials_updated_at
      BEFORE UPDATE ON efiling_credentials
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================
ALTER TABLE efiling_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE efiling_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE efiling_code_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE efiling_payment_accounts ENABLE ROW LEVEL SECURITY;

-- Credentials: firm members can view their firm's credentials
DROP POLICY IF EXISTS "efiling_credentials_select" ON efiling_credentials;
CREATE POLICY "efiling_credentials_select" ON efiling_credentials FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.current_firm_id = efiling_credentials.firm_id
    )
  );

DROP POLICY IF EXISTS "efiling_credentials_insert" ON efiling_credentials;
CREATE POLICY "efiling_credentials_insert" ON efiling_credentials FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.current_firm_id = efiling_credentials.firm_id
    )
  );

DROP POLICY IF EXISTS "efiling_credentials_update" ON efiling_credentials;
CREATE POLICY "efiling_credentials_update" ON efiling_credentials FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.current_firm_id = efiling_credentials.firm_id
    )
  );

DROP POLICY IF EXISTS "efiling_credentials_delete" ON efiling_credentials;
CREATE POLICY "efiling_credentials_delete" ON efiling_credentials FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.current_firm_id = efiling_credentials.firm_id
    )
  );

-- Submissions: accessible through case ownership
DROP POLICY IF EXISTS "efiling_submissions_select" ON efiling_submissions;
CREATE POLICY "efiling_submissions_select" ON efiling_submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = efiling_submissions.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "efiling_submissions_insert" ON efiling_submissions;
CREATE POLICY "efiling_submissions_insert" ON efiling_submissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = efiling_submissions.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "efiling_submissions_update" ON efiling_submissions;
CREATE POLICY "efiling_submissions_update" ON efiling_submissions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = efiling_submissions.case_id
      AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    )
  );

-- Code mappings: readable by all authenticated users
DROP POLICY IF EXISTS "efiling_code_mappings_select" ON efiling_code_mappings;
CREATE POLICY "efiling_code_mappings_select" ON efiling_code_mappings FOR SELECT TO authenticated USING (true);

-- Payment accounts: through credential ownership
DROP POLICY IF EXISTS "efiling_payment_accounts_select" ON efiling_payment_accounts;
CREATE POLICY "efiling_payment_accounts_select" ON efiling_payment_accounts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM efiling_credentials
      JOIN profiles ON profiles.current_firm_id = efiling_credentials.firm_id
      WHERE efiling_credentials.id = efiling_payment_accounts.credential_id
      AND profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "efiling_payment_accounts_insert" ON efiling_payment_accounts;
CREATE POLICY "efiling_payment_accounts_insert" ON efiling_payment_accounts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM efiling_credentials
      JOIN profiles ON profiles.current_firm_id = efiling_credentials.firm_id
      WHERE efiling_credentials.id = efiling_payment_accounts.credential_id
      AND profiles.id = auth.uid()
    )
  );

-- ============================================================
-- 7. SEED: CODE MAPPINGS FOR CA TYLER
-- ============================================================
INSERT INTO efiling_code_mappings (provider, state_code, court_location_code, unbind_filing_type_code, efiling_code, efiling_category, efiling_description, document_type_codes, party_type_codes)
VALUES
  ('tyler', 'CA', 'los-angeles', 'FL-100', 'FL100', 'family', 'Petition - Marriage/Domestic Partnership',
   '["PETITION","SUMMONS","UCCJEA"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),
  ('tyler', 'CA', 'los-angeles', 'FL-110', 'FL110', 'family', 'Summons (Family Law)',
   '["SUMMONS"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),
  ('tyler', 'CA', 'los-angeles', 'FL-120', 'FL120', 'family', 'Response - Marriage/Domestic Partnership',
   '["RESPONSE"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),
  ('tyler', 'CA', 'los-angeles', 'FL-150', 'FL150', 'family', 'Income and Expense Declaration',
   '["DECLARATION","ATTACHMENT"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),
  ('tyler', 'CA', 'los-angeles', 'FL-140', 'FL140', 'family', 'Declaration of Disclosure',
   '["DECLARATION","SCHEDULE"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),
  ('tyler', 'CA', 'los-angeles', 'FL-300', 'FL300', 'family', 'Request for Order',
   '["MOTION","DECLARATION","PROPOSED_ORDER"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),
  ('tyler', 'CA', 'los-angeles', 'FL-180', 'FL180', 'family', 'Judgment (Family Law)',
   '["JUDGMENT","MSA","ATTACHMENT"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),
  ('tyler', 'CA', 'los-angeles', 'MSA', 'MSA', 'family', 'Marital Settlement Agreement',
   '["MSA","ATTACHMENT"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),

  ('tyler', 'TX', 'harris', 'DIVORCE-PET', 'DIVORCE_ORIGINAL', 'family', 'Original Petition for Divorce',
   '["PETITION","SUMMONS"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),
  ('tyler', 'TX', 'harris', 'TX-ANSWER', 'DIVORCE_ANSWER', 'family', 'Original Answer',
   '["ANSWER"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),
  ('tyler', 'TX', 'harris', 'TX-DECREE', 'FINAL_DECREE', 'family', 'Final Decree of Divorce',
   '["DECREE","MSA","ATTACHMENT"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),

  ('tyler', 'FL', 'miami-dade', 'FL-PETITION', 'FL_DISSOLUTION', 'family', 'Petition for Dissolution of Marriage',
   '["PETITION","SUMMONS","UCCJEA"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),
  ('tyler', 'FL', 'miami-dade', 'FL-ANSWER', 'FL_ANSWER', 'family', 'Answer and Counterpetition',
   '["ANSWER","COUNTERPETITION"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb),
  ('tyler', 'FL', 'miami-dade', 'FL-JUDGMENT', 'FL_FINAL_JUDGMENT', 'family', 'Final Judgment of Dissolution',
   '["JUDGMENT","MSA"]'::jsonb, '["PETITIONER","RESPONDENT"]'::jsonb)
ON CONFLICT DO NOTHING;
