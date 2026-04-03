import { NextRequest, NextResponse } from 'next/server'
import { sendTestWebhook } from '@/lib/webhooks/webhookService'
import { Webhook } from '@/types/webhooks'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST - Send a test webhook
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const result = await sendTestWebhook(webhook as Webhook)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Webhook test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
