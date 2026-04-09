import { NextResponse } from 'next/server'
import { getAuditLogs, getLoginHistory } from '@/lib/admin/auditService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/admin/audit
export async function GET(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(req)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'No firm' }, { status: 400 })
    }

    const { data: membership } = await supabase
      .from('firm_members')
      .select('role, is_admin, status')
      .eq('firm_id', profile.current_firm_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (membership.role !== 'owner' && !membership.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const type = url.searchParams.get('type')

    if (type === 'login') {
      const targetUserId = url.searchParams.get('userId') || user.id

      // Verify target user belongs to the same firm
      if (targetUserId !== user.id) {
        const { data: targetMembership } = await supabase
          .from('firm_members')
          .select('id')
          .eq('firm_id', profile.current_firm_id)
          .eq('user_id', targetUserId)
          .single()

        if (!targetMembership) {
          return NextResponse.json({ error: 'User not in your firm' }, { status: 403 })
        }
      }

      const logs = await getLoginHistory(supabase, targetUserId)
      return NextResponse.json({ data: logs })
    }

    const result = await getAuditLogs(supabase, profile.current_firm_id, {
      entityType: url.searchParams.get('entityType') || undefined,
      entityId: url.searchParams.get('entityId') || undefined,
      userId: url.searchParams.get('userId') || undefined,
      action: url.searchParams.get('action') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
    })

    return NextResponse.json({ data: result.logs, total: result.total })
  } catch (error) {
    console.error('Audit GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
