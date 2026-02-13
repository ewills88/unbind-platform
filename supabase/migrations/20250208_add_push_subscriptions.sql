-- Push subscription storage for web push notifications
-- Session 13, Checkpoint 3

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  keys jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, endpoint)
);

-- Index for looking up subscriptions by user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);
