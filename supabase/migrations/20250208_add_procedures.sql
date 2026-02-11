-- Session 12 Checkpoint 3: Procedure Automation & Checklists

-- Procedure type enum
DO $$ BEGIN
  CREATE TYPE procedure_type AS ENUM (
    'filing', 'service', 'discovery', 'settlement', 'trial', 'judgment'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Procedure status enum
DO $$ BEGIN
  CREATE TYPE procedure_status AS ENUM (
    'not_started', 'in_progress', 'completed', 'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Case procedures table (groups of tasks)
CREATE TABLE IF NOT EXISTS case_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  state_code TEXT NOT NULL,
  procedure_type procedure_type NOT NULL,
  status procedure_status NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Procedure tasks table (individual checklist items)
CREATE TABLE IF NOT EXISTS procedure_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  procedure_id UUID REFERENCES case_procedures(id) ON DELETE CASCADE,
  state_code TEXT NOT NULL,
  task_order INTEGER NOT NULL DEFAULT 0,
  task_name TEXT NOT NULL,
  task_description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  required_documents TEXT[] DEFAULT '{}',
  estimated_duration_days INTEGER DEFAULT 1,
  dependencies UUID[] DEFAULT '{}',
  state_statute_reference TEXT,
  is_urgent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_procedures_case ON case_procedures(case_id);
CREATE INDEX IF NOT EXISTS idx_procedure_tasks_case ON procedure_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_procedure_tasks_procedure ON procedure_tasks(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_tasks_due_date ON procedure_tasks(due_date) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_procedure_tasks_assigned ON procedure_tasks(assigned_to) WHERE completed_at IS NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_procedure_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_procedure_tasks_updated_at ON procedure_tasks;
CREATE TRIGGER trigger_procedure_tasks_updated_at
  BEFORE UPDATE ON procedure_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_procedure_tasks_updated_at();

-- RLS policies
ALTER TABLE case_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_tasks ENABLE ROW LEVEL SECURITY;

-- Attorneys can manage all procedures
CREATE POLICY "Attorneys can manage case procedures"
  ON case_procedures FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Attorneys can manage procedure tasks"
  ON procedure_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Clients can view their case procedures
CREATE POLICY "Clients can view case procedures"
  ON case_procedures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_procedures.case_id
      AND cases.client_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view procedure tasks"
  ON procedure_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = procedure_tasks.case_id
      AND cases.client_id = auth.uid()
    )
  );
