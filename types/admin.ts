// Session 21: Admin Console, Firm Settings & System Configuration

// ============================================================
// Firm Settings Types
// ============================================================

export type BusinessType = 'solo' | 'partnership' | 'llc' | 'corporation'
export type TimeFormat = '12h' | '24h'
export type CaseAccessLevel = 'all' | 'assigned' | 'team'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused'
export type BillingCycle = 'monthly' | 'annual'
export type SubscriptionInvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending'
export type LoginEventType = 'login_success' | 'login_failed' | 'logout' | 'password_change' | '2fa_enabled' | '2fa_disabled' | 'session_expired'
export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export' | 'share' | 'invite' | 'deactivate' | 'reactivate' | 'login' | 'logout' | 'permission_change'
export type CustomFieldType = 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'multiselect' | 'email' | 'phone' | 'url' | 'currency' | 'textarea'
export type CustomFieldEntityType = 'case' | 'client' | 'document' | 'invoice' | 'task'
export type EmailTemplateCategory = 'client' | 'internal' | 'reminder' | 'notification' | 'billing'

export interface FirmProfile {
  id: string
  firm_id: string
  business_name?: string
  legal_name?: string
  tax_id?: string
  business_type: BusinessType
  founding_date?: string
  bar_number?: string
  website_url?: string
  primary_email?: string
  primary_phone?: string
  fax_number?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  zip_code?: string
  country: string
  timezone: string
  date_format: string
  time_format: TimeFormat
  currency: string
  fiscal_year_start: number
  logo_url?: string
  logo_dark_url?: string
  favicon_url?: string
  primary_color: string
  secondary_color?: string
  created_at: string
  updated_at: string
}

export interface FirmBillingSettings {
  id: string
  firm_id: string
  default_hourly_rate?: number
  default_billing_increment: number
  minimum_billing_increment: number
  round_up_billing: boolean
  auto_generate_invoices: boolean
  invoice_due_days: number
  invoice_prefix: string
  invoice_starting_number: number
  late_fee_enabled: boolean
  late_fee_percentage?: number
  late_fee_flat_amount?: number
  late_fee_grace_days: number
  trust_account_required: boolean
  minimum_trust_balance?: number
  accept_credit_cards: boolean
  accept_ach: boolean
  accept_checks: boolean
  payment_instructions?: string
  invoice_footer?: string
  invoice_terms?: string
  created_at: string
  updated_at: string
}

export interface FirmCaseSettings {
  id: string
  firm_id: string
  case_number_prefix: string
  case_number_format: string
  case_number_sequence: number
  default_case_type?: string
  require_retainer: boolean
  default_retainer_amount?: number
  auto_create_tasks: boolean
  default_task_template_id?: string
  phases: PhaseDefinition[]
  custom_statuses: StatusDefinition[]
  conflict_check_enabled: boolean
  conflict_check_fields: string[]
  intake_form_enabled: boolean
  intake_form_id?: string
  created_at: string
  updated_at: string
}

export interface PhaseDefinition {
  key: string
  name: string
  description?: string
  order: number
  color?: string
}

export interface StatusDefinition {
  key: string
  name: string
  color: string
  is_terminal: boolean
}

export interface FirmNotificationSettings {
  id: string
  firm_id: string
  email_from_name?: string
  email_from_address?: string
  email_reply_to?: string
  email_signature?: string
  email_logo_url?: string
  sms_enabled: boolean
  sms_from_number?: string
  deadline_reminder_days: number[]
  task_reminder_enabled: boolean
  appointment_reminder_hours: number
  invoice_reminder_enabled: boolean
  invoice_reminder_days: number[]
  client_portal_notifications: boolean
  team_notifications: boolean
  daily_digest_enabled: boolean
  daily_digest_time?: string
  created_at: string
  updated_at: string
}

export interface AllFirmSettings {
  profile: FirmProfile
  billing: FirmBillingSettings
  cases: FirmCaseSettings
  notifications: FirmNotificationSettings
}

// ============================================================
// Roles & Permissions
// ============================================================

export interface Role {
  id: string
  firm_id?: string
  role_name: string
  role_key: string
  description?: string
  is_system: boolean
  is_active: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  permissions: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  permission_key: string
  permission_name: string
  description?: string
  category: string
  created_at: string
}

export interface RolePermission {
  id: string
  role_id: string
  permission_key: string
  granted: boolean
  created_at: string
}

// ============================================================
// Enhanced Firm Member (with new columns)
// ============================================================

export interface EnhancedFirmMember {
  id: string
  firm_id: string
  user_id: string
  role: string
  role_id?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  permissions: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_permissions?: Record<string, any>
  status: string
  is_admin: boolean
  can_access_billing: boolean
  can_manage_users: boolean
  case_access_level: CaseAccessLevel
  hourly_rate?: number
  billable_target_hours?: number
  department?: string
  title?: string
  bar_number?: string
  hire_date?: string
  is_active: boolean
  deactivated_at?: string
  deactivated_by?: string
  invited_email?: string
  invited_at?: string
  joined_at?: string
  created_at: string
  updated_at: string
  // Joined
  profile?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
    last_login_at?: string
  }
  role_info?: Role
}

// ============================================================
// Firm Invitations
// ============================================================

export interface FirmInvitation {
  id: string
  firm_id: string
  email: string
  role_id?: string
  role?: string
  title?: string
  department?: string
  hourly_rate?: number
  invite_token: string
  expires_at: string
  invited_by: string
  status: InvitationStatus
  accepted_at?: string
  created_at: string
  updated_at: string
  // Joined
  inviter?: {
    full_name: string
    email: string
  }
}

// ============================================================
// Audit Logging
// ============================================================

export interface AuditLog {
  id: string
  firm_id: string
  user_id?: string
  user_email?: string
  user_name?: string
  action: AuditAction
  entity_type: string
  entity_id?: string
  entity_name?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changes?: { before?: Record<string, any>; after?: Record<string, any> }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  session_id?: string
  created_at: string
}

export interface LoginAuditLog {
  id: string
  user_id?: string
  firm_id?: string
  event_type: LoginEventType
  ip_address?: string
  user_agent?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  device_info?: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  location?: Record<string, any>
  failure_reason?: string
  created_at: string
}

// ============================================================
// Custom Fields
// ============================================================

export interface CustomFieldOption {
  label: string
  value: string
}

export interface ValidationRule {
  type: 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max'
  value: string | number
  message?: string
}

