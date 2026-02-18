// Session 20 CP3: Portal Payment Service
// Stripe integration for client-facing payments, payment methods, invoices

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// ============================================================
// Get or create Stripe customer
// ============================================================

export async function getOrCreateStripeCustomer(clientId: string): Promise<string | null> {
  const supabase = getServiceClient()
  const stripe = getStripe()
  if (!stripe) return null

  // Check if customer already exists in saved_payment_methods
  const { data: existing } = await supabase
    .from('saved_payment_methods')
    .select('stripe_customer_id')
    .eq('user_id', clientId)
    .not('stripe_customer_id', 'is', null)
    .limit(1)

  if (existing && existing.length > 0 && existing[0].stripe_customer_id) {
    return existing[0].stripe_customer_id
  }

  // Get client profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', clientId)
    .single()

  if (!profile) return null

  // Create Stripe customer
  const customer = await stripe.customers.create({
    email: profile.email,
    name: profile.full_name || undefined,
    metadata: { client_id: clientId },
  })

  return customer.id
}

// ============================================================
// Create setup intent for adding payment method
// ============================================================

export async function createSetupIntent(clientId: string): Promise<{
  clientSecret: string
  customerId: string
} | null> {
  const stripe = getStripe()
  if (!stripe) return null

  const customerId = await getOrCreateStripeCustomer(clientId)
  if (!customerId) return null

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    metadata: { client_id: clientId },
  })

  return {
    clientSecret: setupIntent.client_secret!,
    customerId,
  }
}

// ============================================================
// Save payment method after Stripe setup
// ============================================================

export async function savePaymentMethod(
  clientId: string,
  stripePaymentMethodId: string,
  stripeCustomerId: string,
  setAsDefault: boolean = true
) {
  const supabase = getServiceClient()
  const stripe = getStripe()
  if (!stripe) return { error: 'Stripe not configured' }

  // Get payment method details from Stripe
  const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId)

  // If setting as default, unset other defaults
  if (setAsDefault) {
    await supabase
      .from('saved_payment_methods')
      .update({ is_default: false })
      .eq('user_id', clientId)

    // Set as default in Stripe
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: stripePaymentMethodId },
    })
  }

  // Save to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('saved_payment_methods')
    .insert({
      user_id: clientId,
      stripe_payment_method_id: stripePaymentMethodId,
      stripe_customer_id: stripeCustomerId,
      type: paymentMethod.type === 'card' ? 'card' : 'bank_account',
      card_brand: paymentMethod.card?.brand || null,
      card_last_four: paymentMethod.card?.last4 || null,
      card_exp_month: paymentMethod.card?.exp_month || null,
      card_exp_year: paymentMethod.card?.exp_year || null,
      is_default: setAsDefault,
      is_active: true,
      is_verified: true,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { method: data }
}

// ============================================================
// Get client's payment methods
// ============================================================

export async function getPaymentMethods(clientId: string) {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('saved_payment_methods')
    .select('*')
    .eq('user_id', clientId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })

  if (error) throw error
  return data || []
}

// ============================================================
// Delete payment method
// ============================================================

export async function deletePaymentMethod(clientId: string, paymentMethodId: string) {
  const supabase = getServiceClient()
  const stripe = getStripe()

  const { data: method } = await supabase
    .from('saved_payment_methods')
    .select('stripe_payment_method_id')
    .eq('id', paymentMethodId)
    .eq('user_id', clientId)
    .single()

  if (!method) return { error: 'Payment method not found' }

  // Detach from Stripe if configured
  if (stripe) {
    try {
      await stripe.paymentMethods.detach(method.stripe_payment_method_id)
    } catch {
      // Continue even if Stripe detach fails
    }
  }

  // Mark as inactive
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('saved_payment_methods')
    .update({ is_active: false })
    .eq('id', paymentMethodId)

  return { success: true }
}

// ============================================================
// Set default payment method
// ============================================================

export async function setDefaultPaymentMethod(clientId: string, paymentMethodId: string) {
  const supabase = getServiceClient()
  const stripe = getStripe()

  const { data: method } = await supabase
    .from('saved_payment_methods')
    .select('stripe_payment_method_id, stripe_customer_id')
    .eq('id', paymentMethodId)
    .eq('user_id', clientId)
    .single()

  if (!method) return { error: 'Payment method not found' }

  // Unset other defaults
  await supabase
    .from('saved_payment_methods')
    .update({ is_default: false })
    .eq('user_id', clientId)

  // Set new default
  await supabase
    .from('saved_payment_methods')
    .update({ is_default: true })
    .eq('id', paymentMethodId)

  // Update Stripe customer
  if (stripe && method.stripe_customer_id) {
    try {
      await stripe.customers.update(method.stripe_customer_id, {
        invoice_settings: { default_payment_method: method.stripe_payment_method_id },
      })
    } catch {
      // Continue even if Stripe update fails
    }
  }

  return { success: true }
}

