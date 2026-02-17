-- ============================================================
-- Session 18 CP3: Court Forms, Filing Checklists & Hearings
-- ============================================================

-- ============================================================
-- 1. COURT FORMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS court_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  county TEXT,
  form_number TEXT NOT NULL,
  form_name TEXT NOT NULL,
  form_category TEXT NOT NULL CHECK (form_category IN ('petition', 'response', 'financial', 'custody', 'support', 'disclosure', 'motion', 'judgment', 'other')),
  description TEXT,
  pdf_template_url TEXT,
  pdf_template_path TEXT,
  fillable BOOLEAN NOT NULL DEFAULT true,
  field_mappings JSONB NOT NULL DEFAULT '{}',
  instructions_url TEXT,
  effective_date DATE,
  superseded_date DATE,
  superseded_by TEXT,
  version TEXT,
  page_count INTEGER,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  related_forms TEXT[] NOT NULL DEFAULT '{}',
  filing_types TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(state_code, form_number)
);

CREATE INDEX idx_court_forms_state ON court_forms(state_code);
CREATE INDEX idx_court_forms_category ON court_forms(form_category);
CREATE INDEX idx_court_forms_number ON court_forms(form_number);

CREATE TRIGGER set_court_forms_updated_at
  BEFORE UPDATE ON court_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. FORM PACKETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS form_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  packet_name TEXT NOT NULL,
  description TEXT,
  form_ids UUID[] NOT NULL DEFAULT '{}',
  filing_type_code TEXT,
  case_phase TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_form_packets_state ON form_packets(state_code);
CREATE INDEX idx_form_packets_phase ON form_packets(case_phase);

-- ============================================================
-- 3. FILLED FORMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS filled_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES court_forms(id),
  form_number TEXT NOT NULL,
  form_name TEXT NOT NULL,
  field_values JSONB NOT NULL DEFAULT '{}',
  overrides JSONB NOT NULL DEFAULT '{}',
  filled_pdf_path TEXT,
  filled_pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'finalized', 'filed')),
  version INTEGER NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  filed_with_filing_id UUID REFERENCES case_filings(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_filled_forms_case ON filled_forms(case_id);
CREATE INDEX idx_filled_forms_form ON filled_forms(form_id);
CREATE INDEX idx_filled_forms_status ON filled_forms(status);

CREATE TRIGGER set_filled_forms_updated_at
  BEFORE UPDATE ON filled_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. FILING CHECKLISTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS filing_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  case_type TEXT NOT NULL DEFAULT 'dissolution' CHECK (case_type IN ('dissolution', 'legal_separation', 'nullity', 'paternity')),
  checklist_name TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('filing', 'response', 'disclosure', 'discovery', 'settlement', 'trial', 'judgment', 'post_judgment')),
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  estimated_days INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_filing_checklists_state ON filing_checklists(state_code, case_type);
CREATE INDEX idx_filing_checklists_phase ON filing_checklists(phase);

-- ============================================================
-- 5. CASE CHECKLIST PROGRESS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS case_checklist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES filing_checklists(id),
  item_id TEXT NOT NULL,
  item_name TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete', 'not_applicable', 'waived')),
  filing_id UUID REFERENCES case_filings(id),
  deadline_date DATE,
  completed_date DATE,
  completed_by UUID REFERENCES auth.users(id),
  waiver_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(case_id, checklist_id, item_id)
);

CREATE INDEX idx_checklist_progress_case ON case_checklist_progress(case_id);
CREATE INDEX idx_checklist_progress_status ON case_checklist_progress(status);

