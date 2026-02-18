import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getFirmMembers, updateMember, deactivateMember } from '@/lib/admin/userManagementService'
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

async function checkAdminAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<{ firmId: string; isAdmin: boolean } | null> {
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

  const isAdmin = membership.role === 'owner' || membership.is_admin || membership.can_manage_users ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (membership.permissions as any)?.team?.manage

  return { firmId: profile.current_firm_id, isAdmin }
}

// GET /api/admin/users
export async function GET(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const includeInactive = url.searchParams.get('include_inactive') === 'true'

    const members = await getFirmMembers(supabase, access.firmId, { includeInactive })

    // Enrich with profile data
    const userIds = members
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m.user_id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((id: any) => id)

    let profiles: Record<string, { full_name: string; email: string; avatar_url?: string }> = {}
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds)

      if (profileData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profiles = Object.fromEntries(profileData.map((p: any) => [p.id, p]))
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enriched = members.map((m: any) => ({
      ...m,
      profile: profiles[m.user_id] || null,
    }))

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Admin users GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/users - Update member
export async function PATCH(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { memberId, updates } = await req.json()
    if (!memberId) {
      return NextResponse.json({ error: 'memberId required' }, { status: 400 })
    }

    const result = await updateMember(supabase, access.firmId, memberId, updates)

    await logAudit({
      firmId: access.firmId,
      userId: user.id,
      action: 'update',
      entityType: 'firm_member',
      entityId: memberId,
      changes: { after: updates },
    }).catch(() => {})

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Admin users PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/users - Deactivate member
export async function DELETE(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { memberId, reassignTo } = await req.json()
    if (!memberId) {
      return NextResponse.json({ error: 'memberId required' }, { status: 400 })
    }

    await deactivateMember(access.firmId, memberId, user.id, reassignTo)

    await logAudit({
      firmId: access.firmId,
      userId: user.id,
      action: 'deactivate',
      entityType: 'firm_member',
      entityId: memberId,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin users DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
