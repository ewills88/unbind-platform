import { NextRequest, NextResponse } from 'next/server'
import { deletePaymentMethod, setDefaultPaymentMethod } from '@/lib/portal/paymentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// DELETE /api/portal/billing/payment-methods/[id] — remove payment method
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const result = await deletePaymentMethod(user.id, id)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete payment method error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/portal/billing/payment-methods/[id] — set as default
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    if (body.setDefault) {
      const result = await setDefaultPaymentMethod(user.id, id)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update payment method error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
