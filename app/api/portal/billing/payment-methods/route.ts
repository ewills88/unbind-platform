import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getPaymentMethods } from '@/lib/portal/paymentService'

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

// GET /api/portal/billing/payment-methods — list payment methods
export async function GET() {
  try {
    const { user } = await getAuthenticatedClient()
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
