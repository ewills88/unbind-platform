CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  firm_name TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage demo_requests"
  ON demo_requests FOR ALL
  USING (true)
  WITH CHECK (true);
