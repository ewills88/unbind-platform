-- Session 14 Checkpoint 2: Internal Collaboration, Shared Resources & Paralegal Interface

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE internal_note_type AS ENUM (
  'question',
  'concern',
  'fyi',
  'decision',
  'strategy',
  'reminder'
);

CREATE TYPE delegated_task_type AS ENUM (
  'review_document',
  'prepare_document',
  'research',
  'client_communication',
  'court_filing',
  'other'
);

CREATE TYPE delegated_task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'approved',
  'rejected'
);

CREATE TYPE template_type AS ENUM (
  'petition',
  'response',
  'financial_disclosure',
  'declaration',
  'settlement',
  'motion',
  'order'
);

CREATE TYPE doc_comment_type AS ENUM (
  'comment',
  'suggestion',
  'question',
  'approval_needed'
);

CREATE TYPE coverage_type AS ENUM (
  'full_coverage',
  'urgent_only',
  'specific_cases'
);

CREATE TYPE coverage_status AS ENUM (
  'active',
  'completed',
  'cancelled'
);

-- ============================================================
-- internal_case_notes: Attorney-only discussion threads on cases
-- ============================================================
CREATE TABLE internal_case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  note_type internal_note_type NOT NULL DEFAULT 'fyi',
  mentioned_users UUID[] DEFAULT '{}',
  parent_note_id UUID REFERENCES internal_case_notes(id) ON DELETE CASCADE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  pinned BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- delegated_tasks: Tasks assigned to team members
-- ============================================================
CREATE TABLE delegated_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  task_type delegated_task_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  due_date DATE,
  priority task_priority NOT NULL DEFAULT 'medium',
  status delegated_task_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  related_document_id UUID,
  time_estimate_minutes INTEGER,
  actual_time_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- firm_templates: Firm-wide document templates
-- ============================================================
CREATE TABLE firm_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type template_type NOT NULL,
  file_path TEXT,
  content TEXT,
  state_code TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_firm_wide BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- firm_document_comments: Multi-user document comments
-- ============================================================
CREATE TABLE firm_document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  comment_type doc_comment_type NOT NULL DEFAULT 'comment',
  position JSONB,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  parent_comment_id UUID REFERENCES firm_document_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- document_versions_collab: Track document versions for collaboration
-- ============================================================
CREATE TABLE document_versions_collab (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_path TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- coverage_assignments: Attorney coverage/handoff
-- ============================================================
CREATE TABLE coverage_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  primary_attorney_id UUID NOT NULL REFERENCES auth.users(id),
  coverage_attorney_id UUID NOT NULL REFERENCES auth.users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  coverage_type coverage_type NOT NULL DEFAULT 'full_coverage',
  case_ids UUID[] DEFAULT '{}',
  notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  status coverage_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_internal_notes_case ON internal_case_notes(case_id);
CREATE INDEX idx_internal_notes_firm ON internal_case_notes(firm_id);
CREATE INDEX idx_internal_notes_author ON internal_case_notes(author_id);
CREATE INDEX idx_internal_notes_parent ON internal_case_notes(parent_note_id);
CREATE INDEX idx_internal_notes_pinned ON internal_case_notes(case_id) WHERE pinned = true;

CREATE INDEX idx_delegated_tasks_case ON delegated_tasks(case_id);
CREATE INDEX idx_delegated_tasks_firm ON delegated_tasks(firm_id);
CREATE INDEX idx_delegated_tasks_assigned_to ON delegated_tasks(assigned_to);
CREATE INDEX idx_delegated_tasks_assigned_by ON delegated_tasks(assigned_by);
CREATE INDEX idx_delegated_tasks_status ON delegated_tasks(status);
CREATE INDEX idx_delegated_tasks_due_date ON delegated_tasks(due_date);

CREATE INDEX idx_firm_templates_firm ON firm_templates(firm_id);
CREATE INDEX idx_firm_templates_type ON firm_templates(template_type);
CREATE INDEX idx_firm_templates_state ON firm_templates(state_code);
CREATE INDEX idx_firm_templates_created_by ON firm_templates(created_by);

CREATE INDEX idx_firm_document_comments_document ON firm_document_comments(document_id);
CREATE INDEX idx_firm_document_comments_firm ON firm_document_comments(firm_id);
CREATE INDEX idx_firm_document_comments_author ON firm_document_comments(author_id);
CREATE INDEX idx_firm_document_comments_parent ON firm_document_comments(parent_comment_id);

CREATE INDEX idx_document_versions_collab_document ON document_versions_collab(document_id);
CREATE INDEX idx_document_versions_collab_created_by ON document_versions_collab(created_by);

CREATE INDEX idx_coverage_assignments_firm ON coverage_assignments(firm_id);
CREATE INDEX idx_coverage_assignments_primary ON coverage_assignments(primary_attorney_id);
CREATE INDEX idx_coverage_assignments_coverage ON coverage_assignments(coverage_attorney_id);
CREATE INDEX idx_coverage_assignments_dates ON coverage_assignments(start_date, end_date);
CREATE INDEX idx_coverage_assignments_active ON coverage_assignments(status) WHERE status = 'active';

-- ============================================================
-- Updated_at triggers (reuse existing function if available)
-- ============================================================
CREATE OR REPLACE FUNCTION update_collab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_internal_notes_updated_at
  BEFORE UPDATE ON internal_case_notes
  FOR EACH ROW EXECUTE FUNCTION update_collab_updated_at();

CREATE TRIGGER trigger_delegated_tasks_updated_at
  BEFORE UPDATE ON delegated_tasks
  FOR EACH ROW EXECUTE FUNCTION update_collab_updated_at();

CREATE TRIGGER trigger_firm_templates_updated_at
  BEFORE UPDATE ON firm_templates
  FOR EACH ROW EXECUTE FUNCTION update_collab_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE internal_case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegated_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions_collab ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_assignments ENABLE ROW LEVEL SECURITY;

-- internal_case_notes: Only active firm members can access
CREATE POLICY "Firm members can view internal notes"
  ON internal_case_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = internal_case_notes.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Firm members can create internal notes"
  ON internal_case_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = internal_case_notes.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Authors can update own notes"
  ON internal_case_notes FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Firm managers can update any note"
  ON internal_case_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = internal_case_notes.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.role = 'senior_attorney')
    )
  );

