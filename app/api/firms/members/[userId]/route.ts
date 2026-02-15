import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { UpdateMemberRequest } from '@/types/firm'
import { memberCan, resolvePermissions } from '@/lib/permissions'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCallerMembership(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_firm_id')
    .eq('id', userId)
    .single()

  if (!profile?.current_firm_id) return null

  const { data: membership } = await supabase
    .from('firm_members')
    .select('*')
    .eq('firm_id', profile.current_firm_id)
    .eq('user_id', userId)
    .single()

  return membership
}

// PATCH /api/firms/members/[userId] - Update a member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    const { userId: targetUserId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const callerMembership = await getCallerMembership(supabase, user.id)
    if (!callerMembership || !memberCan(callerMembership, 'team', 'manage')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get target member
    const { data: targetMember } = await supabase
      .from('firm_members')
      .select('*')
      .eq('firm_id', callerMembership.firm_id)
      .eq('user_id', targetUserId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot demote owner
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot modify the firm owner' }, { status: 400 })
    }

    const body: UpdateMemberRequest = await request.json()

    const updates: Record<string, unknown> = {}

    if (body.role) {
      if (body.role === 'owner') {
        return NextResponse.json({ error: 'Cannot promote to owner' }, { status: 400 })
      }
      updates.role = body.role
      // Reset permissions to new role defaults if role changed
      updates.permissions = resolvePermissions(body.role, body.permissions)
    } else if (body.permissions) {
      updates.permissions = resolvePermissions(targetMember.role, body.permissions)
    }

    if (body.status) {
      updates.status = body.status
    }

    const { data: updated, error: updateError } = await supabase
      .from('firm_members')
      .update(updates)
      .eq('id', targetMember.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating member:', updateError)
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    return NextResponse.json({ member: updated })
  } catch (error) {
    console.error('Firm member PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/firms/members/[userId] - Remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    const { userId: targetUserId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const callerMembership = await getCallerMembership(supabase, user.id)
    if (!callerMembership || !memberCan(callerMembership, 'team', 'manage')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get target member
    const { data: targetMember } = await supabase
      .from('firm_members')
      .select('*')
      .eq('firm_id', callerMembership.firm_id)
      .eq('user_id', targetUserId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the firm owner' }, { status: 400 })
    }

    // Set status to removed
    const { error: updateError } = await supabase
      .from('firm_members')
      .update({ status: 'removed' })
      .eq('id', targetMember.id)

    if (updateError) {
      console.error('Error removing member:', updateError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    // Clear target's current_firm_id
    await supabase
      .from('profiles')
      .update({ current_firm_id: null })
      .eq('id', targetUserId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Firm member DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
