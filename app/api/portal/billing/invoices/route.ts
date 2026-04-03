import { NextRequest, NextResponse } from 'next/server'
import { getClientInvoices } from '@/lib/portal/paymentService'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/portal/billing/invoices — list client invoices
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const invoices = await getClientInvoices(user.id, status)
    return NextResponse.json({ data: invoices })
  } catch (error) {
    console.error('Portal invoices GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