export interface CustomFieldDefinition {
  id: string
  firm_id: string
  entity_type: CustomFieldEntityType
  field_name: string
  field_key: string
  field_type: CustomFieldType
  description?: string
  placeholder?: string
  default_value?: string
  options?: CustomFieldOption[]
  validation_rules?: ValidationRule[]
  is_required: boolean
  is_searchable: boolean
  is_visible_in_list: boolean
  is_visible_in_portal: boolean
  display_order: number
  section?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CustomFieldValue {
  id: string
  field_definition_id: string
  entity_type: string
  entity_id: string
  value?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value_json?: any
  created_at: string
  updated_at: string
}

// ============================================================
// Subscriptions
// ============================================================

export interface SubscriptionPlan {
  id: string
  plan_key: string
  plan_name: string
  description?: string
  monthly_price: number
  annual_price: number
  seats_included: number
  additional_seat_price?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  limits: Record<string, any>
  stripe_monthly_price_id?: string
  stripe_annual_price_id?: string
  is_active: boolean
  is_public: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  firm_id: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  plan_id?: string
  plan_name?: string
  status: SubscriptionStatus
  current_period_start?: string
  current_period_end?: string
  trial_start?: string
  trial_end?: string
  cancel_at_period_end: boolean
  canceled_at?: string
  cancellation_reason?: string
  seats_included: number
  seats_used: number
  additional_seat_price?: number
  monthly_price?: number
  annual_price?: number
  billing_cycle: BillingCycle
  next_billing_date?: string
  payment_method_id?: string
  last_payment_date?: string
  last_payment_amount?: number
  last_payment_status?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  limits: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface SubscriptionInvoice {
  id: string
  firm_id: string
  subscription_id?: string
  stripe_invoice_id?: string
  invoice_number?: string
  amount: number
  tax: number
  total: number
  status: SubscriptionInvoiceStatus
  invoice_pdf_url?: string
  hosted_invoice_url?: string
  paid_at?: string
  due_date?: string
  period_start?: string
  period_end?: string
  created_at: string
}

// ============================================================
// Integrations
// ============================================================

export type IntegrationType =
  | 'google_calendar'
  | 'google_drive'
  | 'microsoft_365'
  | 'quickbooks'
  | 'xero'
  | 'stripe'
  | 'twilio'
  | 'sendgrid'
  | 'docusign'
  | 'zoom'
  | 'clio'
  | 'lawpay'

export interface FirmIntegration {
  id: string
  firm_id: string
  integration_type: IntegrationType | string
  integration_name: string
  status: IntegrationStatus
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credentials?: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>
  last_sync_at?: string
  last_sync_status?: string
  last_error?: string
  sync_enabled: boolean
  sync_frequency?: string
  connected_by?: string
  connected_at?: string
  disconnected_at?: string
  created_at: string
  updated_at: string
}

// ============================================================
// Task Templates
// ============================================================

export interface TaskTemplateItem {
  title: string
  description?: string
  assignee_role?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_days_offset?: number
  depends_on?: number[]
}

export interface TaskTemplate {
  id: string
  firm_id: string
  template_name: string
  description?: string
  case_type?: string
  phase?: string
  tasks: TaskTemplateItem[]
  is_active: boolean
  use_count: number
  created_by?: string
  created_at: string
  updated_at: string
}

// ============================================================
// Constants
// ============================================================

export const INTEGRATION_INFO: Record<string, {
  name: string
  description: string
  category: string
  icon: string
}> = {
  google_calendar: { name: 'Google Calendar', description: 'Calendar sync', category: 'Productivity', icon: 'Calendar' },
  google_drive: { name: 'Google Drive', description: 'Document storage', category: 'Storage', icon: 'HardDrive' },
  microsoft_365: { name: 'Microsoft 365', description: 'Outlook/OneDrive', category: 'Productivity', icon: 'Mail' },
  quickbooks: { name: 'QuickBooks', description: 'Accounting sync', category: 'Accounting', icon: 'Calculator' },
  xero: { name: 'Xero', description: 'Accounting sync', category: 'Accounting', icon: 'Calculator' },
  stripe: { name: 'Stripe', description: 'Payment processing', category: 'Payments', icon: 'CreditCard' },
  twilio: { name: 'Twilio', description: 'SMS notifications', category: 'Communication', icon: 'Phone' },
  sendgrid: { name: 'SendGrid', description: 'Email delivery', category: 'Communication', icon: 'Mail' },
  docusign: { name: 'DocuSign', description: 'E-signatures', category: 'Documents', icon: 'PenTool' },
  zoom: { name: 'Zoom', description: 'Video meetings', category: 'Communication', icon: 'Video' },
  clio: { name: 'Clio', description: 'Practice management import', category: 'Legal', icon: 'Briefcase' },
  lawpay: { name: 'LawPay', description: 'Legal payment processing', category: 'Payments', icon: 'CreditCard' },
}

export const PERMISSION_CATEGORIES = [
  { key: 'cases', label: 'Cases' },
  { key: 'clients', label: 'Clients' },
  { key: 'financials', label: 'Financials' },
  { key: 'documents', label: 'Documents' },
  { key: 'team', label: 'Team' },
  { key: 'settings', label: 'Settings' },
  { key: 'admin', label: 'Admin' },
]

export const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
]

export const BILLING_INCREMENT_OPTIONS = [
  { value: 1, label: '1 minute' },
  { value: 6, label: '6 minutes (0.1 hr)' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes (0.25 hr)' },
  { value: 30, label: '30 minutes (0.5 hr)' },
]

export const CASE_NUMBER_FORMAT_OPTIONS = [
  { value: '{PREFIX}-{YEAR}-{SEQ}', label: 'PREFIX-YEAR-SEQ', example: 'CASE-2026-00001' },
  { value: '{PREFIX}-{YY}-{SEQ4}', label: 'PREFIX-YY-SEQ4', example: 'CASE-26-0001' },
  { value: '{YEAR}-{SEQ}', label: 'YEAR-SEQ', example: '2026-00001' },
  { value: '{PREFIX}{SEQ}', label: 'PREFIX+SEQ', example: 'CASE00001' },
]
