import { NextResponse } from 'next/server'
import { performInitialSync } from '@/lib/calendar/bulkSync'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// POST - Trigger manual calendar sync
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await performInitialSync(user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Google sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
