'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard, Loader2, AlertCircle, Check, ExternalLink, ArrowUpRight,
  Receipt, Zap,
} from 'lucide-react'
import type { Subscription, SubscriptionPlan, SubscriptionInvoice } from '@/types/admin'

export default function AdminBillingPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'plans' | 'invoices'>('overview')
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [subRes, invRes] = await Promise.all([
        fetch('/api/admin/subscription'),
        fetch('/api/admin/subscription?type=invoices'),
      ])
      if (subRes.status === 401) { router.push('/login'); return }
      if (subRes.status === 403) { setError('Access denied'); setLoading(false); return }

      if (subRes.ok) {
        const subData = await subRes.json()
        setSubscription(subData.data?.subscription || null)
        setPlans(subData.data?.plans || [])
      }
      if (invRes.ok) {
        const invData = await invRes.json()
        setInvoices(invData.data || [])
      }
    } catch { setError('Failed to load billing data') }
    finally { setLoading(false) }
  }

  const handleUpgrade = async (planId: string, cycle: 'monthly' | 'annual') => {
    setUpgrading(true)
    try {
      const res = await fetch('/api/admin/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', planId, billingCycle: cycle }),
      })
      const data = await res.json()
      if (data.data?.url) {
        window.location.href = data.data.url
      }
    } catch { setError('Failed to start checkout') }
    finally { setUpgrading(false) }
  }

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/admin/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portal' }),
      })
      const data = await res.json()
      if (data.data?.url) {
        window.open(data.data.url, '_blank')
      }
    } catch { setError('Failed to open billing portal') }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your plan and payment details</p>
        </div>
        {subscription?.stripe_customer_id && (
          <button onClick={handleManageBilling}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <ExternalLink className="w-4 h-4" /> Manage Billing
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" /><p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'plans', label: 'Plans' },
          { key: 'invoices', label: 'Invoices' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Plan</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{subscription?.plan_name || 'Free'}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {subscription?.status === 'active' ? 'Active' :
                   subscription?.status === 'trialing' ? 'Trial' :
                   subscription?.status || 'No active subscription'}
                </p>
              </div>
              {subscription && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {subscription.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} billing
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    ${subscription.billing_cycle === 'annual' ? subscription.annual_price : subscription.monthly_price}
                    <span className="text-sm font-normal text-gray-500">/{subscription.billing_cycle === 'annual' ? 'yr' : 'mo'}</span>
                  </p>
                </div>
              )}
            </div>
            {subscription && (
              <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Seats Used</p>
                  <p className="text-lg font-semibold">{subscription.seats_used} / {subscription.seats_included}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Next Billing</p>
                  <p className="text-lg font-semibold">
                    {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(plan => {
            const isCurrent = subscription?.plan_id === plan.id
            return (
              <div key={plan.id} className={`bg-white border rounded-lg p-5 ${isCurrent ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}>
                {isCurrent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full mb-2">
                    <Check className="w-3 h-3" /> Current
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-900">{plan.plan_name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-gray-900">
                    ${plan.monthly_price}<span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ${plan.annual_price}/yr (save ${(plan.monthly_price * 12 - plan.annual_price).toFixed(0)})
                  </p>
                </div>
                <div className="mt-4 space-y-1.5">
                  <p className="text-xs text-gray-600">{plan.seats_included} seat{plan.seats_included !== 1 ? 's' : ''} included</p>
                  {Object.entries(plan.features || {}).slice(0, 5).map(([key, val]) => (
                    val && (
                      <p key={key} className="text-xs text-gray-600 flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    )
                  ))}
                </div>
                {!isCurrent && plan.monthly_price > 0 && (
                  <button onClick={() => handleUpgrade(plan.id, 'monthly')} disabled={upgrading}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    <Zap className="w-4 h-4" /> {upgrading ? 'Loading...' : 'Upgrade'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Invoices */}
      {tab === 'invoices' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{inv.invoice_number || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">${inv.total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                      inv.status === 'open' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.invoice_pdf_url && (
                      <a href={inv.invoice_pdf_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm">
                        <ArrowUpRight className="w-4 h-4 inline" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No invoices yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
