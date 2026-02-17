'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3, TrendingUp, Clock, FileText, Users,
  DollarSign, Scale, Loader2, CalendarDays,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { formatCurrency } from '@/types/settlement'

interface AnalyticsData {
  totalProposals: number
  activeProposals: number
  averageRounds: number
  daysInNegotiation: number
  totalPropertyValue: number
  husbandShare: number
  wifeShare: number
  monthlySupport: number
  supportPayor: string | null
  documentsGenerated: number
  documentsPending: number
  documentsApproved: number
  mediationSessions: number
  mediationOutcome: string | null
  timelineEvents: number
  lastActivity: string | null
  proposalHistory: {
    number: number
    title: string
    husband_total: number
    wife_total: number
    monthly_support: number
    status: string
    date: string
  }[]
  eventTimeline: {
    type: string
    date: string
    title: string
    is_milestone: boolean
  }[]
  totalAssetValue: number
  totalDebtValue: number
}

interface Props {
  caseId: string
}

export default function SettlementAnalytics({ caseId }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/cases/${caseId}/settlement-analytics`)
        if (res.ok) {
          const json = await res.json()
          setData(json.data)
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [caseId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No analytics data available yet.</p>
      </div>
    )
  }

  const totalEstate = data.totalPropertyValue
  const husbandPct = totalEstate > 0 ? ((data.husbandShare / totalEstate) * 100).toFixed(1) : '0'
  const wifePct = totalEstate > 0 ? ((data.wifeShare / totalEstate) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Scale}
          label="Total Estate"
          value={formatCurrency(totalEstate)}
          subtext={`${formatCurrency(data.totalAssetValue)} assets, ${formatCurrency(data.totalDebtValue)} debts`}
        />
        <MetricCard
          icon={Clock}
          label="Days in Negotiation"
          value={data.daysInNegotiation.toString()}
          subtext={`${data.totalProposals} proposals exchanged`}
        />
        <MetricCard
          icon={FileText}
          label="Documents"
          value={data.documentsGenerated.toString()}
          subtext={`${data.documentsApproved} approved, ${data.documentsPending} pending`}
        />
        <MetricCard
          icon={Users}
          label="Mediation"
          value={`${data.mediationSessions} sessions`}
          subtext={data.mediationOutcome || 'No outcome yet'}
        />
      </div>

      {/* Property Division */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Property Division
        </h3>

        <div className="space-y-4">
          {/* Bar visualization */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-blue-600 font-medium">Petitioner: {formatCurrency(data.husbandShare)} ({husbandPct}%)</span>
              <span className="text-pink-600 font-medium">Respondent: {formatCurrency(data.wifeShare)} ({wifePct}%)</span>
            </div>
            <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500 h-full transition-all duration-500"
                style={{ width: `${husbandPct}%` }}
              />
              <div
                className="bg-pink-500 h-full transition-all duration-500"
                style={{ width: `${wifePct}%` }}
              />
            </div>
          </div>

          {/* Support */}
          {data.monthlySupport > 0 && (
            <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-3">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Monthly Support: {formatCurrency(data.monthlySupport)}/mo
                </p>
                <p className="text-xs text-gray-500">
                  Paid by {data.supportPayor === 'husband' ? 'Petitioner' : 'Respondent'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Proposal History */}
      {data.proposalHistory && data.proposalHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Proposal Progression
          </h3>

          <div className="space-y-3">
            {data.proposalHistory.map((p, i) => {
              const prev = i > 0 ? data.proposalHistory[i - 1] : null
              const husbandDelta = prev ? p.husband_total - prev.husband_total : 0
              const wifeDelta = prev ? p.wife_total - prev.wife_total : 0

              return (
                <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                    #{p.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">{formatCurrency(p.husband_total)}</span>
                      <span className="text-gray-300">/</span>
                      <span className="text-pink-600">{formatCurrency(p.wife_total)}</span>
                    </div>
                    {prev && (
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        {husbandDelta !== 0 && (
                          <span className={husbandDelta > 0 ? 'text-green-600' : 'text-red-600'}>
                            {husbandDelta > 0 ? '+' : ''}{formatCurrency(husbandDelta)}
                          </span>
                        )}
                        {wifeDelta !== 0 && (
                          <span className={wifeDelta > 0 ? 'text-green-600' : 'text-red-600'}>
                            {wifeDelta > 0 ? '+' : ''}{formatCurrency(wifeDelta)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    p.status === 'countered' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {p.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline Summary */}
      {data.eventTimeline && data.eventTimeline.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Key Events
          </h3>

          <div className="space-y-2">
            {data.eventTimeline
              .filter(e => e.is_milestone)
              .slice(0, 10)
              .map((event, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-sm text-gray-900">{event.title}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {new Date(event.date).toLocaleDateString()}
                  </span>
                </div>
              ))}

            {data.eventTimeline.filter(e => e.is_milestone).length === 0 && (
              <p className="text-sm text-gray-500">No milestone events yet.</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {data.timelineEvents} total events
              {data.lastActivity && ` · Last activity: ${new Date(data.lastActivity).toLocaleDateString()}`}
            </p>
          </div>
        </div>
      )}

      {/* Negotiation Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Negotiation Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <SummaryItem label="Total Proposals" value={data.totalProposals} />
          <SummaryItem label="Active Proposals" value={data.activeProposals} />
          <SummaryItem label="Documents Generated" value={data.documentsGenerated} />
          <SummaryItem label="Documents Approved" value={data.documentsApproved} />
          <SummaryItem label="Mediation Sessions" value={data.mediationSessions} />
          <SummaryItem label="Timeline Events" value={data.timelineEvents} />
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: typeof Scale
  label: string
  value: string
  subtext: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtext}</p>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}