CREATE TRIGGER set_checklist_progress_updated_at
  BEFORE UPDATE ON case_checklist_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. COURT HEARINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS court_hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  hearing_type TEXT NOT NULL CHECK (hearing_type IN ('status_conference', 'cmc', 'rfo', 'motion', 'osc', 'settlement_conference', 'msc', 'trial', 'prove_up', 'default', 'other')),
  hearing_name TEXT NOT NULL,
  hearing_date DATE NOT NULL,
  hearing_time TIME,
  estimated_duration TEXT,
  court_id UUID REFERENCES courts(id),
  department TEXT,
  judge_name TEXT,
  appearance_type TEXT NOT NULL DEFAULT 'in_person' CHECK (appearance_type IN ('in_person', 'remote', 'telephonic', 'hybrid')),
  remote_link TEXT,
  remote_phone TEXT,
  remote_access_code TEXT,
  related_filing_id UUID REFERENCES case_filings(id),
  issues_to_be_heard TEXT[] NOT NULL DEFAULT '{}',
  our_position TEXT,
  their_position TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'continued', 'vacated', 'completed')),
  continued_to_date DATE,
  continued_to_hearing_id UUID REFERENCES court_hearings(id),
  continuance_reason TEXT,
  outcome TEXT,
  outcome_details TEXT,
  orders_issued TEXT,
  order_document_id UUID,
  minutes_document_id UUID,
  next_hearing_date DATE,
  tentative_ruling TEXT,
  tentative_ruling_url TEXT,
  prep_notes TEXT,
  client_prep_complete BOOLEAN NOT NULL DEFAULT false,
  documents_prepared BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hearings_case ON court_hearings(case_id);
CREATE INDEX idx_hearings_date ON court_hearings(hearing_date);
CREATE INDEX idx_hearings_status ON court_hearings(status);

CREATE TRIGGER set_court_hearings_updated_at
  BEFORE UPDATE ON court_hearings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. HEARING PREP TASKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS hearing_prep_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id UUID NOT NULL REFERENCES court_hearings(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_type TEXT NOT NULL DEFAULT 'other' CHECK (task_type IN ('document_prep', 'client_prep', 'witness_prep', 'exhibit_prep', 'brief', 'other')),
  due_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prep_tasks_hearing ON hearing_prep_tasks(hearing_id);
CREATE INDEX idx_prep_tasks_status ON hearing_prep_tasks(status);

-- ============================================================
-- 8. HEARING EXHIBITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS hearing_exhibits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id UUID NOT NULL REFERENCES court_hearings(id) ON DELETE CASCADE,
  exhibit_number TEXT,
  document_id UUID,
  description TEXT,
  offered_by TEXT CHECK (offered_by IN ('petitioner', 'respondent')),
  admitted BOOLEAN,
  objection TEXT,
  ruling TEXT,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exhibits_hearing ON hearing_exhibits(hearing_id);

-- ============================================================
-- 9. RLS POLICIES
-- ============================================================
ALTER TABLE court_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE filled_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearing_prep_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearing_exhibits ENABLE ROW LEVEL SECURITY;

-- Court forms & checklists: readable by all authenticated users (reference data)
CREATE POLICY "court_forms_select" ON court_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "form_packets_select" ON form_packets FOR SELECT TO authenticated USING (true);
CREATE POLICY "filing_checklists_select" ON filing_checklists FOR SELECT TO authenticated USING (true);

-- Filled forms: case ownership
CREATE POLICY "filled_forms_select" ON filled_forms FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid()));
CREATE POLICY "filled_forms_insert" ON filled_forms FOR INSERT TO authenticated
  WITH CHECK (case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid()));
CREATE POLICY "filled_forms_update" ON filled_forms FOR UPDATE TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid()));
CREATE POLICY "filled_forms_delete" ON filled_forms FOR DELETE TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid()));

-- Checklist progress: case ownership
CREATE POLICY "checklist_progress_select" ON case_checklist_progress FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid()));
CREATE POLICY "checklist_progress_insert" ON case_checklist_progress FOR INSERT TO authenticated
  WITH CHECK (case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid()));
CREATE POLICY "checklist_progress_update" ON case_checklist_progress FOR UPDATE TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid()));

