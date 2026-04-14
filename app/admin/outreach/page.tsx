'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/supabase/auth-fetch'
import {
  Users, Mail, Calendar, Target, CheckCircle2, TrendingUp,
  Download, Play, Loader2, Filter, MoreHorizontal,
} from 'lucide-react'

interface Lead {
  id: string
  name: string
  email: string | null
  firm_name: string | null
  city: string | null
  state: string | null
  phone: string | null
  status: string
  sequence_step: number
  last_contacted_at: string | null
  next_contact_at: string | null
  demo_booked: boolean
  converted: boolean
  notes: string | null
  created_at: string
}

interface Stats {
  total: number
  emailsSentToday: number
  emailsSentWeek: number
  activeInSequence: number
  demosBooked: number
  converted: number
}

const STEP_LABELS = ['New', 'Email 1', 'Email 2', 'Email 3', 'Email 4', 'Email 5', 'Complete']
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  in_sequence: 'bg-blue-100 text-blue-700',
  sequence_complete: 'bg-green-100 text-green-700',
  demo_booked: 'bg-amber-100 text-amber-700',
  converted: 'bg-purple-100 text-purple-700',
  unsubscribed: 'bg-red-100 text-red-700',
  bounced: 'bg-red-100 text-red-700',
}

export default function OutreachDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, emailsSentToday: 0, emailsSentWeek: 0, activeInSequence: 0, demosBooked: 0, converted: 0 })
  const [loading, setLoading] = useState(true)
  const [filterState, setFilterState] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [running, setRunning] = useState<string | null>(null)
  const [actionMenu, setActionMenu] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/outreach')
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
        setStats(data.stats || stats)
      }
    } catch {
      console.error('Failed to fetch outreach data')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const runAction = async (action: 'scraper' | 'scheduler') => {
    setRunning(action)
    try {
      const res = await authFetch(`/api/admin/run-${action}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        alert(`${action} completed successfully`)
        fetchData()
      } else {
        alert(`${action} failed: ${data.error}`)
      }
    } catch {
      alert(`${action} failed`)
    } finally {
      setRunning(null)
    }
  }

  const updateLead = async (leadId: string, updates: Record<string, unknown>) => {
    await authFetch('/api/admin/outreach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: leadId, ...updates }),
    })
    fetchData()
    setActionMenu(null)
  }

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Firm', 'City', 'State', 'Phone', 'Status', 'Step', 'Last Contacted', 'Next Contact']
    const rows = leads.map(l => [
      l.name, l.email || '', l.firm_name || '', l.city || '', l.state || '',
      l.phone || '', l.status, l.sequence_step,
      l.last_contacted_at ? new Date(l.last_contacted_at).toLocaleDateString() : '',
      l.next_contact_at ? new Date(l.next_contact_at).toLocaleDateString() : '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `unbind-leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = leads.filter(l => {
    if (filterState && l.state !== filterState) return false
    if (filterStatus && l.status !== filterStatus) return false
    return true
  })

  const states = [...new Set(leads.map(l => l.state).filter(Boolean))].sort()
  const statuses = [...new Set(leads.map(l => l.status))].sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outreach Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">{stats.total} leads across {states.length} states</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => runAction('scraper')}
              disabled={running !== null}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {running === 'scraper' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Scraper
            </button>
            <button
              onClick={() => runAction('scheduler')}
              disabled={running !== null}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {running === 'scheduler' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Today&apos;s Emails
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-gray-700' },
            { label: 'Sent Today', value: stats.emailsSentToday, icon: Mail, color: 'text-blue-600' },
            { label: 'Sent This Week', value: stats.emailsSentWeek, icon: Calendar, color: 'text-blue-600' },
            { label: 'Active in Sequence', value: stats.activeInSequence, icon: Target, color: 'text-amber-600' },
            { label: 'Demos Booked', value: stats.demosBooked, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Conversion Rate', value: stats.total > 0 ? `${Math.round((stats.converted / stats.total) * 100)}%` : '0%', icon: TrendingUp, color: 'text-purple-600' },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${card.color}`} />
                  <span className="text-xs text-gray-500">{card.label}</span>
                </div>
                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              </div>
            )
          })}
        </div>

        {/* Pipeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8 overflow-x-auto">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Pipeline</h2>
          <div className="flex gap-2 min-w-max">
            {STEP_LABELS.map((label, i) => {
              const count = leads.filter(l => l.sequence_step === i).length
              return (
                <div key={label} className="flex-1 min-w-[90px] text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              )
            })}
            <div className="flex-1 min-w-[90px] text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-lg font-bold text-amber-700">{stats.demosBooked}</div>
              <div className="text-xs text-amber-600">Demo Booked</div>
            </div>
            <div className="flex-1 min-w-[90px] text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-700">{stats.converted}</div>
              <div className="text-xs text-green-600">Converted</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
          >
            <option value="">All States</option>
            {states.map(s => <option key={s} value={s!}>{s}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
          >
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-sm text-gray-500">{filtered.length} leads</span>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Firm</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Step</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Last Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Next</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.slice(0, 100).map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.firm_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{[lead.city, lead.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{lead.email || <span className="text-red-400">no email</span>}</td>
                    <td className="px-4 py-3">{STEP_LABELS[lead.sequence_step] || `Step ${lead.sequence_step}`}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {lead.next_contact_at ? new Date(lead.next_contact_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === lead.id ? null : lead.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                      {actionMenu === lead.id && (
                        <div className="absolute right-4 top-full z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44">
                          <button onClick={() => updateLead(lead.id, { status: 'demo_booked', demo_booked: true })} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-green-700">Mark Demo Booked</button>
                          <button onClick={() => updateLead(lead.id, { status: 'converted', converted: true })} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-purple-700">Mark Converted</button>
                          <button onClick={() => updateLead(lead.id, { status: 'unsubscribed' })} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600">Unsubscribe</button>
                          <button onClick={() => updateLead(lead.id, { status: 'bounced' })} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600">Mark Bounced</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No leads found. Run the scraper to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
