import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

// Use service role for webhook (no user context)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return null
  }

  return createClient(url, serviceKey)
}

function calculateStripeFee(amount: number): number {
  // Stripe fee: 2.9% + $0.30
  return (amount * 0.029) + 0.30
}

// POST /api/webhooks/stripe - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = getServiceClient()

  if (!supabase) {
    console.error('Failed to create Supabase client')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        const invoiceId = paymentIntent.metadata.invoice_id
        const amount = paymentIntent.amount / 100 // Convert from cents
        const fee = calculateStripeFee(amount)

        // Get charge ID
        const chargeId = paymentIntent.latest_charge as string

        // Update payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'succeeded',
            stripe_charge_id: chargeId,
            payment_date: new Date().toISOString(),
            transaction_fee: fee,
            net_amount: amount - fee
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        if (paymentError) {
          console.error('Failed to update payment:', paymentError)
        }

        // Update invoice
        const { data: invoice } = await supabase
          .from('invoices')
          .select('amount_paid, total_amount, balance_due')
          .eq('id', invoiceId)
          .single()

        if (invoice) {
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
            .eq('id', invoiceId)
        }

        // Create payment receipt
        const { data: payment } = await supabase
          .from('payments')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single()

        if (payment) {
          await supabase.from('payment_receipts').insert({
            payment_id: payment.id,
            receipt_number: `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
          })
        }

        console.log(`Payment succeeded for invoice ${invoiceId}: $${amount}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        const failureMessage = paymentIntent.last_payment_error?.message || 'Payment failed'

        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason: failureMessage
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        console.log(`Payment failed for intent ${paymentIntent.id}: ${failureMessage}`)
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        await supabase
          .from('payments')
          .update({
            status: 'cancelled'
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        console.log(`Payment cancelled for intent ${paymentIntent.id}`)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge

        const refundAmount = (charge.amount_refunded || 0) / 100

        await supabase
          .from('payments')
          .update({
            status: charge.refunded ? 'refunded' : 'partially_refunded',
            refund_amount: refundAmount,
            refunded_at: new Date().toISOString()
          })
          .eq('stripe_charge_id', charge.id)

        // If fully refunded, update invoice
        if (charge.refunded && charge.metadata?.invoice_id) {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('amount_paid, total_amount')
            .eq('id', charge.metadata.invoice_id)
            .single()

          if (invoice) {
            const originalAmount = charge.amount / 100
            const newAmountPaid = Math.max(0, (invoice.amount_paid || 0) - originalAmount)

            await supabase
              .from('invoices')
              .update({
                amount_paid: newAmountPaid,
                balance_due: invoice.total_amount - newAmountPaid,
                status: newAmountPaid > 0 ? 'partially_paid' : 'sent',
                paid_at: null
              })
              .eq('id', charge.metadata.invoice_id)
          }
        }

        console.log(`Refund processed for charge ${charge.id}: $${refundAmount}`)
        break
      }

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod

        if (paymentMethod.customer && paymentMethod.card) {
          // Check if this payment method already exists
          const { data: existing } = await supabase
            .from('saved_payment_methods')
            .select('id')
            .eq('stripe_payment_method_id', paymentMethod.id)
            .single()

          if (!existing) {
            // Find user by Stripe customer ID
            const { data: existingMethod } = await supabase
              .from('saved_payment_methods')
              .select('user_id')
              .eq('stripe_customer_id', paymentMethod.customer as string)
              .limit(1)

            if (existingMethod && existingMethod.length > 0) {
              // Check if user has any default
              const { data: defaults } = await supabase
                .from('saved_payment_methods')
                .select('id')
                .eq('user_id', existingMethod[0].user_id)
                .eq('is_default', true)

              const isDefault = !defaults || defaults.length === 0

              await supabase.from('saved_payment_methods').insert({
                user_id: existingMethod[0].user_id,
                stripe_payment_method_id: paymentMethod.id,
                stripe_customer_id: paymentMethod.customer as string,
                card_brand: paymentMethod.card.brand,
                card_last_four: paymentMethod.card.last4,
                card_exp_month: paymentMethod.card.exp_month,
                card_exp_year: paymentMethod.card.exp_year,
                is_default: isDefault
              })
            }
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
