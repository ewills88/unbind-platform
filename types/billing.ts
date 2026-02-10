// Billing System Types
// Session 11: Billing, Invoicing & Payment Management

// Activity types for time entries
export type ActivityType =
  | 'client_communication'
  | 'document_review'
  | 'document_drafting'
  | 'court_appearance'
  | 'research'
  | 'travel'
  | 'administrative'
  | 'other'

// Expense types
export type ExpenseType =
  | 'court_filing'
  | 'service_of_process'
  | 'expert_witness'
  | 'copies'
  | 'travel'
  | 'postage'
  | 'other'

// Invoice status
export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'void'

// Invoice line item types
export type InvoiceItemType =
  | 'time_entry'
  | 'expense'
  | 'adjustment'
  | 'retainer_credit'
  | 'flat_fee'

// Time Entry
export interface TimeEntry {
  id: string
  case_id: string
  attorney_id: string

  entry_date: string
  start_time?: string
  end_time?: string

  duration_minutes: number
  activity_type: ActivityType
  description: string

  billable: boolean
  hourly_rate: number
  amount: number

  billed_at?: string
  invoice_id?: string

  timer_running: boolean
  timer_started_at?: string

  created_by: string
  created_at: string
  updated_at: string

  // Joined
  attorney?: {
    id: string
    full_name: string
  }
  case?: {
    id: string
    case_number: string
    client_name: string
  }
}

// Expense
export interface Expense {
  id: string
  case_id: string

  expense_date: string
  expense_type: ExpenseType
  description: string
  vendor?: string

  amount: number
  receipt_path?: string

  billable: boolean
  markup_percentage: number
  billed_amount: number

  billed_at?: string
  invoice_id?: string

  created_by: string
  created_at: string
  updated_at: string

  // Joined
  case?: {
    id: string
    case_number: string
    client_name: string
  }
}

// Invoice
export interface Invoice {
  id: string
  case_id: string

  invoice_number: string
  issue_date: string
  due_date: string

  status: InvoiceStatus

  subtotal_services: number
  subtotal_expenses: number
  subtotal: number

  tax_rate: number
  tax_amount: number

  retainer_applied: number

  total_amount: number
  amount_paid: number
  balance_due: number

  notes?: string
  payment_instructions?: string

  sent_at?: string
  viewed_at?: string
  paid_at?: string

  pdf_path?: string

  created_by: string
  created_at: string
  updated_at: string

  // Joined
  case?: {
    id: string
    case_number: string
    client_name: string
    client_id: string
  }
  line_items?: InvoiceLineItem[]
}

// Invoice Line Item
export interface InvoiceLineItem {
  id: string
  invoice_id: string

  item_type: InvoiceItemType
  line_date?: string
  description: string

  quantity: number
  rate: number
  amount: number

  reference_id?: string
  sort_order: number

  created_at: string
}

// Attorney Billing Settings
export interface AttorneyBillingSettings {
  id: string
  attorney_id: string

  default_hourly_rate: number
  paralegal_rate: number

  minimum_increment_minutes: number
  round_up_time: boolean

  default_payment_terms_days: number
  default_tax_rate: number

  invoice_prefix: string
  next_invoice_number: number

  firm_name?: string
  firm_address?: string
  firm_phone?: string
  firm_email?: string
  bar_number?: string
  logo_path?: string

  created_at: string
  updated_at: string
}

// Active Timer
export interface ActiveTimer {
  id: string
  user_id: string
  case_id: string

  started_at: string
  paused_at?: string
  accumulated_seconds: number

  activity_type: ActivityType
  description?: string

  created_at: string
  updated_at: string

  // Joined
  case?: {
    id: string
    case_number: string
    client_name: string
  }
}

// Activity type display info
export const ACTIVITY_TYPE_INFO: Record<ActivityType, {
  label: string
  icon: string
  description: string
}> = {
  client_communication: {
    label: 'Client Communication',
    icon: 'MessageSquare',
    description: 'Phone calls, emails, meetings with client'
  },
  document_review: {
    label: 'Document Review',
    icon: 'FileSearch',
    description: 'Reviewing documents, contracts, evidence'
  },
  document_drafting: {
    label: 'Document Drafting',
    icon: 'FileEdit',
    description: 'Creating legal documents, pleadings, motions'
  },
  court_appearance: {
    label: 'Court Appearance',
    icon: 'Gavel',
    description: 'Attending hearings, trials, conferences'
  },
  research: {
    label: 'Legal Research',
    icon: 'Search',
    description: 'Case law research, statute review'
  },
  travel: {
    label: 'Travel',
    icon: 'Car',
    description: 'Travel time to court, depositions, etc.'
  },
  administrative: {
    label: 'Administrative',
    icon: 'Folder',
    description: 'Filing, organizing, non-billable tasks'
  },
  other: {
    label: 'Other',
    icon: 'MoreHorizontal',
    description: 'Other work activities'
  }
}

