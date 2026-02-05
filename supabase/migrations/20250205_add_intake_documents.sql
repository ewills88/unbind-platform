-- Session 9 Checkpoint 2: Document Collection & AI Analysis
-- Migration: Add intake_documents and document_templates tables

-- Create enum for document category
CREATE TYPE document_category AS ENUM ('required', 'recommended', 'optional');

-- Create enum for document upload status
CREATE TYPE document_upload_status AS ENUM ('pending', 'uploaded', 'processing', 'verified', 'rejected');

-- Create intake_documents table
CREATE TABLE IF NOT EXISTS intake_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to intake
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Document classification
    document_type TEXT NOT NULL,
    document_category document_category NOT NULL DEFAULT 'required',

    -- File information
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,

    -- Status tracking
    upload_status document_upload_status NOT NULL DEFAULT 'pending',

    -- AI verification results
    ai_verification JSONB DEFAULT '{}'::JSONB,
    ai_extracted_data JSONB DEFAULT '{}'::JSONB,
    ai_confidence DECIMAL(3,2),

    -- Review tracking
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    rejection_reason TEXT,

    -- Upload metadata
    upload_date TIMESTAMPTZ,
    uploaded_by UUID REFERENCES auth.users(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create document_templates table
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    template_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,

    -- JSON array of document type configurations
    document_types_json JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Template metadata
    case_type TEXT, -- e.g., 'standard_divorce', 'high_asset_divorce', 'custody_only'
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create intake_ai_analysis table for storing AI analysis results
CREATE TABLE IF NOT EXISTS intake_ai_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Analysis results
    complexity_score DECIMAL(3,1), -- 0.0 to 10.0
    flags JSONB DEFAULT '[]'::JSONB,
    recommendations JSONB DEFAULT '[]'::JSONB,
    missing_information JSONB DEFAULT '[]'::JSONB,

    -- Cross-validation results
    data_inconsistencies JSONB DEFAULT '[]'::JSONB,
    document_data_matches JSONB DEFAULT '{}'::JSONB,

    -- Processing metadata
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    analysis_version TEXT DEFAULT '1.0',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_intake_documents_intake_id ON intake_documents(intake_id);
CREATE INDEX idx_intake_documents_status ON intake_documents(upload_status);
CREATE INDEX idx_intake_documents_type ON intake_documents(document_type);
CREATE INDEX idx_document_templates_case_type ON document_templates(case_type);
CREATE INDEX idx_intake_ai_analysis_intake_id ON intake_ai_analysis(intake_id);

-- Enable RLS
ALTER TABLE intake_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_ai_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for intake_documents

-- Users can view documents for their own intakes
CREATE POLICY "Users can view own intake documents"
    ON intake_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_intakes
            WHERE client_intakes.id = intake_documents.intake_id
            AND client_intakes.user_id = auth.uid()
        )
    );

-- Attorneys can view documents for intakes they manage
CREATE POLICY "Attorneys can view managed intake documents"
    ON intake_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_intakes
            WHERE client_intakes.id = intake_documents.intake_id
            AND (client_intakes.invited_by = auth.uid() OR EXISTS (
                SELECT 1 FROM cases
                WHERE cases.id = client_intakes.case_id
                AND cases.attorney_id = auth.uid()
            ))
        )
    );

-- Users can insert documents for their own intakes
CREATE POLICY "Users can upload to own intakes"
    ON intake_documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM client_intakes
            WHERE client_intakes.id = intake_documents.intake_id
            AND client_intakes.user_id = auth.uid()
        )
    );

-- Users can update their own pending/uploaded documents
CREATE POLICY "Users can update own documents"
    ON intake_documents FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM client_intakes
            WHERE client_intakes.id = intake_documents.intake_id
            AND client_intakes.user_id = auth.uid()
        )
        AND upload_status IN ('pending', 'uploaded', 'rejected')
    );

-- Attorneys can update documents they manage
CREATE POLICY "Attorneys can update managed documents"
    ON intake_documents FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM client_intakes
            WHERE client_intakes.id = intake_documents.intake_id
            AND (client_intakes.invited_by = auth.uid() OR EXISTS (
                SELECT 1 FROM cases
                WHERE cases.id = client_intakes.case_id
                AND cases.attorney_id = auth.uid()
            ))
        )
    );

