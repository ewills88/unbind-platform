'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Shield,
} from 'lucide-react'
import {
  FirmMember,
  FirmMemberRole,
  FirmMemberStatus,
  FIRM_MEMBER_ROLE_INFO,
  FirmPermissions,
} from '@/types/firm'
import { getDefaultPermissions } from '@/lib/permissions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const STATUS_STYLES: Record<FirmMemberStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-100' },
  invited: { label: 'Invited', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  suspended: { label: 'Suspended', color: 'text-red-700', bgColor: 'bg-red-100' },
  removed: { label: 'Removed', color: 'text-gray-700', bgColor: 'bg-gray-100' },
}

const PERMISSION_CATEGORIES: {
  key: keyof FirmPermissions
  label: string
  actions: { key: string; label: string }[]
}[] = [
  {
    key: 'cases',
    label: 'Cases',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'assign', label: 'Assign' },
    ],
  },
  {
    key: 'clients',
    label: 'Clients',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'communicate', label: 'Communicate' },
    ],
  },
  {
    key: 'financials',
    label: 'Financials',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'approve', label: 'Approve' },
    ],
  },
  {
    key: 'documents',
    label: 'Documents',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    key: 'team',
    label: 'Team',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'invite', label: 'Invite' },
      { key: 'manage', label: 'Manage' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' },
    ],
  },
]

export default function TeamPage() {
  const [members, setMembers] = useState<FirmMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite dialog
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<FirmMemberRole>('attorney')
  const [inviteLoading, setInviteLoading] = useState(false)

  // Edit dialog
  const [editMember, setEditMember] = useState<FirmMember | null>(null)
  const [editRole, setEditRole] = useState<FirmMemberRole>('attorney')
  const [editPermissions, setEditPermissions] = useState<FirmPermissions>(
    getDefaultPermissions('attorney')
  )
  const [editLoading, setEditLoading] = useState(false)

  // Remove confirmation
  const [removeMember, setRemoveMember] = useState<FirmMember | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  // Open menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/firms/members')
      if (!res.ok) throw new Error('Failed to fetch members')
      const data = await res.json()
      setMembers(data.members || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    setInviteLoading(true)
    try {
      const res = await fetch('/api/firms/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to invite')
      }
      setShowInvite(false)
      setInviteEmail('')
      setInviteRole('attorney')
      fetchMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setInviteLoading(false)
    }
  }

  const openEdit = (member: FirmMember) => {
    setEditMember(member)
    setEditRole(member.role)
    setEditPermissions(member.permissions || getDefaultPermissions(member.role))
    setOpenMenuId(null)
  }

  const handleEditSave = async () => {
    if (!editMember) return
    setEditLoading(true)
    try {
      const res = await fetch(`/api/firms/members/${editMember.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, permissions: editPermissions }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }
      setEditMember(null)
      fetchMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member')
    } finally {
      setEditLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!removeMember) return
    setRemoveLoading(true)
    try {
      const res = await fetch(`/api/firms/members/${removeMember.user_id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove')
      }
      setRemoveMember(null)
      fetchMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setRemoveLoading(false)
    }
  }

  const togglePermission = (category: keyof FirmPermissions, action: string) => {
    setEditPermissions((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [action]: !(prev[category] as Record<string, boolean>)[action],
      },
    }))
  }

  const getInitials = (name?: string, email?: string) => {
    const source = name || email || '?'
    return source
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const gradientColors = [
    'from-blue-500 to-purple-500',
    'from-green-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-500',
    'from-yellow-500 to-orange-500',
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7" />
            Team Management
          </h1>
          <p className="text-gray-500 mt-1">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            &times;
          </button>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {members.map((member, index) => {
            const roleInfo = FIRM_MEMBER_ROLE_INFO[member.role]
            const statusInfo = STATUS_STYLES[member.status]
            const displayName =
              member.profile?.full_name || member.invited_email || 'Unknown'
            const displayEmail =
              member.profile?.email || member.invited_email || ''

            return (
              <div
                key={member.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${
                      gradientColors[index % gradientColors.length]
                    }`}
                  >
                    <span className="text-white font-semibold text-sm">
                      {getInitials(member.profile?.full_name, displayEmail)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{displayName}</p>
                    <p className="text-sm text-gray-500">{displayEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleInfo.color} ${roleInfo.bgColor}`}
                  >
                    {roleInfo.label}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor}`}
                  >
                    {statusInfo.label}
                  </span>
                  {member.role !== 'owner' && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === member.id ? null : member.id)
                        }
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === member.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => openEdit(member)}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setRemoveMember(member)
                              setOpenMenuId(null)
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {members.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No team members yet</p>
              <p className="text-sm mt-1">Invite your first team member to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your firm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="colleague@example.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as FirmMemberRole)}
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {(
                  Object.entries(FIRM_MEMBER_ROLE_INFO) as [
                    FirmMemberRole,
                    typeof FIRM_MEMBER_ROLE_INFO[FirmMemberRole]
                  ][]
                )
                  .filter(([role]) => role !== 'owner')
                  .map(([role, info]) => (
                    <option key={role} value={role}>
                      {info.label} - {info.description}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowInvite(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviteLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {inviteLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Send Invite'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Edit Member
            </DialogTitle>
            <DialogDescription>
              Update role and permissions for{' '}
              {editMember?.profile?.full_name || editMember?.invited_email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => {
                  const role = e.target.value as FirmMemberRole
                  setEditRole(role)
                  setEditPermissions(getDefaultPermissions(role))
                }}
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {(
                  Object.entries(FIRM_MEMBER_ROLE_INFO) as [
                    FirmMemberRole,
                    typeof FIRM_MEMBER_ROLE_INFO[FirmMemberRole]
                  ][]
                )
                  .filter(([role]) => role !== 'owner')
                  .map(([role, info]) => (
                    <option key={role} value={role}>
                      {info.label}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Permissions</h3>
              <div className="space-y-4">
                {PERMISSION_CATEGORIES.map((category) => (
                  <div key={category.key} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      {category.label}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {category.actions.map((action) => (
                        <div key={action.key} className="flex items-center gap-2">
                          <Switch
                            checked={
                              (
                                editPermissions[category.key] as Record<
                                  string,
                                  boolean
                                >
                              )[action.key] ?? false
                            }
                            onCheckedChange={() =>
                              togglePermission(category.key, action.key)
                            }
                          />
                          <Label className="text-sm">{action.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setEditMember(null)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSave}
              disabled={editLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {editLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save Changes'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removeMember} onOpenChange={() => setRemoveMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              {removeMember?.profile?.full_name || removeMember?.invited_email}{' '}
              from the firm? They will lose access to all firm cases and data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setRemoveMember(null)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={removeLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {removeLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Remove Member'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
