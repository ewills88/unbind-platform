// Collaboration System Types
// Session 14 Checkpoint 2: Internal Collaboration, Shared Resources & Paralegal Interface

// ============================================================
// Internal Case Notes
// ============================================================

export type InternalNoteType =
  | 'question'
  | 'concern'
  | 'fyi'
  | 'decision'
  | 'strategy'
  | 'reminder'

export interface InternalCaseNote {
  id: string
  case_id: string
  firm_id: string
  author_id: string
  content: string
  note_type: InternalNoteType
  mentioned_users: string[]
  parent_note_id: string | null
  resolved_at: string | null
  resolved_by: string | null
  pinned: boolean
  attachments: { name: string; path: string; type: string }[]
  created_at: string
  updated_at: string

  // Joined
  author?: {
    id: string
    full_name: string
    email: string
  }
  replies?: InternalCaseNote[]
}

export const NOTE_TYPE_CONFIG: Record<InternalNoteType, {
  label: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  question: { label: 'Question', icon: 'HelpCircle', color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-l-blue-500' },
  concern: { label: 'Concern', icon: 'AlertTriangle', color: 'text-orange-700', bgColor: 'bg-orange-100', borderColor: 'border-l-orange-500' },
  fyi: { label: 'FYI', icon: 'Info', color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-l-gray-400' },
  decision: { label: 'Decision', icon: 'CheckCircle', color: 'text-green-700', bgColor: 'bg-green-100', borderColor: 'border-l-green-500' },
  strategy: { label: 'Strategy', icon: 'Target', color: 'text-purple-700', bgColor: 'bg-purple-100', borderColor: 'border-l-purple-500' },
  reminder: { label: 'Reminder', icon: 'Clock', color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-l-red-500' },
}

export interface CreateNoteRequest {
  content: string
  note_type: InternalNoteType
  mentioned_users?: string[]
  parent_note_id?: string
}

export interface UpdateNoteRequest {
  content?: string
  pinned?: boolean
  resolved?: boolean
}

// ============================================================
// Delegated Tasks
// ============================================================

export type DelegatedTaskType =
  | 'review_document'
  | 'prepare_document'
  | 'research'
  | 'client_communication'
  | 'court_filing'
  | 'other'

export type DelegatedTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'approved'
  | 'rejected'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface DelegatedTask {
  id: string
  case_id: string
  firm_id: string
  task_type: DelegatedTaskType
  title: string
  description: string | null
  assigned_to: string
  assigned_by: string
  due_date: string | null
  priority: TaskPriority
  status: DelegatedTaskStatus
  completed_at: string | null
  completion_notes: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  related_document_id: string | null
  time_estimate_minutes: number | null
  actual_time_minutes: number | null
  created_at: string
  updated_at: string

  // Joined
  assignee?: { id: string; full_name: string; email: string }
  assigner?: { id: string; full_name: string; email: string }
  case_info?: { id: string; case_number: string; client_name: string }
}

export const DELEGATED_TASK_TYPE_INFO: Record<DelegatedTaskType, {
  label: string
  icon: string
}> = {
  review_document: { label: 'Review Document', icon: 'FileSearch' },
  prepare_document: { label: 'Prepare Document', icon: 'FileText' },
  research: { label: 'Legal Research', icon: 'Search' },
  client_communication: { label: 'Client Communication', icon: 'MessageCircle' },
  court_filing: { label: 'Court Filing', icon: 'Scale' },
  other: { label: 'Other', icon: 'MoreHorizontal' },
}

export const TASK_STATUS_INFO: Record<DelegatedTaskStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  pending: { label: 'Pending', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  completed: { label: 'Completed', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
}

export const TASK_PRIORITY_INFO: Record<TaskPriority, {
  label: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-l-gray-300' },
  medium: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-l-blue-500' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-l-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-l-red-500' },
}

export interface CreateDelegatedTaskRequest {
  case_id: string
  task_type: DelegatedTaskType
  title: string
  description?: string
  assigned_to: string
  due_date?: string
  priority?: TaskPriority
  time_estimate_minutes?: number
  related_document_id?: string
}

export interface CompleteTaskRequest {
  completion_notes?: string
  actual_time_minutes?: number
}

// ============================================================
// Firm Templates
// ============================================================

export type TemplateType =
  | 'petition'
  | 'response'
  | 'financial_disclosure'
  | 'declaration'
  | 'settlement'
  | 'motion'
  | 'order'

export interface FirmTemplate {
  id: string
  firm_id: string
  template_name: string
  template_type: TemplateType
  file_path: string | null
  content: string | null
  state_code: string | null
  created_by: string
  is_firm_wide: boolean
  is_default: boolean
  category: string | null
  usage_count: number
  last_used_at: string | null
  version: number
  description: string | null
  tags: string[]
  created_at: string
  updated_at: string

  // Joined
  creator?: { id: string; full_name: string }
}

export const TEMPLATE_TYPE_INFO: Record<TemplateType, {
  label: string
  icon: string
}> = {
  petition: { label: 'Petition', icon: 'FileText' },
  response: { label: 'Response', icon: 'FileOutput' },
  financial_disclosure: { label: 'Financial Disclosure', icon: 'DollarSign' },
  declaration: { label: 'Declaration', icon: 'FileEdit' },
  settlement: { label: 'Settlement', icon: 'Handshake' },
  motion: { label: 'Motion', icon: 'Scale' },
  order: { label: 'Order', icon: 'Stamp' },
}

export interface CreateTemplateRequest {
  template_name: string
  template_type: TemplateType
  content?: string
  state_code?: string
  is_firm_wide?: boolean
  is_default?: boolean
  category?: string
  description?: string
  tags?: string[]
}

// ============================================================
// Document Comments
// ============================================================

export type DocCommentType =
  | 'comment'
  | 'suggestion'
  | 'question'
  | 'approval_needed'

export interface DocumentComment {
  id: string
  document_id: string
  firm_id: string
  author_id: string
  content: string
  comment_type: DocCommentType
  position: { page?: number; x?: number; y?: number } | null
  resolved_at: string | null
  resolved_by: string | null
  parent_comment_id: string | null
  created_at: string

  // Joined
  author?: { id: string; full_name: string; email: string }
  replies?: DocumentComment[]
}

export const DOC_COMMENT_TYPE_INFO: Record<DocCommentType, {
  label: string
  color: string
  bgColor: string
}> = {
  comment: { label: 'Comment', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  suggestion: { label: 'Suggestion', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  question: { label: 'Question', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  approval_needed: { label: 'Needs Approval', color: 'text-orange-700', bgColor: 'bg-orange-100' },
}

// ============================================================
// Document Versions
// ============================================================

export interface DocumentVersionCollab {
  id: string
  document_id: string
  version_number: number
  file_path: string
  created_by: string
  change_summary: string | null
  created_at: string

  // Joined
  creator?: { id: string; full_name: string }
}

// ============================================================
// Coverage Assignments
// ============================================================

export type CoverageType = 'full_coverage' | 'urgent_only' | 'specific_cases'
export type CoverageStatus = 'active' | 'completed' | 'cancelled'

export interface CoverageAssignment {
  id: string
  firm_id: string
  primary_attorney_id: string
  coverage_attorney_id: string
  start_date: string
  end_date: string
  coverage_type: CoverageType
  case_ids: string[]
  notification_preferences: Record<string, unknown>
  notes: string | null
  status: CoverageStatus
  created_at: string

  // Joined
  primary_attorney?: { id: string; full_name: string }
  coverage_attorney?: { id: string; full_name: string }
}

export interface CreateCoverageRequest {
  coverage_attorney_id: string
  start_date: string
  end_date: string
  coverage_type: CoverageType
  case_ids?: string[]
  notes?: string
}

// ============================================================
// Helpers
// ============================================================

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  return Math.ceil((due.getTime() - now.getTime()) / 86400000)
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const now = new Date()
  return due.toDateString() === now.toDateString()
}
