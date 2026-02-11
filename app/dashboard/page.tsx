'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '@/components/layout/Sidebar'
import ActiveCasesOverview from '@/components/dashboard/ActiveCasesOverview'
import QuickActions from '@/components/dashboard/QuickActions'
import RecentActivity from '@/components/dashboard/RecentActivity'
import CaseProgressTracker from '@/components/dashboard/CaseProgressTracker'
import DocumentAnalytics from '@/components/dashboard/DocumentAnalytics'
import { UpcomingDeadlines } from '@/components/events'
import ClientBillingSection from '@/components/billing/ClientBillingSection'
import MultiStateDashboard from '@/components/stateLaw/MultiStateDashboard'

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

function MultiStateDashboardWrapper() {
  const router = useRouter()
  const [casesByState, setCasesByState] = useState<{ state: string; count: number; cases: { id: string; client_name: string; status: string; filing_date: string | null }[] }[]>([])

  useEffect(() => {
    async function fetchCases() {
      const { data: cases } = await supabase
        .from('cases')
        .select('id, client_name, status, filing_date, state')
        .in('status', ['consultation', 'active', 'settlement'])
        .order('created_at', { ascending: false })
      if (!cases) return

      const byState: Record<string, typeof cases> = {}
      for (const c of cases) {
        const st = c.state || 'Unknown'
        if (!byState[st]) byState[st] = []
        byState[st].push(c)
      }
      setCasesByState(
        Object.entries(byState).map(([state, cs]) => ({
          state,
          count: cs.length,
          cases: cs.map((c) => ({ id: c.id, client_name: c.client_name, status: c.status, filing_date: c.filing_date })),
        }))
      )
    }
    fetchCases()
  }, [])

  return (
    <MultiStateDashboard
      casesByState={casesByState}
      onCaseClick={(id) => router.push(`/dashboard/cases/${id}`)}
    />
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

              {/* Document Analytics */}
              <div className="mb-6">
                <DocumentAnalytics />
              </div>
              
              {/* Active Cases Overview */}
              <ActiveCasesOverview />

              {/* Multi-State Dashboard */}
              <div className="mt-6">
                <MultiStateDashboardWrapper />
              </div>
            </div>
          </main>

          {/* Right Sidebar - Deadlines & Activity */}
          <aside className="hidden xl:block w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-6 space-y-6">
              <UpcomingDeadlines limit={5} />
              <RecentActivity />
            </div>
          </aside>
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