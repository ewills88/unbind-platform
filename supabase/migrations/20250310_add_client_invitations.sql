-- Migration: Add client invitation tracking columns to cases table
-- Enables attorneys to invite clients to portal access

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS client_invite_status TEXT DEFAULT NULL
    CHECK (client_invite_status IN ('pending', 'accepted', 'expired', 'revoked')),
  ADD COLUMN IF NOT EXISTS client_invited_at TIMESTAMPTZ DEFAULT NULL;

-- Index for looking up cases by client email
CREATE INDEX IF NOT EXISTS idx_cases_client_email ON cases (client_email)
  WHERE client_email IS NOT NULL;

-- Index for filtering by invite status
CREATE INDEX IF NOT EXISTS idx_cases_invite_status ON cases (client_invite_status)
  WHERE client_invite_status IS NOT NULL;
