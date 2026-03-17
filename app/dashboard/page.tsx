'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ChevronDown, ChevronUp, Activity, PanelRightClose, PanelRightOpen } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import ActiveCasesOverview from '@/components/dashboard/ActiveCasesOverview'
import QuickActions from '@/components/dashboard/QuickActions'
import RecentActivity from '@/components/dashboard/RecentActivity'
import CaseProgressTracker from '@/components/dashboard/CaseProgressTracker'
import DocumentAnalytics from '@/components/dashboard/DocumentAnalytics'
import { UpcomingDeadlines } from '@/components/events'
import ClientBillingSection from '@/components/billing/ClientBillingSection'

const supabase = createClient(
  'https://rpbjravqgflidnwjkgvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'
)

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
  phone: string | null
}

function RightSidebar() {
  const [activityOpen, setActivityOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rightSidebarCollapsed') === 'true'
    }
    return false
  })

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('rightSidebarCollapsed', String(next))
  }

  return (
    <aside className={`hidden xl:flex border-l border-gray-200 bg-white transition-all duration-300 ${
      collapsed ? 'w-12' : 'w-80'
    }`}>
      {/* Collapse toggle */}
      <div className={`flex flex-col ${collapsed ? 'w-12 items-center pt-4' : 'w-full'}`}>
        <button
          onClick={toggleCollapsed}
          className={`flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ${
            collapsed ? 'mx-auto' : 'ml-auto mr-2 mt-2'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelRightOpen className="w-4 h-4" />
          ) : (
            <PanelRightClose className="w-4 h-4" />
          )}
        </button>

        {!collapsed && (
          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
            <UpcomingDeadlines limit={5} />

            {/* Collapsible Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => setActivityOpen(!activityOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-900">Recent Activity</span>
                </div>
                {activityOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {activityOpen && (
                <div className="border-t border-gray-200">
                  <RecentActivity />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserAndLoadProfile()
  }, [])

  const checkUserAndLoadProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
      } else {
        setProfile(profileData)
      }
    } catch (error) {
      console.error('Error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600">Error loading profile</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Return to login
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      {/* Attorney Dashboard with 3-column layout */}
      {profile.role === 'admin' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <main className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Welcome Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {profile.full_name || 'Attorney'}
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage your cases and collaborate with clients efficiently.
                </p>
              </div>

              {/* Quick Actions Bar - Horizontal */}
              <div className="mb-6">
                <QuickActions />
              </div>

              {/* All Cases Overview - Primary content */}
              <div className="mb-6">
                <ActiveCasesOverview />
              </div>

              {/* Document Analytics */}
              <div className="mb-6">
                <DocumentAnalytics />
              </div>
            </div>
          </main>

          {/* Right Sidebar - Deadlines & Collapsible Activity */}
          <RightSidebar />
        </div>
      ) : (
        /* Client Dashboard */
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {profile.full_name || 'User'}
              </h1>
              <p className="mt-2 text-gray-600">
                Track your divorce case progress and stay informed about next steps.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <CaseProgressTracker />
              </div>
              <div>
                <UpcomingDeadlines limit={5} />
              </div>
            </div>

            {/* Billing & Payments */}
            <div className="mb-6">
              <ClientBillingSection />
            </div>
          </div>
        </main>
      )}
    </div>
  )
}