-- Hearings: case ownership
CREATE POLICY "hearings_select" ON court_hearings FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid()));
CREATE POLICY "hearings_insert" ON court_hearings FOR INSERT TO authenticated
  WITH CHECK (case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid()));
CREATE POLICY "hearings_update" ON court_hearings FOR UPDATE TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid()));
CREATE POLICY "hearings_delete" ON court_hearings FOR DELETE TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid()));

-- Hearing prep tasks: via hearing ownership
CREATE POLICY "prep_tasks_select" ON hearing_prep_tasks FOR SELECT TO authenticated
  USING (hearing_id IN (
    SELECT id FROM court_hearings WHERE case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid())
  ));
CREATE POLICY "prep_tasks_insert" ON hearing_prep_tasks FOR INSERT TO authenticated
  WITH CHECK (hearing_id IN (
    SELECT id FROM court_hearings WHERE case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid())
  ));
CREATE POLICY "prep_tasks_update" ON hearing_prep_tasks FOR UPDATE TO authenticated
  USING (hearing_id IN (
    SELECT id FROM court_hearings WHERE case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid())
  ));
CREATE POLICY "prep_tasks_delete" ON hearing_prep_tasks FOR DELETE TO authenticated
  USING (hearing_id IN (
    SELECT id FROM court_hearings WHERE case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid())
  ));

-- Hearing exhibits: via hearing ownership
CREATE POLICY "exhibits_select" ON hearing_exhibits FOR SELECT TO authenticated
  USING (hearing_id IN (
    SELECT id FROM court_hearings WHERE case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid())
  ));
CREATE POLICY "exhibits_insert" ON hearing_exhibits FOR INSERT TO authenticated
  WITH CHECK (hearing_id IN (
    SELECT id FROM court_hearings WHERE case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid())
  ));
CREATE POLICY "exhibits_update" ON hearing_exhibits FOR UPDATE TO authenticated
  USING (hearing_id IN (
    SELECT id FROM court_hearings WHERE case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid())
  ));
CREATE POLICY "exhibits_delete" ON hearing_exhibits FOR DELETE TO authenticated
  USING (hearing_id IN (
    SELECT id FROM court_hearings WHERE case_id IN (SELECT id FROM cases WHERE attorney_id = auth.uid())
  ));

