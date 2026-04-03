import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// DELETE - Disconnect Google Calendar
export async function DELETE(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete synced events for this user
    await supabase
      .from('synced_events')
      .delete()
      .eq('user_id', user.id)

    // Delete calendar connection
    await supabase
      .from('calendar_connections')
      .delete()
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google disconnect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
