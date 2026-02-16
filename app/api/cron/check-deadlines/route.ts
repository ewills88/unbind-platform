import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyDeadlineApproaching, notifyTaskOverdue } from '@/lib/notifications/triggers'

// Service role client for cron operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Check for approaching deadlines and overdue tasks (cron job endpoint)
export async function POST(request: NextRequest) {
  try {
    // Auth check for cron endpoints
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let deadlineNotifications = 0
    let overdueNotifications = 0

    // 1. Check for approaching deadlines (1, 3, 7 days out)
    const now = new Date()
    const dayBuckets = [1, 3, 7]

    for (const daysAhead of dayBuckets) {
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + daysAhead)
      const targetDateStr = targetDate.toISOString().split('T')[0]

      const { data: events } = await supabase
        .from('case_events')
        .select('id, case_id, title, event_date')
        .eq('status', 'upcoming')
        .gte('event_date', `${targetDateStr}T00:00:00`)
        .lt('event_date', `${targetDateStr}T23:59:59`)

      if (events && events.length > 0) {
        for (const event of events) {
          // Get case team members
          const { data: caseData } = await supabase
            .from('cases')
            .select('attorney_id, client_id')
            .eq('id', event.case_id)
            .single()

          if (caseData) {
            const recipients = [caseData.attorney_id, caseData.client_id].filter(Boolean)
            await notifyDeadlineApproaching(
              event.case_id,
              event.title,
              event.event_date,
              recipients,
              daysAhead
            )
            deadlineNotifications += recipients.length
          }
        }
      }
    }

    // 2. Check for overdue tasks (client_tasks with past due dates, not completed)
    const { data: overdueTasks } = await supabase
      .from('client_tasks')
      .select('id, case_id, title, due_date, assigned_to')
      .eq('status', 'pending')
      .lt('due_date', now.toISOString().split('T')[0])

    if (overdueTasks && overdueTasks.length > 0) {
      for (const task of overdueTasks) {
        if (task.assigned_to && task.due_date) {
          await notifyTaskOverdue(
            task.case_id,
            task.title,
            task.assigned_to,
            task.due_date
          )
          overdueNotifications++
        }
      }
    }

    return NextResponse.json({
      message: 'Deadline check complete',
      deadlineNotifications,
      overdueNotifications,
    })
  } catch (error) {
    console.error('Deadline check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
