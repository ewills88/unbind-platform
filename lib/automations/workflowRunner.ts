// Automated Workflow Runner
// Session 15: Built-in workflows triggered by platform events

import { createClient } from '@supabase/supabase-js'
import { queueEmail, renderTemplate } from '@/lib/email/emailService'
import type { NotificationTriggerType } from '@/types/notifications'
import { triggerWebhooks } from '@/lib/webhooks/webhookService'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface WorkflowAction {
  type: 'send_email' | 'create_task' | 'notify_team' | 'send_webhook'
  config: Record<string, string | number | boolean>
}

interface Workflow {
  id: string
  trigger: string
  conditions?: Record<string, unknown>
  actions: WorkflowAction[]
}

// Built-in workflows (always active)
const BUILT_IN_WORKFLOWS: Workflow[] = [
  {
    id: 'deadline-7-days',
    trigger: 'deadline.approaching',
    conditions: { days_until: 7 },
    actions: [
      { type: 'send_email', config: { template: 'deadline_reminder' } },
    ],
  },
  {
    id: 'deadline-3-days',
    trigger: 'deadline.approaching',
    conditions: { days_until: 3 },
    actions: [
      { type: 'send_email', config: { template: 'deadline_reminder' } },
    ],
  },
  {
    id: 'deadline-1-day',
    trigger: 'deadline.approaching',
    conditions: { days_until: 1 },
    actions: [
      { type: 'send_email', config: { template: 'deadline_reminder' } },
      { type: 'notify_team', config: { message: 'Deadline tomorrow: {{event_title}}' } },
    ],
  },
  {
    id: 'invoice-overdue-7-days',
    trigger: 'invoice.overdue',
    conditions: { days_overdue: 7 },
    actions: [
      { type: 'send_email', config: { template: 'task_overdue' } },
    ],
  },
  {
    id: 'invoice-overdue-30-days',
    trigger: 'invoice.overdue',
    conditions: { days_overdue: 30 },
    actions: [
      { type: 'notify_team', config: { message: 'Invoice #{{invoice_number}} is 30 days overdue ({{amount_due}})' } },
    ],
  },
  {
    id: 'payment-received-thank-you',
    trigger: 'payment.received',
    actions: [
      { type: 'send_email', config: { template: 'payment_received' } },
    ],
  },
]

function matchesConditions(conditions: Record<string, unknown>, data: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    if (data[key] !== value) return false
  }
  return true
}

async function executeAction(
  action: WorkflowAction,
  firmId: string,
  data: Record<string, unknown>
) {
  const supabase = getServiceClient()

  switch (action.type) {
    case 'send_email': {
      const recipientId = (data.recipient_id || data.client_id) as string | undefined
      if (recipientId) {
        const variables: Record<string, string> = {}
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === 'string' || typeof v === 'number') {
            variables[k] = String(v)
          }
        }
        await queueEmail(
          recipientId,
          action.config.template as NotificationTriggerType,
          variables,
          data.case_id as string | undefined
        )
      }
      break
    }
    case 'notify_team': {
      const message = renderTemplate(
        String(action.config.message || ''),
        Object.fromEntries(
          Object.entries(data)
            .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
            .map(([k, v]) => [k, String(v)])
        )
      )
      const caseId = data.case_id as string | undefined

      // Get case team
      const teamUserIds: string[] = []
      if (caseId) {
        const { data: caseData } = await supabase
          .from('cases')
          .select('attorney_id, client_id')
          .eq('id', caseId)
          .single()

        if (caseData) {
          if (caseData.attorney_id) teamUserIds.push(caseData.attorney_id)
          if (caseData.client_id) teamUserIds.push(caseData.client_id)
        }

        const { data: assignments } = await supabase
          .from('case_assignments')
          .select('user_id')
          .eq('case_id', caseId)

        if (assignments) {
          for (const a of assignments) {
            if (!teamUserIds.includes(a.user_id)) teamUserIds.push(a.user_id)
          }
        }
      }

      for (const userId of teamUserIds) {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Automation Alert',
          message,
          notification_type: 'system',
          case_id: caseId || null,
          action_url: caseId ? `/dashboard/cases/${caseId}` : null,
        })
      }
      break
    }
    case 'send_webhook': {
      await triggerWebhooks(firmId, (data.trigger as string) || 'automation', data)
      break
    }
  }
}

