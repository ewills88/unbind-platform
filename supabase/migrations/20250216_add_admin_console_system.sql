-- Session 21: Admin Console, Firm Settings & System Configuration

-- ============================================================
-- Firm Settings Tables
-- ============================================================

CREATE TABLE firm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  legal_name TEXT,
  tax_id TEXT,
  business_type TEXT DEFAULT 'solo' CHECK (business_type IN ('solo', 'partnership', 'llc', 'corporation')),
  founding_date DATE,
  bar_number TEXT,
  website_url TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  fax_number TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  date_format TEXT NOT NULL DEFAULT 'MM/dd/yyyy',
  time_format TEXT NOT NULL DEFAULT '12h',
  currency TEXT NOT NULL DEFAULT 'USD',
  fiscal_year_start INTEGER NOT NULL DEFAULT 1,
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE firm_billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE UNIQUE,
  default_hourly_rate DECIMAL(10,2),
  default_billing_increment INTEGER NOT NULL DEFAULT 6,
  minimum_billing_increment INTEGER NOT NULL DEFAULT 6,
  round_up_billing BOOLEAN NOT NULL DEFAULT true,
  auto_generate_invoices BOOLEAN NOT NULL DEFAULT false,
  invoice_due_days INTEGER NOT NULL DEFAULT 30,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  invoice_starting_number INTEGER NOT NULL DEFAULT 1001,
  late_fee_enabled BOOLEAN NOT NULL DEFAULT false,
  late_fee_percentage DECIMAL(5,2),
  late_fee_flat_amount DECIMAL(10,2),
  late_fee_grace_days INTEGER NOT NULL DEFAULT 15,
  trust_account_required BOOLEAN NOT NULL DEFAULT true,
  minimum_trust_balance DECIMAL(10,2) DEFAULT 500,
  accept_credit_cards BOOLEAN NOT NULL DEFAULT true,
  accept_ach BOOLEAN NOT NULL DEFAULT true,
  accept_checks BOOLEAN NOT NULL DEFAULT true,
  payment_instructions TEXT,
  invoice_footer TEXT,
  invoice_terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE firm_case_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE UNIQUE,
  case_number_prefix TEXT NOT NULL DEFAULT 'CASE',
  case_number_format TEXT NOT NULL DEFAULT '{PREFIX}-{YEAR}-{SEQ}',
  case_number_sequence INTEGER NOT NULL DEFAULT 1,
  default_case_type TEXT,
  require_retainer BOOLEAN NOT NULL DEFAULT true,
  default_retainer_amount DECIMAL(10,2),
  auto_create_tasks BOOLEAN NOT NULL DEFAULT true,
  default_task_template_id UUID,
  phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_statuses JSONB NOT NULL DEFAULT '[]'::jsonb,
  conflict_check_enabled BOOLEAN NOT NULL DEFAULT true,
  conflict_check_fields TEXT[] NOT NULL DEFAULT ARRAY['client_name', 'opposing_party'],
  intake_form_enabled BOOLEAN NOT NULL DEFAULT true,
  intake_form_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE firm_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE UNIQUE,
  email_from_name TEXT,
  email_from_address TEXT,
  email_reply_to TEXT,
  email_signature TEXT,
  email_logo_url TEXT,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_from_number TEXT,
  deadline_reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[7, 3, 1],
  task_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  appointment_reminder_hours INTEGER NOT NULL DEFAULT 24,
  invoice_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  invoice_reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[7, 14, 30],
  client_portal_notifications BOOLEAN NOT NULL DEFAULT true,
  team_notifications BOOLEAN NOT NULL DEFAULT true,
  daily_digest_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_digest_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Roles & Permissions System
-- ============================================================

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  role_key TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  permission_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_role_permission UNIQUE (role_id, permission_key)
);

-- ============================================================
-- ALTER firm_members: Add new columns
-- ============================================================

ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS custom_permissions JSONB;
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS can_access_billing BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS can_manage_users BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS case_access_level TEXT NOT NULL DEFAULT 'assigned' CHECK (case_access_level IN ('all', 'assigned', 'team'));
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS billable_target_hours DECIMAL(5,1);
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS bar_number TEXT;
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
ALTER TABLE firm_members ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES auth.users(id);

