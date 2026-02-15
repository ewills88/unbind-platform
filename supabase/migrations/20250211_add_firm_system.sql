-- Session 14 Checkpoint 1: Firm Hierarchy, Member Management & Case Assignment

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE firm_member_role AS ENUM (
  'owner',
  'senior_attorney',
  'attorney',
  'paralegal',
  'legal_assistant',
  'billing_specialist'
);

CREATE TYPE firm_member_status AS ENUM (
  'active',
  'invited',
  'suspended',
  'removed'
);

CREATE TYPE case_assignment_role AS ENUM (
  'lead',
  'supporting',
  'paralegal',
  'supervisor'
);

CREATE TYPE firm_plan AS ENUM (
  'solo',
  'small',
  'professional',
  'enterprise'
);

-- ============================================================
-- firms: Law firm / organization
-- ============================================================
CREATE TABLE firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  plan firm_plan NOT NULL DEFAULT 'solo',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_path TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- firm_members: Users belonging to a firm
-- ============================================================
CREATE TABLE firm_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role firm_member_role NOT NULL DEFAULT 'attorney',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status firm_member_status NOT NULL DEFAULT 'invited',
  invited_email TEXT,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_firm_user UNIQUE (firm_id, user_id)
);

-- ============================================================
-- case_assignments: Multi-attorney case assignments
-- ============================================================
CREATE TABLE case_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  role case_assignment_role NOT NULL DEFAULT 'supporting',
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_case_user UNIQUE (case_id, user_id)
);

-- ============================================================
-- Schema updates to existing tables
-- ============================================================
ALTER TABLE cases ADD COLUMN firm_id UUID REFERENCES firms(id);
ALTER TABLE profiles ADD COLUMN current_firm_id UUID REFERENCES firms(id);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_firms_owner ON firms(owner_id);
CREATE INDEX idx_firms_slug ON firms(slug);
CREATE INDEX idx_firm_members_firm ON firm_members(firm_id);
CREATE INDEX idx_firm_members_user ON firm_members(user_id);
CREATE INDEX idx_firm_members_status ON firm_members(status);
CREATE INDEX idx_case_assignments_case ON case_assignments(case_id);
CREATE INDEX idx_case_assignments_user ON case_assignments(user_id);
CREATE INDEX idx_case_assignments_firm ON case_assignments(firm_id);
CREATE INDEX idx_cases_firm ON cases(firm_id);
CREATE INDEX idx_profiles_current_firm ON profiles(current_firm_id);

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_firm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_firms_updated_at
  BEFORE UPDATE ON firms
  FOR EACH ROW EXECUTE FUNCTION update_firm_updated_at();

CREATE TRIGGER trigger_firm_members_updated_at
  BEFORE UPDATE ON firm_members
  FOR EACH ROW EXECUTE FUNCTION update_firm_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_assignments ENABLE ROW LEVEL SECURITY;

-- firms: Owner or active member can view
CREATE POLICY "Firm visible to owner and active members"
  ON firms FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = firms.id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

-- firms: Authenticated users can create
CREATE POLICY "Authenticated users can create firms"
  ON firms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- firms: Owner can update
CREATE POLICY "Firm owner can update firm"
  ON firms FOR UPDATE
  USING (owner_id = auth.uid());

-- firms: Owner can delete
CREATE POLICY "Firm owner can delete firm"
  ON firms FOR DELETE
  USING (owner_id = auth.uid());

-- firm_members: Same-firm members can view
CREATE POLICY "Firm members can view fellow members"
  ON firm_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members AS my_membership
      WHERE my_membership.firm_id = firm_members.firm_id
      AND my_membership.user_id = auth.uid()
      AND my_membership.status = 'active'
    )
    OR user_id = auth.uid()
  );

-- firm_members: Firm owner or users with team.manage can insert
CREATE POLICY "Firm managers can add members"
  ON firm_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = firm_members.firm_id
      AND firms.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM firm_members AS mgr
      WHERE mgr.firm_id = firm_members.firm_id
      AND mgr.user_id = auth.uid()
      AND mgr.status = 'active'
      AND (mgr.role = 'owner' OR (mgr.permissions->'team'->>'manage')::boolean = true)
    )
  );

-- firm_members: Firm owner or users with team.manage can update
CREATE POLICY "Firm managers can update members"
  ON firm_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = firm_members.firm_id
      AND firms.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM firm_members AS mgr
      WHERE mgr.firm_id = firm_members.firm_id
      AND mgr.user_id = auth.uid()
      AND mgr.status = 'active'
      AND (mgr.role = 'owner' OR (mgr.permissions->'team'->>'manage')::boolean = true)
    )
  );

-- firm_members: Firm owner or users with team.manage can delete
CREATE POLICY "Firm managers can remove members"
  ON firm_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = firm_members.firm_id
      AND firms.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM firm_members AS mgr
      WHERE mgr.firm_id = firm_members.firm_id
      AND mgr.user_id = auth.uid()
      AND mgr.status = 'active'
      AND (mgr.role = 'owner' OR (mgr.permissions->'team'->>'manage')::boolean = true)
    )
  );

-- case_assignments: Same-firm members can view
CREATE POLICY "Firm members can view case assignments"
  ON case_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = case_assignments.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

-- case_assignments: Users with cases.assign permission can manage
CREATE POLICY "Users with assign permission can insert assignments"
  ON case_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = case_assignments.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (
        firm_members.role = 'owner'
        OR (firm_members.permissions->'cases'->>'assign')::boolean = true
      )
    )
  );

CREATE POLICY "Users with assign permission can update assignments"
  ON case_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = case_assignments.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (
        firm_members.role = 'owner'
        OR (firm_members.permissions->'cases'->>'assign')::boolean = true
      )
    )
  );

CREATE POLICY "Users with assign permission can delete assignments"
  ON case_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = case_assignments.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (
        firm_members.role = 'owner'
        OR (firm_members.permissions->'cases'->>'assign')::boolean = true
      )
    )
  );

-- ADDITIVE policy on cases: allow SELECT if user is active firm member of case's firm
CREATE POLICY "Firm members can view firm cases"
  ON cases FOR SELECT
  USING (
    firm_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = cases.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );
