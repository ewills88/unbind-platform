import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { calculateDiscoveryDeadline } from '@/lib/discovery/deadlineCalculator'
import type { ServiceMethod } from '@/types/discovery'

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

// POST /api/discovery/calculate-deadline - Calculate response deadline
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.state_code || !body.discovery_type || !body.served_date || !body.service_method) {
      return NextResponse.json(
        { error: 'state_code, discovery_type, served_date, and service_method are required' },
        { status: 400 }
      )
    }

    const result = await calculateDiscoveryDeadline({
      stateCode: body.state_code,
      discoveryType: body.discovery_type,
      servedDate: new Date(body.served_date),
      serviceMethod: body.service_method as ServiceMethod,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Deadline calculation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
