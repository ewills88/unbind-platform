'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CreditCard } from 'lucide-react'
import InvoicesList from './InvoicesList'
import PaymentsList from './PaymentsList'
import TrustAccountLedger from './TrustAccountLedger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type BillingTab = 'invoices' | 'payments' | 'trust'

export default function ClientBillingSection() {
  const [caseId, setCaseId] = useState<string | null>(null)
  const [caseNumber, setCaseNumber] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<BillingTab>('invoices')

  useEffect(() => {
    loadClientCase()
  }, [])

  const loadClientCase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: caseData } = await supabase
        .from('cases')
        .select('id, case_number')
        .eq('client_id', user.id)
        .single()

      if (caseData) {
        setCaseId(caseData.id)
        setCaseNumber(caseData.case_number || undefined)
      }
    } catch (error) {
      console.error('Error loading case for billing:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!caseId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Billing Information</h3>
        <p className="text-sm text-gray-600">Billing will appear here once your case is set up.</p>
      </div>
    )
  }

  const tabs: { id: BillingTab; label: string }[] = [
    { id: 'invoices', label: 'Invoices' },
    { id: 'payments', label: 'Payments' },
    { id: 'trust', label: 'Trust Account' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 pb-0">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Billing & Payments</h3>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'invoices' && <InvoicesList caseId={caseId} />}
        {activeTab === 'payments' && <PaymentsList caseId={caseId} />}
        {activeTab === 'trust' && <TrustAccountLedger caseId={caseId} caseNumber={caseNumber} />}
      </div>
    </div>
  )
}
