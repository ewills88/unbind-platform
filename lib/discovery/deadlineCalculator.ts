// Discovery Deadline Calculator
// Session 16: State-specific deadline calculation for discovery requests

import { addDays, isWeekend } from 'date-fns'
import { createClient } from '@supabase/supabase-js'
import type { ServiceMethod, DeadlineUrgency, DeadlineResult } from '@/types/discovery'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Calculate discovery response deadline based on state rules
 */
export async function calculateDiscoveryDeadline(params: {
  stateCode: string
  discoveryType: string
  servedDate: Date | string
  serviceMethod: ServiceMethod
}): Promise<DeadlineResult> {
  const { stateCode, discoveryType, serviceMethod } = params
  const servedDate = typeof params.servedDate === 'string'
    ? new Date(params.servedDate)
    : params.servedDate

  const supabase = getServiceClient()

  // Get state rules
  const { data: rule, error } = await supabase
    .from('state_discovery_rules')
    .select('*')
    .eq('state_code', stateCode)
    .eq('discovery_type', discoveryType)
    .single()

  if (error || !rule) {
    // Fall back to default 30-day rule if no state rule found
    const fallbackDueDate = adjustForNonBusinessDay(addDays(servedDate, 30))
    return {
      dueDate: fallbackDueDate.toISOString().split('T')[0],
      baseDays: 30,
      additionalDays: 0,
      totalDays: 30,
      statutoryReference: 'Default (no state rule found)',
      warnings: [`No specific rule found for ${stateCode} ${discoveryType}. Using default 30-day rule.`],
      isRFADeemedAdmitted: false,
    }
  }

  // Calculate base + additional days from service method
  const baseDays = rule.base_response_days
  let additionalDays = 0

  switch (serviceMethod) {
    case 'mail':
      additionalDays = rule.mail_additional_days || 0
      break
    case 'electronic':
    case 'email':
      additionalDays = rule.electronic_additional_days || 0
      break
    case 'personal':
      additionalDays = rule.personal_service_days || 0
      break
  }

  const totalDays = baseDays + additionalDays
  let dueDate = addDays(servedDate, totalDays)

  // Adjust for weekends (move to next Monday)
  dueDate = adjustForNonBusinessDay(dueDate)

  // Build warnings
  const warnings: string[] = []

  if (rule.deemed_admitted) {
    const formatted = dueDate.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    warnings.push(
      `CRITICAL: If no response by ${formatted}, requests will be DEEMED ADMITTED.`
    )
  }

  if (rule.max_interrogatories && discoveryType.includes('interrogatory')) {
    warnings.push(
      `${stateCode} limits to ${rule.max_interrogatories} interrogatories without court permission.`
    )
  }

  return {
    dueDate: dueDate.toISOString().split('T')[0],
    baseDays,
    additionalDays,
    totalDays,
    statutoryReference: rule.statutory_reference || '',
    warnings,
    isRFADeemedAdmitted: rule.deemed_admitted || false,
  }
}

/**
 * Calculate deadline without DB lookup (client-side / from known rule)
 */
export function calculateDeadlineFromRule(
  servedDate: Date | string,
  baseDays: number,
  additionalDays: number
): Date {
  const served = typeof servedDate === 'string' ? new Date(servedDate) : servedDate
  const raw = addDays(served, baseDays + additionalDays)
  return adjustForNonBusinessDay(raw)
}

/**
 * If date falls on weekend, move to next Monday
 */
function adjustForNonBusinessDay(date: Date): Date {
  let adjusted = new Date(date)
  while (isWeekend(adjusted)) {
    adjusted = addDays(adjusted, 1)
  }
  return adjusted
}

/**
 * Get days until deadline and urgency level
 */
export function getDaysUntilDeadline(dueDate: Date | string): {
  days: number
  urgency: DeadlineUrgency
} {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  const diffMs = due.getTime() - today.getTime()
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  let urgency: DeadlineUrgency
  if (days < 0) {
    urgency = 'overdue'
  } else if (days <= 3) {
    urgency = 'urgent'
  } else if (days <= 7) {
    urgency = 'warning'
  } else {
    urgency = 'normal'
  }

  return { days, urgency }
}
