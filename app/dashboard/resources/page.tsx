'use client'

import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import {
  Scale,
  Calculator,
  FileText,
  ChevronRight,
} from 'lucide-react'

const resourceSections = [
  {
    title: 'State Rules',
    description: 'Compare divorce law requirements across all 50 states — waiting periods, property division, residency rules, and more.',
    icon: Scale,
    color: 'blue',
    href: '/dashboard/resources/state-rules',
  },
  {
    title: 'Support Calculators',
    description: 'Estimate child support, spousal support, and property division using state-specific formulas for every jurisdiction.',
    icon: Calculator,
    color: 'green',
    href: '/dashboard/resources/calculators',
  },
  {
    title: 'Forms Library',
    description: 'Browse and auto-fill state-specific court forms. Available for CA, TX, FL with more states coming soon.',
    icon: FileText,
    color: 'purple',
    href: '/dashboard/resources/forms',
  },
]

const getColorClasses = (color: string) => {
  const colors: Record<string, { bg: string; icon: string; border: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200 hover:border-blue-300' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200 hover:border-green-300' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200 hover:border-purple-300' },
  }
  return colors[color] || colors.blue
}

export default function ResourcesPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0d1526]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resources</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Reference tools, calculators, and forms to support your cases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {resourceSections.map((section) => {
              const Icon = section.icon
              const colors = getColorClasses(section.color)

              return (
                <button
                  key={section.title}
                  onClick={() => router.push(section.href)}
                  className={`bg-white rounded-xl border ${colors.border} p-6 text-left hover:shadow-md transition-all group`}
                >
                  <div className={`inline-flex p-3 rounded-lg ${colors.bg} mb-4`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{section.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{section.description}</p>
                  <span className="inline-flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                    Open <ChevronRight className="w-4 h-4 ml-1" />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
