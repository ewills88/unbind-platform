import { NextRequest, NextResponse } from 'next/server'
import { runScheduledReport } from '@/lib/reports/scheduledReportsService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/reports/schedules/[id]/run — manually trigger a scheduled report
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const result = await runScheduledReport(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ runId: result.runId })
  } catch (error) {
    console.error('Run scheduled report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
