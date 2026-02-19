'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, Loader2, AlertCircle, Filter, ChevronLeft, ChevronRight,
  User, Clock, FileText, Settings, Shield, Eye,
} from 'lucide-react'
import type { AuditLog } from '@/types/admin'

const ACTION_ICONS: Record<string, typeof User> = {
  create: FileText,
  update: Settings,
  delete: ClipboardList,
  view: Eye,
  invite: User,
  deactivate: Shield,
  login: Clock,
}

const ACTION_COLORS: Record<string, string> = {
  create: 'text-green-600 bg-green-50',
  update: 'text-blue-600 bg-blue-50',
  delete: 'text-red-600 bg-red-50',
  view: 'text-gray-600 bg-gray-50',
  invite: 'text-purple-600 bg-purple-50',
  deactivate: 'text-amber-600 bg-amber-50',
  login: 'text-indigo-600 bg-indigo-50',
  permission_change: 'text-orange-600 bg-orange-50',
}

export default function AdminAuditPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const pageSize = 25

  useEffect(() => { fetchLogs() }, [page, filterAction, filterEntity])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      })
      if (filterAction) params.set('action', filterAction)
      if (filterEntity) params.set('entityType', filterEntity)

      const res = await fetch(`/api/admin/audit?${params}`)
      if (res.status === 401) { router.push('/login'); return }
      if (res.status === 403) { setError('Access denied'); setLoading(false); return }
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setLogs(data.data || [])
      setTotal(data.total || 0)
    } catch { setError('Failed to load audit logs') }
    finally { setLoading(false) }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-1">Track all changes and activity in your firm</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" /><p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="view">View</option>
            <option value="invite">Invite</option>
            <option value="deactivate">Deactivate</option>
            <option value="permission_change">Permission Change</option>
          </select>
          <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(0) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">All Entities</option>
            <option value="firm_settings">Firm Settings</option>
            <option value="firm_member">Members</option>
            <option value="role">Roles</option>
            <option value="integration">Integrations</option>
            <option value="custom_field">Custom Fields</option>
            <option value="case">Cases</option>
          </select>
        </div>
        <p className="text-sm text-gray-500 ml-auto">{total} events</p>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500">No audit logs found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {logs.map(log => {
            const ActionIcon = ACTION_ICONS[log.action] || ClipboardList
            const colorClass = ACTION_COLORS[log.action] || ACTION_COLORS.view

            return (
              <div key={log.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <ActionIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{log.user_name || log.user_email || 'System'}</span>
                      <span className="text-sm text-gray-500">{log.action}</span>
                      <span className="text-sm text-gray-700">{log.entity_type?.replace(/_/g, ' ')}</span>
                      {log.entity_name && <span className="text-sm text-blue-600">{log.entity_name}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(log.created_at).toLocaleString()}
                      {log.ip_address && ` · ${log.ip_address}`}
                    </p>
                    {log.changes?.after && (
                      <div className="mt-1">
                        <details className="text-xs text-gray-500">
                          <summary className="cursor-pointer hover:text-gray-700">View changes</summary>
                          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.changes.after, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
