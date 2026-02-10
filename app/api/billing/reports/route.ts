import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET - Financial summary reports for the attorney dashboard
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    await supabase.auth.setSession({ access_token: token, refresh_token: '' })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Parallel queries
    const [paymentsRes, invoicesRes, timeRes, trustRes] = await Promise.all([
      supabase
        .from('payments')
        .select('amount, payment_date, status')
        .eq('status', 'succeeded')
        .gte('payment_date', startOfMonth),
      supabase
        .from('invoices')
        .select('balance_due, due_date, status')
        .in('status', ['sent', 'viewed', 'partially_paid', 'overdue']),
      supabase
        .from('time_entries')
        .select('duration_minutes, amount')
        .eq('billable', true)
        .is('billed_at', null),
      supabase
        .from('trust_accounts')
        .select('current_balance'),
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
