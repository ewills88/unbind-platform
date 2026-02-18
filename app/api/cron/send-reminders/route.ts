import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/portal/notificationService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// POST /api/cron/send-reminders — send appointment, task, and payment reminders
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      appointmentReminders: 0,
      taskReminders: 0,
      paymentReminders: 0,
    }

    // ---- Appointment reminders (24 hours before) ----
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStart = new Date(tomorrow)
    tomorrowStart.setHours(0, 0, 0, 0)
    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: appointments } = await (supabase as any)
      .from('client_appointments')
      .select('id, client_id, case_id, start_time, appointment_type_id')
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', tomorrowStart.toISOString())
      .lte('start_time', tomorrowEnd.toISOString())
      .eq('reminder_sent', false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const apt of (appointments || []) as any[]) {
      const startTime = new Date(apt.start_time)
      const timeStr = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

      await createNotification({
        clientId: apt.client_id,
        caseId: apt.case_id,
        type: 'appointment_reminder',
        category: 'appointment',
        title: 'Appointment Tomorrow',
        message: `Reminder: You have an appointment tomorrow at ${timeStr}`,
        link: '/portal/appointments',
        priority: 'high',
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('client_appointments')
        .update({ reminder_sent: true })
        .eq('id', apt.id)

      results.appointmentReminders++
    }

    // ---- Task due reminders (due in 2 days) ----
    const twoDaysOut = new Date()
    twoDaysOut.setDate(twoDaysOut.getDate() + 2)
    const twoDaysDate = twoDaysOut.toISOString().split('T')[0]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tasks } = await (supabase as any)
      .from('client_tasks')
      .select('id, case_id, client_id, title, reminder_count, auto_remind')
      .in('status', ['pending', 'in_progress'])
      .eq('due_date', twoDaysDate)
      .eq('auto_remind', true)
      .lt('reminder_count', 3)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const task of (tasks || []) as any[]) {
      if (!task.client_id) continue

      await createNotification({
        clientId: task.client_id,
        caseId: task.case_id,
        type: 'task_due_soon',
        category: 'task',
        title: 'Task Due Soon',
        message: `"${task.title}" is due in 2 days`,
        link: '/portal/tasks',
        priority: 'high',
        actionRequired: true,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('client_tasks')
        .update({
          reminder_count: (task.reminder_count || 0) + 1,
          last_reminder_at: new Date().toISOString(),
        })
        .eq('id', task.id)

      results.taskReminders++
    }

    // ---- Payment due reminders (due in 3 days) ----
    const threeDaysOut = new Date()
    threeDaysOut.setDate(threeDaysOut.getDate() + 3)
    const threeDaysDate = threeDaysOut.toISOString().split('T')[0]

    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, amount_paid, balance_due, case_id')
      .in('status', ['sent'])
      .eq('due_date', threeDaysDate)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const invoice of (invoices || []) as any[]) {
      // Get client from case
      const { data: caseData } = await supabase
        .from('cases')
        .select('client_id')
        .eq('id', invoice.case_id)
        .single()

      if (!caseData?.client_id) continue

      const balance = invoice.balance_due || ((invoice.total_amount || 0) - (invoice.amount_paid || 0))

      await createNotification({
        clientId: caseData.client_id,
        caseId: invoice.case_id,
        type: 'payment_due',
        category: 'payment',
        title: 'Payment Due Soon',
        message: `Invoice #${invoice.invoice_number} for ${formatCurrency(balance)} is due in 3 days`,
        link: '/portal/billing',
        priority: 'high',
        actionRequired: true,
      })

      results.paymentReminders++
    }

    return NextResponse.json({
      message: 'Reminders sent',
      ...results,
      total: results.appointmentReminders + results.taskReminders + results.paymentReminders,
    })
  } catch (error) {
    console.error('Send reminders error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
