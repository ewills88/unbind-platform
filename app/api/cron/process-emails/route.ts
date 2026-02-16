import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/emailService'

// Service role client for cron operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Process pending email queue (cron job endpoint)
export async function POST(request: NextRequest) {
  try {
    // Auth check for cron endpoints
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch pending emails ready to send
    const { data: emails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 3)
      .order('scheduled_for', { ascending: true })
      .limit(50)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({ message: 'No emails to process', processed: 0 })
    }

    let succeeded = 0
    let failed = 0

    for (const email of emails) {
      // Mark as sending
      await supabase
        .from('email_queue')
        .update({ status: 'sending' })
        .eq('id', email.id)

      const result = await sendEmail(
        email.recipient_email,
        email.recipient_name,
        email.subject,
        email.html_body,
        email.text_body || ''
      )

      if (result.success) {
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            message_id: result.messageId || null,
          })
          .eq('id', email.id)

        succeeded++
      } else {
        const newAttempts = (email.attempts || 0) + 1
        const maxAttempts = email.max_attempts || 3
        const isMaxed = newAttempts >= maxAttempts

        // Exponential backoff: 2^attempts minutes
        const backoffMinutes = Math.pow(2, newAttempts)
        const nextAttempt = new Date()
        nextAttempt.setMinutes(nextAttempt.getMinutes() + backoffMinutes)

        await supabase
          .from('email_queue')
          .update({
            status: isMaxed ? 'failed' : 'pending',
            attempts: newAttempts,
            error_message: result.error || 'Unknown error',
            scheduled_for: isMaxed ? undefined : nextAttempt.toISOString(),
          })
          .eq('id', email.id)

        failed++
      }
    }

    return NextResponse.json({
      message: 'Processing complete',
      processed: emails.length,
      succeeded,
      failed,
    })
  } catch (error) {
    console.error('Email queue processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
