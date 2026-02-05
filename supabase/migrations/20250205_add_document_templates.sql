-- Migration: Add Document Templates System
-- Session 10 Checkpoint 1: Automated Legal Document Generation

-- Enum for document/template types
CREATE TYPE document_template_type AS ENUM (
  'petition',
  'response',
  'summons',
  'financial_disclosure',
  'income_expense_declaration',
  'property_declaration',
  'custody_declaration',
  'spousal_support_request',
  'settlement_agreement',
  'judgment',
  'proof_of_service',
  'request_for_order',
  'stipulation',
  'declaration',
  'motion'
);

-- Enum for generated document status
CREATE TYPE generated_document_status AS ENUM (
  'draft',
  'in_review',
  'approved',
  'filed',
  'rejected'
);

-- Document Templates table
-- Stores template metadata and field mappings for .docx templates
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  template_name TEXT NOT NULL,
  template_code TEXT UNIQUE, -- e.g., 'CA-FL100', 'TX-DIVORCE-PETITION'
  template_type document_template_type NOT NULL,
  description TEXT,

  -- Jurisdiction
  state_code TEXT, -- NULL for generic/federal templates
  county_code TEXT, -- For county-specific variations
  court_type TEXT, -- 'superior', 'district', 'family'
  form_number TEXT, -- Official form number (FL-100, etc.)

  -- Template file
  template_file_path TEXT NOT NULL, -- Supabase Storage path to .docx
  preview_image_path TEXT, -- Thumbnail preview of blank form

  -- Field mappings: maps {{template_field}} to case data paths
  -- Example: {"{{petitioner_name}}": "client.full_name", "{{case_number}}": "case.case_number"}
  field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Required fields that must be filled before generation
  required_data_fields TEXT[] DEFAULT '{}',

  -- Conditional sections: show/hide based on case facts
  -- Example: {"children_section": {"condition": "case.has_children", "operator": "equals", "value": true}}
  conditional_sections JSONB DEFAULT '{}'::jsonb,

  -- Default values for optional fields
  default_values JSONB DEFAULT '{}'::jsonb,

  -- Template version management
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_date DATE, -- When this form version became effective
  superseded_by UUID REFERENCES document_templates(id),

  -- Metadata
  category TEXT, -- 'initial_filing', 'discovery', 'custody', 'financial', 'final'
  estimated_prep_time INTEGER, -- Minutes to complete manually
  instructions TEXT, -- How to use this template

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Documents table
-- Stores documents generated from templates for specific cases
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES document_templates(id),

  -- Document info
  document_type document_template_type NOT NULL,
  document_title TEXT NOT NULL,
  description TEXT,

  -- Status workflow
  status generated_document_status NOT NULL DEFAULT 'draft',

  -- Data snapshot: the case data used to generate this document
  -- Stored so we can regenerate exactly the same document later
  filled_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Custom content added by user (narrative sections, etc.)
  custom_content JSONB DEFAULT '{}'::jsonb,

  -- Generated files
  file_path TEXT, -- Path to generated .docx in Supabase Storage
  pdf_path TEXT, -- Path to PDF version
  preview_url TEXT, -- Temporary preview URL

  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES generated_documents(id),

  -- Approval workflow
  submitted_for_review_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  -- Filing info
  filed_date DATE,
  filing_confirmation_number TEXT,

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Clauses table
-- Library of standard legal language for use in documents
CREATE TABLE document_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Clause identification
  clause_type TEXT NOT NULL, -- 'custody_joint', 'property_division_equal', etc.
  clause_name TEXT NOT NULL, -- Human-readable name
  clause_text TEXT NOT NULL, -- The actual legal language

  -- Applicability
  state_code TEXT, -- NULL for generic
  category TEXT NOT NULL, -- 'custody', 'support', 'property', 'procedure'
  subcategory TEXT, -- More specific classification

  -- Usage
  usage_context TEXT[], -- Where this clause is typically used
  compatible_template_types document_template_type[],

  -- Analytics
  usage_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Generation History table
-- Track all versions and changes
CREATE TABLE document_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,

  version INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'created', 'edited', 'regenerated', 'approved', 'filed'
  changes_summary TEXT,

  -- Snapshot of document at this version
  filled_data_snapshot JSONB,
  file_path_snapshot TEXT,

  -- Who made this change
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Additional context
  notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_document_templates_type ON document_templates(template_type);
