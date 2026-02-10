'use client'

import { useState } from 'react'
import { Clock, FileText, CreditCard, Landmark, BarChart3, Scale } from 'lucide-react'
import TimeTracker from './TimeTracker'
import TimeEntriesList from './TimeEntriesList'
import ExpensesList from './ExpensesList'
import InvoicesList from './InvoicesList'
import PaymentsList from './PaymentsList'
import TrustAccountLedger from './TrustAccountLedger'
import FinancialDashboard from './FinancialDashboard'
import TrustReconciliation from './TrustReconciliation'

type BillingSubTab = 'time' | 'invoices' | 'payments' | 'trust' | 'reports' | 'reconciliation'

interface BillingDashboardProps {
  caseId: string
  caseNumber?: string
  userRole: string
}

const ATTORNEY_TABS: { id: BillingSubTab; label: string; icon: typeof Clock }[] = [
  { id: 'time', label: 'Time & Expenses', icon: Clock },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'trust', label: 'Trust Account', icon: Landmark },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'reconciliation', label: 'Reconciliation', icon: Scale },
]

const CLIENT_TABS: { id: BillingSubTab; label: string; icon: typeof Clock }[] = [
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'trust', label: 'Trust Account', icon: Landmark },
]

export default function BillingDashboard({ caseId, caseNumber, userRole }: BillingDashboardProps) {
  const isAttorney = userRole === 'admin'
  const tabs = isAttorney ? ATTORNEY_TABS : CLIENT_TABS
  const [activeSubTab, setActiveSubTab] = useState<BillingSubTab>(tabs[0].id)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey((k) => k + 1)

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Time & Expenses (attorney only) */}
      {activeSubTab === 'time' && isAttorney && (
        <div className="space-y-6" key={`time-${refreshKey}`}>
          <TimeTracker onTimerStop={refresh} />
          <TimeEntriesList caseId={caseId} />
          <ExpensesList caseId={caseId} />
        </div>
      )}

      {/* Invoices */}
      {activeSubTab === 'invoices' && (
        <div key={`invoices-${refreshKey}`}>
          <InvoicesList caseId={caseId} onInvoiceCreated={refresh} />
        </div>
      )}

      {/* Payments */}
      {activeSubTab === 'payments' && (
        <div key={`payments-${refreshKey}`}>
          <PaymentsList caseId={caseId} />
        </div>
      )}

      {/* Trust Account */}
      {activeSubTab === 'trust' && (
        <div key={`trust-${refreshKey}`}>
          <TrustAccountLedger caseId={caseId} caseNumber={caseNumber} />
        </div>
      )}

      {/* Financial Reports (attorney only) */}
      {activeSubTab === 'reports' && isAttorney && (
        <div key={`reports-${refreshKey}`}>
          <FinancialDashboard />
        </div>
      )}

      {/* Trust Reconciliation (attorney only) */}
      {activeSubTab === 'reconciliation' && isAttorney && (
        <div key={`reconciliation-${refreshKey}`}>
          <TrustReconciliation />
        </div>
      )}
    </div>
  )
}
