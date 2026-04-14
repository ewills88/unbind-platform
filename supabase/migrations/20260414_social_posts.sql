CREATE TABLE IF NOT EXISTS social_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL,
  content text NOT NULL,
  posted_at timestamptz,
  scheduled_for timestamptz,
  status text DEFAULT 'scheduled',
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  clicks integer DEFAULT 0,
  leads_generated integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on social_posts"
  ON social_posts FOR ALL USING (true) WITH CHECK (true);