// ============================================================
// Get client invoices
// ============================================================

export async function getClientInvoices(clientId: string, status?: string) {
  const supabase = getServiceClient()

  // Get cases for client
  const { data: cases } = await supabase
    .from('cases')
    .select('id')
    .eq('client_id', clientId)

  const caseIds = (cases || []).map(c => c.id)
  if (caseIds.length === 0) return []

  let query = supabase
    .from('invoices')
    .select('id, invoice_number, issue_date, due_date, status, total_amount, amount_paid, balance_due, case_id')
    .in('case_id', caseIds)
    .order('issue_date', { ascending: false })

  if (status === 'outstanding') {
    query = query.in('status', ['sent', 'overdue', 'partially_paid'])
  } else if (status === 'paid') {
    query = query.eq('status', 'paid')
  }

  const { data, error } = await query
  if (error) throw error

  // Get case numbers
  const { data: caseData } = await supabase
    .from('cases')
    .select('id, case_number')
    .in('id', caseIds)

  const caseMap: Record<string, string> = {}
  for (const c of caseData || []) {
    caseMap[c.id] = c.case_number
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((inv: any) => ({
    ...inv,
    case_number: inv.case_id ? caseMap[inv.case_id] : null,
  }))
}

// ============================================================
// Get payment history
// ============================================================

export async function getPaymentHistory(clientId: string) {
  const supabase = getServiceClient()

  // Get cases for client
  const { data: cases } = await supabase
    .from('cases')
    .select('id')
    .eq('client_id', clientId)

  const caseIds = (cases || []).map(c => c.id)
  if (caseIds.length === 0) return []

  // Get invoices for client's cases
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .in('case_id', caseIds)

  const invoiceIds = (invoices || []).map(i => i.id)
  if (invoiceIds.length === 0) return []

  const invoiceMap: Record<string, string> = {}
  for (const inv of invoices || []) {
    invoiceMap[inv.id] = inv.invoice_number
  }

  const { data, error } = await supabase
    .from('payments')
    .select('id, invoice_id, amount, payment_method, status, payment_date, stripe_payment_intent_id')
    .in('invoice_id', invoiceIds)
    .order('payment_date', { ascending: false })

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((p: any) => ({
    ...p,
    invoice_number: p.invoice_id ? invoiceMap[p.invoice_id] : null,
  }))
}

// ============================================================
// Make a payment
// ============================================================

export async function makePayment(params: {
  clientId: string
  invoiceId: string
  paymentMethodId: string
  amount: number
}): Promise<{ payment?: { id: string }; error?: string }> {
  const supabase = getServiceClient()
  const stripe = getStripe()
  if (!stripe) return { error: 'Payment processing not configured' }

  const { clientId, invoiceId, paymentMethodId, amount } = params

  // Get invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, amount_paid, balance_due, status, case_id')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return { error: 'Invoice not found' }

  // Verify client has access
  const { data: caseAccess } = await supabase
    .from('cases')
    .select('id, client_id, attorney_id')
    .eq('id', invoice.case_id)
    .eq('client_id', clientId)
    .single()

  if (!caseAccess) return { error: 'Access denied' }

  if (invoice.status === 'paid') return { error: 'Invoice is already paid' }
  if (invoice.status === 'void') return { error: 'Cannot pay a voided invoice' }

  if (amount > invoice.balance_due) {
    return { error: `Amount exceeds balance due of ${formatCurrency(invoice.balance_due)}` }
  }

  // Get payment method
  const { data: method } = await supabase
    .from('saved_payment_methods')
    .select('stripe_payment_method_id, stripe_customer_id')
    .eq('id', paymentMethodId)
    .eq('user_id', clientId)
    .single()

  if (!method) return { error: 'Payment method not found' }
  if (!method.stripe_customer_id) return { error: 'Payment method not properly configured' }

  try {
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: method.stripe_customer_id,
      payment_method: method.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      metadata: {
        client_id: clientId,
        invoice_id: invoiceId,
        case_id: invoice.case_id,
        invoice_number: invoice.invoice_number,
      },
      description: `Payment for Invoice ${invoice.invoice_number}`,
    })

    // Create payment record
    const { data: payment } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoiceId,
        payment_method: 'credit_card',
        amount,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : null,
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'processing',
        payment_date: new Date().toISOString(),
        created_by: clientId,
        notes: 'Online payment via client portal',
      })
      .select('id')
      .single()

    // Update invoice if payment succeeded
    if (paymentIntent.status === 'succeeded') {
      const newAmountPaid = (invoice.amount_paid || 0) + amount
      const newBalanceDue = (invoice.total_amount || 0) - newAmountPaid
      const newStatus = newBalanceDue <= 0 ? 'paid' : 'partially_paid'

      await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: Math.max(0, newBalanceDue),
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', invoiceId)

      // Log activity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('case_activity_log').insert({
        case_id: invoice.case_id,
        user_id: clientId,
        activity_type: 'payment_received',
        title: `Payment of ${formatCurrency(amount)} received`,
        description: `Payment for Invoice #${invoice.invoice_number}`,
        is_visible_to_client: true,
        metadata: { payment_id: payment?.id, invoice_id: invoiceId },
      })

      // Notify attorney
      if (caseAccess.attorney_id) {
        await supabase.from('notifications').insert({
          user_id: caseAccess.attorney_id,
          title: 'Payment Received',
          message: `Client payment of ${formatCurrency(amount)} received for Invoice #${invoice.invoice_number}`,
          notification_type: 'system',
          action_url: `/dashboard/billing`,
        })
      }
    }

    return { payment: payment || undefined }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Payment failed'
    const errorCode = (err as { code?: string })?.code || ''

    // Log failed payment
    await supabase.from('payments').insert({
      invoice_id: invoiceId,
      payment_method: 'credit_card',
      amount,
      status: 'failed',
      failure_reason: errorMessage,
      created_by: clientId,
    })

    return { error: getHumanReadableError(errorCode, errorMessage) }
  }
}