-- ============================================================
-- Firm Invitations
-- ============================================================

CREATE TABLE firm_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID REFERENCES roles(id),
  role TEXT,
  title TEXT,
  department TEXT,
  hourly_rate DECIMAL(10,2),
  invite_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Audit Logging
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  changes JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE login_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  firm_id UUID REFERENCES firms(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('login_success', 'login_failed', 'logout', 'password_change', '2fa_enabled', '2fa_disabled', 'session_expired')),
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  location JSONB,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Custom Fields
-- ============================================================

CREATE TABLE custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('case', 'client', 'document', 'invoice', 'task')),
  field_name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'datetime', 'boolean', 'select', 'multiselect', 'email', 'phone', 'url', 'currency', 'textarea')),
  description TEXT,
  placeholder TEXT,
  default_value TEXT,
  options JSONB,
  validation_rules JSONB,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_searchable BOOLEAN NOT NULL DEFAULT true,
  is_visible_in_list BOOLEAN NOT NULL DEFAULT false,
  is_visible_in_portal BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  section TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  value TEXT,
  value_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_field_entity UNIQUE (field_definition_id, entity_type, entity_id)
);

-- ============================================================
-- Subscription & SaaS Billing
-- ============================================================

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT NOT NULL UNIQUE,
  plan_name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL,
  annual_price DECIMAL(10,2) NOT NULL,
  seats_included INTEGER NOT NULL DEFAULT 1,
  additional_seat_price DECIMAL(10,2),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_id UUID REFERENCES subscription_plans(id),
  plan_name TEXT,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  seats_included INTEGER NOT NULL DEFAULT 1,
  seats_used INTEGER NOT NULL DEFAULT 1,
  additional_seat_price DECIMAL(10,2),
  monthly_price DECIMAL(10,2),
  annual_price DECIMAL(10,2),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  next_billing_date TIMESTAMPTZ,
  payment_method_id TEXT,
  last_payment_date TIMESTAMPTZ,
  last_payment_amount DECIMAL(10,2),
  last_payment_status TEXT,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  stripe_invoice_id TEXT,
  invoice_number TEXT,
  amount DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  paid_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Integrations
-- ============================================================

CREATE TABLE firm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  integration_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  credentials JSONB,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_error TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_frequency TEXT,
  connected_by UUID REFERENCES auth.users(id),
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Task Templates
-- ============================================================

CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  case_type TEXT,
  phase TEXT,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_firm_settings_firm ON firm_settings(firm_id);
