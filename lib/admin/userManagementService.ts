// Session 21: User Management Service (functional)
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import type { EnhancedFirmMember, Role, FirmInvitation } from '@/types/admin'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// ============================================================
// Get Members
// ============================================================

export async function getFirmMembers(
  supabase: SupabaseClient,
  firmId: string,
  options?: { includeInactive?: boolean }
): Promise<EnhancedFirmMember[]> {
  let query = (supabase as SupabaseClient)
    .from('firm_members')
    .select('*')
    .eq('firm_id', firmId)

  if (!options?.includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query.order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// ============================================================
// Invite Member
// ============================================================

export async function inviteMember(
  firmId: string,
  params: {
    email: string
    role?: string
    role_id?: string
    title?: string
    department?: string
    hourly_rate?: number
    invitedBy: string
  }
): Promise<{ success: boolean; invitation?: FirmInvitation; error?: string }> {
  const service = getServiceClient()
  const { email, role, role_id, title, department, hourly_rate, invitedBy } = params

  // Check for existing pending invitation
  const { data: existingInvite } = await (service as SupabaseClient)
    .from('firm_invitations')
    .select('id')
    .eq('firm_id', firmId)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .single()

  if (existingInvite) {
    return { success: false, error: 'An invitation has already been sent to this email' }
  }

  // Check if user already an active member
  const { data: profiles } = await (service as SupabaseClient)
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())

  if (profiles && profiles.length > 0) {
    const { data: existingMember } = await (service as SupabaseClient)
      .from('firm_members')
      .select('id, is_active, status')
      .eq('firm_id', firmId)
      .eq('user_id', profiles[0].id)
      .single()

    if (existingMember) {
      if (existingMember.is_active && existingMember.status === 'active') {
        return { success: false, error: 'User is already a member of this firm' }
      }
      // Reactivate
      await (service as SupabaseClient)
        .from('firm_members')
        .update({
          is_active: true,
          status: 'active',
          role: role || 'attorney',
          role_id,
          title,
          department,
          hourly_rate,
          deactivated_at: null,
          deactivated_by: null,
        })
        .eq('id', existingMember.id)
      return { success: true }
    }
  }

  // Create invitation token
  const inviteToken = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: invitation, error } = await (service as SupabaseClient)
    .from('firm_invitations')
    .insert({
      firm_id: firmId,
      email: email.toLowerCase(),
      role: role || 'attorney',
      role_id,
      title,
      department,
      hourly_rate,
      invite_token: inviteToken,
      expires_at: expiresAt.toISOString(),
      invited_by: invitedBy,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error

  // Also create a firm_members entry with invited status (existing pattern)
  if (profiles && profiles.length > 0) {
    await (service as SupabaseClient)
      .from('firm_members')
      .insert({
        firm_id: firmId,
        user_id: profiles[0].id,
        role: role || 'attorney',
        role_id,
        title,
        department,
        hourly_rate,
        status: 'invited',
        invited_email: email.toLowerCase(),
        invited_at: new Date().toISOString(),
        is_active: false,
      })
  }

  return { success: true, invitation }
}

// ============================================================
// Accept Invitation
// ============================================================

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const service = getServiceClient()

  const { data: invitation } = await (service as SupabaseClient)
    .from('firm_invitations')
    .select('*')
    .eq('invite_token', token)
    .eq('status', 'pending')
    .single()

  if (!invitation) {
    return { success: false, error: 'Invalid or expired invitation' }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await (service as SupabaseClient)
      .from('firm_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)
    return { success: false, error: 'Invitation has expired' }
  }

  // Check if already a member
  const { data: existingMember } = await (service as SupabaseClient)
    .from('firm_members')
    .select('id, status')
    .eq('firm_id', invitation.firm_id)
    .eq('user_id', userId)
    .single()

  if (existingMember) {
    // Update existing
    await (service as SupabaseClient)
      .from('firm_members')
      .update({
        status: 'active',
        is_active: true,
        role: invitation.role || 'attorney',
        role_id: invitation.role_id,
        title: invitation.title,
        department: invitation.department,
        hourly_rate: invitation.hourly_rate,
        joined_at: new Date().toISOString(),
      })
      .eq('id', existingMember.id)
  } else {
    // Create membership
    const { error: memberError } = await (service as SupabaseClient)
      .from('firm_members')
      .insert({
        firm_id: invitation.firm_id,
        user_id: userId,
        role: invitation.role || 'attorney',
        role_id: invitation.role_id,
        title: invitation.title,
        department: invitation.department,
        hourly_rate: invitation.hourly_rate,
        status: 'active',
        is_active: true,
        joined_at: new Date().toISOString(),
      })
    if (memberError) throw memberError
  }

  // Update invitation
  await (service as SupabaseClient)
    .from('firm_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  // Update user's current_firm_id
  await (service as SupabaseClient)
    .from('profiles')
    .update({ current_firm_id: invitation.firm_id })
    .eq('id', userId)

  // Increment subscription seats
  await (service as SupabaseClient).rpc('increment_subscription_seats', { p_firm_id: invitation.firm_id })

  return { success: true }
}

// ============================================================
// Update Member
// ============================================================

export async function updateMember(
  supabase: SupabaseClient,
  firmId: string,
  memberId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates: Record<string, any>
): Promise<EnhancedFirmMember> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, firm_id, user_id, created_at, updated_at, profile, role_info, ...safeUpdates } = updates

  const { data, error } = await (supabase as SupabaseClient)
    .from('firm_members')
    .update(safeUpdates)
    .eq('id', memberId)
    .eq('firm_id', firmId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// Deactivate Member
// ============================================================

export async function deactivateMember(
  firmId: string,
  memberId: string,
  deactivatedBy: string,
  reassignTo?: string
): Promise<void> {
  const service = getServiceClient()

  const { data: member } = await (service as SupabaseClient)
    .from('firm_members')
    .select('user_id')
    .eq('id', memberId)
    .eq('firm_id', firmId)
    .single()

  if (!member) throw new Error('Member not found')

  if (reassignTo) {
    // Reassign cases
    await (service as SupabaseClient)
      .from('cases')
      .update({ attorney_id: reassignTo })
      .eq('firm_id', firmId)
      .eq('attorney_id', member.user_id)

    // Reassign case_assignments
    await (service as SupabaseClient)
      .from('case_assignments')
      .update({ user_id: reassignTo })
      .eq('firm_id', firmId)
      .eq('user_id', member.user_id)
  }

  await (service as SupabaseClient)
    .from('firm_members')
    .update({
      is_active: false,
      status: 'suspended',
      deactivated_at: new Date().toISOString(),
      deactivated_by: deactivatedBy,
    })
    .eq('id', memberId)

  await (service as SupabaseClient).rpc('decrement_subscription_seats', { p_firm_id: firmId })
}

// ============================================================
// Roles
// ============================================================

export async function getRoles(supabase: SupabaseClient, firmId: string): Promise<Role[]> {
  const { data, error } = await (supabase as SupabaseClient)
    .from('roles')
    .select('*')
    .or(`firm_id.eq.${firmId},is_system.eq.true`)
    .eq('is_active', true)
    .order('is_system', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createRole(
  supabase: SupabaseClient,
  firmId: string,
  params: {
    role_name: string
    role_key: string
    description?: string
    permissions: string[]
  }
): Promise<Role> {
  const { data, error } = await (supabase as SupabaseClient)
    .from('roles')
    .insert({
      firm_id: firmId,
      role_name: params.role_name,
      role_key: params.role_key,
      description: params.description,
      is_system: false,
    })
    .select()
    .single()

  if (error) throw error

  if (params.permissions.length > 0) {
    await (supabase as SupabaseClient)
      .from('role_permissions')
      .insert(
        params.permissions.map(p => ({
          role_id: data.id,
          permission_key: p,
          granted: true,
        }))
      )
  }

  return data
}

export async function updateRole(
  supabase: SupabaseClient,
  firmId: string,
  roleId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates: Record<string, any>,
  permissionKeys?: string[]
): Promise<Role> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, firm_id, created_at, updated_at, is_system, ...safeUpdates } = updates

  const { data, error } = await (supabase as SupabaseClient)
    .from('roles')
    .update(safeUpdates)
    .eq('id', roleId)
    .eq('firm_id', firmId)
    .select()
    .single()

  if (error) throw error

  if (permissionKeys !== undefined) {
    // Replace all permissions
    await (supabase as SupabaseClient)
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    if (permissionKeys.length > 0) {
      await (supabase as SupabaseClient)
        .from('role_permissions')
        .insert(
          permissionKeys.map(p => ({
            role_id: roleId,
            permission_key: p,
            granted: true,
          }))
        )
    }
  }

  return data
}

export async function getPermissions(supabase: SupabaseClient): Promise<{ permission_key: string; permission_name: string; description: string; category: string }[]> {
  const { data, error } = await (supabase as SupabaseClient)
    .from('permissions')
    .select('permission_key, permission_name, description, category')
    .order('category')

  if (error) throw error
  return data || []
}

export async function getRolePermissions(supabase: SupabaseClient, roleId: string): Promise<string[]> {
  const { data, error } = await (supabase as SupabaseClient)
    .from('role_permissions')
    .select('permission_key')
    .eq('role_id', roleId)
    .eq('granted', true)

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => r.permission_key)
}

// ============================================================
// Get Invitations
// ============================================================

export async function getInvitations(supabase: SupabaseClient, firmId: string): Promise<FirmInvitation[]> {
  const { data, error } = await (supabase as SupabaseClient)
    .from('firm_invitations')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function revokeInvitation(supabase: SupabaseClient, firmId: string, invitationId: string): Promise<void> {
  const { error } = await (supabase as SupabaseClient)
    .from('firm_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('firm_id', firmId)

  if (error) throw error
}
