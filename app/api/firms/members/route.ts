import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/firms/members - List firm members
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current firm
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a member of any firm' }, { status: 400 })
    }

    // Verify active membership
    const { data: myMembership } = await supabase
      .from('firm_members')
      .select('id, status')
      .eq('firm_id', profile.current_firm_id)
      .eq('user_id', user.id)
      .single()

    if (!myMembership || (myMembership.status !== 'active' && myMembership.status !== 'invited')) {
      return NextResponse.json({ error: 'Not an active member' }, { status: 403 })
    }

    // Get all members with profiles
    const { data: members, error: membersError } = await supabase
      .from('firm_members')
      .select(`
        *,
        profile:profiles!firm_members_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('firm_id', profile.current_firm_id)
      .neq('status', 'removed')
      .order('role', { ascending: true })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      // Fallback: try without join
      const { data: membersOnly, error: fallbackError } = await supabase
        .from('firm_members')
        .select('*')
        .eq('firm_id', profile.current_firm_id)
        .neq('status', 'removed')
        .order('role', { ascending: true })

      if (fallbackError) {
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
      }

      return NextResponse.json({ members: membersOnly || [] })
    }

    return NextResponse.json({ members: members || [] })
  } catch (error) {
    console.error('Firm members GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
