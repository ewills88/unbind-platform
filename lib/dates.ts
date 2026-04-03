// Session 7 Checkpoint 2: Date Utilities for Deadline Calculations

import {
  addDays,
  addMonths,
  format,
  formatDistanceToNow,
  isWeekend,
  isBefore,
  isAfter,
  startOfDay,
  differenceInDays,
  getYear,
  parseISO,
} from 'date-fns'

// Federal holidays (observed dates for common years)
// This is a simplified version - production would use a more comprehensive library
const FEDERAL_HOLIDAYS: Record<number, string[]> = {
  2025: [
    '2025-01-01', // New Year's Day
    '2025-01-20', // MLK Day
    '2025-02-17', // Presidents Day
    '2025-05-26', // Memorial Day
    '2025-06-19', // Juneteenth
    '2025-07-04', // Independence Day
    '2025-09-01', // Labor Day
    '2025-10-13', // Columbus Day
    '2025-11-11', // Veterans Day
    '2025-11-27', // Thanksgiving
    '2025-12-25', // Christmas
  ],
  2026: [
    '2026-01-01', // New Year's Day
    '2026-01-19', // MLK Day
    '2026-02-16', // Presidents Day
    '2026-05-25', // Memorial Day
    '2026-06-19', // Juneteenth
    '2026-07-03', // Independence Day (observed)
    '2026-09-07', // Labor Day
    '2026-10-12', // Columbus Day
    '2026-11-11', // Veterans Day
    '2026-11-26', // Thanksgiving
    '2026-12-25', // Christmas
  ],
  2027: [
    '2027-01-01', // New Year's Day
    '2027-01-18', // MLK Day
    '2027-02-15', // Presidents Day
    '2027-05-31', // Memorial Day
    '2027-06-18', // Juneteenth (observed)
    '2027-07-05', // Independence Day (observed)
    '2027-09-06', // Labor Day
    '2027-10-11', // Columbus Day
    '2027-11-11', // Veterans Day
    '2027-11-25', // Thanksgiving
    '2027-12-24', // Christmas (observed)
  ],
}

// State-specific court holidays (simplified)
const STATE_HOLIDAYS: Record<string, Record<number, string[]>> = {
  CA: {
    2025: ['2025-03-31'], // Cesar Chavez Day
    2026: ['2026-03-31'],
    2027: ['2027-03-31'],
  },
  TX: {
    2025: ['2025-01-19', '2025-03-02'], // Confederate Heroes Day, Texas Independence Day
    2026: ['2026-01-19', '2026-03-02'],
    2027: ['2027-01-19', '2027-03-02'],
  },
  MI: {
    2025: ['2025-12-24', '2025-12-31'], // Christmas Eve, New Year's Eve (MI court holidays)
    2026: ['2026-12-24', '2026-12-31'],
    2027: ['2027-12-24', '2027-12-31'],
  },
}

/**
 * Check if a date is a holiday (federal + state-specific)
 */
export function isHoliday(date: Date, stateCode?: string): boolean {
  const year = getYear(date)
  const dateStr = format(date, 'yyyy-MM-dd')

  // Check federal holidays
  const federalHolidays = FEDERAL_HOLIDAYS[year] || []
  if (federalHolidays.includes(dateStr)) {
    return true
  }

  // Check state-specific holidays
  if (stateCode) {
    const stateHolidays = STATE_HOLIDAYS[stateCode]?.[year] || []
    if (stateHolidays.includes(dateStr)) {
      return true
    }
  }

  return false
}

/**
 * Check if a date is a business day (not weekend, not holiday)
 */
export function isBusinessDay(date: Date, stateCode?: string): boolean {
  return !isWeekend(date) && !isHoliday(date, stateCode)
}

/**
 * Add business days to a date, skipping weekends and holidays
 */
export function addBusinessDays(
  startDate: Date,
  days: number,
  stateCode?: string
): Date {
  let result = startOfDay(startDate)
  let daysAdded = 0

  while (daysAdded < days) {
    result = addDays(result, 1)
    if (isBusinessDay(result, stateCode)) {
      daysAdded++
    }
  }

  return result
}

/**
 * Calculate a deadline date from a start date
 */
export function calculateDeadline(
  startDate: Date | string,
  days: number,
  isWorkingDays: boolean = false,
  stateCode?: string
): Date {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate

  if (isWorkingDays) {
    return addBusinessDays(start, days, stateCode)
  }

  return addDays(start, days)
}

/**
 * Calculate deadline for month-based intervals (e.g., 6-month waiting period)
 */
export function calculateMonthDeadline(
  startDate: Date | string,
  months: number
): Date {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  return addMonths(start, months)
}

/**
 * Check if an event is overdue
 */
export function isOverdue(eventDate: Date | string, status: string): boolean {
  if (status !== 'upcoming') return false

  const date = typeof eventDate === 'string' ? parseISO(eventDate) : eventDate
  return isBefore(startOfDay(date), startOfDay(new Date()))
}

/**
 * Get days until or since an event
 */
export function getDaysUntil(eventDate: Date | string): number {
  const date = typeof eventDate === 'string' ? parseISO(eventDate) : eventDate
  return differenceInDays(startOfDay(date), startOfDay(new Date()))
}

/**
 * Format event date for display
 */
export function formatEventDate(
  date: Date | string,
  allDay: boolean = false
): string {
  const d = typeof date === 'string' ? parseISO(date) : date

  if (allDay) {
    return format(d, 'EEE, MMM d, yyyy')
  }

  return format(d, "EEE, MMM d, yyyy 'at' h:mm a")
}

/**
 * Format date for short display (e.g., in lists)
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

/**
 * Get relative time description
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const days = getDaysUntil(d)

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'

  if (days > 0 && days <= 7) {
    return `in ${days} days`
  }

  if (days < 0 && days >= -7) {
    return `${Math.abs(days)} days ago`
  }

  return formatDistanceToNow(d, { addSuffix: true })
}

/**
 * Get urgency level for deadline
 */
export function getUrgencyLevel(
  eventDate: Date | string,
  status: string
): 'overdue' | 'urgent' | 'soon' | 'normal' {
  if (status !== 'upcoming') return 'normal'

  const days = getDaysUntil(eventDate)

  if (days < 0) return 'overdue'
  if (days <= 3) return 'urgent'
  if (days <= 14) return 'soon'
  return 'normal'
}

/**
 * Format date for API requests
 */
export function toISOString(date: Date): string {
  return date.toISOString()
}

/**
 * Parse date from various formats
 */
export function parseDate(date: Date | string): Date {
  if (typeof date === 'string') {
    return parseISO(date)
  }
  return date
}

/**
 * Check if date is in the future
 */
export function isFutureDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isAfter(startOfDay(d), startOfDay(new Date()))
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return differenceInDays(startOfDay(d), startOfDay(new Date())) === 0
}
