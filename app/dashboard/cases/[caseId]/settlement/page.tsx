'use client'

import { useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import CaseSettlementTab from '@/components/settlement/CaseSettlementTab'

export default function SettlementPage() {
  const params = useParams()
  const caseId = params.caseId as string

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <CaseSettlementTab caseId={caseId} />
        </div>
      </main>
    </div>
  )
}