CREATE INDEX idx_firm_billing_settings_firm ON firm_billing_settings(firm_id);
CREATE INDEX idx_firm_case_settings_firm ON firm_case_settings(firm_id);
CREATE INDEX idx_firm_notification_settings_firm ON firm_notification_settings(firm_id);
CREATE INDEX idx_roles_firm ON roles(firm_id);
CREATE INDEX idx_roles_key ON roles(role_key);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_firm_members_role_id ON firm_members(role_id);
CREATE INDEX idx_firm_members_is_active ON firm_members(is_active);
CREATE INDEX idx_firm_invitations_firm ON firm_invitations(firm_id);
CREATE INDEX idx_firm_invitations_token ON firm_invitations(invite_token);
CREATE INDEX idx_firm_invitations_email ON firm_invitations(email);
CREATE INDEX idx_audit_logs_firm ON audit_logs(firm_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_login_audit_user ON login_audit(user_id);
CREATE INDEX idx_login_audit_firm ON login_audit(firm_id);
CREATE INDEX idx_custom_field_definitions_firm ON custom_field_definitions(firm_id);
CREATE INDEX idx_custom_field_definitions_entity ON custom_field_definitions(entity_type);
CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX idx_custom_field_values_definition ON custom_field_values(field_definition_id);
CREATE INDEX idx_subscriptions_firm ON subscriptions(firm_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscription_invoices_firm ON subscription_invoices(firm_id);
CREATE INDEX idx_subscription_invoices_subscription ON subscription_invoices(subscription_id);
CREATE INDEX idx_firm_integrations_firm ON firm_integrations(firm_id);
CREATE INDEX idx_firm_integrations_type ON firm_integrations(integration_type);
CREATE INDEX idx_task_templates_firm ON task_templates(firm_id);

-- ============================================================
-- Updated_at Triggers
-- ============================================================

CREATE TRIGGER trigger_firm_settings_updated
  BEFORE UPDATE ON firm_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_firm_billing_settings_updated
  BEFORE UPDATE ON firm_billing_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_firm_case_settings_updated
  BEFORE UPDATE ON firm_case_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_firm_notification_settings_updated
  BEFORE UPDATE ON firm_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_roles_updated
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_firm_invitations_updated
  BEFORE UPDATE ON firm_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_custom_field_definitions_updated
  BEFORE UPDATE ON custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_custom_field_values_updated
  BEFORE UPDATE ON custom_field_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_subscriptions_updated
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_subscription_plans_updated
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_firm_integrations_updated
  BEFORE UPDATE ON firm_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_task_templates_updated
  BEFORE UPDATE ON task_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE firm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_case_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Firm settings: Active members can view, owners/admins can manage
CREATE POLICY "Firm members can view firm settings"
  ON firm_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_settings.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
  ));

CREATE POLICY "Firm admins can manage firm settings"
  ON firm_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_settings.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
  ));

-- Billing settings: Same pattern
CREATE POLICY "Firm members can view billing settings"
  ON firm_billing_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_billing_settings.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
  ));

CREATE POLICY "Firm admins can manage billing settings"
  ON firm_billing_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_billing_settings.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
  ));

-- Case settings: Same pattern
CREATE POLICY "Firm members can view case settings"
  ON firm_case_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_case_settings.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
  ));

CREATE POLICY "Firm admins can manage case settings"
  ON firm_case_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_case_settings.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
  ));

-- Notification settings: Same pattern
CREATE POLICY "Firm members can view notification settings"
  ON firm_notification_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_notification_settings.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
  ));

CREATE POLICY "Firm admins can manage notification settings"
  ON firm_notification_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_notification_settings.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
  ));

-- Roles: System roles visible to all, firm roles to firm members
CREATE POLICY "Roles visible to firm members and system"
  ON roles FOR SELECT
  USING (
    is_system = true
    OR EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = roles.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
    )
  );

CREATE POLICY "Firm admins can manage roles"
  ON roles FOR ALL
  USING (
    firm_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM firm_members
      WHERE firm_members.firm_id = roles.firm_id
      AND firm_members.user_id = auth.uid()
      AND firm_members.status = 'active'
      AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
    )
  );

-- Permissions: All authenticated users can view
CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Role permissions: Visible to firm members
CREATE POLICY "Role permissions visible to firm members"
  ON role_permissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM roles
    JOIN firm_members ON firm_members.firm_id = roles.firm_id
    WHERE roles.id = role_permissions.role_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM roles WHERE roles.id = role_permissions.role_id AND roles.is_system = true
  ));

-- Firm invitations: Firm admins can manage
CREATE POLICY "Firm admins can view invitations"
  ON firm_invitations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_invitations.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true OR (firm_members.permissions->'team'->>'invite')::boolean = true)
  ));

CREATE POLICY "Firm admins can manage invitations"
  ON firm_invitations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_invitations.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true OR (firm_members.permissions->'team'->>'invite')::boolean = true)
  ));

-- Audit logs: Firm admins can view
CREATE POLICY "Firm admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = audit_logs.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
  ));

CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Login audit: Users can see own, admins can see all
CREATE POLICY "Users can view own login audit"
  ON login_audit FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert login audit"
  ON login_audit FOR INSERT
  WITH CHECK (true);

