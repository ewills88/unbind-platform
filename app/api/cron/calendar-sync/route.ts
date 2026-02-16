import { NextRequest, NextResponse } from 'next/server'
import { runPeriodicSync } from '@/lib/calendar/bulkSync'

// POST - Periodic calendar sync (cron job endpoint, every 15 minutes)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await runPeriodicSync()

    return NextResponse.json({
      message: 'Calendar sync complete',
      ...result,
    })
  } catch (error) {
    console.error('Calendar sync cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
