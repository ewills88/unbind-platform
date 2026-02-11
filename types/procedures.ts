// Types for Procedure Automation & Checklists

export type ProcedureType = 'filing' | 'service' | 'discovery' | 'settlement' | 'trial' | 'judgment'
export type ProcedureStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped'

export interface CaseProcedure {
  id: string
  case_id: string
  state_code: string
  procedure_type: ProcedureType
  status: ProcedureStatus
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface ProcedureTask {
  id: string
  case_id: string
  procedure_id: string | null
  state_code: string
  task_order: number
  task_name: string
  task_description: string | null
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  completion_notes: string | null
  required_documents: string[]
  estimated_duration_days: number
  dependencies: string[]
  state_statute_reference: string | null
  is_urgent: boolean
  created_at: string
  updated_at: string
}

export interface KeyDates {
  filing_date: string
  service_deadline: string
  response_deadline: string
  earliest_judgment: string
  estimated_final_judgment: string
  [key: string]: string | undefined
}

export interface ProcedureTemplate {
  name: string
  description: string
  required_documents: string[]
  estimated_days: number
  default_assignee: 'attorney' | 'paralegal' | 'client'
  statute: string | null
  dependencies: string[]
  procedure_type: ProcedureType
}

export interface GeneratedChecklist {
  tasks: ProcedureTask[]
  key_dates: KeyDates
  estimated_completion_date: string
}

export interface DeadlineSummary {
  urgent: ProcedureTask[]   // due within 1 day
  soon: ProcedureTask[]     // due within 3 days
  upcoming: ProcedureTask[] // due within 7 days
  overdue: ProcedureTask[]  // past due
}

export const PROCEDURE_TYPE_INFO: Record<ProcedureType, { label: string; color: string }> = {
  filing: { label: 'Filing', color: 'bg-blue-100 text-blue-700' },
  service: { label: 'Service', color: 'bg-green-100 text-green-700' },
  discovery: { label: 'Discovery', color: 'bg-yellow-100 text-yellow-700' },
  settlement: { label: 'Settlement', color: 'bg-purple-100 text-purple-700' },
  trial: { label: 'Trial', color: 'bg-red-100 text-red-700' },
  judgment: { label: 'Judgment', color: 'bg-indigo-100 text-indigo-700' },
}

export const PROCEDURE_STATUS_INFO: Record<ProcedureStatus, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  skipped: { label: 'Skipped', color: 'bg-gray-100 text-gray-500' },
}
