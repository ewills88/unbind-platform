import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ itemId: string }>
}

// PATCH /api/discovery/items/[itemId] - Update a single item
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itemId } = await params
    const body = await request.json()

    // Get current item for history tracking
    const { data: currentItem, error: fetchError } = await supabase
      .from('discovery_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (fetchError || !currentItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Track changes for audit
    const trackedFields = ['response_text', 'objection_text', 'status']
    const changes: {
      discovery_item_id: string
      field_changed: string
      old_value: string | null
      new_value: string | null
      changed_by: string
    }[] = []

    for (const key of trackedFields) {
      if (body[key] !== undefined && String(currentItem[key]) !== String(body[key])) {
        changes.push({
          discovery_item_id: itemId,
          field_changed: key,
          old_value: currentItem[key] != null ? String(currentItem[key]) : null,
          new_value: body[key] != null ? String(body[key]) : null,
          changed_by: user.id,
        })
      }
    }

    // Build update
    const updateData: Record<string, unknown> = {}
    if (body.response_text !== undefined) updateData.response_text = body.response_text
    if (body.objection_text !== undefined) updateData.objection_text = body.objection_text
    if (body.objection_type !== undefined) updateData.objection_type = body.objection_type
    if (body.status !== undefined) updateData.status = body.status
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.request_text !== undefined) updateData.request_text = body.request_text
    if (body.documents_produced !== undefined) updateData.documents_produced = body.documents_produced
    if (typeof body.privilege_claimed === 'boolean') updateData.privilege_claimed = body.privilege_claimed

    // If status changed to 'reviewed', set reviewed_by/at
    if (body.status === 'reviewed' && currentItem.status !== 'reviewed') {
      updateData.reviewed_by = user.id
      updateData.reviewed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('discovery_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Save history entries
    if (changes.length > 0) {
      await supabase.from('discovery_item_history').insert(changes)
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Discovery item PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/discovery/items/[itemId] - Delete an item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itemId } = await params

    const { error } = await supabase
      .from('discovery_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Discovery item DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
