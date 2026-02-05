// Session 9 Checkpoint 3: Attorney Review Workflow Types

// Review status
export type IntakeReviewStatus = 'pending' | 'under_review' | 'info_requested' | 'approved' | 'rejected'

// Extended intake with review fields
export interface IntakeWithReview {
  id: string
  user_id: string
  invited_by?: string
  case_id?: string

  status: string
  review_status: IntakeReviewStatus
  assigned_to?: string

  current_step: number
  completed_steps: number[]
  progress_percentage: number

  intake_data: Record<string, unknown>
  validation_errors: Record<string, string[]>

  // Review workflow
  review_started_at?: string
  info_requested_at?: string
  info_request_message?: string
  info_request_fields?: string[]
  approved_at?: string
  approved_by?: string

  // Timestamps
  submitted_at?: string
  created_at: string
  updated_at: string

  // Joined data
  user?: {
    email: string
    user_metadata?: {
      full_name?: string
    }
  }
  ai_analysis?: IntakeAnalysisSummary
  document_stats?: {
    total: number
    uploaded: number
    verified: number
    rejected: number
  }
}

// AI analysis summary for queue display
export interface IntakeAnalysisSummary {
  complexity_score: number
  flags: Array<{
    type: string
    severity: string
    description: string
  }>
  recommendations: string[]
}

// Conflict check types
export interface ConflictCheck {
  id: string
  intake_id: string
  checked_at: string
  checked_by: string
  potential_conflicts: PotentialConflict[]
  has_conflicts: boolean
  conflict_cleared: boolean
  conflict_waiver_notes?: string
  cleared_at?: string
  cleared_by?: string
}

export interface PotentialConflict {
  type: 'name_match' | 'email_match' | 'phone_match' | 'address_match'
  field: string
  matched_value: string
  matched_case_id: string
  matched_case_number: string
  matched_party: 'client' | 'spouse' | 'opposing'
  similarity_score: number
  description: string
}

// Info request
export interface InfoRequest {
  message: string
  requested_fields: string[]
  requested_documents: string[]
}

// Case preview before approval
export interface CasePreview {
  case_number: string
  client_name: string
  spouse_name: string
  case_type: string
  state_code: string
  estimated_timeline: TimelineEvent[]
  financial_overview: {
    estimated_assets: number
    estimated_debts: number
    income_difference: number
  }
  initial_tasks: CaseSetupTask[]
  complexity: 'simple' | 'standard' | 'complex'
}

export interface TimelineEvent {
  title: string
  description?: string
  estimated_date: string
  is_milestone: boolean
  category: string
}

export interface CaseSetupTask {
  id: string
  task_name: string
  task_description?: string
  category: string
  days_from_case_open: number
  is_milestone: boolean
}

// Approval request
export interface ApproveIntakeRequest {
  case_name?: string
  case_type?: string
  primary_attorney_id?: string
  billing_rate?: number
  notes?: string
  conflict_cleared?: boolean
  conflict_waiver_notes?: string
}

// Engagement letter
export interface EngagementLetter {
  id: string
  case_id: string
  content: string
  fee_structure?: {
    retainer: number
    hourly_rate: number
    payment_terms: string
  }
  scope_of_work?: string
  status: 'draft' | 'sent' | 'viewed' | 'signed'
  sent_at?: string
  viewed_at?: string
  signed_at?: string
  signature_data?: Record<string, unknown>
  pdf_path?: string
  created_at: string
  updated_at: string
}

// Client onboarding
export interface ClientOnboarding {
  id: string
  user_id: string
  case_id?: string
  tour_completed: boolean
  tour_completed_at?: string
  tour_skipped: boolean
  steps_completed: string[]
  welcome_video_watched: boolean
  created_at: string
  updated_at: string
}

// Onboarding steps
export const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome', description: 'Introduction to your case portal' },
  { id: 'messages', title: 'Messaging', description: 'How to communicate with your attorney' },
  { id: 'documents', title: 'Documents', description: 'Upload and manage case documents' },
  { id: 'timeline', title: 'Timeline', description: 'Track your case progress' },
  { id: 'finances', title: 'Finances', description: 'View financial information' },
  { id: 'tasks', title: 'Tasks', description: 'Complete assigned tasks' },
] as const

// Queue filters
export type IntakeQueueFilter = 'all' | 'new' | 'under_review' | 'flagged' | 'info_requested'
export type IntakeQueueSort = 'newest' | 'oldest' | 'most_complex' | 'least_complex'

// Queue stats
export interface IntakeQueueStats {
  pending_review: number
  under_review: number
  info_requested: number
  approved_today: number
  average_review_time_hours: number
}

// Complexity badge config
export const COMPLEXITY_CONFIG = {
  simple: { label: 'Simple', color: 'bg-green-100 text-green-700', threshold: 3 },
  standard: { label: 'Standard', color: 'bg-yellow-100 text-yellow-700', threshold: 6 },
  complex: { label: 'Complex', color: 'bg-red-100 text-red-700', threshold: 10 },
} as const

export function getComplexityLevel(score: number): 'simple' | 'standard' | 'complex' {
  if (score <= COMPLEXITY_CONFIG.simple.threshold) return 'simple'
  if (score <= COMPLEXITY_CONFIG.standard.threshold) return 'standard'
  return 'complex'
}
