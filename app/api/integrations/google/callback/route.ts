import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { encrypt } from '@/lib/encryption'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET - Handle Google OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const settingsUrl = `${BASE_URL}/dashboard/settings/integrations`

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?error=google_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=missing_params`)
  }

  const supabase = getServiceClient()

  try {
    // Verify OAuth state for CSRF protection
    const { data: stateRecord } = await supabase
      .from('oauth_states')
      .select('user_id, expires_at')
      .eq('state', state)
      .single()

    if (!stateRecord) {
      return NextResponse.redirect(`${settingsUrl}?error=invalid_state`)
    }

    // Check expiry
    if (new Date(stateRecord.expires_at) < new Date()) {
      await supabase.from('oauth_states').delete().eq('state', state)
      return NextResponse.redirect(`${settingsUrl}?error=state_expired`)
    }

    const userId = stateRecord.user_id

    // Clean up used state
    await supabase.from('oauth_states').delete().eq('state', state)

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${BASE_URL}/api/integrations/google/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${settingsUrl}?error=no_tokens`)
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token)
    const encryptedRefreshToken = encrypt(tokens.refresh_token)

    // Get user's calendars to find primary
    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const { data: calendarList } = await calendar.calendarList.list()

    const primaryCalendar = calendarList.items?.find(c => c.primary) || calendarList.items?.[0]

    // Upsert calendar connection
    await supabase.from('calendar_connections').upsert({
      user_id: userId,
      provider: 'google',
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : new Date(Date.now() + 3600000).toISOString(),
      calendar_id: primaryCalendar?.id || 'primary',
      calendar_name: primaryCalendar?.summary || 'Primary Calendar',
      sync_enabled: true,
      sync_status: 'active',
      error_message: null,
      connected_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

    return NextResponse.redirect(`${settingsUrl}?success=google_connected`)
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(`${settingsUrl}?error=google_failed`)
  }
}