-- Custom fields: Firm members can view/use, admins can manage definitions
CREATE POLICY "Firm members can view custom field definitions"
  ON custom_field_definitions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = custom_field_definitions.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
  ));

CREATE POLICY "Firm admins can manage custom field definitions"
  ON custom_field_definitions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = custom_field_definitions.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
  ));

CREATE POLICY "Firm members can manage custom field values"
  ON custom_field_values FOR ALL
  USING (EXISTS (
    SELECT 1 FROM custom_field_definitions cfd
    JOIN firm_members fm ON fm.firm_id = cfd.firm_id
    WHERE cfd.id = custom_field_values.field_definition_id
    AND fm.user_id = auth.uid()
    AND fm.status = 'active'
  ));

-- Subscriptions: Firm admins can view
CREATE POLICY "Firm admins can view subscription"
  ON subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = subscriptions.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
  ));

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (true);

-- Subscription plans: All authenticated users can view active plans
CREATE POLICY "Authenticated users can view subscription plans"
  ON subscription_plans FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true AND is_public = true);

-- Subscription invoices: Firm admins
CREATE POLICY "Firm admins can view subscription invoices"
  ON subscription_invoices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = subscription_invoices.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
  ));

-- Firm integrations: Firm admins
CREATE POLICY "Firm admins can view integrations"
  ON firm_integrations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_integrations.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
  ));

CREATE POLICY "Firm admins can manage integrations"
  ON firm_integrations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = firm_integrations.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
  ));

-- Task templates: Firm members can view, admins can manage
CREATE POLICY "Firm members can view task templates"
  ON task_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = task_templates.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
  ));

CREATE POLICY "Firm admins can manage task templates"
  ON task_templates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM firm_members
    WHERE firm_members.firm_id = task_templates.firm_id
    AND firm_members.user_id = auth.uid()
    AND firm_members.status = 'active'
    AND (firm_members.role = 'owner' OR firm_members.is_admin = true)
  ));

-- ============================================================
-- Seed: Default System Roles
-- ============================================================

