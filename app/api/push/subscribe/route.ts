import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { client: null, user: null }
  }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: {
      headers: {
        cookie: cookieStore.toString()
      }
    }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { client: null, user: null }
  }

  return { client: supabase, user }
}

// POST /api/push/subscribe - Save push subscription
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscription } = await request.json()

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    // Upsert push subscription (one per endpoint per user)
    const { error: upsertError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' }
      )

    if (upsertError) {
      console.error('Error saving push subscription:', upsertError)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/push/subscribe - Remove push subscription
export async function DELETE(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    if (deleteError) {
      console.error('Error removing push subscription:', deleteError)
      return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