CREATE INDEX idx_document_templates_state ON document_templates(state_code);
CREATE INDEX idx_document_templates_active ON document_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_document_templates_code ON document_templates(template_code);

CREATE INDEX idx_generated_documents_case ON generated_documents(case_id);
CREATE INDEX idx_generated_documents_status ON generated_documents(status);
CREATE INDEX idx_generated_documents_type ON generated_documents(document_type);
CREATE INDEX idx_generated_documents_created ON generated_documents(created_at DESC);

CREATE INDEX idx_document_clauses_type ON document_clauses(clause_type);
CREATE INDEX idx_document_clauses_category ON document_clauses(category);
CREATE INDEX idx_document_clauses_state ON document_clauses(state_code);

CREATE INDEX idx_generation_history_document ON document_generation_history(document_id);

-- RLS Policies
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_generation_history ENABLE ROW LEVEL SECURITY;

-- Document Templates: Everyone can read active templates
CREATE POLICY document_templates_select ON document_templates
  FOR SELECT
  USING (is_active = true);

-- Document Templates: Only admins can modify
CREATE POLICY document_templates_admin_all ON document_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Generated Documents: Attorneys can manage all documents for their cases
CREATE POLICY generated_documents_attorney_all ON generated_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = generated_documents.case_id
      AND cases.attorney_id = auth.uid()
    )
  );

-- Generated Documents: Clients can view documents for their cases
CREATE POLICY generated_documents_client_select ON generated_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = generated_documents.case_id
      AND cases.client_id = auth.uid()
    )
  );

-- Document Clauses: Everyone can read active clauses
CREATE POLICY document_clauses_select ON document_clauses
  FOR SELECT
  USING (is_active = true);

-- Document Clauses: Only admins can modify
CREATE POLICY document_clauses_admin_all ON document_clauses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Generation History: Same access as parent document
CREATE POLICY generation_history_select ON document_generation_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_generation_history.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_document_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_document_template_timestamp();

CREATE TRIGGER generated_documents_updated_at
  BEFORE UPDATE ON generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_template_timestamp();

CREATE TRIGGER document_clauses_updated_at
  BEFORE UPDATE ON document_clauses
  FOR EACH ROW
  EXECUTE FUNCTION update_document_template_timestamp();