INSERT INTO roles (role_name, role_key, description, is_system, permissions) VALUES
  ('Owner', 'owner', 'Full access to everything', true, '{"cases":{"view":true,"create":true,"edit":true,"delete":true,"assign":true},"clients":{"view":true,"create":true,"edit":true,"communicate":true},"financials":{"view":true,"create":true,"edit":true,"approve":true},"documents":{"view":true,"create":true,"edit":true,"delete":true},"team":{"view":true,"invite":true,"manage":true},"settings":{"view":true,"edit":true},"admin":{"view":true,"edit":true}}'),
  ('Admin', 'admin', 'Manage firm settings, users, billing', true, '{"cases":{"view":true,"create":true,"edit":true,"delete":true,"assign":true},"clients":{"view":true,"create":true,"edit":true,"communicate":true},"financials":{"view":true,"create":true,"edit":true,"approve":true},"documents":{"view":true,"create":true,"edit":true,"delete":true},"team":{"view":true,"invite":true,"manage":true},"settings":{"view":true,"edit":true},"admin":{"view":true,"edit":true}}'),
  ('Partner', 'partner', 'Full case access, reports, some admin', true, '{"cases":{"view":true,"create":true,"edit":true,"delete":false,"assign":true},"clients":{"view":true,"create":true,"edit":true,"communicate":true},"financials":{"view":true,"create":true,"edit":true,"approve":true},"documents":{"view":true,"create":true,"edit":true,"delete":true},"team":{"view":true,"invite":true,"manage":false},"settings":{"view":true,"edit":false},"admin":{"view":true,"edit":false}}'),
  ('Attorney', 'attorney', 'Case management, documents, billing', true, '{"cases":{"view":true,"create":true,"edit":true,"delete":false,"assign":false},"clients":{"view":true,"create":true,"edit":true,"communicate":true},"financials":{"view":true,"create":true,"edit":false,"approve":false},"documents":{"view":true,"create":true,"edit":true,"delete":false},"team":{"view":true,"invite":false,"manage":false},"settings":{"view":false,"edit":false},"admin":{"view":false,"edit":false}}'),
  ('Associate', 'associate', 'Limited case access, time entry', true, '{"cases":{"view":true,"create":false,"edit":true,"delete":false,"assign":false},"clients":{"view":true,"create":false,"edit":false,"communicate":true},"financials":{"view":true,"create":true,"edit":false,"approve":false},"documents":{"view":true,"create":true,"edit":true,"delete":false},"team":{"view":true,"invite":false,"manage":false},"settings":{"view":false,"edit":false},"admin":{"view":false,"edit":false}}'),
  ('Paralegal', 'paralegal', 'Document management, scheduling, no billing', true, '{"cases":{"view":true,"create":false,"edit":true,"delete":false,"assign":false},"clients":{"view":true,"create":false,"edit":false,"communicate":true},"financials":{"view":false,"create":false,"edit":false,"approve":false},"documents":{"view":true,"create":true,"edit":true,"delete":false},"team":{"view":true,"invite":false,"manage":false},"settings":{"view":false,"edit":false},"admin":{"view":false,"edit":false}}'),
  ('Secretary', 'secretary', 'Scheduling, basic document access', true, '{"cases":{"view":true,"create":false,"edit":false,"delete":false,"assign":false},"clients":{"view":true,"create":false,"edit":false,"communicate":true},"financials":{"view":false,"create":false,"edit":false,"approve":false},"documents":{"view":true,"create":true,"edit":false,"delete":false},"team":{"view":true,"invite":false,"manage":false},"settings":{"view":false,"edit":false},"admin":{"view":false,"edit":false}}'),
  ('Bookkeeper', 'bookkeeper', 'Billing and payments only', true, '{"cases":{"view":true,"create":false,"edit":false,"delete":false,"assign":false},"clients":{"view":true,"create":false,"edit":false,"communicate":false},"financials":{"view":true,"create":true,"edit":true,"approve":true},"documents":{"view":true,"create":false,"edit":false,"delete":false},"team":{"view":true,"invite":false,"manage":false},"settings":{"view":false,"edit":false},"admin":{"view":false,"edit":false}}');

-- ============================================================
-- Seed: Permission Definitions
-- ============================================================

INSERT INTO permissions (permission_key, permission_name, description, category) VALUES
  -- Cases
  ('cases.view', 'View Cases', 'View case details and list', 'cases'),
  ('cases.create', 'Create Cases', 'Create new cases', 'cases'),
  ('cases.edit', 'Edit Cases', 'Edit case details', 'cases'),
  ('cases.delete', 'Delete Cases', 'Delete cases', 'cases'),
  ('cases.assign', 'Assign Cases', 'Assign team members to cases', 'cases'),
  -- Clients
  ('clients.view', 'View Clients', 'View client information', 'clients'),
  ('clients.create', 'Create Clients', 'Create new clients', 'clients'),
  ('clients.edit', 'Edit Clients', 'Edit client details', 'clients'),
  ('clients.communicate', 'Communicate with Clients', 'Send messages to clients', 'clients'),
  -- Financials
  ('financials.view', 'View Financials', 'View invoices, payments, reports', 'financials'),
  ('financials.create', 'Create Financial Records', 'Create invoices and time entries', 'financials'),
  ('financials.edit', 'Edit Financial Records', 'Edit invoices and entries', 'financials'),
  ('financials.approve', 'Approve Financials', 'Approve invoices and payments', 'financials'),
  -- Documents
  ('documents.view', 'View Documents', 'View and download documents', 'documents'),
  ('documents.create', 'Create Documents', 'Upload and create documents', 'documents'),
  ('documents.edit', 'Edit Documents', 'Edit document metadata', 'documents'),
  ('documents.delete', 'Delete Documents', 'Delete documents', 'documents'),
  -- Team
  ('team.view', 'View Team', 'View team members', 'team'),
  ('team.invite', 'Invite Members', 'Invite new team members', 'team'),
  ('team.manage', 'Manage Team', 'Update roles, deactivate members', 'team'),
  -- Settings
  ('settings.view', 'View Settings', 'View firm settings', 'settings'),
  ('settings.edit', 'Edit Settings', 'Modify firm settings', 'settings'),
  -- Admin
  ('admin.view', 'View Admin', 'Access admin dashboard', 'admin'),
  ('admin.edit', 'Edit Admin', 'Modify admin settings', 'admin');

