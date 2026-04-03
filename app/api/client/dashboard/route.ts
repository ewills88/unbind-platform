import { NextRequest, NextResponse } from 'next/server'
import { ClientDashboardData } from '@/types/client'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/client/dashboard - Aggregated dashboard data for client
export async function GET(_request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

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
      .select('id, client_name, status, attorney_id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let attorneyName: string | null = null
    if (caseData?.attorney_id) {
      const { data: attorney } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', caseData.attorney_id)
        .single()
      attorneyName = attorney?.full_name || null
    }

    // Get progress (table may not exist yet)
    let progress = null
    if (caseData) {
      try {
        const { data: progressData } = await supabase
          .from('client_progress')
          .select('*')
          .eq('case_id', caseData.id)
          .single()
        progress = progressData
      } catch {
        // client_progress table may not exist
      }
    }

    // Get pending tasks (limit 5, table may not exist yet)
    let pendingTasks: Record<string, unknown>[] = []
    if (caseData) {
      try {
        const { data: tasks } = await supabase
          .from('client_tasks')
          .select('*')
          .eq('case_id', caseData.id)
          .in('status', ['pending', 'in_progress'])
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(5)
        pendingTasks = tasks || []
      } catch {
        // client_tasks table may not exist
      }
    }

    // Get unread message count
    let unreadMessages = 0
    try {
      const { data: unreadData } = await supabase
        .from('message_unread_counts')
        .select('unread_count')
        .eq('user_id', user.id)
      unreadMessages = unreadData?.reduce((sum: number, row: Record<string, unknown>) => sum + ((row.unread_count as number) || 0), 0) || 0
    } catch {
      // Table may not exist yet
    }

    // Get document count
    let documentCount = 0
    if (caseData) {
      try {
        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('case_id', caseData.id)
        documentCount = count || 0
      } catch {
        // documents table may not exist
      }
    }

    // Get next appointment (table may not exist yet)
    let nextAppointment = null
    if (caseData) {
      try {
        const { data: events } = await supabase
          .from('events')
          .select('id, title, start_time')
          .eq('case_id', caseData.id)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(1)
        nextAppointment = events?.[0] || null
      } catch {
        // events table may not exist
      }
    }

    // Get outstanding invoice amount
    let outstandingAmount = 0
    if (caseData) {
      try {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('total_amount, amount_paid')
          .eq('case_id', caseData.id)
          .in('status', ['sent', 'overdue'])
        if (invoices) {
          outstandingAmount = invoices.reduce(
            (sum: number, inv: Record<string, unknown>) => sum + (((inv.total_amount as number) || 0) - ((inv.amount_paid as number) || 0)),
            0
          )
        }
      } catch {
        // Table may not exist yet
      }
    }

    const dashboardData: ClientDashboardData = {
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
      } : null,
      progress,
      pending_tasks: pendingTasks,
      unread_messages: unreadMessages,
      document_count: documentCount,
      next_appointment: nextAppointment,
      outstanding_invoice_amount: outstandingAmount,
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Client dashboard GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
