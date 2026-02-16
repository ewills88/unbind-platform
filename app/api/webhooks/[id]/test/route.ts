import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendTestWebhook } from '@/lib/webhooks/webhookService'
import { Webhook } from '@/types/webhooks'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { client: null, user: null }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: { headers: { cookie: cookieStore.toString() } }
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { client: null, user: null }
  return { client: supabase, user }
}

// POST - Send a test webhook
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
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
