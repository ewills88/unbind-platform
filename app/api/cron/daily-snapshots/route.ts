import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeDailySnapshot } from '@/lib/analytics/metricsService'

// POST /api/cron/daily-snapshots - Generate daily analytics snapshots for all firms
export async function POST(request: NextRequest) {
  try {
    // Cron auth
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all active firms
    const { data: firms, error: firmsError } = await supabase
      .from('firms')
      .select('id')
      .eq('is_active', true)

    if (firmsError) {
      return NextResponse.json({ error: firmsError.message }, { status: 500 })
    }

    if (!firms || firms.length === 0) {
      return NextResponse.json({ message: 'No active firms', processed: 0 })
    }

    const results = []

    for (const firm of firms) {
      try {
        const { data: _data, error } = await computeDailySnapshot(firm.id)
        results.push({
          firm_id: firm.id,
          status: error ? 'error' : 'success',
          error: error?.message,
        })
      } catch (err) {
        results.push({
          firm_id: firm.id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const succeeded = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      message: 'Daily snapshots complete',
      processed: results.length,
      succeeded,
      failed,
      results,
    })
  } catch (error) {
    console.error('Daily snapshots cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
