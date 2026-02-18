import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { inviteMember, getInvitations, revokeInvitation } from '@/lib/admin/userManagementService'
import { logAudit } from '@/lib/admin/auditService'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { client: null, user: null }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: { headers: { cookie: cookieStore.toString() } },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { client: null, user: null }
  return { client: supabase, user }
}

async function checkInviteAccess(
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
    .select('role, is_admin, can_manage_users, permissions, status')
    .eq('firm_id', profile.current_firm_id)
    .eq('user_id', userId)
    .single()

  if (!membership || membership.status !== 'active') return null

  const canInvite = membership.role === 'owner' || membership.is_admin || membership.can_manage_users ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (membership.permissions as any)?.team?.invite

  if (!canInvite) return null

  return { firmId: profile.current_firm_id }
}

// GET /api/admin/users/invite - List invitations
export async function GET() {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkInviteAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const invitations = await getInvitations(supabase, access.firmId)
    return NextResponse.json({ data: invitations })
  } catch (error) {
    console.error('Invitations GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/users/invite - Send invitation
export async function POST(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkInviteAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    if (!body.email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const result = await inviteMember(access.firmId, {
      email: body.email,
      role: body.role,
      role_id: body.role_id,
      title: body.title,
      department: body.department,
      hourly_rate: body.hourly_rate,
      invitedBy: user.id,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    await logAudit({
      firmId: access.firmId,
      userId: user.id,
      action: 'invite',
      entityType: 'firm_invitation',
      entityName: body.email,
      changes: { after: { email: body.email, role: body.role } },
    }).catch(() => {})

    return NextResponse.json({ data: result.invitation })
  } catch (error) {
    console.error('Invite POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/users/invite - Revoke invitation
export async function DELETE(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkInviteAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { invitationId } = await req.json()
    if (!invitationId) {
      return NextResponse.json({ error: 'invitationId required' }, { status: 400 })
    }

    await revokeInvitation(supabase, access.firmId, invitationId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invite DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
