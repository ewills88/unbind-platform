'use client'

import { useRouter } from 'next/navigation'
import {
  Upload,
  MessageSquare,
  Calendar,
  CheckSquare,
  PlusCircle,
  FileText,
  LucideIcon
} from 'lucide-react'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: LucideIcon
  color: string
  href: string
}

export default function QuickActions() {
  const router = useRouter()

  const actions: QuickAction[] = [
    {
      id: 'upload',
      title: 'Upload Document',
      description: 'Add files to a case',
      icon: Upload,
      color: 'blue',
      href: '/dashboard/documents',
    },
    {
      id: 'message',
      title: 'Message Client',
      description: 'Send a quick message',
      icon: MessageSquare,
      color: 'green',
      href: '/dashboard/messages',
    },
    {
      id: 'court-date',
      title: 'Court Date',
      description: 'Add to calendar',
      icon: Calendar,
      color: 'purple',
      href: '/dashboard/calendar',
    },
    {
      id: 'task',
      title: 'Create Task',
      description: 'Quick task creation',
      icon: CheckSquare,
      color: 'orange',
      href: '/dashboard/my-tasks',
    },
    {
      id: 'new-case',
      title: 'New Case',
      description: 'Launch case wizard',
      icon: PlusCircle,
      color: 'indigo',
      href: '/dashboard/cases',
    },
    {
      id: 'templates',
      title: 'Templates',
      description: 'Access documents',
      icon: FileText,
      color: 'pink',
      href: '/dashboard/templates',
    },
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
      green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
      purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
      orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
      indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
      pink: 'bg-pink-50 text-pink-600 group-hover:bg-pink-100',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick Actions</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={() => router.push(action.href)}
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all text-center"
            >
              <div className={`inline-flex p-3 rounded-lg ${getColorClasses(action.color)} transition-colors mb-2`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-sm text-gray-900 group-hover:text-gray-700">
                {action.title}
              </h3>
            </button>
          )
        })}
      </div>
    </div>
  )
}
