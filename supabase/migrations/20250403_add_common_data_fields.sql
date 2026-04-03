-- Add common data fields for client/opposing party addresses and attorney info

-- Case-level fields for opposing party
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opposing_party_name TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opposing_party_address TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opposing_party_email TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opposing_party_phone TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opposing_counsel_name TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opposing_counsel_firm TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opposing_counsel_phone TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opposing_counsel_email TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS court_name TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS court_county TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS judge_name TEXT;

-- Profile-level address fields for attorneys and clients
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_zip TEXT;

-- Firm-level attorney info
ALTER TABLE firms ADD COLUMN IF NOT EXISTS bar_number TEXT;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS default_court TEXT;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS tax_id TEXT;
