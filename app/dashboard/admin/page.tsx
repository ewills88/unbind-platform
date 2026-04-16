'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, Shield, CreditCard, Columns3, FileText,
  Puzzle, ClipboardList, Loader2, AlertCircle,
  Building2, ArrowRight,
} from 'lucide-react'

interface AdminStats {
  totalMembers: number
  activeMembers: number
  pendingInvitations: number
  planName: string
  seatsUsed: number
  seatsIncluded: number
}

const adminSections = [
  { name: 'Firm Settings', href: '/dashboard/admin/settings', icon: Building2, description: 'Profile, branding, localization' },
  { name: 'User Management', href: '/dashboard/admin/users', icon: Users, description: 'Members, invitations, roles' },
  { name: 'Roles & Permissions', href: '/dashboard/admin/roles', icon: Shield, description: 'Access control, custom roles' },
  { name: 'Billing & Subscription', href: '/dashboard/admin/billing', icon: CreditCard, description: 'Plan, payments, invoices' },
  { name: 'Custom Fields', href: '/dashboard/admin/custom-fields', icon: Columns3, description: 'Case, client, document fields' },
  { name: 'Templates', href: '/dashboard/admin/templates', icon: FileText, description: 'Task, email, document templates' },
  { name: 'Integrations', href: '/dashboard/admin/integrations', icon: Puzzle, description: 'Third-party connections' },
  { name: 'Audit Logs', href: '/dashboard/admin/audit', icon: ClipboardList, description: 'Activity history, login records' },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [usersRes, subRes] = await Promise.all([
        authFetch('/api/admin/users'),
        authFetch('/api/admin/subscription'),
      ])

      if (usersRes.status === 401) {
        router.push('/login')
        return
      }
      if (usersRes.status === 403) {
        setError('You do not have admin access.')
        setLoading(false)
        return
      }

      const usersData = usersRes.ok ? await usersRes.json() : { data: [] }
      const subData = subRes.ok ? await subRes.json() : { data: { subscription: null, plans: [] } }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const members = usersData.data || []
      const sub = subData.data?.subscription

      setStats({
        totalMembers: members.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeMembers: members.filter((m: any) => m.status === 'active').length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pendingInvitations: members.filter((m: any) => m.status === 'invited').length,
        planName: sub?.plan_name || 'Free',
        seatsUsed: sub?.seats_used || members.length,
        seatsIncluded: sub?.seats_included || 1,
      })
    } catch {
      setError('Failed to load admin dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Access Denied</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Console</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your firm settings, team, and configuration</p>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1f2937] rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Members</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.activeMembers}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stats.totalMembers} total</p>
          </div>
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1f2937] rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Invitations</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.pendingInvitations}</p>
          </div>
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1f2937] rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.planName}</p>
          </div>
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1f2937] rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Seats Usage</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.seatsUsed} / {stats.seatsIncluded}</p>
            <div className="mt-2 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (stats.seatsUsed / stats.seatsIncluded) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminSections.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.name}
              href={section.href}
              className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1f2937] rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600">{section.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{section.description}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 mt-1" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
