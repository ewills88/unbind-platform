import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runScheduledReport } from '@/lib/reports/scheduledReportsService'

// POST /api/cron/run-scheduled-reports — process due scheduled reports
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()

    // Get reports due to run
    const { data: dueReports } = await supabase
      .from('scheduled_reports')
      .select('id, schedule_name')
      .eq('is_active', true)
      .lte('next_run_at', now.toISOString())
      .order('next_run_at', { ascending: true })
      .limit(10)

    const results: { id: string; name: string; success: boolean; error?: string }[] = []

    for (const report of dueReports || []) {
      const result = await runScheduledReport(report.id)
      results.push({
        id: report.id,
        name: report.schedule_name,
        success: result.success,
        error: result.error,
      })
    }

    return NextResponse.json({
      processed: results.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Run scheduled reports cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
