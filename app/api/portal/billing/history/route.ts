import { NextResponse } from 'next/server'
import { getPaymentHistory } from '@/lib/portal/paymentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/portal/billing/history — get payment history
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const history = await getPaymentHistory(user.id)
    return NextResponse.json({ data: history })
  } catch (error) {
    console.error('Payment history GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
