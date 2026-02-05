import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { InfoRequest } from '@/types/intake-workflow'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { client: null, user: null }
  }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: {
      headers: {
        cookie: cookieStore.toString()
      }
    }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { client: null, user: null }
  }

  return { client: supabase, user }
}

// POST /api/intakes/[id]/request-info - Request more information from client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: intakeId } = await params
    const body: InfoRequest = await request.json()

    if (!body.message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get intake
    const { data: intake, error: intakeError } = await supabase
      .from('client_intakes')
      .select('*, profiles:user_id(email, full_name)')
      .eq('id', intakeId)
      .single()

    if (intakeError || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    // Update intake status
    const { data: updatedIntake, error: updateError } = await supabase
      .from('client_intakes')
      .update({
        review_status: 'info_requested',
        status: 'in_progress', // Allow client to edit again
        info_requested_at: new Date().toISOString(),
        info_request_message: body.message,
        info_request_fields: [...(body.requested_fields || []), ...(body.requested_documents || [])],
      })
      .eq('id', intakeId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating intake:', updateError)
      return NextResponse.json({ error: 'Failed to request info' }, { status: 500 })
    }

    // TODO: Send email notification to client
    // In production, integrate with email service (SendGrid, Resend, etc.)
    const emailData = {
      to: (intake.profiles as { email?: string })?.email,
      subject: 'Additional Information Needed for Your Intake',
      body: `
        Dear ${(intake.profiles as { full_name?: string })?.full_name || 'Client'},

        Thank you for submitting your intake questionnaire. We need a bit more information to get started with your case.

        ${body.message}

        ${body.requested_fields?.length ? `\nPlease update the following sections:\n- ${body.requested_fields.join('\n- ')}` : ''}
        ${body.requested_documents?.length ? `\nPlease upload the following documents:\n- ${body.requested_documents.join('\n- ')}` : ''}

        You can update your intake by logging into your portal:
        ${process.env.NEXT_PUBLIC_APP_URL}/intake/${intakeId}

        Thank you,
        Your Legal Team
      `,
    }

    console.log('Would send email:', emailData)

    return NextResponse.json({
      intake: updatedIntake,
      message: 'Information request sent to client',
    })
  } catch (error) {
    console.error('Request info error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
