'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  CheckSquare,
  MessageSquare,
  FileText,
  DollarSign,
  Calendar,
  HelpCircle,
  LogOut,
  MoreHorizontal,
  CreditCard,
} from 'lucide-react'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import NotificationCenter from '@/components/client/NotificationCenter'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface NavItem {
  name: string
  href: string
  icon: typeof Home
}

const navItems: NavItem[] = [
  { name: 'My Case', href: '/client', icon: Home },
  { name: 'Tasks', href: '/client/tasks', icon: CheckSquare },
  { name: 'Messages', href: '/client/messages', icon: MessageSquare },
  { name: 'Documents', href: '/client/documents', icon: FileText },
  { name: 'Finances', href: '/client/finances', icon: DollarSign },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Payments', href: '/client/payments', icon: CreditCard },
  { name: 'Help', href: '/client/resources', icon: HelpCircle },
]

// Bottom tab items for mobile (subset of main nav)
const mobileTabItems: NavItem[] = [
  { name: 'Home', href: '/client', icon: Home },
  { name: 'Tasks', href: '/client/tasks', icon: CheckSquare },
  { name: 'Messages', href: '/client/messages', icon: MessageSquare },
  { name: 'Docs', href: '/client/documents', icon: FileText },
  { name: 'More', href: '#more', icon: MoreHorizontal },
]

interface ClientNavProps {
  variant: 'desktop' | 'mobile'
  userId: string | null
  profile: { full_name: string; email: string } | null
}

export default function ClientNav({ variant, userId, profile }: ClientNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { totalUnread } = useUnreadCounts(userId)
  const [moreOpen, setMoreOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const isActive = (href: string) => {
    if (href === '/client') return pathname === '/client'
    return pathname.startsWith(href)
  }

  if (variant === 'mobile') {
    return (
      <>
        {/* Top header bar */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="w-10" />
          <img
            src="/unbind-logo.png"
            alt="Unbind"
            className="h-8 w-auto"
          />
          <NotificationCenter userId={userId} />
        </div>

        {/* Bottom tab bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-2 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around">
            {mobileTabItems.map((item) => {
              const Icon = item.icon
              const active = item.href !== '#more' && isActive(item.href)
              const showBadge = item.name === 'Messages' && totalUnread > 0
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
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {showBadge && (
                      <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-1">{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* More menu overlay */}
          {moreOpen && (
            <div
              className="fixed inset-0 z-50"
              onClick={() => setMoreOpen(false)}
            >
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
      </>
    )
  }

  // Desktop sidebar
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
        <img
          src="/unbind-logo.png"
          alt="Unbind - Divorce. Together."
          className="h-12 w-auto"
        />
        <NotificationCenter userId={userId} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const showBadge = item.name === 'Messages' && totalUnread > 0

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
              {showBadge && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Need help card */}
      <div className="px-4 py-3">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">Need help?</p>
          <p className="text-xs text-blue-700 mt-1">
            Contact your attorney or visit our help center.
          </p>
          <Link
            href="/client/resources"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 mt-2 inline-block"
          >
            Get Help →
          </Link>
        </div>
      </div>

      {/* User profile */}
      <div className="border-t border-gray-200 p-4">
        {profile && (
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
                <p className="text-xs text-gray-500 truncate">Client</p>
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
        )}
      </div>
    </div>
  )
}
