'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Home, MessageSquare, FileText, CheckSquare,
  DollarSign, Calendar, HelpCircle, LogOut,
  MoreHorizontal, Bell,
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Profile {
  full_name: string
  email: string
  role: string
}

interface NavItem {
  name: string
  href: string
  icon: typeof Home
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/portal/dashboard', icon: Home },
  { name: 'Messages', href: '/portal/messages', icon: MessageSquare },
  { name: 'Tasks', href: '/portal/tasks', icon: CheckSquare },
  { name: 'Documents', href: '/portal/documents', icon: FileText },
  { name: 'Appointments', href: '/portal/appointments', icon: Calendar },
  { name: 'Billing', href: '/portal/billing', icon: DollarSign },
  { name: 'Notifications', href: '/portal/notifications', icon: Bell },
  { name: 'Resources', href: '/portal/resources', icon: HelpCircle },
]

const mobileTabItems: NavItem[] = [
  { name: 'Home', href: '/portal/dashboard', icon: Home },
  { name: 'Messages', href: '/portal/messages', icon: MessageSquare },
  { name: 'Tasks', href: '/portal/tasks', icon: CheckSquare },
  { name: 'Docs', href: '/portal/documents', icon: FileText },
  { name: 'More', href: '#more', icon: MoreHorizontal },
]

// Pages that don't need the layout shell (login, callback)
const noLayoutPages = ['/portal/login', '/portal/auth', '/portal/accept-invite']

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [moreOpen, setMoreOpen] = useState(false)

  // Skip layout for login/auth pages
  const isAuthPage = noLayoutPages.some(p => pathname.startsWith(p))

  useEffect(() => {
    if (!isAuthPage) {
      checkAuth()
    } else {
      setLoading(false)
    }
  }, [isAuthPage])

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.push('/portal/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }
    } catch {
      router.push('/portal/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/portal/auth/session', { method: 'DELETE' })
    } catch {
      // Continue with client-side logout
    }
    await supabase.auth.signOut()
    router.push('/portal/login')
  }

  const isActive = (href: string) => {
    if (href === '/portal/dashboard') return pathname === '/portal/dashboard'
    return pathname.startsWith(href)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  // Auth pages get no layout shell
  if (isAuthPage) {
    return <>{children}</>
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
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col fixed left-0 top-0 bottom-0 z-30 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-5 border-b border-gray-200">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg mr-3">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">Unbind</span>
              <span className="text-xs text-gray-500 block -mt-0.5">Client Portal</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-700' : 'text-gray-500'}`} />
                  <span className="flex-1">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Help Card */}
          <div className="px-4 py-3">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Need help?</p>
              <p className="text-xs text-blue-700 mt-1">
                Contact your attorney or visit our help center.
              </p>
              <Link
                href="/portal/resources"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Get Help →
              </Link>
            </div>
          </div>

          {/* User Profile */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {getInitials(profile.full_name || profile.email)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {profile.full_name || 'Client'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile: Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">U</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Unbind</span>
        </div>
        <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile: Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around">
          {mobileTabItems.map((item) => {
            const Icon = item.icon
            const active = item.href !== '#more' && isActive(item.href)
            const isMore = item.href === '#more'

            if (isMore) {
              return (
                <button
                  key={item.name}
                  onClick={() => setMoreOpen(!moreOpen)}
                  className="flex flex-col items-center justify-center py-2 px-3 min-h-[44px] min-w-[44px] text-gray-500"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] mt-1">{item.name}</span>
                </button>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-3 min-h-[44px] min-w-[44px] ${
                  active ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-1">{item.name}</span>
              </Link>
            )
          })}
        </div>

        {/* More menu overlay */}
        {moreOpen && (
          <div className="fixed inset-0 z-50" onClick={() => setMoreOpen(false)}>
            <div className="absolute bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg rounded-t-xl p-4">
              <div className="grid grid-cols-3 gap-4">
                {navItems
                  .filter(item => !mobileTabItems.find(m => m.href === item.href))
                  .map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className="flex flex-col items-center py-3 px-2 rounded-lg hover:bg-gray-50 min-h-[44px]"
                      >
                        <Icon className="w-6 h-6 text-gray-600 mb-1" />
                        <span className="text-xs text-gray-700">{item.name}</span>
                      </Link>
                    )
                  })}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Desktop sidebar spacer */}
      <div className="hidden lg:block w-64 flex-shrink-0" />

      {/* Mobile top spacer */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30" />

      {/* Main Content */}
      <main className="flex-1 min-h-screen pt-14 pb-20 lg:pt-0 lg:pb-0">
        {children}
      </main>
    </div>
  )
}
