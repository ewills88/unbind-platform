import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

// GET /api/client/invoices - Get invoices for the client's case
export async function GET() {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get client's case
    const { data: caseData } = await supabase
      .from('cases')
      .select('id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!caseData) {
      return NextResponse.json({ invoices: [], summary: null })
    }

    // Get invoices (exclude drafts - those are attorney-only)
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, line_items:invoice_line_items(*)')
      .eq('case_id', caseData.id)
      .neq('status', 'draft')
      .order('issue_date', { ascending: false })

    if (invoiceError) {
      console.error('Error fetching invoices:', invoiceError)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    const invoiceList = invoices || []

    // Calculate summary
    const outstanding = invoiceList.filter(inv =>
      inv.status !== 'paid' && inv.status !== 'void'
    )
    const paid = invoiceList.filter(inv => inv.status === 'paid')
    const overdue = outstanding.filter(inv => new Date(inv.due_date) < new Date())

    const summary = {
      total_outstanding: outstanding.reduce((sum: number, inv: { balance_due: number }) => sum + (inv.balance_due || 0), 0),
      total_paid: paid.reduce((sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0), 0),
      overdue_count: overdue.length,
      overdue_amount: overdue.reduce((sum: number, inv: { balance_due: number }) => sum + (inv.balance_due || 0), 0),
    }

    // Mark as viewed if not already
    const unviewedIds = invoiceList
      .filter(inv => inv.status === 'sent')
      .map(inv => inv.id)

    if (unviewedIds.length > 0) {
      await supabase
        .from('invoices')
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .in('id', unviewedIds)
    }

    return NextResponse.json({ invoices: invoiceList, summary })
  } catch (error) {
    console.error('Client invoices GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
