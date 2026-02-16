import { NextRequest, NextResponse } from 'next/server'
import { processWebhookQueue } from '@/lib/webhooks/webhookService'

// POST - Process pending webhook deliveries (cron job, every 1 minute)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await processWebhookQueue()

    return NextResponse.json({
      message: 'Webhook queue processed',
      ...result,
    })
  } catch (error) {
    console.error('Webhook queue processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
