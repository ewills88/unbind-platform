import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/discovery/[id]/items - List items for a discovery request
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('discovery_items')
      .select('*')
      .eq('discovery_request_id', id)
      .order('item_number', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Discovery items GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/discovery/[id]/items - Create items (supports bulk)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Support bulk creation (array or single item)
    const items = Array.isArray(body) ? body : [body]

    // Get current max item_number
    const { data: existing } = await supabase
      .from('discovery_items')
      .select('item_number')
      .eq('discovery_request_id', id)
      .order('item_number', { ascending: false })
      .limit(1)

    const startNumber = existing && existing.length > 0 ? existing[0].item_number + 1 : 1

    const insertData = items.map((item: Record<string, unknown>, index: number) => ({
      discovery_request_id: id,
      item_number: (item.item_number as number) || startNumber + index,
      request_text: (item.request_text as string) || '',
      response_text: (item.response_text as string) || '',
      objection_text: (item.objection_text as string) || '',
      objection_type: (item.objection_type as string[]) || [],
      status: 'pending',
      assigned_to: (item.assigned_to as string) || null,
      notes: (item.notes as string) || null,
    }))

    const { data, error } = await supabase
      .from('discovery_items')
      .insert(insertData)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update item count on parent discovery request
    const { count } = await supabase
      .from('discovery_items')
      .select('*', { count: 'exact', head: true })
      .eq('discovery_request_id', id)

    if (count !== null) {
      await supabase
        .from('discovery_requests')
        .update({ item_count: count })
        .eq('id', id)
    }

    return NextResponse.json({ data: data || [] }, { status: 201 })
  } catch (error) {
    console.error('Discovery items POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
