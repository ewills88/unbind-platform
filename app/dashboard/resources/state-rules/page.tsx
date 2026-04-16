'use client'

import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import StateComparisonTool from '@/components/stateLaw/StateComparisonTool'
import { ChevronLeft } from 'lucide-react'

export default function StateRulesPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0d1526]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              href="/dashboard/resources"
              className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 mb-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Resources
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">State Rules</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Compare divorce law requirements side-by-side across different states.
            </p>
          </div>

          <StateComparisonTool />
        </div>
      </main>
    </div>
  )
}
