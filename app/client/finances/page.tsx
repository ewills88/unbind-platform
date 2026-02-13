'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  HelpCircle,
  Info,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/types/financial'
import type { Asset, Debt, DivisionScenario } from '@/types/financial'
import { cn } from '@/lib/utils'

interface FinancialData {
  case_id: string
  state_code: string | null
  total_assets: number
  total_debts: number
  net_worth: number
  assets: Asset[]
  debts: Debt[]
  income: any[]
  expenses: any[]
  division_scenario: DivisionScenario | null
}

const PIE_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6b7280']

export default function ClientFinancesPage() {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFinances()
  }, [])

  const fetchFinances = async () => {
    try {
      const res = await fetch('/api/client/finances')
      if (!res.ok) throw new Error('Failed to load finances')
      const financialData = await res.json()
      setData(financialData)
    } catch (err) {
      console.error('Finances error:', err)
      setError('Unable to load financial information.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600">{error || 'Something went wrong.'}</p>
        </div>
      </div>
    )
  }

  // Build asset breakdown pie data
  const assetsByCategory = data.assets.reduce((acc, asset) => {
    const cat = asset.category || 'other'
    acc[cat] = (acc[cat] || 0) + asset.estimated_value
    return acc
  }, {} as Record<string, number>)

  const assetPieData = Object.entries(assetsByCategory).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value,
  }))

  // Build division viz data
  const scenario = data.division_scenario

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Finances</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Overview of assets, debts, and proposed division
        </p>
      </div>

      {/* Financial summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Assets</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(data.total_assets)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.assets.length} asset{data.assets.length !== 1 ? 's' : ''} tracked
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Debts</h3>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(data.total_debts)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.debts.length} debt{data.debts.length !== 1 ? 's' : ''} tracked
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-600">Net Worth</h3>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className={cn(
            'text-3xl font-bold',
            data.net_worth >= 0 ? 'text-blue-600' : 'text-red-600'
          )}>
            {formatCurrency(data.net_worth)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Assets minus debts</p>
        </div>
      </div>

      {/* Asset breakdown chart */}
      {assetPieData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {assetPieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Property division */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Proposed Property Division</h3>
        <p className="text-sm text-gray-500 mb-4">How assets and debts may be divided</p>

        {scenario ? (
          <div className="space-y-6">
            {/* Side-by-side totals */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <h4 className="font-semibold text-sm text-green-800 mb-2">You Receive</h4>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(scenario.client_net_total)}
                </p>
                <p className="text-xs text-green-700 mt-1">Net value</p>
                <div className="mt-2 space-y-1 text-xs text-green-700">
                  <p>Assets: {formatCurrency(scenario.client_asset_total)}</p>
                  <p>Debts: {formatCurrency(scenario.client_debt_total)}</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <h4 className="font-semibold text-sm text-blue-800 mb-2">Spouse Receives</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(scenario.spouse_net_total)}
                </p>
                <p className="text-xs text-blue-700 mt-1">Net value</p>
                <div className="mt-2 space-y-1 text-xs text-blue-700">
                  <p>Assets: {formatCurrency(scenario.spouse_asset_total)}</p>
                  <p>Debts: {formatCurrency(scenario.spouse_debt_total)}</p>
                </div>
              </div>
            </div>

            {/* Equalizing payment */}
            {scenario.equalization_amount > 0 && scenario.equalization_payer !== 'none' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Equalizing Payment</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    {scenario.equalization_payer === 'client'
                      ? `You would pay ${formatCurrency(scenario.equalization_amount)} to spouse`
                      : `Spouse would pay you ${formatCurrency(scenario.equalization_amount)}`
                    } to balance the division.
                  </p>
                </div>
              </div>
            )}

            {/* What you keep - asset list */}
            {data.assets.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-3">Asset Assignments</h4>
                <div className="space-y-2">
                  {data.assets.map(asset => {
                    const assignment = scenario.asset_assignments[asset.id]
                    return (
                      <div
                        key={asset.id}
                        className={cn(
                          'flex justify-between items-center p-3 rounded-lg text-sm',
                          assignment === 'client' && 'bg-green-50',
                          assignment === 'spouse' && 'bg-blue-50',
                          assignment === 'sell' && 'bg-amber-50',
                          !assignment && 'bg-gray-50'
                        )}
                      >
                        <div>
                          <span className="font-medium">{asset.name}</span>
                          <span className={cn(
                            'ml-2 text-xs px-2 py-0.5 rounded-full',
                            assignment === 'client' && 'bg-green-200 text-green-800',
                            assignment === 'spouse' && 'bg-blue-200 text-blue-800',
                            assignment === 'sell' && 'bg-amber-200 text-amber-800',
                            !assignment && 'bg-gray-200 text-gray-600'
                          )}>
                            {assignment === 'client' ? 'You' : assignment === 'spouse' ? 'Spouse' : assignment === 'sell' ? 'Sell' : 'TBD'}
                          </span>
                        </div>
                        <span className="font-semibold">{formatCurrency(asset.estimated_value)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start space-x-3">
              <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">
                This is a proposed division. Your attorney will discuss options with you.
                Nothing is final until you both agree and the court approves.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No division proposal yet</p>
            <p className="text-sm mt-1">
              Property division proposal will appear here once your attorney prepares it.
            </p>
          </div>
        )}
      </div>

      {/* Asset list */}
      {data.assets.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Assets</h3>
          <div className="space-y-2">
            {data.assets.map(asset => (
              <div key={asset.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-gray-900">{asset.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {asset.category?.replace(/_/g, ' ')} · {asset.ownership}
                  </p>
                </div>
                <span className="font-semibold text-green-600 text-sm">
                  {formatCurrency(asset.estimated_value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debt list */}
      {data.debts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Debts</h3>
          <div className="space-y-2">
            {data.debts.map(debt => (
              <div key={debt.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-gray-900">{debt.creditor_name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {debt.category?.replace(/_/g, ' ')} · {debt.ownership}
                  </p>
                </div>
                <span className="font-semibold text-red-600 text-sm">
                  {formatCurrency(debt.current_balance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Educational content */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <div className="flex gap-4">
          <HelpCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Understanding Property Division</h4>
            <p className="text-sm text-blue-800 mb-3">
              {data.state_code === 'CA' || data.state_code === 'TX' || data.state_code === 'AZ' ||
               data.state_code === 'NV' || data.state_code === 'WA' || data.state_code === 'ID' ||
               data.state_code === 'LA' || data.state_code === 'NM' || data.state_code === 'WI'
                ? `${data.state_code} is a community property state, which means assets acquired during marriage are typically divided 50/50.`
                : data.state_code
                  ? `${data.state_code} follows equitable distribution, meaning assets are divided fairly (not necessarily equally) based on various factors.`
                  : 'Property division rules vary by state. Your attorney will explain how your state handles division of assets and debts.'
              }
            </p>
            <p className="text-xs text-blue-700">
              Ask your attorney if you have questions about how these numbers were calculated.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
