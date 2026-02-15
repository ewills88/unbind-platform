import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { InviteMemberRequest } from '@/types/firm'
import { memberCan, getDefaultPermissions, resolvePermissions } from '@/lib/permissions'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { client: null, user: null }
  }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: {
      headers: {
        cookie: cookieStore.toString()
      }
    }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { client: null, user: null }
  }

  return { client: supabase, user }
}

// POST /api/firms/invite - Invite a member to the firm
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get caller's firm membership
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a member of any firm' }, { status: 400 })
    }

    const { data: callerMembership } = await supabase
      .from('firm_members')
      .select('*')
      .eq('firm_id', profile.current_firm_id)
      .eq('user_id', user.id)
      .single()

    if (!callerMembership || !memberCan(callerMembership, 'team', 'invite')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body: InviteMemberRequest = await request.json()

    if (!body.email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!body.role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 })
    }

    if (body.role === 'owner') {
      return NextResponse.json({ error: 'Cannot invite as owner' }, { status: 400 })
    }

    // Check if already a member
    const { data: existingByEmail } = await supabase
      .from('firm_members')
      .select('id, status, invited_email')
      .eq('firm_id', profile.current_firm_id)
      .eq('invited_email', body.email.trim().toLowerCase())
      .neq('status', 'removed')
      .limit(1)
      .single()

    if (existingByEmail) {
      return NextResponse.json({ error: 'This email has already been invited' }, { status: 400 })
    }

    // Look up the user by email to get user_id (if they exist)
    const { data: invitedProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', body.email.trim().toLowerCase())
      .single()

    const permissions = body.permissions
      ? resolvePermissions(body.role, body.permissions)
      : getDefaultPermissions(body.role)

    const memberData: Record<string, unknown> = {
      firm_id: profile.current_firm_id,
      role: body.role,
      permissions,
      status: 'invited',
      invited_email: body.email.trim().toLowerCase(),
      invited_at: new Date().toISOString(),
    }

    if (invitedProfile) {
      memberData.user_id = invitedProfile.id
    }

    const { data: member, error: insertError } = await supabase
      .from('firm_members')
      .insert(memberData)
      .select()
      .single()

    if (insertError) {
      console.error('Error inviting member:', insertError)
      return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 })
    }

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Firm invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
