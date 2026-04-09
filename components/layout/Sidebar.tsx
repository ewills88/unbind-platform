'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Home,
  Briefcase,
  FileText,
  MessageSquare,
  Calendar,
  BarChart3,
  Settings,
  CheckSquare,
  BookOpen,
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Users,
  ClipboardList,
  Library,
  PieChart,
  Activity,
  DollarSign,
  CreditCard,
  HelpCircle,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'

const supabase = createClient(
  'https://rpbjravqgflidnwjkgvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'
)

interface Profile {
  role: string
  full_name: string
  email: string
  current_firm_id: string | null
}

interface FirmInfo {
  name: string
}

const attorneyNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Cases', href: '/dashboard/cases', icon: Briefcase },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Client Intake', href: '/dashboard/intake', icon: ClipboardList },
  { name: 'Templates', href: '/dashboard/templates', icon: Library },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Resources', href: '/dashboard/resources', icon: BookOpen },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Help', href: '/help', icon: HelpCircle },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const clientNavItems = [
  { name: 'My Case', href: '/client', icon: Home },
  { name: 'Tasks', href: '/client/tasks', icon: CheckSquare },
  { name: 'Documents', href: '/client/documents', icon: FileText },
  { name: 'Messages', href: '/client/messages', icon: MessageSquare },
  { name: 'Resources', href: '/dashboard/resources', icon: BookOpen },
  { name: 'Help', href: '/help', icon: HelpCircle },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [firmInfo, setFirmInfo] = useState<FirmInfo | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  // Get unread message counts
  const { totalUnread } = useUnreadCounts(userId)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('role, full_name, email, current_firm_id')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        // Load firm info if user belongs to a firm
        if (data.current_firm_id) {
          const { data: firm } = await supabase
            .from('firms')
            .select('name')
            .eq('id', data.current_firm_id)
            .single()
          if (firm) setFirmInfo(firm)
        }
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Default to attorney nav while profile is loading to prevent flash of client nav items.
  // The Sidebar remounts on every page navigation (no shared layout), so profile is
  // briefly null on each transition. Without this guard, attorneys see Tasks/Resources flash.
  const navItems = !profile
    ? attorneyNavItems
    : profile.role === 'admin'
      ? profile.current_firm_id
        ? [
            ...attorneyNavItems.slice(0, -1),
            { name: 'Firm Overview', href: '/dashboard/firm', icon: PieChart },
            { name: 'My Tasks', href: '/dashboard/my-tasks', icon: ClipboardList },
            { name: 'Templates', href: '/dashboard/templates', icon: Library },
            { name: 'Workload', href: '/dashboard/workload', icon: Activity },
            { name: 'Financial', href: '/dashboard/reports/financial', icon: DollarSign },
            { name: 'Team', href: '/dashboard/team', icon: Users },
            { name: 'Subscription', href: '/dashboard/settings/subscription', icon: CreditCard },
            ...attorneyNavItems.slice(-1),
          ]
        : attorneyNavItems
      : clientNavItems

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo/Brand */}
<div className={`border-b border-gray-200 ${isCollapsed ? 'flex items-center justify-center px-2 py-4' : 'px-5 py-4'}`}>
  {isCollapsed ? (
    <img src="/logo-icon.svg" alt="Unbind" className="w-9 h-9" />
  ) : (
    <div>
      <img src="/logo-light.svg" alt="Unbind" className="h-8 w-auto" style={{ minWidth: '150px' }} />
      {firmInfo && (
        <p className="text-xs text-gray-400 mt-1.5 truncate">{firmInfo.name}</p>
      )}
    </div>
  )}
</div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const showBadge = item.name === 'Messages' && totalUnread > 0

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={`
                flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative
                ${isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
                }
                ${isCollapsed ? 'justify-center' : 'space-x-3'}
              `}
            >
              <div className="relative">
                <Icon className={`${isActive ? 'text-blue-700' : 'text-gray-500'} ${isCollapsed ? 'w-5 h-5' : 'w-5 h-5 flex-shrink-0'}`} />
                {showBadge && isCollapsed && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.name}</span>
                  {showBadge && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-200 p-4">
        {profile && (
          <div className={`${isCollapsed ? 'flex flex-col items-center' : 'flex items-center justify-between'}`}>
            <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-2' : 'space-x-3'}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {getInitials(profile.full_name || profile.email)}
                </span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {profile.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {profile.role === 'admin' ? 'Attorney' : 'Client'}
                  </p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
<div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 safe-top flex items-center justify-between">
  <div className="flex items-center">
    <img src="/logo-light.svg" alt="Unbind" className="h-7 w-auto" style={{ minWidth: '130px' }} />
  </div>
  <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
    <SheetTrigger asChild>
      <button className="p-2 hover:bg-gray-100 rounded-lg">
        <Menu className="w-6 h-6 text-gray-700" />
      </button>
    </SheetTrigger>
    <SheetContent side="left" className="p-0 w-72">
      <SidebarContent onNavigate={() => setIsMobileOpen(false)} />
    </SheetContent>
  </Sheet>
</div>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex lg:flex-col
          fixed left-0 top-0 bottom-0 z-30
          bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        <SidebarContent />
        
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </aside>

      {/* Spacer for desktop */}
      <div className={`hidden lg:block transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`} />
      
      {/* Spacer for mobile */}
      <div className="lg:hidden h-14" />
    </>
  )
}