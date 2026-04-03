import { NextResponse } from 'next/server'
import { getPaymentMethods } from '@/lib/portal/paymentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/portal/billing/payment-methods — list payment methods
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const methods = await getPaymentMethods(user.id)
    return NextResponse.json({ data: methods })
  } catch (error) {
    console.error('Payment methods GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