/**
 * Run all matching workflows for a trigger event.
 */
export async function runWorkflows(
  trigger: string,
  firmId: string,
  data: Record<string, unknown>
) {
  const supabase = getServiceClient()

  // Match built-in workflows
  const matchingWorkflows = BUILT_IN_WORKFLOWS.filter(w => w.trigger === trigger)

  for (const workflow of matchingWorkflows) {
    if (workflow.conditions && !matchesConditions(workflow.conditions, data)) {
      continue
    }

    for (const action of workflow.actions) {
      try {
        await executeAction(action, firmId, data)

        await supabase.from('automation_logs').insert({
          automation_id: workflow.id,
          firm_id: firmId,
          trigger_event: trigger,
          result: 'success',
          trigger_data: data,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Workflow action failed (${workflow.id}):`, message)

        await supabase.from('automation_logs').insert({
          automation_id: workflow.id,
          firm_id: firmId,
          trigger_event: trigger,
          result: 'error',
          error_message: message,
          trigger_data: data,
        })
      }
    }
  }
}

/**
 * Check for upcoming deadlines and run matching workflows.
 */
export async function checkUpcomingDeadlines(): Promise<{ triggered: number }> {
  const supabase = getServiceClient()
  let triggered = 0

  const checkDays = [7, 3, 1]

  for (const days of checkDays) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + days)
    const targetDateStr = targetDate.toISOString().split('T')[0]

    const { data: events } = await supabase
      .from('case_events')
      .select('id, case_id, title, event_date')
      .eq('status', 'upcoming')
      .gte('event_date', `${targetDateStr}T00:00:00`)
      .lt('event_date', `${targetDateStr}T23:59:59`)

    if (!events) continue

    for (const event of events) {
      const { data: caseData } = await supabase
        .from('cases')
        .select('attorney_id, client_id, case_number, client_name')
        .eq('id', event.case_id)
        .single()

      if (!caseData) continue

      // Get firm ID from attorney
      const { data: member } = await supabase
        .from('firm_members')
        .select('firm_id')
        .eq('user_id', caseData.attorney_id)
        .eq('status', 'active')
        .single()

      const firmId = member?.firm_id || ''

      await runWorkflows('deadline.approaching', firmId, {
        event_id: event.id,
        event_title: event.title,
        event_date: event.event_date,
        days_until: days,
        case_id: event.case_id,
        case_number: caseData.case_number,
        client_name: caseData.client_name,
        recipient_id: caseData.attorney_id,
      })
      triggered++
    }
  }

  return { triggered }
}

/**
 * Check for overdue invoices and run matching workflows.
 */
export async function checkOverdueInvoices(): Promise<{ triggered: number }> {
  const supabase = getServiceClient()
  let triggered = 0

  const checkDays = [7, 30]

  for (const days of checkDays) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - days)
    const targetDateStr = targetDate.toISOString().split('T')[0]

    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, balance_due, due_date, case_id')
      .in('status', ['sent', 'overdue'])
      .gt('balance_due', 0)
      .gte('due_date', `${targetDateStr}`)
      .lt('due_date', `${targetDateStr}T23:59:59`)

    if (!invoices) continue

    for (const invoice of invoices) {
      const { data: caseData } = await supabase
        .from('cases')
        .select('attorney_id, client_id, case_number, client_name')
        .eq('id', invoice.case_id)
        .single()

      if (!caseData) continue

      const { data: member } = await supabase
        .from('firm_members')
        .select('firm_id')
        .eq('user_id', caseData.attorney_id)
        .eq('status', 'active')
        .single()

      const firmId = member?.firm_id || ''

      await runWorkflows('invoice.overdue', firmId, {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount_due: String(invoice.balance_due),
        days_overdue: days,
        case_id: invoice.case_id,
        case_number: caseData.case_number,
        client_id: caseData.client_id,
        client_name: caseData.client_name,
        recipient_id: caseData.attorney_id,
      })
      triggered++
    }
  }

  return { triggered }
}
