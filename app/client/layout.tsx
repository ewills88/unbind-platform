'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ClientNav from '@/components/client/ClientNav'
import PWAInstaller from '@/components/client/PWAInstaller'
import PushNotificationSetup from '@/components/client/PushNotificationSetup'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Profile {
  full_name: string
  email: string
  role: string
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', user.id)
        .single()

      if (profileData) {
        // Redirect attorneys to the attorney dashboard
        if (profileData.role === 'admin') {
          router.push('/dashboard')
          return
        }
        setProfile(profileData)
      }
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="flex min-h-screen bg-blue-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col fixed left-0 top-0 bottom-0 z-30 w-64 bg-white border-r border-gray-200">
        <ClientNav variant="desktop" userId={userId} profile={profile} />
      </aside>

      {/* Mobile nav */}
      <ClientNav variant="mobile" userId={userId} profile={profile} />

      {/* Desktop spacer */}
      <div className="hidden lg:block w-64 flex-shrink-0" />

      {/* Mobile top spacer */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30" />

      {/* Main content */}
      <main className="flex-1 min-h-screen pt-14 pb-20 lg:pt-0 lg:pb-0">
        {children}
      </main>

      {/* PWA Install prompt */}
      <PWAInstaller />

      {/* Push notification setup prompt */}
      <PushNotificationSetup userId={userId} />
    </div>
  )
}
