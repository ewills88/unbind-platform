import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { client: null, user: null }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: { headers: { cookie: cookieStore.toString() } }
  })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { client: null, user: null }
  return { client: supabase, user }
}

// GET /api/cases/[caseId]/revenue-shares
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    const { caseId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: shares, error: sharesError } = await supabase
      .from('revenue_shares')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true })

    if (sharesError) {
      console.error('Error fetching revenue shares:', sharesError)
      return NextResponse.json({ shares: [] })
    }

    // Get user names for each share
    const userIds = Array.from(new Set((shares || []).map(s => s.user_id)))
    let userMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      for (const p of profiles || []) {
        userMap[p.id] = p.full_name || p.email
      }
    }

    const sharesWithNames = (shares || []).map(share => ({
      ...share,
      user_name: userMap[share.user_id] || 'Unknown',
    }))

    return NextResponse.json({ shares: sharesWithNames })
  } catch (error) {
    console.error('Revenue shares GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/revenue-shares
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

    // Verify firm membership and permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 400 })
    }

    const { data: membership } = await supabase
      .from('firm_members')
      .select('role')
      .eq('firm_id', profile.current_firm_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['owner', 'senior_attorney'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { shares } = body

    if (!Array.isArray(shares)) {
      return NextResponse.json({ error: 'Shares must be an array' }, { status: 400 })
    }

    // Validate total percentage doesn't exceed 100
    const totalPercentage = shares
      .filter((s: { share_type: string }) => s.share_type === 'percentage')
      .reduce((sum: number, s: { share_percentage?: number }) => sum + (s.share_percentage || 0), 0)

    if (totalPercentage > 100) {
      return NextResponse.json({ error: 'Total percentage cannot exceed 100%' }, { status: 400 })
    }

    // Delete existing shares for this case
    await supabase
      .from('revenue_shares')
      .delete()
      .eq('case_id', caseId)

    // Insert new shares
    if (shares.length > 0) {
      const rows = shares.map((share: {
        user_id: string
        share_type: string
        share_percentage?: number
        fixed_amount?: number
        applies_to?: string
        notes?: string
      }) => ({
        case_id: caseId,
        firm_id: profile.current_firm_id,
        user_id: share.user_id,
        share_type: share.share_type || 'percentage',
        share_percentage: share.share_percentage || 0,
        fixed_amount: share.fixed_amount || 0,
        applies_to: share.applies_to || 'all_revenue',
        notes: share.notes || null,
      }))

      const { error: insertError } = await supabase
        .from('revenue_shares')
        .insert(rows)

      if (insertError) {
        console.error('Error saving revenue shares:', insertError)
        return NextResponse.json({ error: 'Failed to save revenue shares' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Revenue shares POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
