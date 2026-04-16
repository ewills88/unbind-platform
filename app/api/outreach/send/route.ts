import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const SKIP_STATUSES = ['demo_booked', 'converted', 'unsubscribed', 'bounced', 'sequence_complete']

const FROM_EMAIL = process.env.OUTREACH_FROM_EMAIL || 'eric@unbind.law'
const FROM_NAME = process.env.OUTREACH_FROM_NAME || 'Eric'

interface SequenceStep {
  step: number
  subject: string
  body: (name: string, city: string) => string
  nextDays: number
  nextStep: number
  finalStatus?: string
}

const SEQUENCE: SequenceStep[] = [
  { step: 0, subject: 'Quick question about your divorce practice', nextDays: 3, nextStep: 1,
    body: (n, c) => `Hi ${n},\n\nI came across your practice in ${c} and noticed you specialize in family law.\n\nQuick question: how much time do you spend each week on tasks that have nothing to do with practicing law?\n\nMost divorce attorneys say 15-20 hours. I built Unbind to give that time back.\n\nAI document categorization. Client portal. One-click invoicing.\n\nWorth a 15-minute look? https://unbind.law/demo\n\n— ${FROM_NAME}\n\nP.S. Beta pricing: $89/month locked for life.` },
  { step: 1, subject: 'The math on saving 15 hours/week', nextDays: 3, nextStep: 2,
    body: (n) => `Hi ${n},\n\nFollowing up. Quick math: at $400/hour, 15 hours recovered = $6,000/week. $24,000/month.\n\nUnbind is $89/month during beta.\n\nWorth 15 minutes? https://unbind.law/demo\n\n— ${FROM_NAME}` },
  { step: 2, subject: 'The 3am deadline panic', nextDays: 4, nextStep: 3,
    body: (n) => `Hi ${n},\n\nYou know that feeling. Late night. Sudden panic about a deadline.\n\nUnbind: automatic deadline calculation for your state. Reminders at 7, 3, and 1 day before.\n\nDemo: https://unbind.law/demo\n\n— ${FROM_NAME}` },
  { step: 3, subject: 'What other divorce attorneys are saying', nextDays: 4, nextStep: 4,
    body: (n, c) => `Hi ${n},\n\nAttorneys using Unbind report 15+ hours saved weekly, 50% fewer client calls, and getting paid in 18 days instead of 45.\n\nI'll show you how it works for a ${c} practice: https://unbind.law/demo\n\n— ${FROM_NAME}` },
  { step: 4, subject: 'Closing the loop', nextDays: 0, nextStep: 5, finalStatus: 'sequence_complete',
    body: (n) => `Hi ${n},\n\nLast note. If you're still dealing with too much admin, slow payments, or deadline stress—we should talk.\n\n15 minutes: https://unbind.law/demo\n\nBeta pricing closes soon.\n\n— ${FROM_NAME}` },
]

export async function POST(request: NextRequest) {
  // Verify cron secret or admin
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(resendKey)
  const now = new Date()

  const { data: leads, error: fetchErr } = await supabase
    .from('outreach_leads')
    .select('*')
    .not('status', 'in', `(${SKIP_STATUSES.join(',')})`)
    .lt('sequence_step', 5)
    .not('email', 'is', null)
    .or(`next_contact_at.is.null,next_contact_at.lte.${now.toISOString()}`)
    .order('created_at', { ascending: true })
    .limit(50)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  let sent = 0
  let errors = 0

  for (const lead of leads || []) {
    const step = SEQUENCE.find(s => s.step === lead.sequence_step)
    if (!step) continue

    const firstName = lead.name.split(' ')[0] || lead.name
    const city = lead.city || 'your area'

    try {
      const { error: sendErr } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [lead.email],
        subject: step.subject,
        text: step.body(firstName, city),
      })

      if (sendErr) {
        console.error(`Send failed for ${lead.email}:`, sendErr.message)
        errors++
        if (sendErr.message?.includes('invalid') || sendErr.message?.includes('bounce')) {
          await supabase.from('outreach_leads').update({ status: 'bounced' }).eq('id', lead.id)
        }
        continue
      }

      await supabase.from('outreach_emails_sent').insert({
        lead_id: lead.id, sequence_step: step.step, subject: step.subject,
      })

      const nextContact = step.nextDays > 0
        ? new Date(now.getTime() + step.nextDays * 86400000).toISOString()
        : null

      await supabase.from('outreach_leads').update({
        sequence_step: step.nextStep,
        last_contacted_at: now.toISOString(),
        next_contact_at: nextContact,
        status: step.finalStatus || 'in_sequence',
      }).eq('id', lead.id)

      sent++
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      console.error(`Error for ${lead.email}:`, err)
      errors++
    }
  }

  return NextResponse.json({ sent, errors, total: leads?.length || 0 })
}
