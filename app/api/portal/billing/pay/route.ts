import { NextRequest, NextResponse } from 'next/server'
import { makePayment } from '@/lib/portal/paymentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/portal/billing/pay — make a payment on an invoice
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invoiceId, paymentMethodId, amount } = body

    if (!invoiceId || !paymentMethodId || !amount) {
      return NextResponse.json(
        { error: 'invoiceId, paymentMethodId, and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    const result = await makePayment({
      clientId: user.id,
      invoiceId,
      paymentMethodId,
      amount: parseFloat(amount),
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.payment })
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
