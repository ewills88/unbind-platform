import { ProcedureTask, DeadlineSummary } from '@/types/procedures'

/**
 * Categorizes procedure tasks by deadline urgency.
 * Pure function — takes tasks and current date, returns grouped results.
 */
export function categorizeDeadlines(
  tasks: ProcedureTask[],
  now: Date = new Date()
): DeadlineSummary {
  const today = stripTime(now)
  const oneDayOut = addDays(today, 1)
  const threeDaysOut = addDays(today, 3)
  const sevenDaysOut = addDays(today, 7)

  const incomplete = tasks.filter((t) => !t.completed_at && t.due_date)

  const overdue = incomplete.filter((t) => new Date(t.due_date!) < today)
  const urgent = incomplete.filter((t) => {
    const d = new Date(t.due_date!)
    return d >= today && d <= oneDayOut
  })
  const soon = incomplete.filter((t) => {
    const d = new Date(t.due_date!)
    return d > oneDayOut && d <= threeDaysOut
  })
  const upcoming = incomplete.filter((t) => {
    const d = new Date(t.due_date!)
    return d > threeDaysOut && d <= sevenDaysOut
  })

  return { urgent, soon, upcoming, overdue }
}

/**
 * Calculates overall progress for a set of procedure tasks.
 */
export function calculateProgress(tasks: ProcedureTask[]): {
  total: number
  completed: number
  percentage: number
  overdue: number
  nextDue: ProcedureTask | null
} {
  const total = tasks.length
  const completed = tasks.filter((t) => t.completed_at).length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  const now = new Date()
  const overdue = tasks.filter(
    (t) => !t.completed_at && t.due_date && new Date(t.due_date) < now
  ).length

  const incomplete = tasks
    .filter((t) => !t.completed_at && t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())

  return {
    total,
    completed,
    percentage,
    overdue,
    nextDue: incomplete[0] || null,
  }
}

/**
 * Returns relative date label for a deadline.
 */
export function getDeadlineLabel(dueDate: string, now: Date = new Date()): string {
  const due = new Date(dueDate)
  const today = stripTime(now)
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  if (diff <= 7) return `Due in ${diff} days`
  if (diff <= 30) return `Due in ${Math.ceil(diff / 7)} weeks`
  return `Due in ${Math.ceil(diff / 30)} months`
}

/**
 * Returns urgency color class for a deadline.
 */
export function getDeadlineColor(dueDate: string, now: Date = new Date()): string {
  const due = new Date(dueDate)
  const today = stripTime(now)
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return 'text-red-600 bg-red-50 border-red-200'
  if (diff <= 1) return 'text-orange-600 bg-orange-50 border-orange-200'
  if (diff <= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  if (diff <= 7) return 'text-blue-600 bg-blue-50 border-blue-200'
  return 'text-gray-600 bg-gray-50 border-gray-200'
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
