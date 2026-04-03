import { NextResponse } from 'next/server'
import {
  getSubscription,
  getPlans,
  createCheckoutSession,
  getBillingPortalUrl,
  getSubscriptionInvoices,
} from '@/lib/admin/subscriptionService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

async function checkAdminAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<{ firmId: string } | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_firm_id')
    .eq('id', userId)
    .single()

  if (!profile?.current_firm_id) return null

  const { data: membership } = await supabase
    .from('firm_members')
    .select('role, is_admin, can_access_billing, status')
    .eq('firm_id', profile.current_firm_id)
    .eq('user_id', userId)
    .single()

  if (!membership || membership.status !== 'active') return null
  if (membership.role !== 'owner' && !membership.is_admin && !membership.can_access_billing) return null

  return { firmId: profile.current_firm_id }
}

// GET /api/admin/subscription
export async function GET(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const type = url.searchParams.get('type')

    if (type === 'plans') {
      const plans = await getPlans(supabase)
      return NextResponse.json({ data: plans })
    }

    if (type === 'invoices') {
      const invoices = await getSubscriptionInvoices(supabase, access.firmId)
      return NextResponse.json({ data: invoices })
    }

    const subscription = await getSubscription(supabase, access.firmId)
    const plans = await getPlans(supabase)
    return NextResponse.json({ data: { subscription, plans } })
  } catch (error) {
    console.error('Subscription GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/subscription
export async function POST(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkAdminAccess(supabase, user.id)
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    if (body.action === 'checkout') {
      const { planId, billingCycle } = body
      if (!planId || !billingCycle) {
        return NextResponse.json({ error: 'planId and billingCycle required' }, { status: 400 })
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const result = await createCheckoutSession(supabase, access.firmId, {
        planId,
        billingCycle,
        successUrl: `${baseUrl}/dashboard/admin/billing?success=true`,
        cancelUrl: `${baseUrl}/dashboard/admin/billing?canceled=true`,
      })

      return NextResponse.json({ data: result })
    }

    if (body.action === 'portal') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const url = await getBillingPortalUrl(
        supabase,
        access.firmId,
        `${baseUrl}/dashboard/admin/billing`
      )
      return NextResponse.json({ data: { url } })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Subscription POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