// ============================================================
// Process payment plan installment (for cron)
// ============================================================

export async function processPaymentPlanInstallment(planId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plan } = await (supabase as any)
    .from('payment_plans')
    .select('*')
    .eq('id', planId)
    .eq('status', 'active')
    .single()

  if (!plan) return { success: false, error: 'Payment plan not found' }
  if (!plan.auto_charge || !plan.saved_payment_method_id) {
    return { success: false, error: 'Auto-pay not enabled' }
  }

  if (!plan.client_id) {
    // Look up client from case
    const { data: caseData } = await supabase
      .from('cases')
      .select('client_id')
      .eq('id', plan.case_id)
      .single()
    if (!caseData) return { success: false, error: 'Case not found' }
    plan.client_id = caseData.client_id
  }

  const result = await makePayment({
    clientId: plan.client_id,
    invoiceId: plan.invoice_id,
    paymentMethodId: plan.saved_payment_method_id,
    amount: plan.installment_amount,
  })

  if (result.error) {
    return { success: false, error: result.error }
  }

  // Update plan
  const paymentsMade = (plan.payments_made || 0) + 1
  const paymentsRemaining = Math.max(0, (plan.payments_remaining || plan.installment_count) - 1)
  const amountPaid = (plan.amount_paid || 0) + plan.installment_amount
  const amountRemaining = Math.max(0, (plan.amount_remaining || plan.total_amount) - plan.installment_amount)
  const nextPaymentDate = calculateNextPaymentDate(
    new Date(plan.next_payment_date),
    plan.frequency
  )
  const status = paymentsRemaining === 0 ? 'completed' : 'active'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('payment_plans')
    .update({
      payments_made: paymentsMade,
      payments_remaining: paymentsRemaining,
      amount_paid: amountPaid,
      amount_remaining: amountRemaining,
      next_payment_date: status === 'completed' ? null : nextPaymentDate.toISOString().split('T')[0],
      last_payment_date: new Date().toISOString().split('T')[0],
      status,
    })
    .eq('id', planId)

  return { success: true }
}

// ============================================================
// Get payment plans for client
// ============================================================

export async function getClientPaymentPlans(clientId: string) {
  const supabase = getServiceClient()

  const { data: cases } = await supabase
    .from('cases')
    .select('id')
    .eq('client_id', clientId)

  const caseIds = (cases || []).map(c => c.id)
  if (caseIds.length === 0) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('payment_plans')
    .select('*')
    .in('case_id', caseIds)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get invoice numbers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoiceIds = Array.from(new Set((data || []).map((p: any) => p.invoice_id).filter(Boolean)))
  let invoiceMap: Record<string, string> = {}
  if (invoiceIds.length > 0) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .in('id', invoiceIds)
    if (invoices) {
      invoiceMap = Object.fromEntries(invoices.map(i => [i.id, i.invoice_number]))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((p: any) => ({
    ...p,
    invoice_number: p.invoice_id ? invoiceMap[p.invoice_id] : null,
  }))
}

// ============================================================
// Helpers
// ============================================================

function calculateNextPaymentDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate)
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly':
    default:
      next.setMonth(next.getMonth() + 1)
      break
  }
  return next
}

function getHumanReadableError(code: string, message: string): string {
  const errors: Record<string, string> = {
    card_declined: 'Your card was declined. Please try a different card.',
    insufficient_funds: 'Insufficient funds. Please try a different card.',
    expired_card: 'Your card has expired. Please update your payment method.',
    incorrect_cvc: 'The security code is incorrect. Please try again.',
    processing_error: 'A processing error occurred. Please try again.',
    invalid_account: 'The card account is invalid. Please contact your bank.',
  }
  return errors[code] || message || 'Payment failed. Please try again.'
}
