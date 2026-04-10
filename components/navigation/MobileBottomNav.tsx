'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Briefcase, MessageSquare, Plus, Grid3x3, X,
  FileText, Calendar, Library, Bell, BarChart3, Settings,
} from 'lucide-react'

const MORE_ITEMS = [
  { href: '/dashboard/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/templates', label: 'Templates', icon: Library },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/admin/settings', label: 'Settings', icon: Settings },
]

function HomeIcon({ active }: { active: boolean }) {
  const color = active ? '#f5a623' : '#6b7280'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* House roof */}
      <path d="M3 10.5L12 3l9 7.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* House walls */}
      <path d="M5 9.5V20a1 1 0 001 1h12a1 1 0 001-1V9.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Infinity symbol as "door" */}
      <path d="M9 16.5c0-1.4 1.1-2.5 2.5-2.5.8 0 1.6.4 2 1.1l.5.7.5-.7c.4-.7 1.2-1.1 2-1.1 1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5c-.8 0-1.6-.4-2-1.1l-.5-.7-.5.7c-.4.7-1.2 1.1-2 1.1C10.1 19 9 17.9 9 16.5z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const activeClass = 'text-amber-500'
  const inactiveClass = 'text-gray-500'

  return (
    <>
      {/* More drawer backdrop */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl safe-bottom" style={{ backgroundColor: '#0a0f1e' }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <span className="text-sm font-semibold text-white">More</span>
            <button onClick={() => setMoreOpen(false)} className="p-1 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 px-4 pb-6">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-xl transition-colors ${
                    active ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-amber-400' : 'text-gray-400'}`} />
                  <span className={`text-[11px] ${active ? 'text-amber-400' : 'text-gray-400'}`}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around h-16">
          {/* Home */}
          <Link href="/dashboard" className="flex flex-col items-center gap-0.5 min-w-[56px]">
            <HomeIcon active={isActive('/dashboard')} />
            <span className={`text-[10px] font-medium ${isActive('/dashboard') ? activeClass : inactiveClass}`}>Home</span>
          </Link>

          {/* Cases */}
          <Link href="/dashboard/cases" className="flex flex-col items-center gap-0.5 min-w-[56px]">
            <Briefcase className={`w-5 h-5 ${isActive('/dashboard/cases') ? activeClass : inactiveClass}`} />
            <span className={`text-[10px] font-medium ${isActive('/dashboard/cases') ? activeClass : inactiveClass}`}>Cases</span>
          </Link>

          {/* New (center button) */}
          <Link href="/dashboard/intake/new" className="flex items-center justify-center -mt-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#f5a623' }}>
              <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
          </Link>

          {/* Messages */}
          <Link href="/dashboard/messages" className="flex flex-col items-center gap-0.5 min-w-[56px]">
            <MessageSquare className={`w-5 h-5 ${isActive('/dashboard/messages') ? activeClass : inactiveClass}`} />
            <span className={`text-[10px] font-medium ${isActive('/dashboard/messages') ? activeClass : inactiveClass}`}>Messages</span>
          </Link>

          {/* More */}
          <button onClick={() => setMoreOpen(!moreOpen)} className="flex flex-col items-center gap-0.5 min-w-[56px]">
            <Grid3x3 className={`w-5 h-5 ${moreOpen ? activeClass : inactiveClass}`} />
            <span className={`text-[10px] font-medium ${moreOpen ? activeClass : inactiveClass}`}>More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
