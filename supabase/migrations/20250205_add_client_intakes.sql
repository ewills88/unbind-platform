-- Session 9: Client Intake & Onboarding System
-- Migration: Add client_intakes table for smart intake questionnaire

-- Create enum for intake status
CREATE TYPE intake_status AS ENUM ('draft', 'in_progress', 'submitted', 'reviewed', 'converted');

-- Create client_intakes table
CREATE TABLE IF NOT EXISTS client_intakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to case (optional - may be created before case exists)
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,

    -- The user filling out the intake
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Inviting attorney (if applicable)
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Status tracking
    status intake_status NOT NULL DEFAULT 'draft',

    -- Progress tracking
    current_step INTEGER NOT NULL DEFAULT 1,
    completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    progress_percentage INTEGER NOT NULL DEFAULT 0,

    -- JSONB storage for flexible intake data
    intake_data JSONB NOT NULL DEFAULT '{}'::JSONB,

    -- Validation state
    validation_errors JSONB DEFAULT '{}'::JSONB,

    -- Auto-save tracking
    last_saved_at TIMESTAMPTZ,
    auto_save_enabled BOOLEAN DEFAULT true,

    -- Submission details
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    review_notes TEXT,

    -- Conversion to case
    converted_to_case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    converted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_client_intakes_user_id ON client_intakes(user_id);
CREATE INDEX idx_client_intakes_case_id ON client_intakes(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_client_intakes_status ON client_intakes(status);
CREATE INDEX idx_client_intakes_invited_by ON client_intakes(invited_by) WHERE invited_by IS NOT NULL;
CREATE INDEX idx_client_intakes_created_at ON client_intakes(created_at);

-- GIN index for JSONB intake_data searches
CREATE INDEX idx_client_intakes_intake_data ON client_intakes USING GIN (intake_data);

-- Enable RLS
ALTER TABLE client_intakes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own intakes
CREATE POLICY "Users can view own intakes"
    ON client_intakes FOR SELECT
    USING (auth.uid() = user_id);

-- Attorneys can view intakes they invited
CREATE POLICY "Attorneys can view invited intakes"
    ON client_intakes FOR SELECT
    USING (auth.uid() = invited_by);

-- Attorneys can view intakes linked to their cases
CREATE POLICY "Attorneys can view case-linked intakes"
    ON client_intakes FOR SELECT
    USING (
        case_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM cases
            WHERE cases.id = client_intakes.case_id
            AND cases.attorney_id = auth.uid()
        )
    );

-- Users can create their own intakes
CREATE POLICY "Users can create own intakes"
    ON client_intakes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own draft/in_progress intakes
CREATE POLICY "Users can update own intakes"
    ON client_intakes FOR UPDATE
    USING (auth.uid() = user_id AND status IN ('draft', 'in_progress'))
    WITH CHECK (auth.uid() = user_id);

-- Attorneys can update intakes they invited (for review)
CREATE POLICY "Attorneys can update invited intakes"
    ON client_intakes FOR UPDATE
    USING (auth.uid() = invited_by)
    WITH CHECK (auth.uid() = invited_by);

-- Users can delete their own draft intakes
CREATE POLICY "Users can delete own draft intakes"
    ON client_intakes FOR DELETE
    USING (auth.uid() = user_id AND status = 'draft');

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_client_intakes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_client_intakes_updated_at
    BEFORE UPDATE ON client_intakes
    FOR EACH ROW
    EXECUTE FUNCTION update_client_intakes_updated_at();

-- Create function to calculate progress percentage
CREATE OR REPLACE FUNCTION calculate_intake_progress(completed INTEGER[], total_steps INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF total_steps = 0 THEN
        RETURN 0;
    END IF;
    RETURN ROUND((array_length(completed, 1)::NUMERIC / total_steps) * 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment for documentation
COMMENT ON TABLE client_intakes IS 'Stores client intake questionnaire data with multi-step progress tracking';
COMMENT ON COLUMN client_intakes.intake_data IS 'JSONB storage for all intake form data organized by section';
COMMENT ON COLUMN client_intakes.completed_steps IS 'Array of step numbers that have been completed';
