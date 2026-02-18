import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/portal/auth/magic-link — request a magic link for client login
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const supabase = getServiceClient()

    // Find user by email in profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('email', normalizedEmail)
      .single()

    if (!profile) {
      // Don't reveal whether email exists — return success either way
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a login link has been sent.',
      })
    }

    // Verify user has a case (is actually a client)
    const { data: caseData } = await supabase
      .from('cases')
      .select('id')
      .eq('client_id', profile.id)
      .limit(1)
      .single()

    if (!caseData) {
      // Also don't reveal — just return generic success
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a login link has been sent.',
      })
    }

    // Generate a secure token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    // Store token (expires in 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('portal_access_tokens').insert({
      user_id: profile.id,
      case_id: caseData.id,
      token_hash: tokenHash,
      token_type: 'magic_link',
      email: normalizedEmail,
      expires_at: expiresAt.toISOString(),
    })

    // Use Supabase magic link if available, otherwise use our token system
    // Try Supabase built-in magic link first
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const redirectTo = `${siteUrl}/portal/auth/callback?token=${rawToken}`

    const { error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo,
      },
    })

    if (authError) {
      // Fallback: send via Resend if configured
      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'portal@unbind.app'

        await resend.emails.send({
          from: `Unbind Portal <${fromEmail}>`,
          to: normalizedEmail,
          subject: 'Your Secure Login Link',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Secure Login Link</h2>
              <p style="color: #4b5563;">Hello ${profile.full_name || 'there'},</p>
              <p style="color: #4b5563;">Click the button below to securely access your client portal:</p>
              <p style="margin: 24px 0;">
                <a href="${redirectTo}" style="
                  display: inline-block; padding: 12px 24px;
                  background-color: #4F46E5; color: white;
                  text-decoration: none; border-radius: 6px; font-weight: 600;
                ">Access Your Portal</a>
              </p>
              <p style="color: #9ca3af; font-size: 14px;">
                This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
              </p>
              <p style="color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
                Unbind - Divorce. Together.
              </p>
            </div>
          `,
        })
      } else {
        console.log(`Magic link for ${normalizedEmail}: ${redirectTo}`)
      }
    }

    // Log the login attempt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('client_login_history').insert({
      user_id: profile.id,
      login_method: 'magic_link',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
      device_type: detectDeviceType(request.headers.get('user-agent') || ''),
      success: true,
    })

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a login link has been sent.',
    })
  } catch (error) {
    console.error('Magic link request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return 'mobile'
  return 'desktop'
}