-- Seed: Default role_permissions for system roles
INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT r.id, p.permission_key, true
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'owner';

INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT r.id, p.permission_key, true
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'admin';

INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT r.id, p.permission_key, true
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'partner'
AND p.permission_key NOT IN ('cases.delete', 'team.manage', 'settings.edit', 'admin.edit');

INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT r.id, p.permission_key, true
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'attorney'
AND p.permission_key IN ('cases.view', 'cases.create', 'cases.edit', 'clients.view', 'clients.create', 'clients.edit', 'clients.communicate', 'financials.view', 'financials.create', 'documents.view', 'documents.create', 'documents.edit', 'team.view');

INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT r.id, p.permission_key, true
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'associate'
AND p.permission_key IN ('cases.view', 'cases.edit', 'clients.view', 'clients.communicate', 'financials.view', 'financials.create', 'documents.view', 'documents.create', 'documents.edit', 'team.view');

INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT r.id, p.permission_key, true
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'paralegal'
AND p.permission_key IN ('cases.view', 'cases.edit', 'clients.view', 'clients.communicate', 'documents.view', 'documents.create', 'documents.edit', 'team.view');

INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT r.id, p.permission_key, true
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'secretary'
AND p.permission_key IN ('cases.view', 'clients.view', 'clients.communicate', 'documents.view', 'documents.create', 'team.view');

INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT r.id, p.permission_key, true
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'bookkeeper'
AND p.permission_key IN ('cases.view', 'clients.view', 'financials.view', 'financials.create', 'financials.edit', 'financials.approve', 'documents.view', 'team.view');

-- ============================================================
-- Seed: Default Subscription Plans
-- ============================================================

INSERT INTO subscription_plans (plan_key, plan_name, description, monthly_price, annual_price, seats_included, additional_seat_price, features, limits, display_order) VALUES
  ('solo', 'Solo', 'For solo practitioners', 0, 0, 1, 0, '{"basic_cases":true,"document_storage":true,"client_portal":true,"basic_billing":true}', '{"max_cases":25,"max_storage_gb":5,"max_documents":500}', 1),
  ('starter', 'Starter', 'For small practices getting started', 49, 470, 3, 15, '{"basic_cases":true,"document_storage":true,"client_portal":true,"basic_billing":true,"email_notifications":true,"custom_fields":true}', '{"max_cases":100,"max_storage_gb":25,"max_documents":2500}', 2),
  ('professional', 'Professional', 'For growing law firms', 149, 1430, 10, 12, '{"basic_cases":true,"document_storage":true,"client_portal":true,"basic_billing":true,"email_notifications":true,"custom_fields":true,"advanced_analytics":true,"integrations":true,"task_templates":true,"audit_logs":true}', '{"max_cases":500,"max_storage_gb":100,"max_documents":10000}', 3),
  ('enterprise', 'Enterprise', 'For large firms and organizations', 349, 3350, 25, 10, '{"basic_cases":true,"document_storage":true,"client_portal":true,"basic_billing":true,"email_notifications":true,"custom_fields":true,"advanced_analytics":true,"integrations":true,"task_templates":true,"audit_logs":true,"white_label":true,"api_access":true,"sso":true,"priority_support":true}', '{"max_cases":-1,"max_storage_gb":500,"max_documents":-1}', 4);

-- ============================================================
-- Helper Functions
-- ============================================================

CREATE OR REPLACE FUNCTION increment_subscription_seats(p_firm_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions SET seats_used = seats_used + 1 WHERE firm_id = p_firm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_subscription_seats(p_firm_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions SET seats_used = GREATEST(seats_used - 1, 0) WHERE firm_id = p_firm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
