-- Add missing RLS policies for the cases table
-- The firm system migration added a firm-member policy but no base policy
-- for attorneys/clients to see their own cases.
-- The firm member policy also caused infinite recursion (cases -> firm_members -> cases).

-- Ensure RLS is enabled
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Drop the firm member policy that causes infinite recursion
-- (firm_members RLS references cases, creating a circular dependency)
DROP POLICY IF EXISTS "Firm members can view firm cases" ON cases;

-- Base policy: users can see cases where they are attorney or client
CREATE POLICY "Users can view own cases"
  ON cases FOR SELECT
  USING (
    auth.uid() = attorney_id
    OR auth.uid() = client_id
  );

-- Attorneys can create cases
CREATE POLICY "Attorneys can create cases"
  ON cases FOR INSERT
  WITH CHECK (auth.uid() = attorney_id);

-- Attorneys can update their cases
CREATE POLICY "Attorneys can update own cases"
  ON cases FOR UPDATE
  USING (auth.uid() = attorney_id);

-- Attorneys can delete their cases
CREATE POLICY "Attorneys can delete own cases"
  ON cases FOR DELETE
  USING (auth.uid() = attorney_id);
