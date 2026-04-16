'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Plus, Loader2, AlertCircle, X, Lock,
} from 'lucide-react'
import type { Role, Permission } from '@/types/admin'
import { PERMISSION_CATEGORIES } from '@/types/admin'
import { authFetch } from '@/lib/supabase/auth-fetch'

export default function AdminRolesPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRole, setNewRole] = useState({ role_name: '', role_key: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchRoles() }, [])

  const fetchRoles = async () => {
    try {
      const res = await authFetch('/api/admin/roles')
      if (res.status === 401) { router.push('/login'); return }
      if (res.status === 403) { setError('Access denied'); setLoading(false); return }
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setRoles(data.data.roles || [])
      setAllPermissions(data.data.permissions || [])
    } catch { setError('Failed to load roles') }
    finally { setLoading(false) }
  }

  const fetchRolePermissions = async (roleId: string) => {
    setLoadingPerms(true)
    setSelectedRole(roleId)
    try {
      const res = await authFetch(`/api/admin/roles?roleId=${roleId}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setRolePermissions(data.data || [])
    } catch { setError('Failed to load permissions') }
    finally { setLoadingPerms(false) }
  }

  const togglePermission = (permKey: string) => {
    setRolePermissions(prev =>
      prev.includes(permKey) ? prev.filter(p => p !== permKey) : [...prev, permKey]
    )
  }

  const savePermissions = async () => {
    if (!selectedRole) return
    setSaving(true)
    try {
      const res = await authFetch('/api/admin/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRole, permissions: rolePermissions }),
      })
      if (!res.ok) throw new Error('Failed')
      fetchRoles()
    } catch { setError('Failed to save permissions') }
    finally { setSaving(false) }
  }

  const handleCreateRole = async () => {
    if (!newRole.role_name || !newRole.role_key) return
    setSaving(true)
    try {
      const res = await authFetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRole, permissions: [] }),
      })
      if (!res.ok) throw new Error('Failed')
      setShowCreateModal(false)
      setNewRole({ role_name: '', role_key: '', description: '' })
      fetchRoles()
    } catch { setError('Failed to create role') }
    finally { setSaving(false) }
  }

  const selectedRoleData = roles.find(r => r.id === selectedRole)
  const permissionsByCategory = PERMISSION_CATEGORIES.map(cat => ({
    ...cat,
    permissions: allPermissions.filter(p => p.category === cat.key),
  })).filter(cat => cat.permissions.length > 0)

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Configure access control for your team</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Create Role
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" /><p className="text-red-800 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4 text-red-600" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1f2937] rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-[#1f2937]">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Roles</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-[#1f2937]">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => fetchRolePermissions(role.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedRole === role.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {role.is_system && <Lock className="w-3 h-3 text-gray-400 dark:text-gray-500" />}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{role.role_name}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.description}</p>
                {role.is_system && <span className="text-xs text-gray-400 dark:text-gray-500">System role</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1f2937] rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-[#1f2937] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {selectedRoleData ? `Permissions: ${selectedRoleData.role_name}` : 'Select a role'}
            </h3>
            {selectedRole && !selectedRoleData?.is_system && (
              <button onClick={savePermissions} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>

          {!selectedRole ? (
            <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Select a role to view permissions</p>
              </div>
            </div>
          ) : loadingPerms ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {permissionsByCategory.map(cat => (
                <div key={cat.key}>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{cat.label}</h4>
                  <div className="space-y-1">
                    {cat.permissions.map(perm => (
                      <label key={perm.permission_key} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1f2937] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rolePermissions.includes(perm.permission_key)}
                          onChange={() => togglePermission(perm.permission_key)}
                          disabled={selectedRoleData?.is_system}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-[#374151] rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{perm.permission_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {selectedRoleData?.is_system && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  System roles cannot be modified. Create a custom role to customize permissions.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-[#111827] rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Custom Role</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Role Name *</label>
                <input type="text" value={newRole.role_name} onChange={e => setNewRole(p => ({ ...p, role_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#374151] rounded-lg text-sm" placeholder="e.g. Senior Paralegal" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Role Key *</label>
                <input type="text" value={newRole.role_key} onChange={e => setNewRole(p => ({ ...p, role_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#374151] rounded-lg text-sm" placeholder="e.g. senior_paralegal" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description</label>
                <input type="text" value={newRole.description} onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#374151] rounded-lg text-sm" placeholder="Brief description..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1f2937] rounded-lg">Cancel</button>
              <button onClick={handleCreateRole} disabled={saving || !newRole.role_name || !newRole.role_key}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
