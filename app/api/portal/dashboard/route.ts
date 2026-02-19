import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { PortalDashboardData } from '@/types/portal'

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

// GET /api/portal/dashboard — enhanced portal dashboard data
export async function GET() {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get client's case
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, client_name, status, attorney_id, firm_id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let attorneyName: string | null = null
    let firmName: string | null = null

    if (caseData?.attorney_id) {
      const { data: attorney } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', caseData.attorney_id)
        .single()
      attorneyName = attorney?.full_name || null
    }

    if (caseData?.firm_id) {
      const { data: firm } = await supabase
        .from('firms')
        .select('name')
        .eq('id', caseData.firm_id)
        .single()
      firmName = firm?.name || null
    }

    // Get progress
    let progress = null
    if (caseData) {
      const { data: progressData } = await supabase
        .from('client_progress')
        .select('current_stage, overall_completion_percentage, estimated_completion_date')
        .eq('case_id', caseData.id)
        .single()
      progress = progressData
    }

    // Get pending task count
    let pendingTasks = 0
    if (caseData) {
      const { count } = await supabase
        .from('client_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', caseData.id)
        .in('status', ['pending', 'in_progress'])
      pendingTasks = count || 0
    }

    // Get unread conversation count
    let unreadConversations = 0
    if (caseData) {
      const { data: convos } = await supabase
        .from('portal_conversations')
        .select('client_unread_count')
        .eq('case_id', caseData.id)
        .eq('status', 'open')
        .gt('client_unread_count', 0)
      unreadConversations = convos?.length || 0
    }

    // Get recent activity (last 10 entries visible to client)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recentActivity: any[] = []
    if (caseData) {
      const { data: activity } = await supabase
        .from('case_activity_log')
        .select('*')
        .eq('case_id', caseData.id)
        .eq('is_visible_to_client', true)
        .order('created_at', { ascending: false })
        .limit(10)
      recentActivity = activity || []
    }

    // Get upcoming events (next 5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let upcomingEvents: any[] = []
    if (caseData) {
      const { data: events } = await supabase
        .from('case_events')
        .select('id, title, event_date, event_type')
        .eq('case_id', caseData.id)
        .eq('status', 'upcoming')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(5)
      upcomingEvents = events || []
    }

    // Get recent documents (last 5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recentDocuments: any[] = []
    if (caseData) {
      const { data: docs } = await supabase
        .from('documents')
        .select('id, file_name, created_at')
        .eq('case_id', caseData.id)
        .order('created_at', { ascending: false })
        .limit(5)
      recentDocuments = docs || []
    }

    // Get outstanding balance
    let outstandingBalance = 0
    if (caseData) {
      try {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('total_amount, amount_paid')
          .eq('case_id', caseData.id)
          .in('status', ['sent', 'overdue'])
        if (invoices) {
          outstandingBalance = invoices.reduce(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sum: number, inv: any) => sum + ((inv.total_amount || 0) - (inv.amount_paid || 0)),
            0
          )
        }
      } catch {
        // Table may not exist yet
      }
    }

    const dashboardData: PortalDashboardData = {
      profile: {
        full_name: profile.full_name || '',
        email: profile.email || '',
      },
      case_info: caseData ? {
        id: caseData.id,
        client_name: caseData.client_name,
        status: caseData.status,
        attorney_name: attorneyName,
        attorney_id: caseData.attorney_id,
        firm_name: firmName,
      } : null,
      progress,
      pending_tasks: pendingTasks,
      unread_conversations: unreadConversations,
      recent_activity: recentActivity,
      upcoming_events: upcomingEvents,
      recent_documents: recentDocuments,
      outstanding_balance: outstandingBalance,
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Portal dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
