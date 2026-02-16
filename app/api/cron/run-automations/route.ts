import { NextRequest, NextResponse } from 'next/server'
import { checkUpcomingDeadlines, checkOverdueInvoices } from '@/lib/automations/workflowRunner'
import { processWebhookQueue } from '@/lib/webhooks/webhookService'

// POST - Run automated workflows (cron job, daily at 9am)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [deadlines, overdueInvoices, webhooks] = await Promise.all([
      checkUpcomingDeadlines(),
      checkOverdueInvoices(),
      processWebhookQueue(),
    ])

    return NextResponse.json({
      message: 'Automations complete',
      deadlines,
      overdue_invoices: overdueInvoices,
      webhooks,
    })
  } catch (error) {
    console.error('Automation run error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
