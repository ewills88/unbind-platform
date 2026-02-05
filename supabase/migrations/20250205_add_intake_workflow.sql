-- Session 9 Checkpoint 3: Attorney Review Workflow & Automated Case Setup
-- Migration: Add intake workflow and conflict check tables

-- Add intake review status enum if not exists
DO $$ BEGIN
    CREATE TYPE intake_review_status AS ENUM ('pending', 'under_review', 'info_requested', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns to client_intakes for review workflow
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS review_status intake_review_status DEFAULT 'pending';
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMPTZ;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS info_requested_at TIMESTAMPTZ;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS info_request_message TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS info_request_fields JSONB DEFAULT '[]'::JSONB;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Create conflict_checks table
CREATE TABLE IF NOT EXISTS conflict_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES client_intakes(id) ON DELETE CASCADE,

    -- Check results
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_by UUID NOT NULL REFERENCES auth.users(id),

    -- Potential conflicts found
    potential_conflicts JSONB DEFAULT '[]'::JSONB,
    has_conflicts BOOLEAN DEFAULT false,

    -- Resolution
    conflict_cleared BOOLEAN DEFAULT false,
    conflict_waiver_notes TEXT,
    cleared_at TIMESTAMPTZ,
    cleared_by UUID REFERENCES auth.users(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create case_setup_tasks table for automated task creation
CREATE TABLE IF NOT EXISTS case_setup_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    task_name TEXT NOT NULL,
    task_description TEXT,
    category TEXT, -- 'intake', 'filing', 'client_management', etc.

    -- Timing
    days_from_case_open INTEGER DEFAULT 0,
    is_milestone BOOLEAN DEFAULT false,

    -- Auto-creation rules
    auto_create BOOLEAN DEFAULT true,
    case_type_filter TEXT[], -- Only create for certain case types
    complexity_filter TEXT[], -- Only create for certain complexity levels

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Active
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create engagement_letters table
CREATE TABLE IF NOT EXISTS engagement_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Letter content
    content TEXT NOT NULL,
    fee_structure JSONB,
    scope_of_work TEXT,

    -- Signature tracking
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    signature_data JSONB,

    -- Status
    status TEXT DEFAULT 'draft', -- draft, sent, viewed, signed

    -- PDF storage
    pdf_path TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create client_onboarding table
CREATE TABLE IF NOT EXISTS client_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,

    -- Tour progress
    tour_completed BOOLEAN DEFAULT false,
    tour_completed_at TIMESTAMPTZ,
    tour_skipped BOOLEAN DEFAULT false,

    -- Step completion
    steps_completed JSONB DEFAULT '[]'::JSONB,

    -- Welcome video
    welcome_video_watched BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_intakes_review_status ON client_intakes(review_status);
CREATE INDEX IF NOT EXISTS idx_client_intakes_assigned_to ON client_intakes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conflict_checks_intake_id ON conflict_checks(intake_id);
CREATE INDEX IF NOT EXISTS idx_engagement_letters_case_id ON engagement_letters(case_id);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_user_id ON client_onboarding(user_id);

-- Enable RLS
ALTER TABLE conflict_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_setup_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conflict_checks
CREATE POLICY "Attorneys can view conflict checks" ON conflict_checks FOR SELECT
    USING (checked_by = auth.uid() OR cleared_by = auth.uid());

CREATE POLICY "Attorneys can create conflict checks" ON conflict_checks FOR INSERT
    WITH CHECK (checked_by = auth.uid());

CREATE POLICY "Attorneys can update conflict checks" ON conflict_checks FOR UPDATE
    USING (checked_by = auth.uid() OR cleared_by = auth.uid());

-- RLS for case_setup_tasks (read only for all authenticated)
CREATE POLICY "Authenticated users can view setup tasks" ON case_setup_tasks FOR SELECT
    USING (is_active = true);

-- RLS for engagement_letters
CREATE POLICY "Case participants can view engagement letters" ON engagement_letters FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = engagement_letters.case_id
        AND (cases.attorney_id = auth.uid() OR cases.client_id = auth.uid())
    ));

CREATE POLICY "Attorneys can manage engagement letters" ON engagement_letters FOR ALL
    USING (EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = engagement_letters.case_id
        AND cases.attorney_id = auth.uid()
    ));

-- RLS for client_onboarding
CREATE POLICY "Users can view own onboarding" ON client_onboarding FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding" ON client_onboarding FOR UPDATE
    USING (user_id = auth.uid());

-- Insert default case setup tasks
INSERT INTO case_setup_tasks (task_name, task_description, category, days_from_case_open, is_milestone, sort_order) VALUES
('Review intake thoroughly', 'Review all intake information and documents', 'intake', 0, false, 1),
('Schedule initial consultation', 'Schedule first meeting with client', 'client_management', 0, false, 2),
('Send engagement letter', 'Generate and send engagement letter for signature', 'client_management', 0, false, 3),
('Request retainer payment', 'Send invoice for retainer fee', 'billing', 1, false, 4),
('Complete financial questionnaire', 'Work with client to complete detailed financial disclosure', 'intake', 3, false, 5),
('Draft petition', 'Prepare divorce petition document', 'filing', 7, false, 6),
('File petition with court', 'Submit petition to court clerk', 'filing', 14, true, 7),
('Arrange service of process', 'Coordinate service of spouse', 'filing', 14, false, 8),
('Confirm service completed', 'Verify spouse was properly served', 'filing', 21, true, 9)
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at on new tables
CREATE TRIGGER trigger_engagement_letters_updated_at
    BEFORE UPDATE ON engagement_letters
    FOR EACH ROW
    EXECUTE FUNCTION update_client_intakes_updated_at();

CREATE TRIGGER trigger_client_onboarding_updated_at
    BEFORE UPDATE ON client_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION update_client_intakes_updated_at();

-- Add comments
COMMENT ON TABLE conflict_checks IS 'Conflict of interest checks for intake review';
COMMENT ON TABLE case_setup_tasks IS 'Template tasks to auto-create when case is approved';
COMMENT ON TABLE engagement_letters IS 'Client engagement letters for cases';
COMMENT ON TABLE client_onboarding IS 'Client portal onboarding progress';
