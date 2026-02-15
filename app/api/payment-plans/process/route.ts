import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Uses service role key since this is a cron/server-side operation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
})

function calculateNextPaymentDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate)
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'biweekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
  }
  return date.toISOString().split('T')[0]
}

// POST - Process scheduled payment plan charges (cron job endpoint)
export async function POST(request: NextRequest) {
  try {
    // Basic auth check for cron endpoints
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

  // Get all active payment plans with auto_charge where next_payment_date <= today
  const { data: duePlans, error: fetchError } = await supabase
    .from('payment_plans')
    .select(`
      *,
      saved_payment_method:saved_payment_methods(
        stripe_payment_method_id,
        stripe_customer_id
      )
    `)
    .eq('status', 'active')
    .eq('auto_charge', true)
    .lte('next_payment_date', today)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!duePlans || duePlans.length === 0) {
    return NextResponse.json({ message: 'No payments due', processed: 0 })
  }

  const results = []

  for (const plan of duePlans) {
    const paymentMethod = plan.saved_payment_method
    if (!paymentMethod?.stripe_payment_method_id || !paymentMethod?.stripe_customer_id) {
      results.push({ plan_id: plan.id, status: 'skipped', reason: 'No saved payment method' })
      continue
    }

    try {
      // Create and confirm payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(plan.installment_amount * 100),
        currency: 'usd',
        payment_method: paymentMethod.stripe_payment_method_id,
        customer: paymentMethod.stripe_customer_id,
        confirm: true,
        off_session: true,
        metadata: {
          invoice_id: plan.invoice_id,
          payment_plan_id: plan.id,
        },
      })

      if (paymentIntent.status === 'succeeded') {
        const newPaymentsMade = plan.payments_made + 1
        const newAmountPaid = parseFloat(plan.amount_paid) + parseFloat(plan.installment_amount)
        const isLastPayment = newPaymentsMade >= plan.installment_count

        // Record the payment
        await supabase.from('payments').insert({
          invoice_id: plan.invoice_id,
          payment_method: 'credit_card',
          amount: plan.installment_amount,
          stripe_payment_intent_id: paymentIntent.id,
          status: 'succeeded',
          created_by: plan.created_by,
        })

        // Update the payment plan
        await supabase
          .from('payment_plans')
          .update({
            payments_made: newPaymentsMade,
            amount_paid: newAmountPaid,
            next_payment_date: isLastPayment
              ? null
              : calculateNextPaymentDate(plan.next_payment_date, plan.frequency),
            last_payment_date: today,
            status: isLastPayment ? 'completed' : 'active',
          })
          .eq('id', plan.id)

        // Update invoice amount_paid and balance_due
        await supabase.rpc('update_invoice_payment', {
          p_invoice_id: plan.invoice_id,
          p_amount: plan.installment_amount,
        })

        results.push({ plan_id: plan.id, status: 'succeeded', payment_intent: paymentIntent.id })
      } else {
        results.push({ plan_id: plan.id, status: 'requires_action', payment_intent: paymentIntent.id })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Mark as defaulted after 3 consecutive failures (simplified)
      results.push({ plan_id: plan.id, status: 'failed', error: errorMessage })
    }
  }

  return NextResponse.json({ message: 'Processing complete', processed: results.length, results })
  } catch (error) {
    console.error('Payment plans process error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
