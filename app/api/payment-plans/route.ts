import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
})

// GET - List payment plans (optionally filter by case_id or invoice_id)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('case_id')
  const invoiceId = searchParams.get('invoice_id')

  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    await supabase.auth.setSession({ access_token: token, refresh_token: '' })
  }

  let query = supabase
    .from('payment_plans')
    .select('*, invoice:invoices(id, invoice_number, total_amount, balance_due)')
    .order('created_at', { ascending: false })

  if (caseId) query = query.eq('case_id', caseId)
  if (invoiceId) query = query.eq('invoice_id', invoiceId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - Create a new payment plan
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    await supabase.auth.setSession({ access_token: token, refresh_token: '' })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    invoice_id,
    case_id,
    installment_count,
    frequency,
    first_payment_date,
    auto_charge,
    saved_payment_method_id,
  } = body

  // Get the invoice to determine total amount
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, balance_due, status')
    .eq('id', invoice_id)
    .single()

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (invoice.balance_due <= 0) {
    return NextResponse.json({ error: 'Invoice has no balance due' }, { status: 400 })
  }

  // Check for existing active plan on this invoice
  const { data: existingPlan } = await supabase
    .from('payment_plans')
    .select('id')
    .eq('invoice_id', invoice_id)
    .eq('status', 'active')
    .single()

  if (existingPlan) {
    return NextResponse.json({ error: 'An active payment plan already exists for this invoice' }, { status: 400 })
  }

  const totalAmount = invoice.balance_due
  const installmentAmount = Math.ceil((totalAmount / installment_count) * 100) / 100

  const { data: plan, error: planError } = await supabase
    .from('payment_plans')
    .insert({
      invoice_id,
      case_id,
      total_amount: totalAmount,
      installment_count,
      installment_amount: installmentAmount,
      frequency,
      first_payment_date,
      next_payment_date: first_payment_date,
      auto_charge: auto_charge || false,
      saved_payment_method_id: auto_charge ? saved_payment_method_id : null,
      created_by: user.id,
    })
    .select()
    .single()

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 })
  }

  return NextResponse.json(plan, { status: 201 })
}
