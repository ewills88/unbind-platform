-- Outreach lead management tables

CREATE TABLE IF NOT EXISTS outreach_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  firm_name text,
  city text,
  state text,
  phone text,
  avvo_url text,
  source text DEFAULT 'avvo',
  status text DEFAULT 'new',
  sequence_step integer DEFAULT 0,
  last_contacted_at timestamptz,
  next_contact_at timestamptz,
  demo_booked boolean DEFAULT false,
  converted boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_emails_sent (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES outreach_leads(id),
  sequence_step integer,
  subject text,
  sent_at timestamptz DEFAULT now(),
  opened boolean DEFAULT false,
  replied boolean DEFAULT false
);

ALTER TABLE outreach_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_emails_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on outreach_leads"
  ON outreach_leads FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on outreach_emails_sent"
  ON outreach_emails_sent FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_outreach_leads_email ON outreach_leads(email);
CREATE INDEX idx_outreach_leads_status ON outreach_leads(status);
CREATE INDEX idx_outreach_leads_state ON outreach_leads(state);
