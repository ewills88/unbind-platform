import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EFilingService } from '@/lib/efiling/efilingService'
import { mapProviderStatus } from '@/types/efiling'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey)
}

// POST /api/webhooks/efiling - Handle e-filing status webhooks
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    const body = await request.json()
    const { envelope_id, status, status_message, timestamp } = body

    if (!envelope_id) {
      return NextResponse.json({ received: true, note: 'No envelope_id' })
    }

    // Find submission by envelope ID
    const { data: submission } = await supabase
      .from('efiling_submissions')
      .select('*')
      .eq('envelope_id', envelope_id)
      .single()

    if (!submission) {
      console.error(`Webhook: unknown envelope ${envelope_id}`)
      return NextResponse.json({ received: true, note: 'Unknown envelope' })
    }

    // Update submission with webhook data
    const updatedStatus = mapProviderStatus(status || 'processing')
    await supabase
      .from('efiling_submissions')
      .update({
        status: updatedStatus,
        status_message: status_message || null,
        status_timestamp: timestamp || new Date().toISOString(),
        webhook_received: true,
        webhook_payload: body,
      })
      .eq('id', submission.id)

    // If accepted or rejected, fetch full status from provider
    if (['accepted', 'rejected', 'filed'].includes((status || '').toLowerCase())) {
      const { data: credentials } = await supabase
        .from('efiling_credentials')
        .select('*')
        .eq('id', submission.credential_id)
        .single()

      if (credentials) {
        try {
          const service = new EFilingService(credentials)
          await service.checkSubmissionStatus(submission.id)
        } catch (err) {
          console.error('Webhook: failed to fetch full status:', err)
        }
      }
    }

    // Create in-app notification
    if (updatedStatus === 'accepted' || updatedStatus === 'rejected') {
      const { data: caseData } = await supabase
        .from('cases')
        .select('attorney_id')
        .eq('id', submission.case_id)
        .single()

      if (caseData?.attorney_id) {
        await supabase.from('notifications').insert({
          user_id: caseData.attorney_id,
          title: updatedStatus === 'accepted'
            ? 'E-Filing Accepted'
            : 'E-Filing Rejected',
          message: updatedStatus === 'accepted'
            ? `Filing "${submission.filing_description}" has been accepted by the court.`
            : `Filing "${submission.filing_description}" was rejected: ${status_message || 'Unknown reason'}`,
          type: updatedStatus === 'accepted' ? 'case_update' : 'action_required',
          link: `/dashboard/cases/${submission.case_id}/filings`,
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('E-filing webhook error:', error)
    return NextResponse.json({ received: true, error: 'Processing error' })
  }
}
