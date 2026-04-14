/**
 * Automated email sequence engine for Unbind outreach.
 *
 * Usage: npm run send-emails (or called by scheduler)
 * Reads .env.local for RESEND_API_KEY, OUTREACH_FROM_EMAIL, OUTREACH_FROM_NAME,
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.OUTREACH_FROM_EMAIL || 'eric@unbind.law'
const FROM_NAME = process.env.OUTREACH_FROM_NAME || 'Eric'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars: RESEND_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const MAX_SENDS_PER_RUN = 50
const DELAY_BETWEEN_SENDS_MS = 2000

const SKIP_STATUSES = ['demo_booked', 'converted', 'unsubscribed', 'bounced', 'sequence_complete']

interface SequenceStep {
  step: number
  subject: string
  body: (name: string, city: string) => string
  nextContactDays: number
  nextStep: number
  finalStatus?: string
}

const SEQUENCE: SequenceStep[] = [
  {
    step: 0,
    subject: 'Quick question about your divorce practice',
    body: (name, city) =>
      `Hi ${name},\n\nI came across your practice in ${city} and noticed you specialize in family law.\n\nQuick question: how much time do you spend each week on tasks that have nothing to do with actually practicing law?\n\nMost divorce attorneys say 15-20 hours—sorting documents, chasing clients for updates, generating invoices.\n\nI built Unbind to give that time back. AI that categorizes documents instantly. A client portal that cuts status calls by 50%. One-click invoicing that gets you paid 40% faster.\n\nWorth a 15-minute look? Book here: https://unbind.law/demo\n\n— ${FROM_NAME}\n\nP.S. Limited beta—50% off locked in for life.`,
    nextContactDays: 3,
    nextStep: 1,
  },
  {
    step: 1,
    subject: 'The math on saving 15 hours/week',
    body: (name, _city) =>
      `Hi ${name},\n\nFollowing up. Quick math:\n\nAt $400/hour, 15 hours/week recovered = $6,000.\nPer month: $24,000.\n\nUnbind is $89/month during beta.\n\nEven saving just 1 hour/week puts you ahead. Most attorneys save 15+.\n\nWorth 15 minutes?\nhttps://unbind.law/demo\n\n— ${FROM_NAME}`,
    nextContactDays: 3,
    nextStep: 2,
  },
  {
    step: 2,
    subject: 'The 3am deadline panic',
    body: (name, _city) =>
      `Hi ${name},\n\nYou know that feeling. It's late. You suddenly remember a deadline. Stomach drops.\n\nDid I file that response? When was discovery due?\n\nEvery divorce attorney knows it. Unbind eliminates it.\n\nAutomatic deadline calculation for your state. Reminders at 7, 3, and 1 day before. Never again.\n\nDemo: https://unbind.law/demo\n\n— ${FROM_NAME}`,
    nextContactDays: 4,
    nextStep: 3,
  },
  {
    step: 3,
    subject: 'What other divorce attorneys are saying',
    body: (name, city) =>
      `Hi ${name},\n\nAttorneys using Unbind report:\n• 15+ hours saved weekly\n• 50% fewer client status calls\n• Getting paid in 18 days instead of 45\n\nThe client portal alone changes practices—clients check their own case status instead of calling you.\n\nI'll show you exactly how it works for a ${city} practice:\nhttps://unbind.law/demo\n\n— ${FROM_NAME}`,
    nextContactDays: 4,
    nextStep: 4,
  },
  {
    step: 4,
    subject: 'Closing the loop',
    body: (name, _city) =>
      `Hi ${name},\n\nLast note.\n\nIf you're still dealing with too much admin, clients calling for updates, slow payments, or deadline stress—we should talk.\n\n15 minutes: https://unbind.law/demo\n\nBeta pricing ($89/month, 50% off forever) closes soon.\n\nThanks for your time.\n\n— ${FROM_NAME}`,
    nextContactDays: 0,
    nextStep: 5,
    finalStatus: 'sequence_complete',
  },
]

function createSupabaseClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(SUPABASE_URL!, SUPABASE_KEY!)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

async function main() {
  console.log(`=== Unbind Email Scheduler ===`)
  console.log(`Time: ${new Date().toISOString()}`)
  console.log(`Max sends this run: ${MAX_SENDS_PER_RUN}\n`)

  const supabase = createSupabaseClient()
  const resend = new Resend(RESEND_API_KEY)
  const now = new Date()

  // Get leads that are due for their next email
  const { data: leads, error } = await supabase
    .from('outreach_leads')
    .select('*')
    .not('status', 'in', `(${SKIP_STATUSES.join(',')})`)
    .lt('sequence_step', 5)
    .or(`next_contact_at.is.null,next_contact_at.lte.${now.toISOString()}`)
    .not('email', 'is', null)
    .order('created_at', { ascending: true })
    .limit(MAX_SENDS_PER_RUN)

  if (error) {
    console.error('Error fetching leads:', error.message)
    process.exit(1)
  }

  if (!leads || leads.length === 0) {
    console.log('No leads due for emails. Done.')
    return
  }

  console.log(`Found ${leads.length} leads ready for emails\n`)

  let sent = 0
  let errors = 0

  for (const lead of leads) {
    const step = SEQUENCE.find(s => s.step === lead.sequence_step)
    if (!step) {
      console.log(`  Skip ${lead.name}: unknown step ${lead.sequence_step}`)
      continue
    }

    const subject = step.subject
    const body = step.body(
      lead.name.split(' ')[0] || lead.name,
      lead.city || 'your area'
    )

    console.log(`  Sending step ${step.step} to ${lead.name} <${lead.email}>...`)

    try {
      const { error: sendError } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [lead.email],
        subject,
        text: body,
      })

      if (sendError) {
        console.error(`    FAILED: ${sendError.message}`)
        errors++

        // Mark as bounced if it's an invalid email
        if (sendError.message?.includes('invalid') || sendError.message?.includes('bounce')) {
          await supabase
            .from('outreach_leads')
            .update({ status: 'bounced' })
            .eq('id', lead.id)
        }
        continue
      }

      // Log the sent email
      await supabase
        .from('outreach_emails_sent')
        .insert({
          lead_id: lead.id,
          sequence_step: step.step,
          subject,
        })

      // Update the lead
      const updateData: Record<string, unknown> = {
        sequence_step: step.nextStep,
        last_contacted_at: now.toISOString(),
        status: step.finalStatus || 'in_sequence',
      }

      if (step.nextContactDays > 0) {
        updateData.next_contact_at = addDays(now, step.nextContactDays).toISOString()
      } else {
        updateData.next_contact_at = null
      }

      await supabase
        .from('outreach_leads')
        .update(updateData)
        .eq('id', lead.id)

      sent++
      console.log(`    OK — step ${step.step} → ${step.nextStep}`)

      // Rate limit
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_SENDS_MS))

    } catch (err) {
      console.error(`    ERROR: ${err instanceof Error ? err.message : err}`)
      errors++
    }
  }

  console.log(`\n=== DONE ===`)
  console.log(`Sent: ${sent}`)
  console.log(`Errors: ${errors}`)
  console.log(`Remaining in queue: ${leads.length - sent - errors}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
