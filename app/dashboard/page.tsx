'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '@/components/layout/Sidebar'
import ActiveCasesOverview from '@/components/dashboard/ActiveCasesOverview'

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
      
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {profile.role === 'admin' ? (
                <>Welcome back, {profile.full_name || 'Attorney'}</>
              ) : (
                <>Welcome, {profile.full_name || 'User'}</>
              )}
            </h1>
            <p className="mt-2 text-gray-600">
              {profile.role === 'admin' 
                ? 'Manage your cases and collaborate with clients efficiently.' 
                : 'Track your divorce case progress and communicate with your attorney.'}
            </p>
          </div>

          {/* Attorney Dashboard - Active Cases */}
          {profile.role === 'admin' && (
            <ActiveCasesOverview />
          )}

          {/* Client Dashboard - Simple View */}
          {profile.role !== 'admin' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Case Dashboard</h2>
                <p className="text-gray-600">Client dashboard coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}