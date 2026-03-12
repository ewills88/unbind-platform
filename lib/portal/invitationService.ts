// Client Invitation Service
// Handles inviting clients to access their case via the portal

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { InviteStatus, ClientInviteStatus } from '@/types/portal'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================
// Invite a client to a case
// ============================================================

export async function inviteClient(
  attorneyId: string,
  { caseId, clientEmail, clientName }: { caseId: string; clientEmail: string; clientName?: string }
): Promise<{ success: boolean; message: string; error?: string }> {
  const supabase = getServiceClient()
  const normalizedEmail = clientEmail.toLowerCase().trim()

  // Verify attorney owns this case
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('id, attorney_id, firm_id, client_id, client_invite_status')
    .eq('id', caseId)
    .single()

  if (caseError || !caseData) {
    return { success: false, message: 'Case not found', error: 'case_not_found' }
  }

  if (caseData.attorney_id !== attorneyId) {
    // Check if attorney is a member of the firm
    const { data: membership } = await supabase
      .from('firm_members')
      .select('id')
      .eq('firm_id', caseData.firm_id)
      .eq('user_id', attorneyId)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return { success: false, message: 'Not authorized for this case', error: 'unauthorized' }
    }
  }

  // Check if client already accepted
  if (caseData.client_invite_status === 'accepted' && caseData.client_id) {
    return { success: false, message: 'Client has already accepted the invitation', error: 'already_accepted' }
  }

  // Find or create the client profile
  let clientUserId: string

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .single()

  if (existingProfile) {
    clientUserId = existingProfile.id
  } else {
    // Create auth user + profile
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: {
        full_name: clientName || normalizedEmail.split('@')[0],
        role: 'client',
      },
    })

    if (createError || !newUser.user) {
      return { success: false, message: 'Failed to create client account', error: 'create_failed' }
    }

    clientUserId = newUser.user.id

    // Create profile
    await supabase.from('profiles').upsert({
      id: clientUserId,
      email: normalizedEmail,
      full_name: clientName || normalizedEmail.split('@')[0],
      role: 'client',
    })
  }

  // Set client_id on the case and update invite tracking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('cases')
    .update({
      client_id: clientUserId,
      client_email: normalizedEmail,
      client_invite_status: 'pending' as ClientInviteStatus,
      client_invited_at: new Date().toISOString(),
    })
    .eq('id', caseId)

  // Generate invite token (7-day expiry)
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  // Revoke any existing invite tokens for this case+user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('portal_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', clientUserId)
    .eq('case_id', caseId)
    .eq('token_type', 'invite')
    .is('revoked_at', null)
    .is('used_at', null)

  // Insert new invite token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('portal_access_tokens').insert({
    user_id: clientUserId,
    case_id: caseId,
    token_hash: tokenHash,
    token_type: 'invite',
    email: normalizedEmail,
    expires_at: expiresAt.toISOString(),
    created_by: attorneyId,
  })

  // Send invitation email via Resend
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const inviteUrl = `${siteUrl}/portal/accept-invite?token=${rawToken}`

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'portal@unbind.app'

      await resend.emails.send({
        from: `Unbind Portal <${fromEmail}>`,
        to: normalizedEmail,
        subject: 'You\'ve been invited to your case portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">You're Invited to Your Case Portal</h2>
            <p style="color: #4b5563;">Hello ${clientName || 'there'},</p>
            <p style="color: #4b5563;">Your attorney has invited you to access your case through the Unbind client portal. Here you can view documents, communicate with your legal team, and track your case progress.</p>
            <p style="margin: 24px 0;">
              <a href="${inviteUrl}" style="
                display: inline-block; padding: 12px 24px;
                background-color: #4F46E5; color: white;
                text-decoration: none; border-radius: 6px; font-weight: 600;
              ">Accept Invitation</a>
            </p>
            <p style="color: #9ca3af; font-size: 14px;">
              This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
              Unbind - Divorce. Together.
            </p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError)
    }
  } else {
    console.log(`Invite link for ${normalizedEmail}: ${inviteUrl}`)
  }

  // Log activity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('case_activity_log').insert({
    case_id: caseId,
    user_id: attorneyId,
    activity_type: 'status_changed',
    title: 'Client invited to portal',
    description: `Invitation sent to ${normalizedEmail}`,
    is_visible_to_client: false,
  })

  return { success: true, message: `Invitation sent to ${normalizedEmail}` }
}

// ============================================================
// Accept an invite
// ============================================================

