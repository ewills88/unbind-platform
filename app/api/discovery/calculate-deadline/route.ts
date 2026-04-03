import { NextRequest, NextResponse } from 'next/server'
import { calculateDiscoveryDeadline } from '@/lib/discovery/deadlineCalculator'
import type { ServiceMethod } from '@/types/discovery'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST /api/discovery/calculate-deadline - Calculate response deadline
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)
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
