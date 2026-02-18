import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { savePaymentMethod } from '@/lib/portal/paymentService'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { client: null, user: null }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: { headers: { cookie: cookieStore.toString() } }
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { client: null, user: null }
  return { client: supabase, user }
}

// POST /api/portal/billing/payment-methods/save — save payment method after Stripe setup
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient()
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
