-- Fix Migration: Add missing generated_documents table
-- This runs after document_templates was partially created

-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE document_template_type AS ENUM (
    'petition', 'response', 'summons', 'financial_disclosure',
    'income_expense_declaration', 'property_declaration', 'custody_declaration',
    'spousal_support_request', 'settlement_agreement', 'judgment',
    'proof_of_service', 'request_for_order', 'stipulation', 'declaration', 'motion'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE generated_document_status AS ENUM (
    'draft', 'in_review', 'approved', 'filed', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create generated_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS generated_documents (
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

-- Create document_clauses if it doesn't exist
CREATE TABLE IF NOT EXISTS document_clauses (
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

-- Create document_generation_history if it doesn't exist
CREATE TABLE IF NOT EXISTS document_generation_history (
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_generated_documents_case ON generated_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_template ON generated_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_status ON generated_documents(status);
CREATE INDEX IF NOT EXISTS idx_generated_documents_created ON generated_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_clauses_type ON document_clauses(clause_type);
CREATE INDEX IF NOT EXISTS idx_document_clauses_category ON document_clauses(category);
CREATE INDEX IF NOT EXISTS idx_document_generation_history_document ON document_generation_history(document_id);

-- Enable RLS
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_generation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists, then create)
DROP POLICY IF EXISTS generated_documents_select ON generated_documents;
DROP POLICY IF EXISTS generated_documents_insert ON generated_documents;
DROP POLICY IF EXISTS generated_documents_update ON generated_documents;

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

DROP POLICY IF EXISTS document_clauses_select ON document_clauses;
CREATE POLICY document_clauses_select ON document_clauses
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS document_generation_history_select ON document_generation_history;
CREATE POLICY document_generation_history_select ON document_generation_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_generation_history.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Helper function for logging
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

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_document_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_templates_updated_at ON document_templates;
CREATE TRIGGER document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_document_template_timestamp();

DROP TRIGGER IF EXISTS generated_documents_updated_at ON generated_documents;
CREATE TRIGGER generated_documents_updated_at
  BEFORE UPDATE ON generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_template_timestamp();
