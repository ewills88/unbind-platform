import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EFilingService } from '@/lib/efiling/efilingService'

// POST /api/cron/check-efiling-status - Poll for submission status updates
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)

    // Get pending submissions not updated in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data: submissions } = await supabase
      .from('efiling_submissions')
      .select('*')
      .in('status', ['submitted', 'processing'])
      .lt('status_timestamp', fiveMinutesAgo)
      .lt('retry_count', 20) // Max retries
      .limit(20)

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ checked: 0, message: 'No pending submissions' })
    }

    const results: Array<{ id: string; success: boolean; status?: string; error?: string }> = []

    // Group by credential for efficiency
    const byCredential: Record<string, typeof submissions> = {}
    for (const sub of submissions) {
      if (!byCredential[sub.credential_id]) byCredential[sub.credential_id] = []
      byCredential[sub.credential_id].push(sub)
    }

    for (const [credentialId, subs] of Object.entries(byCredential)) {
      const { data: credentials } = await supabase
        .from('efiling_credentials')
        .select('*')
        .eq('id', credentialId)
        .single()

      if (!credentials) {
        for (const sub of subs) {
          results.push({ id: sub.id, success: false, error: 'Credentials not found' })
        }
        continue
      }

      const service = new EFilingService(credentials)

      for (const sub of subs) {
        try {
          const updated = await service.checkSubmissionStatus(sub.id)
          results.push({
            id: sub.id,
            success: true,
            status: updated.status,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          results.push({ id: sub.id, success: false, error: message })

          // Increment retry count
          await supabase
            .from('efiling_submissions')
            .update({
              retry_count: (sub.retry_count || 0) + 1,
              last_error: message,
            })
            .eq('id', sub.id)
        }
      }
    }

    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      checked: results.length,
      succeeded,
      failed,
      results,
    })
  } catch (error) {
    console.error('E-filing status cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
