import {
  FirmPermissions,
  FirmMemberRole,
  FirmMember,
  CaseAssignment,
  DEFAULT_PERMISSIONS,
} from '@/types/firm'

type PermissionCategory = keyof FirmPermissions

type PermissionAction<C extends PermissionCategory> = keyof FirmPermissions[C]

export function hasPermission<C extends PermissionCategory>(
  permissions: FirmPermissions,
  category: C,
  action: PermissionAction<C>
): boolean {
  return !!permissions[category]?.[action]
}

export function getDefaultPermissions(role: FirmMemberRole): FirmPermissions {
  return DEFAULT_PERMISSIONS[role]
}

export function resolvePermissions(
  role: FirmMemberRole,
  customOverrides?: Partial<Record<PermissionCategory, Partial<FirmPermissions[PermissionCategory]>>>
): FirmPermissions {
  const defaults = getDefaultPermissions(role)
  if (!customOverrides) return defaults

  const resolved = JSON.parse(JSON.stringify(defaults)) as FirmPermissions

  for (const category of Object.keys(customOverrides) as PermissionCategory[]) {
    const overrides = customOverrides[category]
    if (overrides && resolved[category]) {
      Object.assign(resolved[category], overrides)
    }
  }

  return resolved
}

export function canAccessCase(
  userId: string,
  caseData: { attorney_id?: string; client_id?: string; firm_id?: string },
  assignments: CaseAssignment[],
  firmMembership?: FirmMember | null
): boolean {
  // Direct attorney or client
  if (caseData.attorney_id === userId || caseData.client_id === userId) {
    return true
  }

  // Has a case assignment
  if (assignments.some(a => a.user_id === userId)) {
    return true
  }

  // Active firm member of the case's firm
  if (
    caseData.firm_id &&
    firmMembership &&
    firmMembership.firm_id === caseData.firm_id &&
    firmMembership.status === 'active'
  ) {
    return true
  }

  return false
}

export function memberCan<C extends PermissionCategory>(
  member: FirmMember | null | undefined,
  category: C,
  action: PermissionAction<C>
): boolean {
  if (!member || member.status !== 'active') return false
  if (member.role === 'owner') return true
  return hasPermission(member.permissions, category, action)
}