-- delegated_tasks: Visible to assignee, assigner, and firm managers
CREATE POLICY "Users can view assigned/created tasks"
  ON delegated_tasks FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = delegated_tasks.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.role = 'senior_attorney')
    )
  );

CREATE POLICY "Firm members can create delegated tasks"
  ON delegated_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = delegated_tasks.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Task participants can update tasks"
  ON delegated_tasks FOR UPDATE
  USING (
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = delegated_tasks.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.role = 'senior_attorney')
    )
  );

-- firm_templates: Active firm members can view, creators can manage
CREATE POLICY "Firm members can view templates"
  ON firm_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firm_templates.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Firm members can create templates"
  ON firm_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firm_templates.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Template creators and managers can update"
  ON firm_templates FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firm_templates.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.role = 'senior_attorney')
    )
  );

CREATE POLICY "Template creators and managers can delete"
  ON firm_templates FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firm_templates.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.role = 'senior_attorney')
    )
  );

-- firm_document_comments: Firm members can view and create
CREATE POLICY "Firm members can view document comments"
  ON firm_document_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firm_document_comments.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Firm members can create document comments"
  ON firm_document_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firm_document_comments.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Comment authors and managers can update"
  ON firm_document_comments FOR UPDATE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firm_document_comments.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.role = 'senior_attorney')
    )
  );

-- document_versions_collab: Firm members can view and create
CREATE POLICY "Firm members can view document versions"
  ON document_versions_collab FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_document_comments dc
      JOIN firm_members fm ON fm.firm_id = dc.firm_id
      WHERE dc.document_id = document_versions_collab.document_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'active'
      LIMIT 1
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Authenticated users can create versions"
  ON document_versions_collab FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- coverage_assignments: Firm members can view, participants can manage
CREATE POLICY "Firm members can view coverage"
  ON coverage_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = coverage_assignments.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Attorneys can create coverage"
  ON coverage_assignments FOR INSERT
  WITH CHECK (
    primary_attorney_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = coverage_assignments.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.role = 'senior_attorney')
    )
  );

CREATE POLICY "Coverage participants can update"
  ON coverage_assignments FOR UPDATE
  USING (
    primary_attorney_id = auth.uid()
    OR coverage_attorney_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = coverage_assignments.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.role = 'senior_attorney')
    )
  );
