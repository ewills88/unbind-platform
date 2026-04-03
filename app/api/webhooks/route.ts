import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET - List webhooks for user's firm
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ webhooks: webhooks || [] })
  } catch (error) {
    console.error('Webhooks GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new webhook
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.name || !body.url || !body.events || body.events.length === 0) {
      return NextResponse.json({ error: 'Name, URL, and at least one event are required' }, { status: 400 })
    }

    // Get user's firm
    const { data: member } = await supabase
      .from('firm_members')
      .select('firm_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'No active firm membership found' }, { status: 400 })
    }

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        firm_id: member.firm_id,
        name: body.name,
        url: body.url,
        secret_key: body.secret_key || crypto.randomUUID(),
        events: body.events,
        is_active: true,
        headers: body.headers || {},
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ webhook }, { status: 201 })
  } catch (error) {
    console.error('Webhooks POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
