import { NextResponse } from 'next/server'
import { createSetupIntent } from '@/lib/portal/paymentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/portal/billing/payment-methods/setup — create Stripe setup intent
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await createSetupIntent(user.id)
    if (!result) {
      return NextResponse.json({ error: 'Payment setup not available' }, { status: 503 })
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Setup intent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
