import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { AssignCaseRequest } from '@/types/firm'
import { memberCan } from '@/lib/permissions'

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

// POST /api/cases/[caseId]/assign - Assign team members to a case
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    const { caseId } = await params

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

    if (!callerMembership || !memberCan(callerMembership, 'cases', 'assign')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body: AssignCaseRequest = await request.json()

    if (!body.assignments || body.assignments.length === 0) {
      return NextResponse.json({ error: 'At least one assignment is required' }, { status: 400 })
    }

    // Ensure exactly one lead
    const leads = body.assignments.filter(a => a.role === 'lead')
    if (leads.length !== 1) {
      return NextResponse.json({ error: 'Exactly one lead attorney is required' }, { status: 400 })
    }

    // Validate all assigned users are active firm members
    const userIds = body.assignments.map(a => a.user_id)
    const { data: activeMembers } = await supabase
      .from('firm_members')
      .select('user_id')
      .eq('firm_id', profile.current_firm_id)
      .eq('status', 'active')
      .in('user_id', userIds)

    if (!activeMembers || activeMembers.length !== userIds.length) {
      return NextResponse.json({ error: 'All assigned users must be active firm members' }, { status: 400 })
    }

    // Delete existing assignments for this case
    await supabase
      .from('case_assignments')
      .delete()
      .eq('case_id', caseId)

    // Insert new assignments
    const assignmentRows = body.assignments.map(a => ({
      case_id: caseId,
      user_id: a.user_id,
      firm_id: profile.current_firm_id,
      role: a.role,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
    }))

    const { data: assignments, error: insertError } = await supabase
      .from('case_assignments')
      .insert(assignmentRows)
      .select()

    if (insertError) {
      console.error('Error creating assignments:', insertError)
      return NextResponse.json({ error: 'Failed to create assignments' }, { status: 500 })
    }

    // Set case.firm_id if not already set
    await supabase
      .from('cases')
      .update({ firm_id: profile.current_firm_id })
      .eq('id', caseId)
      .is('firm_id', null)

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Case assign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
