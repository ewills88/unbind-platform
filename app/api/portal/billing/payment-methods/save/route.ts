import { NextRequest, NextResponse } from 'next/server'
import { savePaymentMethod } from '@/lib/portal/paymentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/portal/billing/payment-methods/save — save payment method after Stripe setup
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { paymentMethodId, customerId, setAsDefault } = body

    if (!paymentMethodId || !customerId) {
      return NextResponse.json(
        { error: 'paymentMethodId and customerId are required' },
        { status: 400 }
      )
    }

    const result = await savePaymentMethod(user.id, paymentMethodId, customerId, setAsDefault !== false)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.method })
  } catch (error) {
    console.error('Save payment method error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
