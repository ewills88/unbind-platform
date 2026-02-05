'use client'

import IntakeQueue from '@/components/attorney/IntakeQueue'

export default function AttorneyIntakesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Intake Queue</h1>
          <p className="text-gray-600 mt-1">
            Review and approve client intake submissions
          </p>
        </div>

        <IntakeQueue />
      </div>
    </div>
  )
}
