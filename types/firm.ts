// Firm System Types
// Session 14: Firm Hierarchy, Member Management & Case Assignment

export type FirmMemberRole =
  | 'owner'
  | 'senior_attorney'
  | 'attorney'
  | 'paralegal'
  | 'legal_assistant'
  | 'billing_specialist'

export type CaseAssignmentRole =
  | 'lead'
  | 'supporting'
  | 'paralegal'
  | 'supervisor'

export type FirmMemberStatus =
  | 'active'
  | 'invited'
  | 'suspended'
  | 'removed'

export type FirmPlan =
  | 'solo'
  | 'small'
  | 'professional'
  | 'enterprise'

export interface FirmPermissions {
  cases: {
    view: boolean
    create: boolean
    edit: boolean
    delete: boolean
    assign: boolean
  }
  clients: {
    view: boolean
    create: boolean
    edit: boolean
    communicate: boolean
  }
  financials: {
    view: boolean
    create: boolean
    edit: boolean
    approve: boolean
  }
  documents: {
    view: boolean
    create: boolean
    edit: boolean
    delete: boolean
  }
  team: {
    view: boolean
    invite: boolean
    manage: boolean
  }
  settings: {
    view: boolean
    edit: boolean
  }
}

export interface Firm {
  id: string
  name: string
  slug: string
  owner_id: string
  plan: FirmPlan
  stripe_customer_id?: string
  stripe_subscription_id?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  logo_path?: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface FirmMember {
  id: string
  firm_id: string
  user_id: string
  role: FirmMemberRole
  permissions: FirmPermissions
  status: FirmMemberStatus
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
  }
}

export interface CaseAssignment {
  id: string
  case_id: string
  user_id: string
  firm_id: string
  role: CaseAssignmentRole
  assigned_by?: string
  assigned_at: string
  created_at: string

  // Joined
  profile?: {
    id: string
    full_name: string
    email: string
  }
}

// Role display info
export const FIRM_MEMBER_ROLE_INFO: Record<FirmMemberRole, {
  label: string
  description: string
  color: string
  bgColor: string
}> = {
  owner: {
    label: 'Owner',
    description: 'Full firm access and management',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  senior_attorney: {
    label: 'Senior Attorney',
    description: 'Full case access with team oversight',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  attorney: {
    label: 'Attorney',
    description: 'Case management and client communication',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  paralegal: {
    label: 'Paralegal',
    description: 'Document preparation and case support',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  legal_assistant: {
    label: 'Legal Assistant',
    description: 'Administrative and scheduling support',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  billing_specialist: {
    label: 'Billing Specialist',
    description: 'Invoice and payment management',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
  },
}

export const CASE_ASSIGNMENT_ROLE_INFO: Record<CaseAssignmentRole, {
  label: string
  description: string
  color: string
  bgColor: string
}> = {
  lead: {
    label: 'Lead Attorney',
    description: 'Primary attorney responsible for the case',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  supporting: {
    label: 'Supporting Attorney',
    description: 'Assists lead attorney on the case',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  paralegal: {
    label: 'Paralegal',
    description: 'Handles document prep and case logistics',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  supervisor: {
    label: 'Supervisor',
    description: 'Oversight and quality review',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
}

// Default permissions per role
export const DEFAULT_PERMISSIONS: Record<FirmMemberRole, FirmPermissions> = {
  owner: {
    cases: { view: true, create: true, edit: true, delete: true, assign: true },
    clients: { view: true, create: true, edit: true, communicate: true },
    financials: { view: true, create: true, edit: true, approve: true },
    documents: { view: true, create: true, edit: true, delete: true },
    team: { view: true, invite: true, manage: true },
    settings: { view: true, edit: true },
  },
  senior_attorney: {
    cases: { view: true, create: true, edit: true, delete: false, assign: true },
    clients: { view: true, create: true, edit: true, communicate: true },
    financials: { view: true, create: true, edit: true, approve: false },
    documents: { view: true, create: true, edit: true, delete: true },
    team: { view: true, invite: true, manage: false },
    settings: { view: true, edit: false },
  },
  attorney: {
    cases: { view: true, create: true, edit: true, delete: false, assign: false },
    clients: { view: true, create: true, edit: true, communicate: true },
    financials: { view: true, create: true, edit: false, approve: false },
    documents: { view: true, create: true, edit: true, delete: false },
    team: { view: true, invite: false, manage: false },
    settings: { view: false, edit: false },
  },
  paralegal: {
    cases: { view: true, create: false, edit: true, delete: false, assign: false },
    clients: { view: true, create: false, edit: false, communicate: true },
    financials: { view: false, create: false, edit: false, approve: false },
    documents: { view: true, create: true, edit: true, delete: false },
    team: { view: true, invite: false, manage: false },
    settings: { view: false, edit: false },
  },
  legal_assistant: {
    cases: { view: true, create: false, edit: false, delete: false, assign: false },
    clients: { view: true, create: false, edit: false, communicate: true },
    financials: { view: false, create: false, edit: false, approve: false },
    documents: { view: true, create: true, edit: false, delete: false },
    team: { view: true, invite: false, manage: false },
    settings: { view: false, edit: false },
  },
  billing_specialist: {
    cases: { view: true, create: false, edit: false, delete: false, assign: false },
    clients: { view: true, create: false, edit: false, communicate: false },
    financials: { view: true, create: true, edit: true, approve: true },
    documents: { view: true, create: false, edit: false, delete: false },
    team: { view: true, invite: false, manage: false },
    settings: { view: false, edit: false },
  },
}

export const FIRM_PLAN_INFO: Record<FirmPlan, {
  label: string
  description: string
  maxMembers: number
  price: number
}> = {
  solo: {
    label: 'Solo',
    description: 'For solo practitioners',
    maxMembers: 1,
    price: 0,
  },
  small: {
    label: 'Small Firm',
    description: 'Up to 5 team members',
    maxMembers: 5,
    price: 99,
  },
  professional: {
    label: 'Professional',
    description: 'Up to 20 team members',
    maxMembers: 20,
    price: 249,
  },
  enterprise: {
    label: 'Enterprise',
    description: 'Unlimited team members',
    maxMembers: Infinity,
    price: 499,
  },
}

// API Request Types

export interface CreateFirmRequest {
  name: string
  address?: string
  phone?: string
  email?: string
  website?: string
  plan?: FirmPlan
}

export interface InviteMemberRequest {
  email: string
  role: FirmMemberRole
  permissions?: Partial<FirmPermissions>
}

export interface UpdateMemberRequest {
  role?: FirmMemberRole
  permissions?: Partial<FirmPermissions>
  status?: FirmMemberStatus
}

export interface AssignCaseRequest {
  assignments: {
    user_id: string
    role: CaseAssignmentRole
  }[]
}
