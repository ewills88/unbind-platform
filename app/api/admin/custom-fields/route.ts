import { NextRequest, NextResponse } from 'next/server'
import {
  getFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
  getFieldValues,
  setFieldValues,
} from '@/lib/admin/customFieldService'
import { logAudit } from '@/lib/admin/auditService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

async function checkAdminAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<{ firmId: string } | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_firm_id')
    .eq('id', userId)
    .single()

  if (!profile?.current_firm_id) return null

  const { data: membership } = await supabase
    .from('firm_members')
    .select('role, is_admin, status')
    .eq('firm_id', profile.current_firm_id)
    .eq('user_id', userId)
    .single()

  if (!membership || membership.status !== 'active') return null
  if (membership.role !== 'owner' && !membership.is_admin) return null

  return { firmId: profile.current_firm_id }
}

// GET /api/admin/custom-fields
export async function GET(req: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(req)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const entityType = url.searchParams.get('entityType') || undefined
    const entityId = url.searchParams.get('entityId')

    if (entityId && entityType) {
      const values = await getFieldValues(supabase, entityType, entityId)
      return NextResponse.json({ data: values })
    }

    const definitions = await getFieldDefinitions(supabase, access.firmId, entityType)
    return NextResponse.json({ data: definitions })
  } catch (error) {
    console.error('Custom fields GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/custom-fields
export async function POST(req: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(req)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    // Set field values
    if (body.entityId && body.entityType && body.values) {
      await setFieldValues(supabase, access.firmId, body.entityType, body.entityId, body.values)
      return NextResponse.json({ success: true })
    }

    // Create field definition
    if (!body.entity_type || !body.field_name || !body.field_type) {
      return NextResponse.json({ error: 'entity_type, field_name, and field_type required' }, { status: 400 })
    }

    const definition = await createFieldDefinition(supabase, access.firmId, {
      ...body,
      created_by: user.id,
    })

    await logAudit({
      firmId: access.firmId,
      userId: user.id,
      action: 'create',
      entityType: 'custom_field',
      entityId: definition.id,
      entityName: body.field_name,
    }).catch(() => {})

    return NextResponse.json({ data: definition })
  } catch (error) {
    console.error('Custom fields POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/custom-fields
export async function PATCH(req: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(req)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { fieldId, updates } = await req.json()
    if (!fieldId) {
      return NextResponse.json({ error: 'fieldId required' }, { status: 400 })
    }

    const definition = await updateFieldDefinition(supabase, access.firmId, fieldId, updates)
    return NextResponse.json({ data: definition })
  } catch (error) {
    console.error('Custom fields PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/custom-fields
export async function DELETE(req: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(req)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { fieldId } = await req.json()
    if (!fieldId) {
      return NextResponse.json({ error: 'fieldId required' }, { status: 400 })
    }

    await deleteFieldDefinition(supabase, access.firmId, fieldId)

    await logAudit({
      firmId: access.firmId,
      userId: user.id,
      action: 'delete',
      entityType: 'custom_field',
      entityId: fieldId,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Custom fields DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