-- RLS Policies for document_templates (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view templates"
    ON document_templates FOR SELECT
    USING (is_active = true);

-- RLS Policies for intake_ai_analysis

-- Users can view analysis for their own intakes
CREATE POLICY "Users can view own intake analysis"
    ON intake_ai_analysis FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_intakes
            WHERE client_intakes.id = intake_ai_analysis.intake_id
            AND client_intakes.user_id = auth.uid()
        )
    );

-- Attorneys can view analysis for managed intakes
CREATE POLICY "Attorneys can view managed intake analysis"
    ON intake_ai_analysis FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_intakes
            WHERE client_intakes.id = intake_ai_analysis.intake_id
            AND (client_intakes.invited_by = auth.uid() OR EXISTS (
                SELECT 1 FROM cases
                WHERE cases.id = client_intakes.case_id
                AND cases.attorney_id = auth.uid()
            ))
        )
    );

-- Trigger for updated_at
CREATE TRIGGER trigger_intake_documents_updated_at
    BEFORE UPDATE ON intake_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_client_intakes_updated_at();

CREATE TRIGGER trigger_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_client_intakes_updated_at();

CREATE TRIGGER trigger_intake_ai_analysis_updated_at
    BEFORE UPDATE ON intake_ai_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_client_intakes_updated_at();

-- Insert default document templates
INSERT INTO document_templates (template_name, display_name, description, case_type, document_types_json) VALUES
('standard_divorce', 'Standard Divorce', 'Standard divorce case document requirements', 'standard_divorce',
'[
  {"type": "marriage_certificate", "category": "required"},
  {"type": "tax_return_current", "category": "required"},
  {"type": "tax_return_prior", "category": "required"},
  {"type": "drivers_license", "category": "required"},
  {"type": "bank_statements", "category": "required"},
  {"type": "pay_stubs", "category": "required"},
  {"type": "property_deed", "category": "recommended"},
  {"type": "mortgage_statement", "category": "recommended"},
  {"type": "retirement_statements", "category": "recommended"},
  {"type": "vehicle_titles", "category": "optional"},
  {"type": "prenup_agreement", "category": "optional"}
]'::JSONB),

('high_asset_divorce', 'High-Asset Divorce', 'Complex divorce with significant assets', 'high_asset_divorce',
'[
  {"type": "marriage_certificate", "category": "required"},
  {"type": "tax_return_current", "category": "required"},
  {"type": "tax_return_prior", "category": "required"},
  {"type": "tax_return_2_years_prior", "category": "required"},
  {"type": "drivers_license", "category": "required"},
  {"type": "bank_statements", "category": "required"},
  {"type": "investment_statements", "category": "required"},
  {"type": "retirement_statements", "category": "required"},
  {"type": "business_tax_returns", "category": "required"},
  {"type": "business_financial_statements", "category": "required"},
  {"type": "property_deed", "category": "required"},
  {"type": "property_appraisal", "category": "required"},
  {"type": "mortgage_statement", "category": "required"},
  {"type": "pay_stubs", "category": "required"},
  {"type": "stock_options", "category": "recommended"},
  {"type": "trust_documents", "category": "recommended"},
  {"type": "prenup_agreement", "category": "recommended"}
]'::JSONB),

('custody_only', 'Custody Modification', 'Custody-focused case requirements', 'custody_only',
'[
  {"type": "drivers_license", "category": "required"},
  {"type": "birth_certificates", "category": "required"},
  {"type": "current_custody_order", "category": "required"},
  {"type": "school_records", "category": "required"},
  {"type": "tax_return_current", "category": "required"},
  {"type": "pay_stubs", "category": "required"},
  {"type": "childcare_expenses", "category": "recommended"},
  {"type": "medical_records_children", "category": "recommended"},
  {"type": "extracurricular_expenses", "category": "optional"}
]'::JSONB);

-- Add comments
COMMENT ON TABLE intake_documents IS 'Stores documents uploaded during client intake process';
COMMENT ON TABLE document_templates IS 'Predefined document checklists for different case types';
COMMENT ON TABLE intake_ai_analysis IS 'AI analysis results for client intake submissions';
