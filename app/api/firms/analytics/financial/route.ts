import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/firms/analytics/financial - Financial summary and A/R aging
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 400 })
    }

    const firmId = profile.current_firm_id
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('report') || 'summary'

    // Get firm case IDs
    const { data: firmCases } = await supabase
      .from('cases')
      .select('id, client_name')
      .eq('firm_id', firmId)

    const caseIds = (firmCases || []).map(c => c.id)
    const caseNameMap: Record<string, string> = {}
    for (const c of firmCases || []) {
      caseNameMap[c.id] = c.client_name || 'Unknown'
    }

    if (caseIds.length === 0) {
      return NextResponse.json({
        summary: {
          billed: 0,
          collected: 0,
          outstanding_ar: 0,
          invoices_sent: 0,
          payments_received: 0,
          avg_days_to_payment: 0,
        },
        ar_aging: null,
      })
    }

    // Current month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Financial summary
    const { data: monthInvoices } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid, status, sent_at, paid_at, created_at')
      .in('case_id', caseIds)
      .gte('created_at', monthStart)

    const billed = (monthInvoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const collected = (monthInvoices || []).reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)
    const invoicesSent = (monthInvoices || []).filter(inv => inv.sent_at).length
    const paymentsReceived = (monthInvoices || []).filter(inv => inv.amount_paid > 0).length

    // Calculate avg days to payment
    const paidInvoices = (monthInvoices || []).filter(inv => inv.paid_at && inv.sent_at)
    let avgDaysToPayment = 0
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        const sent = new Date(inv.sent_at)
        const paid = new Date(inv.paid_at)
        return sum + Math.round((paid.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24))
      }, 0)
      avgDaysToPayment = Math.round(totalDays / paidInvoices.length)
    }

    // Outstanding A/R
    const { data: outstandingInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, case_id, issue_date, due_date, total_amount, amount_paid, balance_due, status')
      .in('case_id', caseIds)
      .gt('balance_due', 0)
      .not('status', 'eq', 'void')
      .not('status', 'eq', 'draft')
      .order('due_date', { ascending: true })

    const outstandingAR = (outstandingInvoices || []).reduce(
      (sum, inv) => sum + (inv.balance_due || 0), 0
    )

    let arAging = null

    if (reportType === 'ar' || reportType === 'summary') {
      let current = 0, days31_60 = 0, days61_90 = 0, days90Plus = 0
      const arInvoices = []

      for (const inv of outstandingInvoices || []) {
        const dueDate = new Date(inv.due_date)
        const daysOverdue = Math.max(0, Math.round((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
        const balance = inv.balance_due || 0

        if (daysOverdue <= 30) current += balance
        else if (daysOverdue <= 60) days31_60 += balance
        else if (daysOverdue <= 90) days61_90 += balance
        else days90Plus += balance

        arInvoices.push({
          id: inv.id,
          invoice_number: inv.invoice_number,
          client_name: caseNameMap[inv.case_id] || 'Unknown',
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          total_amount: inv.total_amount,
          amount_paid: inv.amount_paid || 0,
          balance_due: balance,
          days_overdue: daysOverdue,
        })
      }

      const total = current + days31_60 + days61_90 + days90Plus

      arAging = {
        current: Math.round(current * 100) / 100,
        current_percent: total > 0 ? Math.round((current / total) * 100) : 0,
        days_31_60: Math.round(days31_60 * 100) / 100,
        days_31_60_percent: total > 0 ? Math.round((days31_60 / total) * 100) : 0,
        days_61_90: Math.round(days61_90 * 100) / 100,
        days_61_90_percent: total > 0 ? Math.round((days61_90 / total) * 100) : 0,
        days_90_plus: Math.round(days90Plus * 100) / 100,
        days_90_plus_percent: total > 0 ? Math.round((days90Plus / total) * 100) : 0,
        total: Math.round(total * 100) / 100,
        invoice_count: arInvoices.length,
        invoices: arInvoices,
      }
    }

    return NextResponse.json({
      summary: {
        billed: Math.round(billed * 100) / 100,
        collected: Math.round(collected * 100) / 100,
        outstanding_ar: Math.round(outstandingAR * 100) / 100,
        invoices_sent: invoicesSent,
        payments_received: paymentsReceived,
        avg_days_to_payment: avgDaysToPayment,
      },
      ar_aging: arAging,
    })
  } catch (error) {
    console.error('Financial analytics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
