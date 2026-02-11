'use client'

import { useState } from 'react'
import {
  Home, Clock, Scale, Users, DollarSign, Heart, Gavel, BookOpen,
} from 'lucide-react'
import { getStateData } from '@/lib/stateData'
import { STATE_NAMES } from '@/types/stateLaw'

interface StateLawPanelProps {
  stateCode: string
}

type LawTab = 'residency' | 'waiting' | 'property' | 'grounds' | 'custody' | 'child_support' | 'spousal_support'

const TABS: { id: LawTab; label: string; icon: typeof Home }[] = [
  { id: 'residency', label: 'Residency', icon: Home },
  { id: 'waiting', label: 'Waiting Period', icon: Clock },
  { id: 'grounds', label: 'Grounds', icon: Gavel },
  { id: 'property', label: 'Property', icon: Scale },
  { id: 'custody', label: 'Custody', icon: Users },
  { id: 'child_support', label: 'Child Support', icon: DollarSign },
  { id: 'spousal_support', label: 'Spousal Support', icon: Heart },
]

export default function StateLawPanel({ stateCode }: StateLawPanelProps) {
  const [activeTab, setActiveTab] = useState<LawTab>('residency')
  const stateData = getStateData(stateCode)
  const stateName = STATE_NAMES[stateCode] || stateCode

  if (!stateData) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">State law data not available for {stateCode}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          {stateName} Divorce Law Reference
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        {activeTab === 'residency' && (
          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-gray-900">Residency Requirements</h4>
            <dl className="space-y-2">
              <div><dt className="text-gray-500 inline">State:</dt> <dd className="inline font-medium">{stateData.residency.state_months} months</dd></div>
              <div><dt className="text-gray-500 inline">County:</dt> <dd className="inline font-medium">{stateData.residency.county_months > 0 ? `${stateData.residency.county_months} months` : 'None required'}</dd></div>
              <div><dt className="text-gray-500 inline">Military exception:</dt> <dd className="inline font-medium">{stateData.residency.military_exception ? 'Yes' : 'No'}</dd></div>
            </dl>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Proof Documents:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                {stateData.residency.proof_documents.map((doc, i) => <li key={i}>{doc}</li>)}
              </ul>
            </div>
            <p className="text-xs text-gray-400">{stateData.residency.statute}</p>
          </div>
        )}

        {activeTab === 'waiting' && (
          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-gray-900">Waiting Period</h4>
            <dl className="space-y-2">
              <div><dt className="text-gray-500 inline">Duration:</dt> <dd className="inline font-medium">{stateData.waiting_period.duration_days} days</dd></div>
              <div><dt className="text-gray-500 inline">Starts:</dt> <dd className="inline font-medium">{stateData.waiting_period.start_event.replace(/_/g, ' ')}</dd></div>
              <div><dt className="text-gray-500 inline">Earliest judgment:</dt> <dd className="inline font-medium">{stateData.waiting_period.earliest_judgment}</dd></div>
              <div><dt className="text-gray-500 inline">Can waive:</dt> <dd className="inline font-medium">{stateData.waiting_period.can_waive ? 'Yes (with conditions)' : 'No'}</dd></div>
            </dl>
            {stateData.waiting_period.exceptions.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-gray-500 font-medium mb-1">Exceptions:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                  {stateData.waiting_period.exceptions.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            <p className="text-xs text-gray-400">{stateData.waiting_period.statute}</p>
          </div>
        )}

        {activeTab === 'grounds' && (
          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-gray-900">Grounds for Divorce</h4>
            <dl className="space-y-2">
              <div><dt className="text-gray-500 inline">No-fault available:</dt> <dd className="inline font-medium">{stateData.grounds.no_fault ? 'Yes' : 'No'}</dd></div>
              <div><dt className="text-gray-500 inline">Legal separation:</dt> <dd className="inline font-medium">{stateData.grounds.legal_separation_available ? 'Available' : 'Not available'}</dd></div>
            </dl>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Available Grounds:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                {stateData.grounds.grounds_options.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
            <p className="text-xs text-gray-400">{stateData.grounds.statute}</p>
          </div>
        )}

        {activeTab === 'property' && (
          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-gray-900">Property Division</h4>
            <dl className="space-y-2">
              <div><dt className="text-gray-500 inline">System:</dt> <dd className="inline font-medium capitalize">{stateData.property_division.system.replace(/_/g, ' ')}</dd></div>
              <div><dt className="text-gray-500 inline">Default split:</dt> <dd className="inline font-medium">{stateData.property_division.default_split}</dd></div>
              <div><dt className="text-gray-500 inline">Date of separation significant:</dt> <dd className="inline font-medium">{stateData.property_division.date_of_separation_significant ? 'Yes' : 'No'}</dd></div>
            </dl>
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div>
                <p className="text-gray-500 font-medium">Community/Marital Property:</p>
                <p className="text-gray-700">{stateData.property_division.community_property_definition}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Separate/Non-Marital Property:</p>
                <p className="text-gray-700">{stateData.property_division.separate_property_definition}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Commingling:</p>
                <p className="text-gray-700">{stateData.property_division.commingling_rules}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">{stateData.property_division.statute}</p>
          </div>
        )}

        {activeTab === 'custody' && (
          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-gray-900">Child Custody</h4>
            <dl className="space-y-2">
              <div><dt className="text-gray-500 inline">Standard:</dt> <dd className="inline font-medium capitalize">{stateData.child_custody.standard.replace(/_/g, ' ')}</dd></div>
              <div><dt className="text-gray-500 inline">Joint custody preference:</dt> <dd className="inline font-medium">{stateData.child_custody.joint_custody_preference ? 'Yes' : 'No'}</dd></div>
              {stateData.child_custody.geographic_restrictions && (
                <div><dt className="text-gray-500 inline">Geographic restrictions:</dt> <dd className="inline font-medium">{stateData.child_custody.geographic_restrictions}</dd></div>
              )}
            </dl>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Best Interest Factors:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                {stateData.child_custody.factors.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <p className="text-xs text-gray-400">{stateData.child_custody.statute}</p>
          </div>
        )}

        {activeTab === 'child_support' && (
          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-gray-900">Child Support Guidelines</h4>
            <dl className="space-y-2">
              <div><dt className="text-gray-500 inline">Guideline type:</dt> <dd className="inline font-medium capitalize">{stateData.child_support.guideline_type.replace(/_/g, ' ')}</dd></div>
              {stateData.child_support.cap && (
                <div><dt className="text-gray-500 inline">Cap:</dt> <dd className="inline font-medium">{stateData.child_support.cap}</dd></div>
              )}
            </dl>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Factors Considered:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                {stateData.child_support.factors.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <p className="text-xs text-gray-400">{stateData.child_support.statute}</p>
          </div>
        )}

        {activeTab === 'spousal_support' && (
          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-gray-900">Spousal Support / Alimony</h4>
            <dl className="space-y-2">
              <div><dt className="text-gray-500 inline">Temporary formula:</dt> <dd className="inline font-medium">{stateData.spousal_support.temporary_support_formula ? 'Yes' : 'No'}</dd></div>
              <div><dt className="text-gray-500 inline">Long-term marriage:</dt> <dd className="inline font-medium">{stateData.spousal_support.long_term_marriage_years}+ years</dd></div>
              <div><dt className="text-gray-500 inline">Modification:</dt> <dd className="inline font-medium">{stateData.spousal_support.modification_standard}</dd></div>
            </dl>
            {stateData.spousal_support.duration_limits && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-gray-500 font-medium">Duration Limits:</p>
                <p className="text-gray-700">{stateData.spousal_support.duration_limits}</p>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Termination Events:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                {stateData.spousal_support.termination_events.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
            <p className="text-xs text-gray-400">{stateData.spousal_support.permanent_support_factors}</p>
          </div>
        )}
      </div>
    </div>
  )
}