-- ============================================================
-- 10. SEED: CALIFORNIA COURT FORMS
-- ============================================================
INSERT INTO court_forms (state_code, form_number, form_name, form_category, description, pdf_template_url, fillable, field_mappings, effective_date, page_count, is_mandatory, related_forms, filing_types)
VALUES
  ('CA', 'FL-100', 'Petition—Marriage/Domestic Partnership', 'petition',
   'Initial petition to start dissolution, legal separation, or nullity proceedings',
   'https://www.courts.ca.gov/documents/fl100.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","marriage_date":"case.marriage_date","separation_date":"case.separation_date","petitioner_address":"case.petitioner.address_full","minor_children":"case.children.count > 0","children_names":"case.children.names_and_ages","real_property":"case.has_real_property","spousal_support_requested":"case.spousal_support_requested"}'::jsonb,
   '2023-01-01', 4, true, ARRAY['FL-110','FL-115','FL-105'], ARRAY['petition']),

  ('CA', 'FL-110', 'Summons (Family Law)', 'petition',
   'Summons that must be served with the petition',
   'https://www.courts.ca.gov/documents/fl110.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number"}'::jsonb,
   '2023-01-01', 2, true, ARRAY['FL-100'], ARRAY['petition','summons']),

  ('CA', 'FL-115', 'Proof of Service of Summons', 'petition',
   'Proof that summons and petition were served',
   'https://www.courts.ca.gov/documents/fl115.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number","served_date":"service.service_date","served_address":"service.served_to_address","server_name":"service.server_name","service_type":"service.service_type"}'::jsonb,
   '2023-01-01', 2, true, ARRAY['FL-100','FL-110'], ARRAY['proof_of_service']),

  ('CA', 'FL-105', 'Declaration Under UCCJEA', 'custody',
   'Uniform Child Custody Jurisdiction and Enforcement Act declaration. Required when minor children are involved.',
   'https://www.courts.ca.gov/documents/fl105.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number","children":"case.children"}'::jsonb,
   '2023-01-01', 3, false, ARRAY['FL-100'], ARRAY['petition','custody']),

  ('CA', 'FL-120', 'Response—Marriage/Domestic Partnership', 'response',
   'Response to petition for dissolution',
   'https://www.courts.ca.gov/documents/fl120.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number"}'::jsonb,
   '2023-01-01', 4, false, ARRAY['FL-105'], ARRAY['response']),

  ('CA', 'FL-150', 'Income and Expense Declaration', 'financial',
   'Detailed income and expense information',
   'https://www.courts.ca.gov/documents/fl150.pdf', true,
   '{"party_name":"party.full_name","employer_name":"party.employment.employer_name","employer_address":"party.employment.employer_address","job_title":"party.employment.job_title","gross_monthly_income":"party.income.gross_monthly","net_monthly_income":"party.income.net_monthly","monthly_expenses":"party.expenses.total_monthly"}'::jsonb,
   '2023-01-01', 4, true, ARRAY['FL-140','FL-142'], ARRAY['income_expense','preliminary_disclosure','final_disclosure','rfo']),

  ('CA', 'FL-142', 'Schedule of Assets and Debts', 'financial',
   'List of all community and separate property',
   'https://www.courts.ca.gov/documents/fl142.pdf', true,
   '{"party_name":"party.full_name","assets":"case.financial_items.assets","debts":"case.financial_items.debts"}'::jsonb,
   '2023-01-01', 4, true, ARRAY['FL-140','FL-150'], ARRAY['schedule_assets_debts','preliminary_disclosure','final_disclosure']),

  ('CA', 'FL-140', 'Declaration of Disclosure', 'disclosure',
   'Cover sheet for preliminary and final disclosures',
   'https://www.courts.ca.gov/documents/fl140.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number","disclosure_type":"disclosure.type"}'::jsonb,
   '2023-01-01', 2, true, ARRAY['FL-142','FL-150','FL-160'], ARRAY['preliminary_disclosure','final_disclosure']),

  ('CA', 'FL-141', 'Declaration Regarding Service of Disclosure', 'disclosure',
   'Declaration that preliminary or final disclosure was served',
   'https://www.courts.ca.gov/documents/fl141.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number"}'::jsonb,
   '2023-01-01', 2, true, ARRAY['FL-140'], ARRAY['declaration_of_service']),

  ('CA', 'FL-160', 'Property Declaration', 'financial',
   'Community and separate property declaration attachment',
   'https://www.courts.ca.gov/documents/fl160.pdf', true,
   '{"party_name":"party.full_name","assets":"case.financial_items.assets","debts":"case.financial_items.debts"}'::jsonb,
   '2023-01-01', 2, false, ARRAY['FL-140','FL-142'], ARRAY['preliminary_disclosure','final_disclosure']),

  ('CA', 'FL-300', 'Request for Order', 'motion',
   'Request for temporary orders (custody, support, etc.)',
   'https://www.courts.ca.gov/documents/fl300.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number","hearing_date":"hearing.hearing_date","hearing_time":"hearing.hearing_time","department":"hearing.department"}'::jsonb,
   '2023-01-01', 4, false, ARRAY['FL-305','FL-311','FL-150'], ARRAY['rfo']),

  ('CA', 'FL-305', 'Temporary Emergency Orders', 'motion',
   'Application for emergency ex parte orders',
   'https://www.courts.ca.gov/documents/fl305.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number"}'::jsonb,
   '2023-01-01', 2, false, ARRAY['FL-300'], ARRAY['rfo','emergency']),

  ('CA', 'FL-320', 'Responsive Declaration to Request for Order', 'motion',
   'Response to Request for Order',
   'https://www.courts.ca.gov/documents/fl320.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number"}'::jsonb,
   '2023-01-01', 3, false, ARRAY['FL-150'], ARRAY['responsive_declaration']),

  ('CA', 'FL-311', 'Child Custody and Visitation Application Attachment', 'custody',
   'Details of requested custody and visitation orders',
   'https://www.courts.ca.gov/documents/fl311.pdf', true,
   '{"children":"case.children","custody_requested":"proposal.custody"}'::jsonb,
   '2023-01-01', 3, false, ARRAY['FL-300','FL-341'], ARRAY['rfo','custody']),

  ('CA', 'FL-341', 'Child Custody and Visitation Order Attachment', 'custody',
   'Custody and visitation orders',
   'https://www.courts.ca.gov/documents/fl341.pdf', true,
   '{"children":"case.children","custody_order":"order.custody"}'::jsonb,
   '2023-01-01', 6, false, ARRAY['FL-311'], ARRAY['custody_order']),

  ('CA', 'FL-165', 'Request to Enter Default', 'judgment',
   'Request when respondent fails to respond',
   'https://www.courts.ca.gov/documents/fl165.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number"}'::jsonb,
   '2023-01-01', 2, false, ARRAY['FL-170','FL-180'], ARRAY['default']),

  ('CA', 'FL-170', 'Declaration for Default or Uncontested Dissolution', 'judgment',
   'Declaration for processing dissolution without trial',
   'https://www.courts.ca.gov/documents/fl170.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number","marriage_date":"case.marriage_date","separation_date":"case.separation_date"}'::jsonb,
   '2023-01-01', 4, false, ARRAY['FL-165','FL-180'], ARRAY['judgment']),

  ('CA', 'FL-180', 'Judgment', 'judgment',
   'Final judgment of dissolution',
   'https://www.courts.ca.gov/documents/fl180.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number","marriage_date":"case.marriage_date","separation_date":"case.separation_date"}'::jsonb,
   '2023-01-01', 3, true, ARRAY['FL-190'], ARRAY['judgment']),

  ('CA', 'FL-190', 'Notice of Entry of Judgment', 'judgment',
   'Notice that judgment has been entered by court',
   'https://www.courts.ca.gov/documents/fl190.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number"}'::jsonb,
   '2023-01-01', 1, true, ARRAY['FL-180'], ARRAY['judgment']),

  ('CA', 'FL-343', 'Spousal or Partner Support Order Attachment', 'support',
   'Details of spousal support orders',
   'https://www.courts.ca.gov/documents/fl343.pdf', true,
   '{"party_name":"party.full_name","support_amount":"proposal.spousal_support.amount","support_duration":"proposal.spousal_support.duration"}'::jsonb,
   '2023-01-01', 2, false, ARRAY['FL-180'], ARRAY['support_order','judgment']),

  ('CA', 'FL-342', 'Child Support Information and Order Attachment', 'support',
   'Details of child support orders',
   'https://www.courts.ca.gov/documents/fl342.pdf', true,
   '{"children":"case.children","support_amount":"proposal.child_support.amount"}'::jsonb,
   '2023-01-01', 3, false, ARRAY['FL-180'], ARRAY['support_order','judgment']),

  ('CA', 'FL-144', 'Stipulation and Waiver of Final Disclosure', 'disclosure',
   'Agreement to waive final disclosure requirements',
   'https://www.courts.ca.gov/documents/fl144.pdf', true,
   '{"petitioner_name":"case.petitioner.full_name","respondent_name":"case.respondent_name","case_number":"case.court_case_number"}'::jsonb,
   '2023-01-01', 2, false, ARRAY['FL-140'], ARRAY['final_disclosure'])
