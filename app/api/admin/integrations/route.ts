import { NextResponse } from 'next/server'
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

// GET /api/admin/integrations
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('firm_integrations')
      .select('*')
      .eq('firm_id', access.firmId)
      .order('integration_name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Integrations GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/integrations - Connect integration
export async function POST(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    if (!body.integration_type || !body.integration_name) {
      return NextResponse.json({ error: 'integration_type and integration_name required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('firm_integrations')
      .upsert({
        firm_id: access.firmId,
        integration_type: body.integration_type,
        integration_name: body.integration_name,
        status: body.status || 'pending',
        settings: body.settings || {},
        credentials: body.credentials,
        connected_by: user.id,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'firm_id,integration_type' })
      .select()
      .single()

    if (error) {
      // No unique constraint on firm_id+integration_type, use insert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: insertData, error: insertError } = await (supabase as any)
        .from('firm_integrations')
        .insert({
          firm_id: access.firmId,
          integration_type: body.integration_type,
          integration_name: body.integration_name,
          status: body.status || 'pending',
          settings: body.settings || {},
          credentials: body.credentials,
          connected_by: user.id,
          connected_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      await logAudit({
        firmId: access.firmId,
        userId: user.id,
        action: 'create',
        entityType: 'integration',
        entityId: insertData.id,
        entityName: body.integration_name,
      }).catch(() => {})

      return NextResponse.json({ data: insertData })
    }

    await logAudit({
      firmId: access.firmId,
      userId: user.id,
      action: 'create',
      entityType: 'integration',
      entityId: data.id,
      entityName: body.integration_name,
    }).catch(() => {})

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Integrations POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/integrations - Update integration settings
export async function PATCH(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { integrationId, updates } = await req.json()
    if (!integrationId) {
      return NextResponse.json({ error: 'integrationId required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('firm_integrations')
      .update(updates)
      .eq('id', integrationId)
      .eq('firm_id', access.firmId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Integrations PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/integrations - Disconnect
export async function DELETE(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { integrationId } = await req.json()
    if (!integrationId) {
      return NextResponse.json({ error: 'integrationId required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('firm_integrations')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        credentials: null,
      })
      .eq('id', integrationId)
      .eq('firm_id', access.firmId)

    await logAudit({
      firmId: access.firmId,
      userId: user.id,
      action: 'delete',
      entityType: 'integration',
      entityId: integrationId,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Integrations DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