// Expense type display info
export const EXPENSE_TYPE_INFO: Record<ExpenseType, {
  label: string
  icon: string
}> = {
  court_filing: {
    label: 'Court Filing Fee',
    icon: 'FileText'
  },
  service_of_process: {
    label: 'Service of Process',
    icon: 'Send'
  },
  expert_witness: {
    label: 'Expert Witness',
    icon: 'UserCheck'
  },
  copies: {
    label: 'Copies/Printing',
    icon: 'Copy'
  },
  travel: {
    label: 'Travel/Mileage',
    icon: 'Car'
  },
  postage: {
    label: 'Postage/Shipping',
    icon: 'Mail'
  },
  other: {
    label: 'Other Expense',
    icon: 'Receipt'
  }
}

// Invoice status display info
export const INVOICE_STATUS_INFO: Record<InvoiceStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  sent: {
    label: 'Sent',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  viewed: {
    label: 'Viewed',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  paid: {
    label: 'Paid',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  partially_paid: {
    label: 'Partially Paid',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  overdue: {
    label: 'Overdue',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  void: {
    label: 'Void',
    color: 'text-gray-400',
    bgColor: 'bg-gray-50'
  }
}

// API Request Types

export interface CreateTimeEntryRequest {
  case_id: string
  entry_date?: string
  duration_minutes: number
  activity_type: ActivityType
  description: string
  billable?: boolean
  hourly_rate?: number
}

export interface CreateExpenseRequest {
  case_id: string
  expense_date?: string
  expense_type: ExpenseType
  description: string
  amount: number
  receipt_path?: string
  billable?: boolean
  markup_percentage?: number
}

export interface GenerateInvoiceRequest {
  case_id: string
  time_entry_ids?: string[] // Specific entries to include, or all unbilled if not provided
  expense_ids?: string[]
  due_date?: string
  notes?: string
  tax_rate?: number
  include_all_unbilled?: boolean
}

export interface UpdateInvoiceStatusRequest {
  status: InvoiceStatus
}

// Helper functions

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) {
    return `${mins}m`
  }

  if (mins === 0) {
    return `${hours}h`
  }

  return `${hours}h ${mins}m`
}

export function formatDurationDecimal(minutes: number): string {
  const hours = minutes / 60
  return hours.toFixed(2)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function calculateAmount(durationMinutes: number, hourlyRate: number): number {
  return (durationMinutes / 60) * hourlyRate
}

export function roundToIncrement(minutes: number, increment: number, roundUp: boolean = true): number {
  if (roundUp) {
    return Math.ceil(minutes / increment) * increment
  }
  return Math.round(minutes / increment) * increment
}

export function getInvoiceDueDate(issueDate: string, termsDays: number): string {
  const date = new Date(issueDate)
  date.setDate(date.getDate() + termsDays)
  return date.toISOString().split('T')[0]
}

export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'paid' || invoice.status === 'void') {
    return false
  }
  return new Date(invoice.due_date) < new Date()
}

// Summary types for dashboards

export interface BillingSummary {
  unbilled_time_entries: number
  unbilled_time_amount: number
  unbilled_expenses: number
  unbilled_expenses_amount: number

  draft_invoices: number
  draft_invoices_amount: number

  outstanding_invoices: number
  outstanding_amount: number

  overdue_invoices: number
  overdue_amount: number

  paid_this_month: number
  paid_this_month_amount: number
}

export interface CaseBillingSummary {
  case_id: string
  case_number: string
  client_name: string

  total_time_entries: number
  total_time_minutes: number
  total_time_amount: number

  unbilled_time_minutes: number
  unbilled_time_amount: number

  total_expenses: number
  total_expenses_amount: number
  unbilled_expenses_amount: number

  total_invoiced: number
  total_paid: number
  balance_due: number
}

export interface TimeEntrySuggestion {
  type: 'message' | 'document' | 'call'
  description: string
  suggested_minutes: number
  activity_type: ActivityType
  timestamp: string
  reference_id?: string
}
