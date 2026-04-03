import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAuthenticatedClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

// POST /api/payments/create-intent - Create Stripe Payment Intent
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invoice_id, amount, save_payment_method } = body

    if (!invoice_id || !amount) {
      return NextResponse.json(
        { error: 'invoice_id and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Fetch invoice with case details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        case:cases(
          id, case_number, client_id, client_name, attorney_id
        )
      `)
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Verify user has access (is client or attorney)
    const isClient = invoice.case?.client_id === user.id
    const isAttorney = invoice.case?.attorney_id === user.id

    if (!isClient && !isAttorney) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify amount doesn't exceed balance due
    if (amount > invoice.balance_due) {
      return NextResponse.json(
        { error: `Amount exceeds balance due of $${invoice.balance_due}` },
        { status: 400 }
      )
    }

    // Check if invoice can be paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      )
    }

    if (invoice.status === 'void') {
      return NextResponse.json(
        { error: 'Cannot pay a voided invoice' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined

    // Check for existing saved payment methods
    const { data: savedMethods } = await supabase
      .from('saved_payment_methods')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .limit(1)

    if (savedMethods && savedMethods.length > 0 && savedMethods[0].stripe_customer_id) {
      stripeCustomerId = savedMethods[0].stripe_customer_id
    } else if (save_payment_method) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      })
      stripeCustomerId = customer.id
    }

    // Create Stripe Payment Intent
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        case_id: invoice.case?.id || '',
        case_number: invoice.case?.case_number || '',
        user_id: user.id
      },
      description: `Payment for Invoice ${invoice.invoice_number}`,
      automatic_payment_methods: {
        enabled: true
      }
    }

    if (stripeCustomerId) {
      paymentIntentData.customer = stripeCustomerId

      if (save_payment_method) {
        paymentIntentData.setup_future_usage = 'off_session'
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

    // Create pending payment record
    await supabase.from('payments').insert({
      invoice_id: invoice.id,
      payment_method: 'credit_card',
      amount: amount,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
      created_by: user.id
    })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: amount
    })
  } catch (error) {
    console.error('Create payment intent error:', error)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
