import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Uses service role key since this is a cron/server-side operation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const reminderTemplates: Record<string, { subject: string; body: string }> = {
  upcoming: {
    subject: 'Reminder: Invoice #{invoice_number} due in 3 days',
    body: `Hi {client_name},

This is a friendly reminder that Invoice #{invoice_number} for {amount} is due on {due_date} (in 3 days).

You can view and pay your invoice securely online:
{payment_link}

Thank you for your prompt attention.

{attorney_name}`,
  },
  due_today: {
    subject: 'Payment Due Today: Invoice #{invoice_number}',
    body: `Hi {client_name},

Invoice #{invoice_number} for {amount} is due today ({due_date}).

Please submit your payment online:
{payment_link}

Thank you,
{attorney_name}`,
  },
  past_due_7: {
    subject: 'Past Due: Invoice #{invoice_number}',
    body: `Hi {client_name},

Invoice #{invoice_number} for {amount} was due on {due_date} and remains unpaid.

If you've already sent payment, please disregard this notice. Otherwise, please remit payment as soon as possible:
{payment_link}

If you're having difficulty making payment, please contact me to discuss payment arrangements.

{attorney_name}`,
  },
  past_due_30: {
    subject: 'Seriously Past Due: Invoice #{invoice_number}',
    body: `{client_name},

Invoice #{invoice_number} for {amount} is now 30 days past due (original due date: {due_date}).

Immediate payment is strongly requested. Please contact me to discuss payment options:
{payment_link}

{attorney_name}`,
  },
  final_notice: {
    subject: 'FINAL NOTICE: Invoice #{invoice_number}',
    body: `{client_name},

This is a final notice regarding Invoice #{invoice_number} for {amount}, now {days_overdue} days past due.

Immediate payment is required. If payment is not received within 7 days, I may need to withdraw from representation of your case.

Please contact me immediately to arrange payment:
{payment_link}

{attorney_name}`,
  },
}

function interpolate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// POST - Process and send pending payment reminders (cron job endpoint)
export async function POST() {
  const today = new Date().toISOString().split('T')[0]

  // Get pending reminders due today or earlier
  const { data: reminders, error: fetchError } = await supabase
    .from('payment_reminders')
    .select(`
      *,
      invoice:invoices(
        id,
        invoice_number,
        total_amount,
        balance_due,
        due_date,
        status,
        case_id
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_date', today)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ message: 'No reminders to send', processed: 0 })
  }

  const results = []

  for (const reminder of reminders) {
    const invoice = reminder.invoice
    if (!invoice || invoice.status === 'paid' || invoice.status === 'void') {
      // Cancel reminder for paid/void invoices
      await supabase
        .from('payment_reminders')
        .update({ status: 'failed' })
        .eq('id', reminder.id)
      results.push({ id: reminder.id, status: 'cancelled', reason: 'Invoice paid or void' })
      continue
    }

    try {
      // Get case info with client and attorney
      const { data: caseData } = await supabase
        .from('cases')
        .select('client_id, attorney_id, client_name')
        .eq('id', invoice.case_id)
        .single()

      if (!caseData) {
        results.push({ id: reminder.id, status: 'skipped', reason: 'Case not found' })
        continue
      }

      // Get attorney profile
      const { data: attorney } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', caseData.attorney_id)
        .single()

      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
      )

      const template = reminderTemplates[reminder.reminder_type]
      if (!template) {
        results.push({ id: reminder.id, status: 'skipped', reason: 'Unknown template' })
        continue
      }

      const vars = {
        client_name: caseData.client_name || 'Client',
        invoice_number: invoice.invoice_number,
        amount: formatCurrency(invoice.balance_due),
        due_date: new Date(invoice.due_date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        }),
        days_overdue: daysOverdue.toString(),
        payment_link: `${BASE_URL}/dashboard`,
        attorney_name: attorney?.full_name || 'Your Attorney',
      }

      const subject = interpolate(template.subject, vars)
      const body = interpolate(template.body, vars)

      // Log the reminder (in production, this would send an actual email)
      console.log(`[REMINDER] To: ${caseData.client_name}, Subject: ${subject}`)
      console.log(`[REMINDER] Body: ${body}`)

      // Mark as sent
      await supabase
        .from('payment_reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', reminder.id)

      results.push({ id: reminder.id, status: 'sent', subject })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await supabase
        .from('payment_reminders')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('id', reminder.id)
      results.push({ id: reminder.id, status: 'failed', error: errorMessage })
    }
  }

  return NextResponse.json({ message: 'Processing complete', processed: results.length, results })
}
