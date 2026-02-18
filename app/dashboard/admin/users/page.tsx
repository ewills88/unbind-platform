'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, UserPlus, Loader2, AlertCircle, Mail, MoreVertical,
  Shield, Clock, X, Search, ChevronDown,
} from 'lucide-react'
import type { EnhancedFirmMember } from '@/types/admin'
import { FIRM_MEMBER_ROLE_INFO } from '@/types/firm'

export default function AdminUsersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<EnhancedFirmMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'attorney', title: '', department: '' })
  const [inviting, setInviting] = useState(false)
  const [editingMember, setEditingMember] = useState<string | null>(null)

  useEffect(() => { fetchMembers() }, [showInactive])

  const fetchMembers = async () => {
    try {
      const params = showInactive ? '?include_inactive=true' : ''
      const res = await fetch(`/api/admin/users${params}`)
      if (res.status === 401) { router.push('/login'); return }
      if (res.status === 403) { setError('Access denied'); setLoading(false); return }
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setMembers(data.data || [])
    } catch { setError('Failed to load members') }
    finally { setLoading(false) }
  }

  const handleInvite = async () => {
    if (!inviteForm.email) return
    setInviting(true)
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to invite'); return }
      setShowInviteModal(false)
      setInviteForm({ email: '', role: 'attorney', title: '', department: '' })
      fetchMembers()
    } catch { setError('Failed to send invitation') }
    finally { setInviting(false) }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdateMember = async (memberId: string, updates: Record<string, any>) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, updates }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setEditingMember(null)
      fetchMembers()
    } catch { setError('Failed to update member') }
  }

  const handleDeactivate = async (memberId: string) => {
    if (!confirm('Are you sure you want to deactivate this member?')) return
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      if (!res.ok) throw new Error('Failed')
      fetchMembers()
    } catch { setError('Failed to deactivate member') }
  }

  const filteredMembers = members.filter(m => {
    if (!search) return true
    const name = m.profile?.full_name || m.invited_email || ''
    const email = m.profile?.email || m.invited_email || ''
    return name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" /><p className="text-red-800 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
          Show inactive
        </label>
      </div>

      {/* Members Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Member</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredMembers.map(member => {
              const name = member.profile?.full_name || member.invited_email || 'Unknown'
              const email = member.profile?.email || member.invited_email || ''
              const roleInfo = FIRM_MEMBER_ROLE_INFO[member.role as keyof typeof FIRM_MEMBER_ROLE_INFO]

              return (
                <tr key={member.id} className={`${!member.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">{name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{name}</p>
                        <p className="text-xs text-gray-500">{email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingMember === member.id ? (
                      <select value={member.role} onChange={e => handleUpdateMember(member.id, { role: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm">
                        <option value="owner">Owner</option>
                        <option value="senior_attorney">Senior Attorney</option>
                        <option value="attorney">Attorney</option>
                        <option value="paralegal">Paralegal</option>
                        <option value="legal_assistant">Legal Assistant</option>
                        <option value="billing_specialist">Billing Specialist</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleInfo?.bgColor || 'bg-gray-100'} ${roleInfo?.color || 'text-gray-700'}`}>
                        {roleInfo?.label || member.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      member.status === 'active' ? 'text-green-700' :
                      member.status === 'invited' ? 'text-amber-700' :
                      'text-gray-500'
                    }`}>
                      {member.status === 'invited' && <Clock className="w-3 h-3" />}
                      {member.status === 'active' && <Shield className="w-3 h-3" />}
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.department || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button onClick={() => setEditingMember(editingMember === member.id ? null : member.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {editingMember === member.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <button onClick={() => { handleUpdateMember(member.id, { is_admin: !member.is_admin }) }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            {member.is_admin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                          {member.status === 'active' && member.role !== 'owner' && (
                            <button onClick={() => handleDeactivate(member.id)}
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                              Deactivate
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No members found</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Invite Team Member</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="colleague@firm.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="senior_attorney">Senior Attorney</option>
                  <option value="attorney">Attorney</option>
                  <option value="paralegal">Paralegal</option>
                  <option value="legal_assistant">Legal Assistant</option>
                  <option value="billing_specialist">Billing Specialist</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={inviteForm.title} onChange={e => setInviteForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Senior Partner" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input type="text" value={inviteForm.department} onChange={e => setInviteForm(p => ({ ...p, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Family Law" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleInvite} disabled={inviting || !inviteForm.email}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                <Mail className="w-4 h-4" />
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
