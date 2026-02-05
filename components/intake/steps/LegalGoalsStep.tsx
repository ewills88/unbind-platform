'use client'

import { LegalGoals, PRIMARY_GOALS, PROPERTY_PRIORITIES } from '@/types/intake'
import { Scale, MessageSquare, Calendar, FileText } from 'lucide-react'

interface LegalGoalsStepProps {
  data?: Partial<LegalGoals>
  onChange: (data: Partial<LegalGoals>) => void
  errors?: string[]
}

const APPROACH_OPTIONS = [
  {
    value: 'collaborative',
    label: 'Collaborative Divorce',
    description: 'Both parties work together with attorneys to reach an agreement without court',
  },
  {
    value: 'mediation',
    label: 'Mediation',
    description: 'A neutral mediator helps both parties negotiate an agreement',
  },
  {
    value: 'litigation',
    label: 'Traditional Litigation',
    description: 'Court proceedings with attorneys representing each party',
  },
  {
    value: 'undecided',
    label: 'Undecided',
    description: 'I need guidance on which approach is best for my situation',
  },
]

const URGENCY_OPTIONS = [
  { value: 'urgent', label: 'Urgent', description: 'Safety concerns or time-sensitive issues' },
  { value: 'standard', label: 'Standard', description: 'Normal timeline, no rush' },
  { value: 'flexible', label: 'Flexible', description: 'No specific deadline' },
]

export default function LegalGoalsStep({ data = {}, onChange, errors }: LegalGoalsStepProps) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  const toggleGoal = (goal: string) => {
    const current = data.primaryGoals || []
    const updated = current.includes(goal)
      ? current.filter((g) => g !== goal)
      : [...current, goal]
    updateField('primaryGoals', updated)
  }

  const togglePriority = (priority: string) => {
    const current = data.propertyDivisionPriorities || []
    const updated = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority]
    updateField('propertyDivisionPriorities', updated)
  }

  return (
    <div className="space-y-8">
      {errors && errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <ul className="list-disc list-inside text-red-600 text-sm">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary Goals */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-blue-500" />
          Primary Goals <span className="text-red-500">*</span>
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Select all goals that are important to you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PRIMARY_GOALS.map((goal) => (
            <label key={goal} className="flex items-start gap-2 p-2 rounded hover:bg-gray-50">
              <input
                type="checkbox"
                checked={(data.primaryGoals || []).includes(goal)}
                onChange={() => toggleGoal(goal)}
                className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{goal}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Preferred Approach */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Preferred Divorce Approach <span className="text-red-500">*</span>
        </h3>

        <div className="space-y-3">
          {APPROACH_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                data.preferredApproach === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="approach"
                  value={option.value}
                  checked={data.preferredApproach === option.value}
                  onChange={(e) => updateField('preferredApproach', e.target.value)}
                  className="w-4 h-4 mt-1 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">{option.label}</span>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </div>
              </div>
            </label>
          ))}
        </div>

        {data.preferredApproach && data.preferredApproach !== 'undecided' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why did you choose this approach?
            </label>
            <textarea
              value={data.approachReasoning || ''}
              onChange={(e) => updateField('approachReasoning', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="Optional - helps us understand your perspective"
            />
          </div>
        )}
      </section>

      {/* Timeline */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          Timeline
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How urgent is this matter?
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {URGENCY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`block p-3 rounded-lg border cursor-pointer transition-colors text-center ${
                  data.urgencyLevel === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="urgency"
                  value={option.value}
                  checked={data.urgencyLevel === option.value}
                  onChange={(e) => updateField('urgencyLevel', e.target.value)}
                  className="sr-only"
                />
                <span className="font-medium text-gray-900">{option.label}</span>
                <p className="text-xs text-gray-600 mt-1">{option.description}</p>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Completion Date
          </label>
          <input
            type="date"
            value={data.targetCompletionDate || ''}
            onChange={(e) => updateField('targetCompletionDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Optional - if you have a specific date in mind</p>
        </div>
      </section>

      {/* Spousal Support */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spousal Support</h3>

        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.spousalSupportSeeking || false}
              onChange={(e) => updateField('spousalSupportSeeking', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">I am seeking spousal support (alimony)</span>
          </label>
        </div>

        {data.spousalSupportSeeking && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desired Monthly Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={data.spousalSupportAmount || ''}
                  onChange={(e) => updateField('spousalSupportAmount', parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desired Duration
              </label>
              <input
                type="text"
                value={data.spousalSupportDuration || ''}
                onChange={(e) => updateField('spousalSupportDuration', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 5 years, until remarriage"
              />
            </div>
          </div>
        )}
      </section>

      {/* Property Division */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Division Priorities</h3>
        <p className="text-sm text-gray-600 mb-4">
          Which assets are most important for you to keep?
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {PROPERTY_PRIORITIES.map((priority) => (
            <label
              key={priority}
              className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-colors text-center ${
                (data.propertyDivisionPriorities || []).includes(priority)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={(data.propertyDivisionPriorities || []).includes(priority)}
                onChange={() => togglePriority(priority)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{priority}</span>
            </label>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Must-Keep Items
          </label>
          <textarea
            value={(data.mustKeepItems || []).join('\n')}
            onChange={(e) => updateField('mustKeepItems', e.target.value.split('\n').filter(Boolean))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="List specific items you absolutely need to keep (one per line)"
          />
        </div>
      </section>

      {/* Name Change */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Name Change</h3>
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.nameChangeRequested || false}
              onChange={(e) => updateField('nameChangeRequested', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">I want to change my last name</span>
          </label>
        </div>

        {data.nameChangeRequested && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Last Name
            </label>
            <input
              type="text"
              value={data.newLastName || ''}
              onChange={(e) => updateField('newLastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter desired last name"
            />
          </div>
        )}
      </section>

      {/* Communication Preferences */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-green-500" />
          Communication Preferences
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Contact Method
            </label>
            <select
              value={data.communicationPreference || 'email'}
              onChange={(e) => updateField('communicationPreference', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="text">Text Message</option>
              <option value="portal">Client Portal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Preference
            </label>
            <select
              value={data.meetingPreference || 'either'}
              onChange={(e) => updateField('meetingPreference', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="in_person">In-Person</option>
              <option value="video">Video Call</option>
              <option value="either">Either</option>
            </select>
          </div>
        </div>
      </section>

      {/* Additional Information */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500" />
          Additional Information
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Any other concerns or information?
            </label>
            <textarea
              value={data.additionalConcerns || ''}
              onChange={(e) => updateField('additionalConcerns', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Anything else we should know about your situation..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Questions for your attorney?
            </label>
            <textarea
              value={data.questionsForAttorney || ''}
              onChange={(e) => updateField('questionsForAttorney', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="List any questions you'd like answered during your consultation..."
            />
          </div>
        </div>
      </section>
    </div>
  )
}
