-- Rebuild Document System - Clean slate
-- Drops incomplete tables and recreates them properly

-- Drop existing incomplete tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS document_generation_history CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS document_comments CASCADE;
DROP TABLE IF EXISTS document_assignments CASCADE;
DROP TABLE IF EXISTS document_signatures CASCADE;
DROP TABLE IF EXISTS document_packages CASCADE;
DROP TABLE IF EXISTS document_analytics CASCADE;
DROP TABLE IF EXISTS document_clauses CASCADE;
DROP TABLE IF EXISTS generated_documents CASCADE;
DROP TABLE IF EXISTS document_templates CASCADE;
DROP TABLE IF EXISTS state_requirements CASCADE;

-- Drop enums if they exist
DROP TYPE IF EXISTS document_template_type CASCADE;
DROP TYPE IF EXISTS generated_document_status CASCADE;

-- Create enums
CREATE TYPE document_template_type AS ENUM (
  'petition', 'response', 'summons', 'financial_disclosure',
  'income_expense_declaration', 'property_declaration', 'custody_declaration',
  'spousal_support_request', 'settlement_agreement', 'judgment',
  'proof_of_service', 'request_for_order', 'stipulation', 'declaration', 'motion'
);

CREATE TYPE generated_document_status AS ENUM (
  'draft', 'in_review', 'approved', 'filed', 'rejected'
);

-- Document Templates table
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_code TEXT UNIQUE,
  template_type document_template_type NOT NULL,
  description TEXT,
  state_code TEXT,
  county_code TEXT,
  court_type TEXT,
  form_number TEXT,
  template_file_path TEXT NOT NULL DEFAULT '',
  preview_image_path TEXT,
  field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_data_fields TEXT[] DEFAULT '{}',
  conditional_sections JSONB DEFAULT '{}'::jsonb,
  default_values JSONB DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_date DATE,
  superseded_by UUID REFERENCES document_templates(id),
  category TEXT,
  estimated_prep_time INTEGER,
  instructions TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Documents table
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES document_templates(id),
  document_type document_template_type NOT NULL,
  document_title TEXT NOT NULL,
  description TEXT,
  status generated_document_status NOT NULL DEFAULT 'draft',
  filled_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_content JSONB DEFAULT '{}'::jsonb,
  file_path TEXT,
  pdf_path TEXT,
  preview_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES generated_documents(id),
  submitted_for_review_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  filed_date DATE,
  filing_confirmation_number TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Clauses table
CREATE TABLE document_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_type TEXT NOT NULL,
  clause_name TEXT NOT NULL,
  clause_text TEXT NOT NULL,
  state_code TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  usage_context TEXT[],
  compatible_template_types document_template_type[],
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Generation History
CREATE TABLE document_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  action TEXT NOT NULL,
  changes_summary TEXT,
  filled_data_snapshot JSONB,
  file_path_snapshot TEXT,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Indexes
CREATE INDEX idx_document_templates_code ON document_templates(template_code);
CREATE INDEX idx_document_templates_state ON document_templates(state_code);
CREATE INDEX idx_document_templates_type ON document_templates(template_type);
CREATE INDEX idx_document_templates_active ON document_templates(is_active) WHERE is_active = true;

CREATE INDEX idx_generated_documents_case ON generated_documents(case_id);
CREATE INDEX idx_generated_documents_template ON generated_documents(template_id);
CREATE INDEX idx_generated_documents_status ON generated_documents(status);
CREATE INDEX idx_generated_documents_created ON generated_documents(created_at DESC);

CREATE INDEX idx_document_clauses_type ON document_clauses(clause_type);
CREATE INDEX idx_document_clauses_category ON document_clauses(category);

CREATE INDEX idx_document_generation_history_document ON document_generation_history(document_id);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_generation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY document_templates_select ON document_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY generated_documents_select ON generated_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = generated_documents.case_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY generated_documents_insert ON generated_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = generated_documents.case_id
      AND c.attorney_id = auth.uid()
    )
  );

CREATE POLICY generated_documents_update ON generated_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = generated_documents.case_id
      AND c.attorney_id = auth.uid()
    )
  );

CREATE POLICY document_clauses_select ON document_clauses
  FOR SELECT USING (is_active = true);

CREATE POLICY document_generation_history_select ON document_generation_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_generation_history.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Helper function
CREATE OR REPLACE FUNCTION log_document_generation(
  p_document_id UUID,
  p_version INTEGER,
  p_action TEXT,
  p_changes_summary TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO document_generation_history (
    document_id, version, action, changes_summary, performed_by
  ) VALUES (
    p_document_id, p_version, p_action, p_changes_summary, p_user_id
  ) RETURNING id INTO v_history_id;
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Timestamp trigger
CREATE OR REPLACE FUNCTION update_document_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

CREATE TRIGGER generated_documents_updated_at
  BEFORE UPDATE ON generated_documents
  FOR EACH ROW EXECUTE FUNCTION update_document_template_timestamp();

-- Insert sample California templates
INSERT INTO document_templates (
  template_name, template_code, template_type, description,
  state_code, court_type, form_number, template_file_path,
  field_mappings, required_data_fields, category, estimated_prep_time
) VALUES
(
  'Petition for Dissolution of Marriage',
  'CA-FL100',
  'petition',
  'Initial petition to start divorce proceedings in California',
  'CA', 'superior', 'FL-100',
  'templates/ca/fl-100-petition.docx',
  '{"{{petitioner_name}}": "client.full_name", "{{respondent_name}}": "spouse.full_name", "{{marriage_date}}": "case.marriage_date", "{{separation_date}}": "case.separation_date"}'::jsonb,
  ARRAY['client.full_name', 'spouse.full_name'],
  'initial_filing', 45
),
(
  'Summons (Family Law)',
  'CA-FL110',
  'summons',
  'Summons to be served with the petition',
  'CA', 'superior', 'FL-110',
  'templates/ca/fl-110-summons.docx',
  '{"{{petitioner_name}}": "client.full_name", "{{respondent_name}}": "spouse.full_name"}'::jsonb,
  ARRAY['client.full_name', 'spouse.full_name'],
  'initial_filing', 15
),
(
  'Income and Expense Declaration',
  'CA-FL150',
  'income_expense_declaration',
  'Required financial disclosure form',
  'CA', 'superior', 'FL-150',
  'templates/ca/fl-150-income-expense.docx',
  '{"{{petitioner_name}}": "client.full_name", "{{employer}}": "income.employer_name", "{{gross_monthly}}": "income.gross_monthly"}'::jsonb,
  ARRAY['client.full_name', 'income.gross_monthly'],
  'financial', 60
);
