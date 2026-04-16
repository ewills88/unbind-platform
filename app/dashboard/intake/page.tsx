'use client'

import Sidebar from '@/components/layout/Sidebar'
import IntakeQueue from '@/components/attorney/IntakeQueue'

export default function DashboardIntakePage() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0d1526]">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Client Intake</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Review and manage client intake questionnaires
            </p>
          </div>

          <IntakeQueue />
        </div>
      </main>
    </div>
  )
}