ON CONFLICT (state_code, form_number) DO NOTHING;

-- ============================================================
-- 11. SEED: FORM PACKETS (use subquery for form_ids)
-- ============================================================
INSERT INTO form_packets (state_code, packet_name, description, form_ids, filing_type_code, case_phase, is_mandatory, display_order)
VALUES
  ('CA', 'Initial Divorce Filing Packet',
   'All forms needed to file for divorce in California',
   (SELECT ARRAY_AGG(id) FROM court_forms WHERE state_code = 'CA' AND form_number IN ('FL-100', 'FL-110', 'FL-115', 'FL-105')),
   'petition', 'filing', true, 1),

  ('CA', 'Preliminary Disclosure Packet',
   'Required disclosure forms to serve on other party',
   (SELECT ARRAY_AGG(id) FROM court_forms WHERE state_code = 'CA' AND form_number IN ('FL-140', 'FL-142', 'FL-150', 'FL-160')),
   'preliminary_disclosure', 'disclosure', true, 2),

  ('CA', 'Request for Order Packet',
   'Forms for requesting temporary orders',
   (SELECT ARRAY_AGG(id) FROM court_forms WHERE state_code = 'CA' AND form_number IN ('FL-300', 'FL-305', 'FL-150')),
   'rfo', 'motion', false, 3),

  ('CA', 'Default Judgment Packet',
   'Forms for entering judgment by default',
   (SELECT ARRAY_AGG(id) FROM court_forms WHERE state_code = 'CA' AND form_number IN ('FL-165', 'FL-170', 'FL-180', 'FL-190')),
   'judgment', 'judgment', false, 4);

