'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/supabase/auth-fetch'
import {
  Loader2, Plus, X, Check, MessageSquare, Heart, Share2,
  MousePointer, Users, Calendar,
} from 'lucide-react'

interface SocialPost {
  id: string
  platform: string
  content: string
  posted_at: string | null
  scheduled_for: string | null
  status: string
  likes: number
  comments: number
  shares: number
  clicks: number
  leads_generated: number
  notes: string | null
  created_at: string
}

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn', color: 'bg-blue-100 text-blue-700' },
  { value: 'facebook', label: 'Facebook', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'reddit', label: 'Reddit', color: 'bg-orange-100 text-orange-700' },
  { value: 'x', label: 'X', color: 'bg-gray-100 text-gray-700' },
]

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  posted: 'bg-green-100 text-green-700',
}

function getPlatformConfig(platform: string) {
  return PLATFORMS.find(p => p.value === platform) || PLATFORMS[0]
}

export default function SocialPostsTab() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMetrics, setEditingMetrics] = useState<string | null>(null)
  const [metricsForm, setMetricsForm] = useState({ likes: 0, comments: 0, shares: 0, clicks: 0, leads_generated: 0 })

  // New post form state
  const [newPlatform, setNewPlatform] = useState('linkedin')
  const [newContent, setNewContent] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newStatus, setNewStatus] = useState('scheduled')
  const [saving, setSaving] = useState(false)

  const fetchPosts = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/social')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleCreate = async () => {
    if (!newContent.trim()) return
    setSaving(true)
    try {
      await authFetch('/api/admin/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: newPlatform,
          content: newContent.trim(),
          scheduled_for: newDate || null,
          status: newStatus,
        }),
      })
      setShowForm(false)
      setNewContent('')
      setNewDate('')
      fetchPosts()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const markPosted = async (postId: string) => {
    await authFetch('/api/admin/social', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, status: 'posted', posted_at: new Date().toISOString() }),
    })
    fetchPosts()
  }

  const saveMetrics = async (postId: string) => {
    await authFetch('/api/admin/social', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, ...metricsForm }),
    })
    setEditingMetrics(null)
    fetchPosts()
  }

  const startEditMetrics = (post: SocialPost) => {
    setMetricsForm({
      likes: post.likes, comments: post.comments, shares: post.shares,
      clicks: post.clicks, leads_generated: post.leads_generated,
    })
    setEditingMetrics(post.id)
  }

  const now = new Date()
  const weekStart = new Date(now.getTime() - now.getDay() * 86400000)
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)

  const thisWeekPosts = posts.filter(p => {
    const d = new Date(p.scheduled_for || p.created_at)
    return d >= weekStart && d < weekEnd
  })

  const totalLikes = posts.reduce((s, p) => s + p.likes, 0)
  const totalComments = posts.reduce((s, p) => s + p.comments, 0)
  const totalShares = posts.reduce((s, p) => s + p.shares, 0)
  const totalLeads = posts.reduce((s, p) => s + p.leads_generated, 0)
  const postedCount = posts.filter(p => p.status === 'posted').length

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Scheduled This Week', value: thisWeekPosts.filter(p => p.status === 'scheduled').length, icon: Calendar },
          { label: 'Published Total', value: postedCount, icon: Check },
          { label: 'Total Engagement', value: totalLikes + totalComments + totalShares, icon: Heart },
          { label: 'Total Clicks', value: posts.reduce((s, p) => s + p.clicks, 0), icon: MousePointer },
          { label: 'Leads from Social', value: totalLeads, icon: Users },
        ].map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">{card.label}</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{card.value}</div>
            </div>
          )
        })}
      </div>

      {/* Weekly Calendar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">This Week</h3>
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
            const date = new Date(weekStart.getTime() + i * 86400000)
            const dayPosts = posts.filter(p => {
              const d = new Date(p.scheduled_for || p.created_at)
              return d.toDateString() === date.toDateString()
            })
            const isToday = date.toDateString() === now.toDateString()

            return (
              <div key={day} className={`text-center p-2 rounded-lg ${isToday ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                <div className="text-[10px] text-gray-500">{day}</div>
                <div className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>{date.getDate()}</div>
                <div className="mt-1 space-y-0.5">
                  {dayPosts.map(p => {
                    const plat = getPlatformConfig(p.platform)
                    return (
                      <div key={p.id} className={`text-[9px] px-1 py-0.5 rounded ${plat.color} truncate`}>
                        {plat.label}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Post Button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-700">All Posts ({posts.length})</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {/* Quick Add Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
              <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Schedule For</label>
              <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={3} placeholder="Post content..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none mb-3" />
          <button onClick={handleCreate} disabled={saving || !newContent.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Post'}
          </button>
        </div>
      )}

      {/* Posts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Platform</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Content</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600"><Heart className="w-3.5 h-3.5 inline" /></th>
                <th className="text-center px-3 py-3 font-medium text-gray-600"><MessageSquare className="w-3.5 h-3.5 inline" /></th>
                <th className="text-center px-3 py-3 font-medium text-gray-600"><Share2 className="w-3.5 h-3.5 inline" /></th>
                <th className="text-center px-3 py-3 font-medium text-gray-600"><MousePointer className="w-3.5 h-3.5 inline" /></th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Leads</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map(post => {
                const plat = getPlatformConfig(post.platform)
                const isEditing = editingMetrics === post.id

                return (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${plat.color}`}>{plat.label}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <p className="text-gray-700 text-xs truncate">{post.content}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {post.scheduled_for ? new Date(post.scheduled_for).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[post.status] || 'bg-gray-100'}`}>{post.status}</span>
                    </td>
                    {isEditing ? (
                      <>
                        {(['likes', 'comments', 'shares', 'clicks', 'leads_generated'] as const).map(field => (
                          <td key={field} className="px-1 py-2">
                            <input
                              type="number"
                              min="0"
                              value={metricsForm[field]}
                              onChange={e => setMetricsForm({ ...metricsForm, [field]: parseInt(e.target.value) || 0 })}
                              className="w-14 px-1 py-1 text-xs border border-blue-300 rounded text-center"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-3">
                          <button onClick={() => saveMetrics(post.id)} className="text-xs text-blue-600 font-medium">Save</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3 text-center text-gray-600">{post.likes}</td>
                        <td className="px-3 py-3 text-center text-gray-600">{post.comments}</td>
                        <td className="px-3 py-3 text-center text-gray-600">{post.shares}</td>
                        <td className="px-3 py-3 text-center text-gray-600">{post.clicks}</td>
                        <td className="px-3 py-3 text-center text-gray-600">{post.leads_generated}</td>
                        <td className="px-2 py-3 space-x-2 whitespace-nowrap">
                          <button onClick={() => startEditMetrics(post)} className="text-xs text-gray-500 hover:text-blue-600">Edit</button>
                          {post.status !== 'posted' && (
                            <button onClick={() => markPosted(post.id)} className="text-xs text-green-600 hover:text-green-700">Post</button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {posts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No posts yet. Create your first post above.</p>
          </div>
        )}
      </div>
    </div>
  )
}
