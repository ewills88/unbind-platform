-- Migration: Add Document Collaboration & Version Control
-- Session 10 Checkpoint 3: Collaboration, Versioning, Multi-State Support

-- Document Versions table for version control
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,

  version_number INTEGER NOT NULL,
  is_major_version BOOLEAN DEFAULT false,

  -- Content snapshot
  content_snapshot JSONB NOT NULL, -- Full document content at this version
  filled_data_snapshot JSONB, -- Case data used
  custom_content_snapshot JSONB, -- Custom content

  -- Change tracking
  changes_summary TEXT,
  changes_diff JSONB, -- Detailed diff from previous version

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(document_id, version_number)
);

-- Document Comments table
CREATE TABLE document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,

  -- Comment content
  content TEXT NOT NULL,

  -- Position in document (for inline comments)
  position_start INTEGER, -- Character offset start
  position_end INTEGER, -- Character offset end
  section_id TEXT, -- Or section identifier

  -- Thread support
  parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,

  -- Status
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  -- Mentions
  mentioned_users UUID[], -- Array of user IDs mentioned

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Workflow Assignments
CREATE TABLE document_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,

  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),

  role TEXT NOT NULL, -- 'reviewer', 'approver', 'signer'
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'declined'

  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Signatures table
CREATE TABLE document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,

  signer_id UUID REFERENCES auth.users(id),
  signer_name TEXT NOT NULL,
  signer_email TEXT,

  -- Signature data
  signature_image_path TEXT, -- Path to signature image in storage
  signature_data TEXT, -- Base64 encoded signature or SVG

  -- Verification
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,

  -- E-signature service
  external_signature_id TEXT, -- DocuSign/HelloSign ID
  external_service TEXT, -- 'docusign', 'hellosign', 'native'

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'signed', 'declined', 'expired'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- State Requirements table
CREATE TABLE state_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL UNIQUE,
  state_name TEXT NOT NULL,

  -- Residency requirements
  residency_months INTEGER NOT NULL,
  county_residency_months INTEGER DEFAULT 0,

  -- Waiting periods
  waiting_period_days INTEGER DEFAULT 0,

  -- Property division
  community_property BOOLEAN DEFAULT false,
  equitable_distribution BOOLEAN DEFAULT false,

  -- Required forms (array of template codes)
  required_forms TEXT[],
  optional_forms TEXT[],

  -- Filing information
  filing_portal_url TEXT,
  filing_instructions TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Document Packages table (for bulk generation)
CREATE TABLE document_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  package_name TEXT NOT NULL,
  package_type TEXT, -- 'initial_filing', 'discovery', 'trial_prep', etc.

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'

  -- Generated documents
  document_ids UUID[], -- Array of generated_documents IDs

  -- Download info
  zip_file_path TEXT,
  cover_sheet_path TEXT,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Document Analytics (aggregated stats)
CREATE TABLE document_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metrics
  template_id UUID REFERENCES document_templates(id),
  template_code TEXT,

  documents_generated INTEGER DEFAULT 0,
  avg_generation_time_seconds INTEGER,
  avg_edits_per_document DECIMAL(5,2),
  success_rate DECIMAL(5,2),

  -- Breakdown by user type
  generated_by_attorneys INTEGER DEFAULT 0,
  generated_by_paralegals INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(period_start, period_end, template_id)
);

-- Indexes
CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE INDEX idx_document_versions_created ON document_versions(created_at DESC);

CREATE INDEX idx_document_comments_document ON document_comments(document_id);
CREATE INDEX idx_document_comments_parent ON document_comments(parent_comment_id);
CREATE INDEX idx_document_comments_resolved ON document_comments(resolved) WHERE resolved = false;

CREATE INDEX idx_document_assignments_document ON document_assignments(document_id);
CREATE INDEX idx_document_assignments_user ON document_assignments(assigned_to);
CREATE INDEX idx_document_assignments_pending ON document_assignments(status) WHERE status = 'pending';

