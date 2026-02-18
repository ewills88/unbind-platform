-- Session 20 CP3: Payment Portal, Notifications & Mobile PWA
-- Extends existing saved_payment_methods and payment_plans,
-- adds client-facing notifications and push subscription tables

-- ============================================================
-- 1. Extend saved_payment_methods with portal-facing columns
-- ============================================================

DO $$ BEGIN
  ALTER TABLE saved_payment_methods ADD COLUMN type TEXT NOT NULL DEFAULT 'card';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE saved_payment_methods ADD COLUMN bank_name TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE saved_payment_methods ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE saved_payment_methods ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE saved_payment_methods ADD COLUMN billing_address JSONB;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- 2. Extend payment_plans with portal-facing columns
-- ============================================================

DO $$ BEGIN
  ALTER TABLE payment_plans ADD COLUMN client_id UUID REFERENCES auth.users(id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payment_plans ADD COLUMN firm_id UUID REFERENCES firms(id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payment_plans ADD COLUMN plan_name TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payment_plans ADD COLUMN down_payment_amount NUMERIC(10,2) DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payment_plans ADD COLUMN down_payment_paid BOOLEAN DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payment_plans ADD COLUMN amount_remaining NUMERIC(10,2) DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payment_plans ADD COLUMN payments_remaining INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payment_plans ADD COLUMN late_fee_amount NUMERIC(10,2) DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payment_plans ADD COLUMN grace_period_days INTEGER DEFAULT 5;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- 3. Client auto-pay settings
-- ============================================================

CREATE TABLE IF NOT EXISTS client_auto_pay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES saved_payment_methods(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  pay_full_balance BOOLEAN NOT NULL DEFAULT true,
  max_amount NUMERIC(10,2),
  notification_days_before INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. Client notifications
-- ============================================================

DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM (
    'message', 'document', 'task', 'appointment',
    'payment', 'case_update', 'deadline', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  category notification_category NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  icon TEXT,
  priority notification_priority NOT NULL DEFAULT 'normal',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  action_required BOOLEAN NOT NULL DEFAULT false,
  action_completed BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  email_opened BOOLEAN NOT NULL DEFAULT false,
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  sms_sent_at TIMESTAMPTZ,
  push_sent BOOLEAN NOT NULL DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. Client notification preferences
-- ============================================================

DO $$ BEGIN
  CREATE TYPE digest_frequency AS ENUM ('daily', 'weekly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS client_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  digest_enabled BOOLEAN NOT NULL DEFAULT false,
  digest_frequency digest_frequency DEFAULT 'daily',
  digest_time TIME DEFAULT '09:00',
  preferences JSONB NOT NULL DEFAULT '{
    "new_message": { "email": true, "sms": false, "push": true },
    "document_shared": { "email": true, "sms": false, "push": true },
    "document_request": { "email": true, "sms": false, "push": true },
    "task_assigned": { "email": true, "sms": false, "push": true },
    "task_due_soon": { "email": true, "sms": true, "push": true },
    "appointment_reminder": { "email": true, "sms": true, "push": true },
    "appointment_confirmed": { "email": true, "sms": false, "push": true },
    "payment_due": { "email": true, "sms": true, "push": true },
    "payment_received": { "email": true, "sms": false, "push": true },
    "payment_failed": { "email": true, "sms": true, "push": true },
    "case_update": { "email": true, "sms": false, "push": true },
    "deadline_approaching": { "email": true, "sms": true, "push": true }
  }'::jsonb,
  phone_number TEXT,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. Push subscriptions (Web Push API)
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  device_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, endpoint)
);

-- ============================================================
-- 7. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_client_auto_pay_client
  ON client_auto_pay(client_id);

CREATE INDEX IF NOT EXISTS idx_client_notifications_client
  ON client_notifications(client_id, is_read, is_archived);
CREATE INDEX IF NOT EXISTS idx_client_notifications_category
  ON client_notifications(category);
CREATE INDEX IF NOT EXISTS idx_client_notifications_created
  ON client_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_client
  ON push_subscriptions(client_id, is_active);

-- ============================================================
-- 8. Row-Level Security
-- ============================================================

ALTER TABLE client_auto_pay ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- client_auto_pay
CREATE POLICY "client_auto_pay_select_own" ON client_auto_pay
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "client_auto_pay_insert_own" ON client_auto_pay
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "client_auto_pay_update_own" ON client_auto_pay
  FOR UPDATE USING (auth.uid() = client_id);

-- client_notifications
CREATE POLICY "client_notifications_select_own" ON client_notifications
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "client_notifications_update_own" ON client_notifications
  FOR UPDATE USING (auth.uid() = client_id);

-- client_notification_preferences
CREATE POLICY "client_notif_prefs_select_own" ON client_notification_preferences
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "client_notif_prefs_insert_own" ON client_notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "client_notif_prefs_update_own" ON client_notification_preferences
  FOR UPDATE USING (auth.uid() = client_id);

-- push_subscriptions
CREATE POLICY "push_subs_select_own" ON push_subscriptions
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "push_subs_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "push_subs_update_own" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "push_subs_delete_own" ON push_subscriptions
  FOR DELETE USING (auth.uid() = client_id);

-- ============================================================
-- 9. Updated_at triggers
-- ============================================================

CREATE TRIGGER update_client_auto_pay_updated_at
  BEFORE UPDATE ON client_auto_pay
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_notification_preferences_updated_at
  BEFORE UPDATE ON client_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
