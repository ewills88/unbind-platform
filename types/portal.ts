// Session 20 CP1: Client Portal Types
// Authentication, sessions, conversations, messages, templates

// ============================================================
// Enums / Union Types
// ============================================================

export type PortalTokenType = 'magic_link' | 'invite' | 'reset'

export type DeviceType = 'desktop' | 'mobile' | 'tablet'

export type LoginMethod = 'magic_link' | 'password' | 'oauth' | 'invite_link'

export type ConversationType =
  | 'general'
  | 'billing'
  | 'document_request'
  | 'scheduling'
  | 'legal_question'
  | 'urgent'

export type ConversationStatus = 'open' | 'closed' | 'archived'

export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type MessageSenderRole = 'client' | 'attorney' | 'staff' | 'system'

export type MessageContentType = 'text' | 'rich_text' | 'system'

export type TemplateCategory =
  | 'general'
  | 'billing'
  | 'scheduling'
  | 'legal'
  | 'onboarding'
  | 'closing'

export type ActivityType =
  | 'message_sent'
  | 'document_uploaded'
  | 'document_signed'
  | 'task_completed'
  | 'task_assigned'
  | 'status_changed'
  | 'payment_received'
  | 'invoice_sent'
  | 'appointment_scheduled'
  | 'form_submitted'
  | 'note_added'
  | 'deadline_approaching'
  | 'portal_login'
  | 'conversation_opened'
  | 'conversation_closed'

// ============================================================
// Database Row Types
// ============================================================

export interface PortalAccessToken {
  id: string
  user_id: string
  case_id: string | null
  token_hash: string
  token_type: PortalTokenType
  email: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_by: string | null
  created_at: string
}

export interface ClientSession {
  id: string
  user_id: string
  session_token: string
  ip_address: string | null
  user_agent: string | null
  device_type: DeviceType | null
  is_active: boolean
  last_activity_at: string
  expires_at: string
  created_at: string
}

export interface ClientLoginHistory {
  id: string
  user_id: string
  login_method: LoginMethod
  ip_address: string | null
  user_agent: string | null
  device_type: DeviceType | null
  location_info: Record<string, string>
  success: boolean
  failure_reason: string | null
  session_id: string | null
  created_at: string
}

export interface PortalConversation {
  id: string
  case_id: string
  subject: string
  conversation_type: ConversationType
  status: ConversationStatus
  priority: ConversationPriority
  started_by: string
  assigned_to: string | null
  last_message_at: string | null
  last_message_preview: string | null
  client_unread_count: number
  attorney_unread_count: number
  closed_at: string | null
  closed_by: string | null
  created_at: string
  updated_at: string
}

export interface PortalMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_role: MessageSenderRole
  content: string
  content_type: MessageContentType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attachments: any[]
  is_read: boolean
  read_at: string | null
  is_internal: boolean
  edited_at: string | null
  created_at: string
}

