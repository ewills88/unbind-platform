// Session 15: Webhooks, Exports & Automation Types

// Webhook delivery status
export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying'

// Webhook event types
export type WebhookEventType =
  | 'case.created'
  | 'case.status_changed'
  | 'case.closed'
  | 'document.uploaded'
  | 'invoice.created'
  | 'invoice.sent'
  | 'payment.received'
  | 'intake.submitted'
  | 'intake.approved'
  | 'task.completed'
  | 'deadline.approaching'

// QuickBooks export format
export type ExportFormat = 'csv' | 'iif' | 'qbo'

// Webhook
export interface Webhook {
  id: string
  firm_id: string
  name: string
  url: string
  secret_key: string
  events: string[]
  is_active: boolean
  headers: Record<string, string>
  retry_count: number
  created_by: string
  last_triggered_at: string | null
  failure_count: number
  disabled_at: string | null
  created_at: string
  updated_at: string
}

// Webhook delivery
export interface WebhookDelivery {
  id: string
  webhook_id: string
  event_type: string
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  duration_ms: number | null
  attempt_number: number
  status: WebhookDeliveryStatus
  error_message: string | null
  delivered_at: string | null
  created_at: string
  // Joined
  webhook?: Webhook
}

// Webhook payload envelope
export interface WebhookPayload {
  event: string
  timestamp: string
  firm_id: string
  data: Record<string, unknown>
}

// Accounting export record
export interface AccountingExport {
  id: string
  firm_id: string | null
  user_id: string
  export_type: ExportFormat
  date_range_start: string
  date_range_end: string
  include_invoices: boolean
  include_payments: boolean
  include_time_entries: boolean
  record_count: number
  file_name: string | null
  created_at: string
}

// Export request
export interface ExportRequest {
  format: ExportFormat
  startDate: string
  endDate: string
  includeInvoices: boolean
  includePayments: boolean
  includeTimeEntries: boolean
}

// Automation log
export interface AutomationLog {
  id: string
  automation_id: string
  firm_id: string | null
  trigger_event: string
  result: 'success' | 'error'
  error_message: string | null
  trigger_data: Record<string, unknown>
  triggered_at: string
}

// Available webhook events with metadata
export const WEBHOOK_EVENT_INFO: Record<WebhookEventType, {
  label: string
  description: string
}> = {
  'case.created': { label: 'Case Created', description: 'When a new case is created' },
  'case.status_changed': { label: 'Case Status Changed', description: 'When case moves to a new stage' },
  'case.closed': { label: 'Case Closed', description: 'When a case is closed' },
  'document.uploaded': { label: 'Document Uploaded', description: 'When a document is uploaded' },
  'invoice.created': { label: 'Invoice Created', description: 'When an invoice is generated' },
  'invoice.sent': { label: 'Invoice Sent', description: 'When an invoice is sent to client' },
  'payment.received': { label: 'Payment Received', description: 'When a payment is recorded' },
  'intake.submitted': { label: 'Intake Submitted', description: 'When new client submits intake' },
  'intake.approved': { label: 'Intake Approved', description: 'When intake is approved' },
  'task.completed': { label: 'Task Completed', description: 'When a task is marked complete' },
  'deadline.approaching': { label: 'Deadline Approaching', description: '7, 3, 1 days before deadline' },
}

// Export format options
export const EXPORT_FORMAT_INFO: Record<ExportFormat, {
  label: string
  description: string
  extension: string
}> = {
  csv: { label: 'CSV (Universal)', description: 'Compatible with Excel, Google Sheets, and most software', extension: 'csv' },
  iif: { label: 'QuickBooks Desktop (.iif)', description: 'Import directly into QuickBooks Desktop', extension: 'iif' },
  qbo: { label: 'QuickBooks Online (.qbo)', description: 'Web Connect format for QuickBooks Online', extension: 'qbo' },
}
