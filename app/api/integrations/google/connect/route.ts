import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import crypto from 'crypto'
import { getAuthenticatedClient } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// GET - Generate Google OAuth URL and redirect
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(request)

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