CREATE INDEX idx_document_signatures_document ON document_signatures(document_id);

CREATE INDEX idx_document_packages_case ON document_packages(case_id);

-- RLS Policies
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_analytics ENABLE ROW LEVEL SECURITY;

-- Document Versions: Same access as parent document
CREATE POLICY document_versions_select ON document_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_versions.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY document_versions_insert ON document_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_versions.document_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Document Comments: Case participants can view/create
CREATE POLICY document_comments_select ON document_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_comments.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY document_comments_insert ON document_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_comments.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY document_comments_update ON document_comments
  FOR UPDATE
  USING (created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_comments.document_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Document Assignments: Attorneys can manage, assigned users can view
CREATE POLICY document_assignments_select ON document_assignments
  FOR SELECT
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_assignments.document_id
      AND c.attorney_id = auth.uid()
    )
  );

CREATE POLICY document_assignments_manage ON document_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_assignments.document_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Document Signatures: Document participants can view, signers can update their own
CREATE POLICY document_signatures_select ON document_signatures
  FOR SELECT
  USING (
    signer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_signatures.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- State Requirements: Public read
CREATE POLICY state_requirements_select ON state_requirements
  FOR SELECT
  USING (is_active = true);

-- Document Packages: Same as case access
CREATE POLICY document_packages_select ON document_packages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = document_packages.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY document_packages_manage ON document_packages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = document_packages.case_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Document Analytics: Attorneys can view their own analytics
CREATE POLICY document_analytics_select ON document_analytics
  FOR SELECT
  USING (true); -- Public for now, can be restricted later

-- Triggers
CREATE TRIGGER document_comments_updated_at
  BEFORE UPDATE ON document_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_document_template_timestamp();

-- Insert state requirements
INSERT INTO state_requirements (state_code, state_name, residency_months, county_residency_months, waiting_period_days, community_property, equitable_distribution, required_forms, optional_forms, filing_portal_url) VALUES
('CA', 'California', 6, 3, 180, true, false,
  ARRAY['CA-FL100', 'CA-FL110', 'CA-FL150'],
  ARRAY['CA-FL160', 'CA-MSA'],
  'https://www.courts.ca.gov/selfhelp-efiling.htm'),
('TX', 'Texas', 6, 3, 60, true, false,
  ARRAY['TX-PETITION', 'TX-WAIVER'],
  ARRAY['TX-DECREE', 'TX-INVENTORY'],
  'https://efiletexas.gov'),
('FL', 'Florida', 6, 0, 20, false, true,
  ARRAY['FL-12901A', 'FL-12902B'],
  ARRAY['FL-12995A', 'FL-12902C'],
  'https://www.myflcourtaccess.com'),
('NY', 'New York', 12, 0, 0, false, true,
  ARRAY['NY-UD-1', 'NY-UD-2'],
  ARRAY['NY-UD-8', 'NY-UD-11'],
  'https://iapps.courts.state.ny.us/nyscef'),
('IL', 'Illinois', 3, 0, 0, false, true,
  ARRAY['IL-PETITION'],
  ARRAY['IL-MSA', 'IL-PARENTING'],
  'https://efile.illinoiscourts.gov');

-- Insert additional state templates (TX and FL)
INSERT INTO document_templates (
  template_name, template_code, template_type, description,
  state_code, court_type, form_number,
  template_file_path, field_mappings, required_data_fields,
  category, estimated_prep_time
) VALUES
-- Texas templates
(
  'Texas Original Petition for Divorce',
  'TX-PETITION',
  'petition',
  'Initial petition to file for divorce in Texas District Court',
  'TX',
  'district',
  'Original Petition',
  'templates/tx/original-petition.docx',
  '{
    "{{petitioner_name}}": "client.full_name",
    "{{respondent_name}}": "case.spouse_name",
    "{{marriage_date}}": "case.marriage_date",
    "{{separation_date}}": "case.separation_date",
    "{{county}}": "case.county",
    "{{has_children}}": "case.has_children"
  }'::jsonb,
  ARRAY['client.full_name', 'case.spouse_name'],
  'initial_filing',
  90
),
(
  'Texas Waiver of Citation',
  'TX-WAIVER',
  'summons',
  'Waiver of formal service in Texas divorce',
  'TX',
  'district',
  'Waiver',
  'templates/tx/waiver-citation.docx',
  '{
    "{{respondent_name}}": "case.spouse_name",
    "{{case_number}}": "case.case_number"
  }'::jsonb,
  ARRAY['case.spouse_name'],
  'initial_filing',
  15
),
(
  'Texas Final Decree of Divorce',
  'TX-DECREE',
  'judgment',
  'Final decree ending marriage in Texas',
  'TX',
  'district',
  'Final Decree',
  'templates/tx/final-decree.docx',
  '{
    "{{petitioner_name}}": "client.full_name",
    "{{respondent_name}}": "case.spouse_name",
    "{{case_number}}": "case.case_number",
    "{{property_division}}": "settlement.property_terms"
  }'::jsonb,
  ARRAY['client.full_name', 'case.spouse_name', 'settlement.property_terms'],
  'final',
  120
),
-- Florida templates
(
  'Florida Petition for Dissolution of Marriage',
  'FL-12901A',
  'petition',
  'Initial petition for divorce in Florida Circuit Court',
  'FL',
  'circuit',
  '12.901(a)',
  'templates/fl/12-901a-petition.docx',
  '{
    "{{petitioner_name}}": "client.full_name",
    "{{respondent_name}}": "case.spouse_name",
    "{{marriage_date}}": "case.marriage_date",
    "{{county}}": "case.county"
  }'::jsonb,
  ARRAY['client.full_name', 'case.spouse_name'],
  'initial_filing',
  90
),
(
  'Florida Family Law Financial Affidavit (Short Form)',
  'FL-12902B',
  'financial_disclosure',
  'Financial disclosure for Florida cases under $50k income',
  'FL',
  'circuit',
  '12.902(b)',
  'templates/fl/12-902b-financial-short.docx',
  '{
    "{{petitioner_name}}": "client.full_name",
    "{{gross_monthly_income}}": "income.gross_monthly",
    "{{total_monthly_expenses}}": "expenses.total"
  }'::jsonb,
  ARRAY['income.gross_monthly', 'expenses.total'],
  'financial',
  60
),
(
  'Florida Parenting Plan',
  'FL-12995A',
  'custody_declaration',
  'Parenting plan for Florida custody cases',
  'FL',
  'circuit',
  '12.995(a)',
  'templates/fl/12-995a-parenting-plan.docx',
  '{
    "{{mother_name}}": "client.full_name",
    "{{father_name}}": "case.spouse_name",
    "{{children}}": "children.names"
  }'::jsonb,
  ARRAY['children.names'],
  'custody',
  90
);

-- Function to create a new document version
CREATE OR REPLACE FUNCTION create_document_version(
  p_document_id UUID,
  p_changes_summary TEXT,
  p_is_major BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_version_id UUID;
  v_next_version INTEGER;
  v_document RECORD;
BEGIN
  -- Get current document
  SELECT * INTO v_document FROM generated_documents WHERE id = p_document_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM document_versions WHERE document_id = p_document_id;

  -- Create version
  INSERT INTO document_versions (
    document_id, version_number, is_major_version,
    content_snapshot, filled_data_snapshot, custom_content_snapshot,
    changes_summary, created_by
  ) VALUES (
    p_document_id, v_next_version, p_is_major,
    jsonb_build_object(
      'title', v_document.document_title,
      'status', v_document.status,
      'file_path', v_document.file_path
    ),
    v_document.filled_data,
    v_document.custom_content,
    p_changes_summary,
    auth.uid()
  ) RETURNING id INTO v_version_id;

  -- Update document version number
  UPDATE generated_documents
  SET version = v_next_version
  WHERE id = p_document_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
