'use client'

import { useState } from 'react'
import {
  Scale, Briefcase, FileText, MessageSquare, CreditCard,
  Clock, CheckCircle2, AlertCircle, Search,
} from 'lucide-react'

const DEMO_CASE = {
  caseNumber: '2026-00142',
  clientName: 'Sarah Johnson',
  spouseName: 'Michael Johnson',
  status: 'Active — Discovery',
  type: 'Divorce',
  state: 'Michigan',
  filedDate: 'January 15, 2026',
  attorney: 'You (Demo)',
  children: 2,
  childrenAges: '8, 11',
  estimatedAssets: '$850,000',
}

const DEMO_TASKS = [
  { title: 'Respond to Interrogatories (Set 1)', due: 'Apr 12, 2026', priority: 'high', status: 'overdue' },
  { title: 'Review opposing financial disclosures', due: 'Apr 18, 2026', priority: 'high', status: 'pending' },
  { title: 'Draft parenting plan proposal', due: 'Apr 25, 2026', priority: 'medium', status: 'pending' },
  { title: 'File FOC 10 — Uniform Child Support Order', due: 'May 2, 2026', priority: 'medium', status: 'pending' },
  { title: 'Schedule mediation session', due: 'May 10, 2026', priority: 'low', status: 'pending' },
]

const DEMO_DOCUMENTS = [
  { name: 'DC 100a — Complaint for Divorce', category: 'Legal', date: 'Jan 15, 2026' },
  { name: 'Financial Disclosure — Client', category: 'Financial', date: 'Feb 3, 2026' },
  { name: 'Bank Statements (Chase)', category: 'Financial', date: 'Feb 10, 2026' },
  { name: '2024 Tax Return — Joint', category: 'Tax', date: 'Feb 14, 2026' },
  { name: 'Marital Home Appraisal', category: 'Property', date: 'Mar 1, 2026' },
  { name: 'Retirement Account Statement (Fidelity)', category: 'Financial', date: 'Mar 8, 2026' },
]

const DEMO_MESSAGES = [
  { from: 'Sarah Johnson', time: '2 hours ago', preview: 'I found the 2023 tax return in my files. Uploading it now.' },
  { from: 'You', time: '3 hours ago', preview: 'Sarah, please locate the 2023 joint tax return. We need it for discovery.' },
  { from: 'Sarah Johnson', time: '1 day ago', preview: 'When is our next court date? I want to make sure I can get time off work.' },
]

const DEMO_BILLING = {
  unbilledHours: 12.5,
  unbilledAmount: 3750,
  outstandingInvoices: 1,
  outstandingAmount: 2400,
  trustBalance: 5000,
}

