-- Session 25: Attorney-initiated client intake table
-- Run this migration in Supabase SQL Editor

-- Add new columns to client_intakes for attorney-initiated intakes
-- (table may already exist from client-facing intake flow)
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS client_first_name TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS client_last_name TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'email';

-- Opposing Party
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS opposing_first_name TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS opposing_last_name TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS opposing_attorney_name TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS opposing_attorney_firm TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS has_opposing_attorney BOOLEAN DEFAULT FALSE;

-- Case Details
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS case_type TEXT DEFAULT 'divorce';
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS date_of_marriage DATE;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS date_of_separation DATE;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS has_children BOOLEAN DEFAULT FALSE;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS number_of_children INTEGER;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS children_ages TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS state_of_filing TEXT;

-- Financial Snapshot
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS owns_real_estate BOOLEAN DEFAULT FALSE;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS has_retirement_accounts BOOLEAN DEFAULT FALSE;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS has_business_interests BOOLEAN DEFAULT FALSE;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS estimated_assets TEXT DEFAULT 'unknown';
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS client_annual_income TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS opposing_annual_income TEXT;

-- Intake Meta
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS consultation_date TIMESTAMPTZ;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS consultation_notes TEXT;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS conflict_check_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS retainer_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS retainer_amount NUMERIC;

-- Ensure attorney_id and firm_id columns exist
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS attorney_id UUID REFERENCES auth.users(id);
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS firm_id UUID;

-- RLS policy for attorney access
CREATE POLICY IF NOT EXISTS "Attorneys can view their firm intakes"
  ON client_intakes FOR SELECT
  USING (
    auth.uid() = attorney_id OR
    firm_id IN (SELECT current_firm_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "Attorneys can create intakes"
  ON client_intakes FOR INSERT
  WITH CHECK (auth.uid() = attorney_id);

CREATE POLICY IF NOT EXISTS "Attorneys can update their intakes"
  ON client_intakes FOR UPDATE
  USING (auth.uid() = attorney_id);

CREATE POLICY IF NOT EXISTS "Attorneys can delete their intakes"
  ON client_intakes FOR DELETE
  USING (auth.uid() = attorney_id);
