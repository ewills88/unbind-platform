'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  CreditCard,
  Users,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface FirmDetails {
  id: string
  name: string
  plan: string
  subscription_status?: string
}

interface SeatMember {
  user_id: string
  full_name: string
  email: string
  role: string
  joined_at: string
  initials: string
}

const PLANS = [
  { id: 'solo', name: 'Solo', seats: 1, price: 199, features: ['1 attorney', 'Unlimited cases', 'Basic analytics'] },
  { id: 'small', name: 'Small Firm', seats: 3, price: 499, features: ['Up to 3 attorneys', 'Full analytics', 'Team collaboration'] },
  { id: 'professional', name: 'Professional', seats: 10, price: 999, features: ['Up to 10 attorneys', 'Advanced reporting', 'Revenue sharing'] },
  { id: 'enterprise', name: 'Enterprise', seats: 50, price: 1999, features: ['Unlimited attorneys', 'Custom integrations', 'Priority support'] },
]

export default function SubscriptionManagement() {
  const [firm, setFirm] = useState<FirmDetails | null>(null)
  const [activeSeats, setActiveSeats] = useState<SeatMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const membersRes = await fetch('/api/firms/members')
      const membersData = await membersRes.json()

      const members = (membersData.members || [])
        .filter((m: { status: string }) => m.status === 'active')
        .map((m: { user_id: string; role: string; joined_at: string; profile?: { full_name?: string; email?: string } }) => {
          const name = m.profile?.full_name || m.profile?.email || 'Unknown'
          return {
            user_id: m.user_id,
            full_name: name,
            email: m.profile?.email || '',
            role: m.role,
            joined_at: m.joined_at || '',
            initials: name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
          }
        })

      setActiveSeats(members)

      // Get firm info from the first member's firm context
      if (membersData.firm) {
        setFirm(membersData.firm)
      } else {
        setFirm({ id: '', name: 'Your Firm', plan: 'small', subscription_status: 'active' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const currentPlan = PLANS.find(p => p.id === firm?.plan) || PLANS[1]
  const seatsUsed = activeSeats.length
  const seatsAvailable = currentPlan.seats - seatsUsed

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
        <p className="text-gray-600 mt-1">Manage your firm&apos;s plan and billing</p>
      </div>

      {/* Current plan */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentPlan.name}</h3>
            <p className="text-gray-600 mb-4">
              {seatsUsed} of {currentPlan.seats} seats used
            </p>
            <div className="flex items-center gap-2 mb-4">
              <Progress
                value={(seatsUsed / currentPlan.seats) * 100}
                className="w-64"
              />
              <span className="text-sm text-gray-600">
                {seatsAvailable > 0 ? `${seatsAvailable} seats available` : 'All seats used'}
              </span>
            </div>
            <ul className="space-y-1">
              {currentPlan.features.map(feature => (
                <li key={feature} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-green-500">&#10003;</span> {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-right">
            <p className="text-4xl font-bold text-gray-900">${currentPlan.price}</p>
            <p className="text-gray-600">/month</p>
            <span className={`inline-flex mt-2 px-3 py-1 text-xs font-semibold rounded-full ${
              firm?.subscription_status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {firm?.subscription_status || 'active'}
            </span>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Change Plan
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Add Seats
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <CreditCard className="w-4 h-4" />
            Update Payment Method
          </button>
        </div>
      </div>

      {/* Available plans */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`rounded-xl border-2 p-5 transition-all ${
                plan.id === currentPlan.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-semibold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-2xl font-bold text-gray-900 mb-3">
                ${plan.price}<span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <p className="text-xs text-gray-600 mb-3">Up to {plan.seats} seats</p>
              <ul className="space-y-1 mb-4">
                {plan.features.map(f => (
                  <li key={f} className="text-xs text-gray-600">&#10003; {f}</li>
                ))}
              </ul>
              {plan.id === currentPlan.id ? (
                <span className="block text-center text-xs font-medium text-blue-600">Current Plan</span>
              ) : (
                <button className="w-full px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  {plan.price > currentPlan.price ? 'Upgrade' : 'Downgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active seats */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Active Seats ({seatsUsed})
        </h2>
        <div className="space-y-3">
          {activeSeats.map(member => (
            <div key={member.user_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">{member.initials}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{member.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {member.role}
                    {member.joined_at && ` \u2022 Joined ${new Date(member.joined_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>

              {member.role !== 'owner' && (
                <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>

        {activeSeats.length === 0 && (
          <div className="text-center py-8">
            <Users className="mx-auto w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No active team members</p>
          </div>
        )}
      </div>
    </div>
  )
}
