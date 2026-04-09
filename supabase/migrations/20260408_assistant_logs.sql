-- Assistant chat usage logging
CREATE TABLE IF NOT EXISTS assistant_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audience TEXT CHECK (audience IN ('attorney', 'client')),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assistant_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own logs"
  ON assistant_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
  ON assistant_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for usage analytics
CREATE INDEX idx_assistant_logs_user ON assistant_logs(user_id, created_at DESC);
CREATE INDEX idx_assistant_logs_audience ON assistant_logs(audience, created_at DESC);
