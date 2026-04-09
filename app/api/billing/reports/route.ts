import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET - Financial summary reports for the attorney dashboard
export async function GET(request: NextRequest) {
  const { client: supabase, user } = await getAuthenticatedClient(request)
  if (!user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Get cases this attorney is assigned to, for scoping all queries
    const { data: userCases } = await supabase
      .from('cases')
      .select('id')
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)

    const caseIds = (userCases || []).map(c => c.id)

    if (caseIds.length === 0) {
      return NextResponse.json({
        revenue_this_month: 0,
        accounts_receivable: 0,
        overdue_count: 0,
        unbilled_time_value: 0,
        unbilled_hours: 0,
        total_trust_balance: 0,
        trust_account_count: 0,
      })
    }

    // Parallel queries — all scoped to user's cases
    const [paymentsRes, invoicesRes, timeRes, trustRes] = await Promise.all([
      supabase
        .from('payments')
        .select('amount, payment_date, status')
        .eq('status', 'succeeded')
        .in('case_id', caseIds)
        .gte('payment_date', startOfMonth),
      supabase
        .from('invoices')
        .select('balance_due, due_date, status')
        .in('case_id', caseIds)
        .in('status', ['sent', 'viewed', 'partially_paid', 'overdue']),
      supabase
        .from('time_entries')
        .select('duration_minutes, amount')
        .in('case_id', caseIds)
        .eq('billable', true)
        .is('billed_at', null),
      supabase
        .from('trust_accounts')
        .select('current_balance')
        .in('case_id', caseIds),
    ])

    const revenue = (paymentsRes.data || []).reduce((s, p) => s + parseFloat(String(p.amount)), 0)
    const ar = (invoicesRes.data || []).reduce((s, i) => s + parseFloat(String(i.balance_due)), 0)
    const overdueCount = (invoicesRes.data || []).filter(i => new Date(i.due_date) < now).length
    const unbilledValue = (timeRes.data || []).reduce((s, t) => s + parseFloat(String(t.amount)), 0)
    const unbilledMins = (timeRes.data || []).reduce((s, t) => s + t.duration_minutes, 0)
    const trustTotal = (trustRes.data || []).reduce((s, t) => s + parseFloat(String(t.current_balance)), 0)

    return NextResponse.json({
      revenue_this_month: revenue,
      accounts_receivable: ar,
      overdue_count: overdueCount,
      unbilled_time_value: unbilledValue,
      unbilled_hours: Math.round((unbilledMins / 60) * 10) / 10,
      total_trust_balance: trustTotal,
      trust_account_count: (trustRes.data || []).length,
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
