// Session 21: Subscription Service (functional)
import type { Subscription, SubscriptionPlan, SubscriptionInvoice } from '@/types/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

// ============================================================
// Get Subscription
// ============================================================

export async function getSubscription(
  supabase: SupabaseClient,
  firmId: string
): Promise<Subscription | null> {
  const { data } = await (supabase as SupabaseClient)
    .from('subscriptions')
    .select('*')
    .eq('firm_id', firmId)
    .single()

  return data
}

// ============================================================
// Get Plans
// ============================================================

export async function getPlans(supabase: SupabaseClient): Promise<SubscriptionPlan[]> {
  const { data } = await (supabase as SupabaseClient)
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .eq('is_public', true)
    .order('display_order', { ascending: true })

  return data || []
}

// ============================================================
// Create Checkout Session
// ============================================================

export async function createCheckoutSession(
  supabase: SupabaseClient,
  firmId: string,
  params: {
    planId: string
    billingCycle: 'monthly' | 'annual'
    successUrl: string
    cancelUrl: string
  }
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe not configured')

  const { data: plan } = await (supabase as SupabaseClient)
    .from('subscription_plans')
    .select('*')
    .eq('id', params.planId)
    .single()

  if (!plan) throw new Error('Plan not found')

  const priceId = params.billingCycle === 'annual'
    ? plan.stripe_annual_price_id
    : plan.stripe_monthly_price_id

  if (!priceId) throw new Error('Stripe price not configured for this plan')

  // Get or create Stripe customer
  const { data: subscription } = await (supabase as SupabaseClient)
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('firm_id', firmId)
    .single()

  let customerId = subscription?.stripe_customer_id

  if (!customerId) {
    const { data: firm } = await (supabase as SupabaseClient)
      .from('firms')
      .select('name, email')
      .eq('id', firmId)
      .single()

    const customer = await stripe.customers.create({
      name: firm?.name,
      email: firm?.email,
      metadata: { firm_id: firmId },
    })
    customerId = customer.id
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { firm_id: firmId, plan_id: params.planId },
  })

  return { sessionId: session.id, url: session.url }
}

// ============================================================
// Handle Webhook Event
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleWebhookEvent(event: any): Promise<void> {
  const stripe = getStripe()
  if (!stripe) return

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js')
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const firmId = session.metadata?.firm_id
      const planId = session.metadata?.plan_id
      if (!firmId || !planId) return

      const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription)

      const { data: plan } = await (service as SupabaseClient)
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single()

      await (service as SupabaseClient)
        .from('subscriptions')
        .upsert({
          firm_id: firmId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: stripeSubscription.id,
          plan_id: planId,
          plan_name: plan?.plan_name,
          status: stripeSubscription.status,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          seats_included: plan?.seats_included || 1,
          seats_used: 1,
          monthly_price: plan?.monthly_price,
          annual_price: plan?.annual_price,
          billing_cycle: stripeSubscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
          features: plan?.features || {},
          limits: plan?.limits || {},
        }, { onConflict: 'firm_id' })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object
      await (service as SupabaseClient)
        .from('subscriptions')
        .update({
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      await (service as SupabaseClient)
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object
      const firmSub = await (service as SupabaseClient)
        .from('subscriptions')
        .select('id, firm_id')
        .eq('stripe_customer_id', invoice.customer)
        .single()

      if (firmSub.data) {
        await (service as SupabaseClient)
          .from('subscription_invoices')
          .insert({
            firm_id: firmSub.data.firm_id,
            subscription_id: firmSub.data.id,
            stripe_invoice_id: invoice.id,
            invoice_number: invoice.number,
            amount: invoice.amount_paid / 100,
            tax: (invoice.tax || 0) / 100,
            total: invoice.total / 100,
            status: 'paid',
            invoice_pdf_url: invoice.invoice_pdf,
            hosted_invoice_url: invoice.hosted_invoice_url,
            paid_at: new Date().toISOString(),
            period_start: new Date(invoice.period_start * 1000).toISOString(),
            period_end: new Date(invoice.period_end * 1000).toISOString(),
          })

        await (service as SupabaseClient)
          .from('subscriptions')
          .update({
            last_payment_date: new Date().toISOString(),
            last_payment_amount: invoice.amount_paid / 100,
            last_payment_status: 'paid',
          })
          .eq('id', firmSub.data.id)
      }
      break
    }
  }
}

// ============================================================
// Get Billing Portal URL
// ============================================================

export async function getBillingPortalUrl(
  supabase: SupabaseClient,
  firmId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe not configured')

  const { data: subscription } = await (supabase as SupabaseClient)
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('firm_id', firmId)
    .single()

  if (!subscription?.stripe_customer_id) {
    throw new Error('No subscription found')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: returnUrl,
  })

  return session.url
}

// ============================================================
// Check Feature / Limit
// ============================================================

export async function hasFeature(
  supabase: SupabaseClient,
  firmId: string,
  feature: string
): Promise<boolean> {
  const sub = await getSubscription(supabase, firmId)
  if (!sub || (sub.status !== 'active' && sub.status !== 'trialing')) return false
  return sub.features?.[feature] === true
}

export async function checkLimit(
  supabase: SupabaseClient,
  firmId: string,
  limitKey: string,
  currentValue: number
): Promise<{ allowed: boolean; limit: number; used: number; remaining: number }> {
  const sub = await getSubscription(supabase, firmId)
  const limit = sub?.limits?.[limitKey] || 0

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1, used: currentValue, remaining: -1 }
  }

  const remaining = Math.max(0, limit - currentValue)
  return {
    allowed: currentValue < limit,
    limit,
    used: currentValue,
    remaining,
  }
}

// ============================================================
// Get Subscription Invoices
// ============================================================

export async function getSubscriptionInvoices(
  supabase: SupabaseClient,
  firmId: string
): Promise<SubscriptionInvoice[]> {
  const { data } = await (supabase as SupabaseClient)
    .from('subscription_invoices')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })

  return data || []
}