type DemoTab = 'overview' | 'documents' | 'messages' | 'billing' | 'discovery'

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<DemoTab>('overview')

  const tabs: { key: DemoTab; label: string; icon: typeof Briefcase }[] = [
    { key: 'overview', label: 'Overview', icon: Briefcase },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'messages', label: 'Messages', icon: MessageSquare },
    { key: 'billing', label: 'Billing', icon: CreditCard },
    { key: 'discovery', label: 'Discovery', icon: Search },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0f1e' }}>
      {/* Demo Banner */}
      <div className="text-center py-3 text-sm font-medium" style={{ backgroundColor: '#f5a623', color: '#0a0f1e' }}>
        You&apos;re viewing a live demo of Unbind.&nbsp;
        <a href="https://buy.stripe.com/14AcN57TyfScdzxcOL2wU0c" className="underline font-bold">Start your free trial &rarr;</a>
      </div>

      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="w-7 h-7 text-amber-400" />
            <span className="text-xl font-bold text-white">Unbind</span>
            <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded ml-2">DEMO</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="mailto:demo@unbind.law" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">
              Book a call
            </a>
            <a
              href="https://buy.stripe.com/14AcN57TyfScdzxcOL2wU0c"
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: '#f5a623', color: '#0a0f1e' }}
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Case Header */}
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-white">
                  {DEMO_CASE.clientName} v. {DEMO_CASE.spouseName}
                </h1>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                  {DEMO_CASE.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                <span>Case #{DEMO_CASE.caseNumber}</span>
                <span>{DEMO_CASE.type}</span>
                <span>{DEMO_CASE.state}</span>
                <span>Filed {DEMO_CASE.filedDate}</span>
              </div>
            </div>
            <div className="text-right text-sm text-slate-400">
              <div>{DEMO_CASE.children} minor children (ages {DEMO_CASE.childrenAges})</div>
              <div>Est. marital assets: {DEMO_CASE.estimatedAssets}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tasks */}
            <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                Open Tasks
              </h2>
              <div className="space-y-3">
                {DEMO_TASKS.map((task) => (
                  <div key={task.title} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === 'overdue' ? 'bg-red-400' :
                        task.priority === 'high' ? 'bg-amber-400' :
                        'bg-slate-500'
                      }`} />
                      <span className="text-sm text-slate-200">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.status === 'overdue' && (
                        <span className="text-xs text-red-400 font-medium">OVERDUE</span>
                      )}
                      <span className="text-xs text-slate-500">{task.due}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Unbilled Time</span>
                    <span className="text-sm font-semibold text-white">{DEMO_BILLING.unbilledHours}h (${DEMO_BILLING.unbilledAmount.toLocaleString()})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Outstanding</span>
                    <span className="text-sm font-semibold text-amber-400">${DEMO_BILLING.outstandingAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Trust Balance</span>
                    <span className="text-sm font-semibold text-green-400">${DEMO_BILLING.trustBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Documents</span>
                    <span className="text-sm font-semibold text-white">{DEMO_DOCUMENTS.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Recent Messages</h3>
                <div className="space-y-3">
                  {DEMO_MESSAGES.map((msg, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-medium text-slate-200">{msg.from}</span>
                        <span className="text-xs text-slate-500">{msg.time}</span>
                      </div>
                      <p className="text-slate-400 text-xs truncate">{msg.preview}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Case Documents</h2>
            <div className="space-y-2">
              {DEMO_DOCUMENTS.map((doc) => (
                <div key={doc.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-200">{doc.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">{doc.category}</span>
                    <span className="text-xs text-slate-500">{doc.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Secure Messages</h2>
            <div className="space-y-4">
              {DEMO_MESSAGES.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === 'You' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.from === 'You'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white/10 text-slate-200 rounded-bl-md'
                  }`}>
                    <p className="text-sm">{msg.preview}</p>
                    <p className="text-[10px] mt-1 opacity-60">{msg.time}</p>
                  </div>
                </div>
              ))}
              <div className="mt-6 p-4 bg-white/5 rounded-lg text-center text-sm text-slate-500">
                Messaging is encrypted and real-time in the live version.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Unbilled Time', value: `$${DEMO_BILLING.unbilledAmount.toLocaleString()}`, sub: `${DEMO_BILLING.unbilledHours} hours`, icon: Clock, color: 'text-white' },
              { label: 'Outstanding Invoices', value: `$${DEMO_BILLING.outstandingAmount.toLocaleString()}`, sub: `${DEMO_BILLING.outstandingInvoices} invoice`, icon: AlertCircle, color: 'text-amber-400' },
              { label: 'Trust Balance', value: `$${DEMO_BILLING.trustBalance.toLocaleString()}`, sub: 'IOLTA compliant', icon: CreditCard, color: 'text-green-400' },
            ].map((card) => {
              const Icon = card.icon
              return (
                <div key={card.label} className="bg-slate-900 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-400">{card.label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{card.sub}</div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'discovery' && (
          <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Discovery Tracking</h2>
            <div className="space-y-3">
              {[
                { type: 'Interrogatories (Set 1)', direction: 'Incoming', deadline: 'Apr 12, 2026', status: 'overdue', items: 25 },
                { type: 'Request for Production', direction: 'Outgoing', deadline: 'Apr 20, 2026', status: 'pending', items: 18 },
                { type: 'Request for Admission', direction: 'Incoming', deadline: 'May 5, 2026', status: 'pending', items: 30 },
              ].map((disc) => (
                <div key={disc.type} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{disc.type}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{disc.direction} · {disc.items} items</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${disc.status === 'overdue' ? 'text-red-400' : 'text-slate-400'}`}>
                      {disc.status === 'overdue' ? 'OVERDUE' : 'Due'} {disc.deadline}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg text-sm text-blue-400">
              Michigan deadline rules: 28 days for interrogatories, RFPs, and RFAs. Auto-calculated from service date.
            </div>
          </div>
        )}

        {/* CTA Footer */}
        <div className="mt-12 text-center pb-8">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to manage your cases like this?</h2>
          <p className="text-slate-400 mb-6">14-day free trial. No credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://buy.stripe.com/14AcN57TyfScdzxcOL2wU0c"
              className="px-8 py-3.5 rounded-lg font-semibold text-lg"
              style={{ backgroundColor: '#f5a623', color: '#0a0f1e' }}
            >
              Start Free Trial
            </a>
            <a
              href="mailto:demo@unbind.law"
              className="px-8 py-3.5 border border-white/10 text-slate-300 rounded-lg font-medium hover:bg-white/5 transition-colors"
            >
              Book a call with our team
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