-- ============================================================
-- 12. SEED: CALIFORNIA FILING CHECKLISTS
-- ============================================================
INSERT INTO filing_checklists (state_code, case_type, checklist_name, phase, description, estimated_days, display_order, items)
VALUES
  ('CA', 'dissolution', 'Initial Filing Checklist', 'filing',
   'Steps to initiate divorce proceedings', 7, 1,
   '[
     {"id":"prepare_petition","name":"Prepare Petition (FL-100)","description":"Complete the Petition for Dissolution of Marriage","forms":["FL-100"],"is_mandatory":true,"prerequisites":[],"tips":["Indicate whether you are requesting spousal support","List all minor children"]},
     {"id":"prepare_summons","name":"Prepare Summons (FL-110)","description":"Complete the Family Law Summons","forms":["FL-110"],"is_mandatory":true,"prerequisites":[],"tips":["Summons contains automatic restraining orders"]},
     {"id":"prepare_uccjea","name":"Prepare UCCJEA Declaration (FL-105)","description":"Complete if there are minor children","forms":["FL-105"],"is_mandatory":false,"condition":"has_children","prerequisites":[],"tips":["Required if you have minor children"]},
     {"id":"file_petition","name":"File Petition with Court","description":"File the petition and summons with the court clerk","filing_type":"petition","is_mandatory":true,"prerequisites":["prepare_petition","prepare_summons"],"tips":["Filing fee is approximately $435-$450","Request fee waiver if needed (FW-001)"]},
     {"id":"serve_respondent","name":"Serve Respondent","description":"Personally serve the petition and summons on respondent","is_mandatory":true,"prerequisites":["file_petition"],"deadline_rule":{"days":60,"from":"file_petition"},"tips":["Cannot serve yourself","Server must be 18+ and not a party","Consider process server or sheriff"]},
     {"id":"file_proof_of_service","name":"File Proof of Service (FL-115)","description":"File proof that respondent was served","forms":["FL-115"],"filing_type":"proof_of_service","is_mandatory":true,"prerequisites":["serve_respondent"],"tips":["Must be filed before judgment can be entered"]}
   ]'::jsonb),

  ('CA', 'dissolution', 'Response Checklist', 'response',
   'Steps for responding to divorce petition', 30, 2,
   '[
     {"id":"prepare_response","name":"Prepare Response (FL-120)","description":"Complete the Response to Petition","forms":["FL-120"],"is_mandatory":false,"prerequisites":[],"deadline_rule":{"days":30,"from":"service_date"},"tips":["Response deadline is 30 days from service","Can file response even if you agree with petition"]},
     {"id":"file_response","name":"File Response with Court","description":"File the response with the court clerk","filing_type":"response","is_mandatory":false,"prerequisites":["prepare_response"],"tips":["Filing fee is approximately $435-$450","Default can be entered if no response filed"]},
     {"id":"serve_response","name":"Serve Response on Petitioner","description":"Serve copy of response on petitioner","is_mandatory":false,"prerequisites":["file_response"],"tips":["Can serve by mail"]}
   ]'::jsonb),

  ('CA', 'dissolution', 'Disclosure Checklist', 'disclosure',
   'Required financial disclosures', 60, 3,
   '[
     {"id":"prepare_preliminary_disclosure","name":"Prepare Preliminary Declaration of Disclosure","description":"Complete FL-140, FL-142, FL-150, and FL-160","forms":["FL-140","FL-142","FL-150","FL-160"],"is_mandatory":true,"prerequisites":[],"tips":["DO NOT FILE with court - only serve on other party"]},
     {"id":"serve_preliminary_disclosure","name":"Serve Preliminary Disclosure","description":"Serve disclosure documents on other party","is_mandatory":true,"prerequisites":["prepare_preliminary_disclosure"],"deadline_rule":{"days":60,"from":"file_petition"},"tips":["Must be served within 60 days of filing petition"]},
     {"id":"file_dos_preliminary","name":"File Declaration of Service (FL-141)","description":"File proof that preliminary disclosure was served","forms":["FL-141"],"filing_type":"declaration_of_service","is_mandatory":true,"prerequisites":["serve_preliminary_disclosure"],"tips":["Must be filed before judgment can be entered"]},
     {"id":"prepare_final_disclosure","name":"Prepare Final Declaration of Disclosure","description":"Complete final disclosure forms","forms":["FL-140","FL-142","FL-150","FL-160"],"is_mandatory":true,"prerequisites":["serve_preliminary_disclosure"],"tips":["Can be waived by stipulation (FL-144)"]},
     {"id":"serve_final_disclosure","name":"Serve Final Disclosure","description":"Serve final disclosure on other party","is_mandatory":true,"prerequisites":["prepare_final_disclosure"],"tips":["Must be completed before judgment"]},
     {"id":"file_dos_final","name":"File Declaration of Service - Final","description":"File proof that final disclosure was served","forms":["FL-141"],"filing_type":"declaration_of_service","is_mandatory":true,"prerequisites":["serve_final_disclosure"]}
   ]'::jsonb),

  ('CA', 'dissolution', 'Judgment Checklist', 'judgment',
   'Steps to finalize the divorce', 30, 6,
   '[
     {"id":"verify_disclosures","name":"Verify All Disclosures Complete","description":"Confirm preliminary and final disclosures are served","is_mandatory":true,"prerequisites":[],"tips":["Both parties must have completed disclosures"]},
     {"id":"prepare_judgment","name":"Prepare Judgment (FL-180)","description":"Complete the Judgment form","forms":["FL-180"],"is_mandatory":true,"prerequisites":["verify_disclosures"],"tips":["Attach all necessary attachments (FL-341, FL-343, etc.)"]},
     {"id":"prepare_notice_entry","name":"Prepare Notice of Entry of Judgment (FL-190)","description":"Complete the Notice of Entry","forms":["FL-190"],"is_mandatory":true,"prerequisites":["prepare_judgment"]},
     {"id":"file_judgment","name":"File Judgment with Court","description":"Submit judgment for court approval","filing_type":"judgment","is_mandatory":true,"prerequisites":["prepare_judgment","prepare_notice_entry"],"tips":["6-month waiting period must have elapsed","Include self-addressed stamped envelopes"]},
     {"id":"serve_notice_entry","name":"Serve Notice of Entry of Judgment","description":"Serve notice on other party after court signs judgment","is_mandatory":true,"prerequisites":["file_judgment"],"tips":["Other party has 180 days to set aside default judgment"]}
   ]'::jsonb);
