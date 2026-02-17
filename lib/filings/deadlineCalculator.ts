// Session 18: Deadline Calculator for Court Filings
// Calculates deadlines based on filing type rules, service dates, and court holidays

import { addDays, addMonths, isWeekend, startOfDay, format, parseISO } from 'date-fns'
import type { AutoDeadlineRule, FilingDeadline } from '@/types/filings'

interface DeadlineInput {
  caseId: string
  filingId: string
  firmId?: string
  triggerDate: string | Date
  stateCode: string
  createdBy: string
}

interface CalculatedDeadline {
  deadline_name: string
  description: string
  deadline_date: string
  deadline_type: string
  priority: string
  source_type: string
  source_filing_id: string
  calculation_rule: string
  is_working_days: boolean
}

// Check if a date falls on a court holiday
// Uses the court_holidays table data passed in
function isCourtHoliday(
  date: Date,
  holidays: Set<string>
): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')
  return holidays.has(dateStr)
}

// Check if a date is a court business day
function isCourtBusinessDay(date: Date, holidays: Set<string>): boolean {
  return !isWeekend(date) && !isCourtHoliday(date, holidays)
}

// Add court business days (skipping weekends + court holidays)
function addCourtBusinessDays(
  startDate: Date,
  days: number,
  holidays: Set<string>
): Date {
  let result = startOfDay(startDate)
  let daysAdded = 0

  while (daysAdded < days) {
    result = addDays(result, 1)
    if (isCourtBusinessDay(result, holidays)) {
      daysAdded++
    }
  }

  return result
}

// Calculate a single deadline date
export function calculateDeadlineDate(
  triggerDate: Date | string,
  days: number,
  isWorkingDays: boolean,
  holidays: Set<string>
): Date {
  const start = typeof triggerDate === 'string' ? parseISO(triggerDate) : triggerDate

  if (isWorkingDays) {
    return addCourtBusinessDays(start, days, holidays)
  }

  // Calendar days, but if lands on weekend/holiday, push to next business day
  let result = addDays(startOfDay(start), days)
  while (!isCourtBusinessDay(result, holidays)) {
    result = addDays(result, 1)
  }

  return result
}

// Calculate month-based deadlines (e.g., 6-month waiting period)
export function calculateMonthDeadlineDate(
  triggerDate: Date | string,
  months: number,
  holidays: Set<string>
): Date {
  const start = typeof triggerDate === 'string' ? parseISO(triggerDate) : triggerDate
  let result = addMonths(startOfDay(start), months)

  // Push to next business day if needed
  while (!isCourtBusinessDay(result, holidays)) {
    result = addDays(result, 1)
  }

  return result
}

// Build a Set of holiday date strings from DB rows
export function buildHolidaySet(
  holidays: Array<{ holiday_date: string }>
): Set<string> {
  const set = new Set<string>()
  for (const h of holidays) {
    // holiday_date comes as "2025-03-31" or "2025-03-31T00:00:00"
    const dateStr = h.holiday_date.substring(0, 10)
    set.add(dateStr)
  }
  return set
}

// Generate auto-deadlines from a filing type's auto_deadlines rules
export function generateAutoDeadlines(
  rules: AutoDeadlineRule[],
  input: DeadlineInput,
  holidays: Set<string>
): CalculatedDeadline[] {
  const trigger = typeof input.triggerDate === 'string'
    ? parseISO(input.triggerDate)
    : input.triggerDate

  return rules.map(rule => {
    let deadlineDate: Date

    // Special handling for long periods (likely months)
    if (rule.days >= 60 && rule.days % 30 === 0 && !rule.is_working_days) {
      const months = Math.round(rule.days / 30)
      deadlineDate = calculateMonthDeadlineDate(trigger, months, holidays)
    } else {
      deadlineDate = calculateDeadlineDate(trigger, rule.days, rule.is_working_days, holidays)
    }

    // Determine priority based on urgency
    let priority = 'normal'
    if (rule.days <= 3) priority = 'critical'
    else if (rule.days <= 7) priority = 'high'
    else if (rule.days <= 14) priority = 'high'

    return {
      deadline_name: rule.name,
      description: rule.description,
      deadline_date: deadlineDate.toISOString(),
      deadline_type: rule.name.toLowerCase().includes('hearing') ? 'hearing'
        : rule.name.toLowerCase().includes('response') ? 'response'
        : rule.name.toLowerCase().includes('service') ? 'service'
        : 'filing',
      priority,
      source_type: 'auto_calculated',
      source_filing_id: input.filingId,
      calculation_rule: `${rule.days} ${rule.is_working_days ? 'working' : 'calendar'} days from trigger date`,
      is_working_days: rule.is_working_days,
    }
  })
}

// Calculate service response deadline based on service method and state rules
export function calculateServiceResponseDeadline(
  serviceDate: Date | string,
  responseDays: number,
  isWorkingDays: boolean,
  serviceMethod: string,
  holidays: Set<string>
): Date {
  const served = typeof serviceDate === 'string' ? parseISO(serviceDate) : serviceDate

  // Add extra days for mail service (typically +5 calendar days for CA, +3 for TX)
  let totalDays = responseDays
  if (serviceMethod === 'mail') {
    totalDays += 5 // Common mail service extension
  } else if (serviceMethod === 'electronic') {
    totalDays += 2 // Common e-service extension
  }

  return calculateDeadlineDate(served, totalDays, isWorkingDays, holidays)
}

// Build insert-ready deadline rows for Supabase
export function buildDeadlineInserts(
  calculated: CalculatedDeadline[],
  input: DeadlineInput
): Array<Record<string, unknown>> {
  return calculated.map(d => ({
    case_id: input.caseId,
    filing_id: input.filingId,
    firm_id: input.firmId || null,
    deadline_name: d.deadline_name,
    description: d.description,
    deadline_date: d.deadline_date,
    deadline_type: d.deadline_type,
    priority: d.priority,
    status: 'upcoming',
    source_type: d.source_type,
    source_filing_id: d.source_filing_id,
    calculation_rule: d.calculation_rule,
    is_working_days: d.is_working_days,
    reminder_days: [7, 3, 1],
    created_by: input.createdBy,
  }))
}

// Get upcoming deadlines summary for a case
export function categorizeDeadlines(
  deadlines: FilingDeadline[]
): { overdue: FilingDeadline[]; thisWeek: FilingDeadline[]; upcoming: FilingDeadline[] } {
  const now = new Date()
  const weekFromNow = addDays(now, 7)

  const overdue: FilingDeadline[] = []
  const thisWeek: FilingDeadline[] = []
  const upcoming: FilingDeadline[] = []

  for (const d of deadlines) {
    if (d.status === 'completed' || d.status === 'waived') continue

    const deadlineDate = parseISO(d.deadline_date)
    if (deadlineDate < now) {
      overdue.push(d)
    } else if (deadlineDate <= weekFromNow) {
      thisWeek.push(d)
    } else {
      upcoming.push(d)
    }
  }

  return { overdue, thisWeek, upcoming }
}
