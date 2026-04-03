import { NextResponse } from 'next/server'
import { getRoles, createRole, updateRole, getPermissions, getRolePermissions } from '@/lib/admin/userManagementService'
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

// GET /api/admin/roles
export async function GET(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const roleId = url.searchParams.get('roleId')

    if (roleId) {
      const permissions = await getRolePermissions(supabase, roleId)
      return NextResponse.json({ data: permissions })
    }

    const [roles, allPermissions] = await Promise.all([
      getRoles(supabase, access.firmId),
      getPermissions(supabase),
    ])

    return NextResponse.json({ data: { roles, permissions: allPermissions } })
  } catch (error) {
    console.error('Roles GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/roles
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
    if (!body.role_name || !body.role_key) {
      return NextResponse.json({ error: 'role_name and role_key required' }, { status: 400 })
    }

    const role = await createRole(supabase, access.firmId, {
      role_name: body.role_name,
      role_key: body.role_key,
      description: body.description,
      permissions: body.permissions || [],
    })

    await logAudit({
      firmId: access.firmId,
      userId: user.id,
      action: 'create',
      entityType: 'role',
      entityId: role.id,
      entityName: body.role_name,
    }).catch(() => {})

    return NextResponse.json({ data: role })
  } catch (error) {
    console.error('Roles POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/roles
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

    const { roleId, updates, permissions } = await req.json()
    if (!roleId) {
      return NextResponse.json({ error: 'roleId required' }, { status: 400 })
    }

    const role = await updateRole(supabase, access.firmId, roleId, updates || {}, permissions)

    await logAudit({
      firmId: access.firmId,
      userId: user.id,
      action: 'update',
      entityType: 'role',
      entityId: roleId,
      changes: { after: updates },
    }).catch(() => {})

    return NextResponse.json({ data: role })
  } catch (error) {
    console.error('Roles PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
