import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

// PUT /api/discovery/items/bulk?action=bulk_assign|bulk_status
export async function PUT(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const body = await request.json()

    if (!body.item_ids || !Array.isArray(body.item_ids) || body.item_ids.length === 0) {
      return NextResponse.json({ error: 'item_ids array required' }, { status: 400 })
    }

    if (action === 'bulk_assign') {
      const { error } = await supabase
        .from('discovery_items')
        .update({ assigned_to: body.assigned_to || null })
        .in('id', body.item_ids)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, updated: body.item_ids.length })
    }

    if (action === 'bulk_status') {
      if (!body.status) {
        return NextResponse.json({ error: 'status required for bulk_status' }, { status: 400 })
      }

      const { error } = await supabase
        .from('discovery_items')
        .update({ status: body.status })
        .in('id', body.item_ids)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, updated: body.item_ids.length })
    }

    return NextResponse.json({ error: 'Invalid action. Use bulk_assign or bulk_status.' }, { status: 400 })
  } catch (error) {
    console.error('Bulk items error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
