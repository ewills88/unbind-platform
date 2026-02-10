import { NextRequest, NextResponse } from 'next/server'
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

// GET /api/cases/[caseId]/payments - List payments for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    // Verify case access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const isAttorney = caseData.attorney_id === user.id
    const isClient = caseData.client_id === user.id

    if (!isAttorney && !isClient) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get payments for all invoices in this case
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          id, invoice_number, total_amount, case_id
        )
      `)
      .eq('invoice.case_id', caseId)
      .order('payment_date', { ascending: false })

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      )
    }

    // Calculate summary
    const successfulPayments = (payments || []).filter(p => p.status === 'succeeded')
    const summary = {
      total_payments: successfulPayments.length,
      total_amount: successfulPayments.reduce((sum, p) => sum + p.amount, 0),
      total_fees: successfulPayments.reduce((sum, p) => sum + (p.transaction_fee || 0), 0),
      net_received: successfulPayments.reduce((sum, p) => sum + (p.net_amount || p.amount), 0)
    }

    return NextResponse.json({
      payments: payments || [],
      summary
    })
  } catch (error) {
    console.error('Payments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/payments - Record a manual payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    // Verify case access (only attorney can record manual payments)
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      invoice_id,
      payment_method,
      amount,
      payment_date,
      check_number,
      bank_name,
      notes
    } = body

    if (!invoice_id || !payment_method || !amount) {
      return NextResponse.json(
        { error: 'invoice_id, payment_method, and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Verify invoice belongs to this case
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, case_id, total_amount, balance_due, amount_paid, status')
      .eq('id', invoice_id)
      .eq('case_id', caseId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      )
    }

    if (invoice.status === 'void') {
      return NextResponse.json(
        { error: 'Cannot record payment for voided invoice' },
        { status: 400 }
      )
    }

    if (amount > invoice.balance_due) {
      return NextResponse.json(
        { error: `Amount exceeds balance due of $${invoice.balance_due.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoice_id,
        payment_method: payment_method,
        amount: amount,
        payment_date: payment_date || new Date().toISOString(),
        status: 'succeeded',
        check_number: check_number || null,
        bank_name: bank_name || null,
        notes: notes || null,
        transaction_fee: 0, // No fee for manual payments
        net_amount: amount,
        created_by: user.id
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      return NextResponse.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      )
    }

    // Update invoice
    const newAmountPaid = (invoice.amount_paid || 0) + amount
    const newBalanceDue = invoice.total_amount - newAmountPaid
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'partially_paid'

    await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        balance_due: Math.max(0, newBalanceDue),
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null
      })
      .eq('id', invoice_id)

    // Create payment receipt
    await supabase.from('payment_receipts').insert({
      payment_id: payment.id,
      receipt_number: `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
    })

    return NextResponse.json({
      payment,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        balance_due: Math.max(0, newBalanceDue),
        status: newStatus
      },
      message: 'Payment recorded successfully'
    })
  } catch (error) {
    console.error('Payments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
