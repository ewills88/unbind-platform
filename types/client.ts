// Session 13 Checkpoint 1: Client Portal Types


// ============================================================
// Enums / Union Types
// ============================================================

export type CaseStage =
  | 'getting_started'
  | 'filed'
  | 'discovery'
  | 'negotiation'
  | 'final'
  | 'complete'

export type TaskType =
  | 'upload_document'
  | 'review_form'
  | 'complete_questionnaire'
  | 'attend_appointment'
  | 'make_payment'
  | 'review_settlement'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'approved'

export type NotificationType =
  | 'task_assigned'
  | 'message_received'
  | 'document_request'
  | 'payment_due'
  | 'appointment_reminder'
  | 'milestone_reached'

export type NotificationPriority = 'low' | 'normal' | 'high'

// ============================================================
// Database Row Types
// ============================================================

export interface ClientProgress {
  id: string
  case_id: string
  current_stage: CaseStage
  stage_started_at: string
  overall_completion_percentage: number
  milestones_completed: string[] // jsonb array of milestone IDs
  estimated_completion_date: string | null
  created_at: string
  updated_at: string
}

export interface ClientTask {
  id: string
  case_id: string
  task_type: TaskType
  title: string
  description: string | null
  instructions: string | null
  due_date: string | null
  priority: TaskPriority
  estimated_minutes: number | null
  status: TaskStatus
  completed_by_client_at: string | null
  approved_by_attorney_at: string | null
  related_document_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ClientNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  link: string | null
  priority: NotificationPriority
  read_at: string | null
  created_at: string
}

// ============================================================
// Stage Definition (UI metadata)
// ============================================================

export interface StageDefinition {
  key: CaseStage
  name: string
  description: string
  typical_duration_days: number
  milestones: string[]
}

export const STAGE_DEFINITIONS: Record<CaseStage, StageDefinition> = {
  getting_started: {
    key: 'getting_started',
    name: 'Getting Started',
    description: 'Initial consultation, document gathering, and case setup.',
    typical_duration_days: 14,
    milestones: [
      'Initial consultation completed',
      'Retainer agreement signed',
      'Financial documents gathered',
      'Case questionnaire completed',
    ],
  },
  filed: {
    key: 'filed',
    name: 'Filed',
    description: 'Divorce petition has been filed with the court.',
    typical_duration_days: 30,
    milestones: [
      'Petition drafted and reviewed',
      'Petition filed with court',
      'Spouse served',
      'Response period started',
    ],
  },
  discovery: {
    key: 'discovery',
    name: 'Discovery',
    description: 'Both parties exchange financial and other information.',
    typical_duration_days: 60,
    milestones: [
      'Financial disclosures exchanged',
      'Asset valuations completed',
      'Depositions scheduled',
      'Discovery responses filed',
    ],
  },
  negotiation: {
    key: 'negotiation',
    name: 'Negotiation',
    description: 'Working toward a settlement agreement on key issues.',
    typical_duration_days: 45,
    milestones: [
      'Settlement proposals exchanged',
      'Mediation scheduled',
      'Custody arrangement discussed',
      'Property division agreed',
    ],
  },
  final: {
    key: 'final',
    name: 'Finalization',
    description: 'Final agreements and court approval process.',
    typical_duration_days: 30,
    milestones: [
      'Settlement agreement finalized',
      'Court hearing scheduled',
      'Final documents prepared',
      'Judgment entered',
    ],
  },
  complete: {
    key: 'complete',
    name: 'Complete',
    description: 'Your divorce is finalized. Post-decree tasks may remain.',
    typical_duration_days: 0,
    milestones: [
      'Decree of divorce received',
      'Name change processed (if applicable)',
      'Asset transfers completed',
      'Case file archived',
    ],
  },
}

export const STAGE_ORDER: CaseStage[] = [
  'getting_started',
  'filed',
  'discovery',
  'negotiation',
  'final',
  'complete',
]

// ============================================================
// Dashboard API Response Types
// ============================================================

export interface ClientDashboardData {
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
  } | null
  progress: ClientProgress | null
  pending_tasks: ClientTask[]
  unread_messages: number
  document_count: number
  next_appointment: {
    id: string
    title: string
    start_time: string
  } | null
  outstanding_invoice_amount: number
}
