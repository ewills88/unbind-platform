import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createSetupIntent } from '@/lib/portal/paymentService'

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

// POST /api/portal/billing/payment-methods/setup — create Stripe setup intent
export async function POST() {
  try {
    const { user } = await getAuthenticatedClient()
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