export async function acceptInvite(
  token: string
): Promise<{ success: boolean; user?: { id: string; email: string; full_name: string }; session_token?: string; error?: string }> {
  const supabase = getServiceClient()
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  // Find the token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accessToken } = await (supabase as any)
    .from('portal_access_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('token_type', 'invite')
    .is('used_at', null)
    .is('revoked_at', null)
    .single()

  if (!accessToken) {
    return { success: false, error: 'Invalid or already used invitation' }
  }

  if (new Date(accessToken.expires_at) < new Date()) {
    // Update case invite status to expired
    if (accessToken.case_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('cases')
        .update({ client_invite_status: 'expired' as ClientInviteStatus })
        .eq('id', accessToken.case_id)
        .eq('client_invite_status', 'pending')
    }
    return { success: false, error: 'Invitation has expired. Please ask your attorney to send a new one.' }
  }

  // Mark token as used
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('portal_access_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', accessToken.id)

  // Update case invite status
  if (accessToken.case_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('cases')
      .update({ client_invite_status: 'accepted' as ClientInviteStatus })
      .eq('id', accessToken.case_id)
  }

  // Create portal session
  const sessionToken = crypto.randomBytes(32).toString('hex')
  const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('client_sessions').insert({
    user_id: accessToken.user_id,
    session_token: crypto.createHash('sha256').update(sessionToken).digest('hex'),
    expires_at: sessionExpiry.toISOString(),
  })

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', accessToken.user_id)
    .single()

  // Log activity
  if (accessToken.case_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('case_activity_log').insert({
      case_id: accessToken.case_id,
      user_id: accessToken.user_id,
      activity_type: 'portal_login',
      title: 'Client accepted portal invitation',
      description: 'Client accepted the invitation and activated portal access',
      is_visible_to_client: false,
    })
  }

  return {
    success: true,
    session_token: sessionToken,
    user: profile ? {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
    } : undefined,
  }
}

// ============================================================
// Resend invite
// ============================================================

export async function resendInvite(
  attorneyId: string,
  caseId: string
): Promise<{ success: boolean; message: string; error?: string }> {
  const supabase = getServiceClient()

  // Get case info
  const { data: caseData } = await supabase
    .from('cases')
    .select('client_email, client_id')
    .eq('id', caseId)
    .single()

  if (!caseData?.client_email) {
    return { success: false, message: 'No client email found for this case', error: 'no_email' }
  }

  // Get client name
  let clientName: string | undefined
  if (caseData.client_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', caseData.client_id)
      .single()
    clientName = profile?.full_name || undefined
  }

  return inviteClient(attorneyId, {
    caseId,
    clientEmail: caseData.client_email,
    clientName,
  })
}

// ============================================================
// Revoke client access
// ============================================================

export async function revokeClientAccess(
  attorneyId: string,
  caseId: string
): Promise<{ success: boolean; message: string; error?: string }> {
  const supabase = getServiceClient()

  // Verify attorney owns this case
  const { data: caseData } = await supabase
    .from('cases')
    .select('id, attorney_id, firm_id, client_id')
    .eq('id', caseId)
    .single()

  if (!caseData) {
    return { success: false, message: 'Case not found', error: 'case_not_found' }
  }

  if (caseData.attorney_id !== attorneyId) {
    const { data: membership } = await supabase
      .from('firm_members')
      .select('id')
      .eq('firm_id', caseData.firm_id)
      .eq('user_id', attorneyId)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return { success: false, message: 'Not authorized', error: 'unauthorized' }
    }
  }

  // Null out client_id, update invite status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('cases')
    .update({
      client_id: null,
      client_invite_status: 'revoked' as ClientInviteStatus,
    })
    .eq('id', caseId)

  // Revoke all tokens for this case
  if (caseData.client_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('portal_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', caseData.client_id)
      .eq('case_id', caseId)
      .is('revoked_at', null)

    // Invalidate active sessions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('client_sessions')
      .update({ is_active: false })
      .eq('user_id', caseData.client_id)
      .eq('is_active', true)
  }

  // Log activity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('case_activity_log').insert({
    case_id: caseId,
    user_id: attorneyId,
    activity_type: 'status_changed',
    title: 'Client portal access revoked',
    description: 'Attorney revoked client portal access',
    is_visible_to_client: false,
  })

  return { success: true, message: 'Client access has been revoked' }
}

// ============================================================
// Get invite status for a case
// ============================================================

export async function getInviteStatus(caseId: string): Promise<InviteStatus | null> {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: caseData } = await (supabase as any)
    .from('cases')
    .select('id, client_id, client_email, client_name, client_invite_status, client_invited_at')
    .eq('id', caseId)
    .single()

  if (!caseData) return null

  return {
    caseId: caseData.id,
    clientEmail: caseData.client_email || null,
    clientName: caseData.client_name || null,
    status: caseData.client_invite_status || null,
    invitedAt: caseData.client_invited_at || null,
    clientId: caseData.client_id || null,
  }
}
