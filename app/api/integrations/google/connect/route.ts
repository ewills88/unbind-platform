import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import crypto from 'crypto'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

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

// GET - Generate Google OAuth URL and redirect
export async function GET() {
  try {
    const { user } = await getAuthenticatedClient()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${BASE_URL}/api/integrations/google/callback`
    )

    // Create a secure random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex')

    // Store state in DB with expiration (service role for insert)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10) // 10 minute expiry

    await serviceClient.from('oauth_states').insert({
      user_id: user.id,
      state,
      provider: 'google',
      expires_at: expiresAt.toISOString(),
    })

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ]

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent', // Force consent to always get refresh token
    })

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    console.error('Google connect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