export interface MessageTemplate {
  id: string
  firm_id: string | null
  category: TemplateCategory
  title: string
  content: string
  variables: string[]
  is_active: boolean
  usage_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CaseActivityLogEntry {
  id: string
  case_id: string
  user_id: string | null
  activity_type: ActivityType
  title: string
  description: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>
  is_visible_to_client: boolean
  created_at: string
}

// ============================================================
// Extended Types (with joined data)
// ============================================================

export interface PortalConversationWithDetails extends PortalConversation {
  starter_name?: string
  assignee_name?: string
  message_count?: number
}

export interface PortalMessageWithSender extends PortalMessage {
  sender_name: string
  sender_avatar_initials: string
}

// ============================================================
// API Request / Response Types
// ============================================================

export interface MagicLinkRequest {
  email: string
  redirect_to?: string
}

export interface MagicLinkResponse {
  success: boolean
  message: string
}

export interface PortalAuthSession {
  user: {
    id: string
    email: string
    full_name: string
    role: string
  }
  case_info: {
    id: string
    client_name: string
    status: string
    attorney_id: string | null
    attorney_name: string | null
  } | null
  session_id: string | null
}

export interface CreateConversationRequest {
  subject: string
  conversation_type: ConversationType
  priority?: ConversationPriority
  initial_message: string
}

export interface SendMessageRequest {
  content: string
  content_type?: MessageContentType
  attachments?: string[]
  is_internal?: boolean
}

export interface PortalDashboardData {
  profile: {
    full_name: string
    email: string
  }
  case_info: {
    id: string
    client_name: string
    status: string
    attorney_name: string | null
    attorney_id: string | null
    firm_name: string | null
  } | null
  progress: {
    current_stage: string
    overall_completion_percentage: number
    estimated_completion_date: string | null
  } | null
  pending_tasks: number
  unread_conversations: number
  recent_activity: CaseActivityLogEntry[]
  upcoming_events: {
    id: string
    title: string
    event_date: string
    event_type: string
  }[]
  recent_documents: {
    id: string
    file_name: string
    created_at: string
  }[]
  outstanding_balance: number
}

// ============================================================
// Constants
// ============================================================

export const CONVERSATION_TYPE_LABELS: Record<ConversationType, { label: string; description: string; color: string }> = {
  general: { label: 'General', description: 'General questions and updates', color: 'bg-gray-100 text-gray-700' },
  billing: { label: 'Billing', description: 'Payment and billing inquiries', color: 'bg-green-100 text-green-700' },
  document_request: { label: 'Documents', description: 'Document requests and uploads', color: 'bg-blue-100 text-blue-700' },
  scheduling: { label: 'Scheduling', description: 'Appointments and scheduling', color: 'bg-purple-100 text-purple-700' },
  legal_question: { label: 'Legal', description: 'Legal questions and advice', color: 'bg-indigo-100 text-indigo-700' },
  urgent: { label: 'Urgent', description: 'Time-sensitive matters', color: 'bg-red-100 text-red-700' },
}

export const PRIORITY_LABELS: Record<ConversationPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-500' },
  normal: { label: 'Normal', color: 'text-blue-600' },
  high: { label: 'High', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: 'General',
  billing: 'Billing',
  scheduling: 'Scheduling',
  legal: 'Legal',
  onboarding: 'Onboarding',
  closing: 'Closing',
}

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, { label: string; color: string }> = {
  message_sent: { label: 'Message Sent', color: 'text-blue-500' },
  document_uploaded: { label: 'Document Uploaded', color: 'text-purple-500' },
  document_signed: { label: 'Document Signed', color: 'text-green-500' },
  task_completed: { label: 'Task Completed', color: 'text-green-600' },
  task_assigned: { label: 'Task Assigned', color: 'text-orange-500' },
  status_changed: { label: 'Status Changed', color: 'text-indigo-500' },
  payment_received: { label: 'Payment Received', color: 'text-emerald-500' },
  invoice_sent: { label: 'Invoice Sent', color: 'text-amber-500' },
  appointment_scheduled: { label: 'Appointment Scheduled', color: 'text-cyan-500' },
  form_submitted: { label: 'Form Submitted', color: 'text-teal-500' },
  note_added: { label: 'Note Added', color: 'text-gray-500' },
  deadline_approaching: { label: 'Deadline Approaching', color: 'text-red-500' },
  portal_login: { label: 'Portal Login', color: 'text-slate-500' },
  conversation_opened: { label: 'Conversation Opened', color: 'text-blue-600' },
  conversation_closed: { label: 'Conversation Closed', color: 'text-gray-600' },
}

// ============================================================
// Session 20 CP2: Document Sharing, Appointments & Tasks
// ============================================================

export type DocumentRequestPriority = 'low' | 'normal' | 'high' | 'urgent'
export type DocumentRequestStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'cancelled'
export type SignatureStatus = 'pending' | 'signed' | 'declined'
export type AppointmentLocationType = 'in_person' | 'video' | 'phone'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
export type EnhancedTaskStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'cancelled'

export interface SharedDocument {
  id: string
  case_id: string
  document_id: string
  client_id: string
  shared_by: string
  share_message: string | null
  category: string
  is_active: boolean
  allow_download: boolean
  requires_signature: boolean
  signature_status: SignatureStatus | null
  signed_at: string | null
  expires_at: string | null
  view_count: number
  download_count: number
  first_viewed_at: string | null
  last_viewed_at: string | null
  created_at: string
  updated_at: string
  // Joined
  document?: {
    id: string
    file_name: string
    file_type: string
    file_size: number
  }
  shared_by_name?: string
}

export interface DocumentRequest {
  id: string
  case_id: string
  client_id: string
  firm_id: string | null
  requested_by: string
  document_type: string
  title: string
  description: string | null
  instructions: string | null
  accepted_formats: string[]
  max_file_size_mb: number
  deadline: string | null
  priority: DocumentRequestPriority
  status: DocumentRequestStatus
  fulfilled_document_id: string | null
  rejection_reason: string | null
  reminder_count: number
  auto_remind: boolean
  created_at: string
  submitted_at: string | null
  reviewed_at: string | null
  // Joined
  requested_by_name?: string
}

export interface AppointmentType {
  id: string
  firm_id: string
  type_name: string
  description: string | null
  duration_minutes: number
  color: string
  allow_video: boolean
  allow_phone: boolean
  allow_in_person: boolean
  buffer_before_minutes: number
  buffer_after_minutes: number
  max_daily: number | null
  advance_booking_days: number
  min_notice_hours: number
  cancellation_notice_hours: number
  intake_form_required: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intake_form_fields: any[]
  confirmation_email: boolean
  reminder_email: boolean
  reminder_hours_before: number
  is_active: boolean
  display_order: number
  created_at: string
}

export interface AvailabilityWindow {
  id: string
  user_id: string
  firm_id: string | null
  day_of_week: number
  start_time: string
  end_time: string
  appointment_type_ids: string[]
  location_types: string[]
  is_active: boolean
  created_at: string
}

export interface AvailabilityOverride {
  id: string
  user_id: string
  override_date: string
  is_available: boolean
  start_time: string | null
  end_time: string | null
  reason: string | null
  created_at: string
}

export interface ClientAppointment {
  id: string
  case_id: string
  client_id: string
  firm_id: string | null
  attorney_id: string
  appointment_type_id: string | null
  start_time: string
  end_time: string
  timezone: string
  location_type: AppointmentLocationType
  location_address: string | null
  video_link: string | null
  phone_number: string | null
  status: AppointmentStatus
  confirmation_sent: boolean
  confirmed_at: string | null
  reminder_sent: boolean
  intake_form_completed: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intake_form_data: Record<string, any> | null
  client_notes: string | null
  attorney_notes: string | null
  outcome_notes: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  rescheduled_from_id: string | null
  rescheduled_to_id: string | null
  created_at: string
  updated_at: string
  // Joined
  appointment_type?: { type_name: string; duration_minutes: number; color: string }
  attorney_name?: string
}

export interface AvailableSlot {
  date: string
  startTime: string
  endTime: string
  startDateTime: string
  endDateTime: string
}

export interface EnhancedClientTask {
  id: string
  case_id: string
  client_id: string | null
  firm_id: string | null
  task_type: string
  title: string
  description: string | null
  instructions: string | null
  due_date: string | null
  priority: string
  status: string
  requires_upload: boolean
  requires_form: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form_fields: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form_data: Record<string, any> | null
  completed_by_client_at: string | null
  submission_notes: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submitted_files: any[]
  review_status: string | null
  review_notes: string | null
  reviewed_at: string | null
  reminder_count: number
  auto_remind: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // Computed
  isOverdue?: boolean
  // Joined
  created_by_name?: string
}

export interface TaskStats {
  total: number
  pending: number
  inProgress: number
  submitted: number
  approved: number
  overdue: number
}

export const APPOINTMENT_LOCATION_LABELS: Record<AppointmentLocationType, { label: string; icon: string }> = {
  in_person: { label: 'In Person', icon: 'MapPin' },
  video: { label: 'Video Call', icon: 'Video' },
  phone: { label: 'Phone Call', icon: 'Phone' },
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  no_show: { label: 'No Show', color: 'bg-orange-100 text-orange-700' },
  rescheduled: { label: 'Rescheduled', color: 'bg-purple-100 text-purple-700' },
}

// ============================================================
// Session 20 CP3: Payments, Notifications & PWA
// ============================================================

export type PaymentMethodType = 'card' | 'bank_account'
export type ClientPaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'disputed'
export type PaymentPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled'
export type PaymentPlanFrequency = 'weekly' | 'biweekly' | 'monthly'
export type NotificationCategory = 'message' | 'document' | 'task' | 'appointment' | 'payment' | 'case_update' | 'deadline' | 'system'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
export type DigestFrequency = 'daily' | 'weekly'

export interface PortalPaymentMethod {
  id: string
  user_id: string
  stripe_payment_method_id: string
  stripe_customer_id: string | null
  type: PaymentMethodType
  card_brand: string | null
  card_last_four: string | null
  card_exp_month: number | null
  card_exp_year: number | null
  bank_name: string | null
  is_default: boolean
  is_verified: boolean
  is_active: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  billing_address: Record<string, any> | null
  nickname: string | null
  created_at: string
  updated_at: string
}

export interface PortalPaymentPlan {
  id: string
  invoice_id: string
  case_id: string
  client_id: string | null
  firm_id: string | null
  plan_name: string | null
  total_amount: number
  down_payment_amount: number
  down_payment_paid: boolean
  installment_count: number
  installment_amount: number
  frequency: PaymentPlanFrequency
  first_payment_date: string
  next_payment_date: string | null
  last_payment_date: string | null
  payments_made: number
  payments_remaining: number
  amount_paid: number
  amount_remaining: number
  status: PaymentPlanStatus
  auto_charge: boolean
  saved_payment_method_id: string | null
  late_fee_amount: number
  grace_period_days: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface ClientAutoPaySettings {
  id: string
  client_id: string
  firm_id: string | null
  payment_method_id: string | null
  is_active: boolean
  pay_full_balance: boolean
  max_amount: number | null
  notification_days_before: number
  created_at: string
  updated_at: string
}

export interface ClientNotification {
  id: string
  client_id: string
  case_id: string | null
  notification_type: string
  category: NotificationCategory
  title: string
  message: string
  link: string | null
  icon: string | null
  priority: NotificationPriority
  is_read: boolean
  read_at: string | null
  is_archived: boolean
  archived_at: string | null
  action_required: boolean
  action_completed: boolean
  email_sent: boolean
  email_sent_at: string | null
  email_opened: boolean
  sms_sent: boolean
  sms_sent_at: string | null
  push_sent: boolean
  push_sent_at: string | null
  expires_at: string | null
  created_at: string
}

export interface ClientNotificationPreferences {
  id: string
  client_id: string
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  digest_enabled: boolean
  digest_frequency: DigestFrequency
  digest_time: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences: Record<string, { email: boolean; sms: boolean; push: boolean }>
  phone_number: string | null
  phone_verified: boolean
  created_at: string
  updated_at: string
}

export interface PushSubscriptionRecord {
  id: string
  client_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
  user_agent: string | null
  device_type: string | null
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export interface PortalInvoiceSummary {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: string
  total_amount: number
  amount_paid: number
  balance_due: number
  case_number?: string
}

export interface PaymentHistoryItem {
  id: string
  invoice_id: string
  amount: number
  payment_method: string
  status: string
  payment_date: string
  stripe_payment_intent_id: string | null
  invoice_number?: string
  receipt_url?: string
}

export const NOTIFICATION_CATEGORY_ICONS: Record<NotificationCategory, string> = {
  message: 'MessageSquare',
  document: 'FileText',
  task: 'CheckSquare',
  appointment: 'Calendar',
  payment: 'CreditCard',
  case_update: 'Briefcase',
  deadline: 'Clock',
  system: 'Bell',
}

export const PAYMENT_STATUS_LABELS: Record<ClientPaymentStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700' },
  succeeded: { label: 'Paid', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  refunded: { label: 'Refunded', color: 'bg-purple-100 text-purple-700' },
  disputed: { label: 'Disputed', color: 'bg-orange-100 text-orange-700' },
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Record<string, { email: boolean; sms: boolean; push: boolean }> = {
  new_message: { email: true, sms: false, push: true },
  document_shared: { email: true, sms: false, push: true },
  document_request: { email: true, sms: false, push: true },
  task_assigned: { email: true, sms: false, push: true },
  task_due_soon: { email: true, sms: true, push: true },
  appointment_reminder: { email: true, sms: true, push: true },
  appointment_confirmed: { email: true, sms: false, push: true },
  payment_due: { email: true, sms: true, push: true },
  payment_received: { email: true, sms: false, push: true },
  payment_failed: { email: true, sms: true, push: true },
  case_update: { email: true, sms: false, push: true },
  deadline_approaching: { email: true, sms: true, push: true },
}

export const NOTIFICATION_TYPE_INFO: Record<string, { label: string; description: string }> = {
  new_message: { label: 'New Messages', description: 'When you receive a new message from your legal team' },
  document_shared: { label: 'Document Shared', description: 'When a document is shared with you' },
  document_request: { label: 'Document Request', description: 'When your legal team requests a document' },
  task_assigned: { label: 'Task Assigned', description: 'When a new task is assigned to you' },
  task_due_soon: { label: 'Task Due Soon', description: 'When a task deadline is approaching' },
  appointment_reminder: { label: 'Appointment Reminder', description: 'Before your scheduled appointments' },
  appointment_confirmed: { label: 'Appointment Confirmed', description: 'When an appointment is confirmed' },
  payment_due: { label: 'Payment Due', description: 'When a payment is coming due' },
  payment_received: { label: 'Payment Received', description: 'When a payment is processed successfully' },
  payment_failed: { label: 'Payment Failed', description: 'When a payment fails to process' },
  case_update: { label: 'Case Updates', description: 'When there are updates to your case' },
  deadline_approaching: { label: 'Deadlines', description: 'When important deadlines are approaching' },
}

// ============================================================
// Client Invitation Types
// ============================================================

export type ClientInviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface InviteClientRequest {
  caseId: string
  clientEmail: string
  clientName?: string
}

export interface InviteClientResponse {
  success: boolean
  message: string
  inviteStatus?: ClientInviteStatus
  error?: string
}

export interface InviteStatus {
  caseId: string
  clientEmail: string | null
  clientName: string | null
  status: ClientInviteStatus | null
  invitedAt: string | null
  clientId: string | null
}