-- Function to increment clause usage count
CREATE OR REPLACE FUNCTION increment_clause_usage(clause_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE document_clauses
  SET usage_count = usage_count + 1
  WHERE id = clause_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log document generation history
CREATE OR REPLACE FUNCTION log_document_generation(
  p_document_id UUID,
  p_version INTEGER,
  p_action TEXT,
  p_changes_summary TEXT,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
  v_filled_data JSONB;
  v_file_path TEXT;
BEGIN
  -- Get current document state
  SELECT filled_data, file_path INTO v_filled_data, v_file_path
  FROM generated_documents WHERE id = p_document_id;

  -- Insert history record
  INSERT INTO document_generation_history (
    document_id, version, action, changes_summary,
    filled_data_snapshot, file_path_snapshot,
    performed_by, notes
  ) VALUES (
    p_document_id, p_version, p_action, p_changes_summary,
    v_filled_data, v_file_path,
    p_user_id, p_notes
  ) RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- Insert sample CA templates (placeholders - actual files uploaded separately)
INSERT INTO document_templates (
  template_name, template_code, template_type, description,
  state_code, court_type, form_number,
  template_file_path, field_mappings, required_data_fields,
  category, estimated_prep_time, instructions
) VALUES
(
  'California Petition for Dissolution of Marriage',
  'CA-FL100',
  'petition',
  'Initial petition to file for divorce in California Superior Court',
  'CA',
  'superior',
  'FL-100',
  'templates/ca/FL-100-petition.docx',
  '{
    "{{petitioner_name}}": "client.full_name",
    "{{petitioner_address}}": "client.address",
    "{{petitioner_city_state_zip}}": "client.city_state_zip",
    "{{respondent_name}}": "case.spouse_name",
    "{{respondent_address}}": "spouse.address",
    "{{marriage_date}}": "case.marriage_date",
    "{{separation_date}}": "case.separation_date",
    "{{case_number}}": "case.case_number",
    "{{court_name}}": "case.court_name",
    "{{court_county}}": "case.county",
    "{{attorney_name}}": "attorney.full_name",
    "{{attorney_bar_number}}": "attorney.bar_number",
    "{{attorney_address}}": "attorney.address",
    "{{attorney_phone}}": "attorney.phone",
    "{{has_children}}": "case.has_children",
    "{{child_count}}": "children.count"
  }'::jsonb,
  ARRAY['client.full_name', 'case.spouse_name', 'case.marriage_date'],
  'initial_filing',
  120,
  'Complete all sections. The petitioner section should contain your client information. Required fields are marked with asterisks.'
),
(
  'California Summons (Family Law)',
  'CA-FL110',
  'summons',
  'Summons to serve with Petition in California divorce cases',
  'CA',
  'superior',
  'FL-110',
  'templates/ca/FL-110-summons.docx',
  '{
    "{{petitioner_name}}": "client.full_name",
    "{{respondent_name}}": "case.spouse_name",
    "{{case_number}}": "case.case_number",
    "{{court_name}}": "case.court_name",
    "{{court_address}}": "case.court_address"
  }'::jsonb,
  ARRAY['client.full_name', 'case.spouse_name'],
  'initial_filing',
  15,
  'Standard form - most fields auto-populate. Must be served with Petition.'
),
(
  'California Income and Expense Declaration',
  'CA-FL150',
  'financial_disclosure',
  'Required financial disclosure form for California family law cases',
  'CA',
  'superior',
  'FL-150',
  'templates/ca/FL-150-income-expense.docx',
  '{
    "{{petitioner_name}}": "client.full_name",
    "{{case_number}}": "case.case_number",
    "{{employer_name}}": "income.employer_name",
    "{{employer_address}}": "income.employer_address",
    "{{job_title}}": "income.job_title",
    "{{gross_monthly_income}}": "income.gross_monthly",
    "{{net_monthly_income}}": "income.net_monthly",
    "{{monthly_rent_mortgage}}": "expenses.housing",
    "{{monthly_food}}": "expenses.food",
    "{{monthly_utilities}}": "expenses.utilities",
    "{{monthly_transportation}}": "expenses.transportation",
    "{{monthly_insurance}}": "expenses.insurance",
    "{{monthly_childcare}}": "expenses.childcare",
    "{{total_monthly_expenses}}": "expenses.total"
  }'::jsonb,
  ARRAY['income.gross_monthly', 'expenses.total'],
  'financial',
  90,
  'Requires complete income and expense information. Attach pay stubs and tax returns as exhibits.'
),
(
  'California Property Declaration',
  'CA-FL160',
  'property_declaration',
  'Declaration of all property for equitable division',
  'CA',
  'superior',
  'FL-160',
  'templates/ca/FL-160-property.docx',
  '{
    "{{petitioner_name}}": "client.full_name",
    "{{case_number}}": "case.case_number",
    "{{total_assets}}": "assets.total_value",
    "{{total_debts}}": "debts.total_balance",
    "{{real_property}}": "assets.real_estate",
    "{{vehicles}}": "assets.vehicles",
    "{{bank_accounts}}": "assets.bank_accounts",
    "{{retirement_accounts}}": "assets.retirement"
  }'::jsonb,
  ARRAY['assets.total_value', 'debts.total_balance'],
  'financial',
  60,
  'List all community and separate property. Use Schedule of Assets attachment for detailed listings.'
),
(
  'California Marital Settlement Agreement',
  'CA-MSA',
  'settlement_agreement',
  'Comprehensive agreement for uncontested divorces',
  'CA',
  'superior',
  NULL,
  'templates/ca/marital-settlement-agreement.docx',
  '{
    "{{petitioner_name}}": "client.full_name",
    "{{respondent_name}}": "case.spouse_name",
    "{{case_number}}": "case.case_number",
    "{{marriage_date}}": "case.marriage_date",
    "{{separation_date}}": "case.separation_date",
    "{{property_division}}": "settlement.property_terms",
    "{{spousal_support}}": "settlement.support_terms",
    "{{custody_arrangement}}": "settlement.custody_terms",
    "{{child_support}}": "settlement.child_support_terms"
  }'::jsonb,
  ARRAY['client.full_name', 'case.spouse_name', 'settlement.property_terms'],
  'final',
  180,
  'Complete settlement agreement. Both parties must sign. Requires detailed property division and support terms.'
);
