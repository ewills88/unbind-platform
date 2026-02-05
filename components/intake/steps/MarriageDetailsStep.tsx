'use client'

import { MarriageDetails } from '@/types/intake'
import { AlertTriangle } from 'lucide-react'

interface MarriageDetailsStepProps {
  data?: Partial<MarriageDetails>
  onChange: (data: Partial<MarriageDetails>) => void
  errors?: string[]
}

export default function MarriageDetailsStep({ data = {}, onChange, errors }: MarriageDetailsStepProps) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value })
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

      {/* Marriage Information */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Marriage Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Marriage <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={data.dateOfMarriage || ''}
              onChange={(e) => updateField('dateOfMarriage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Separation
            </label>
            <input
              type="date"
              value={data.dateOfSeparation || ''}
              onChange={(e) => updateField('dateOfSeparation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City of Marriage <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.placeOfMarriage?.city || ''}
              onChange={(e) =>
                onChange({
                  ...data,
                  placeOfMarriage: { ...data.placeOfMarriage, city: e.target.value } as MarriageDetails['placeOfMarriage'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.placeOfMarriage?.state || ''}
              onChange={(e) =>
                onChange({
                  ...data,
                  placeOfMarriage: { ...data.placeOfMarriage, state: e.target.value } as MarriageDetails['placeOfMarriage'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={data.placeOfMarriage?.country || 'United States'}
              onChange={(e) =>
                onChange({
                  ...data,
                  placeOfMarriage: { ...data.placeOfMarriage, country: e.target.value } as MarriageDetails['placeOfMarriage'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {data.dateOfSeparation && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Separation Circumstances
            </label>
            <textarea
              value={data.separationCircumstances || ''}
              onChange={(e) => updateField('separationCircumstances', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Briefly describe the circumstances of your separation..."
            />
          </div>
        )}
      </section>

      {/* Living Situation */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Living Situation</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Are you currently living together?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="livingTogether"
                checked={data.currentlyLivingTogether === true}
                onChange={() => updateField('currentlyLivingTogether', true)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="livingTogether"
                checked={data.currentlyLivingTogether === false}
                onChange={() => updateField('currentlyLivingTogether', false)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
        </div>

        {data.currentlyLivingTogether === false && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who left the marital home?
            </label>
            <select
              value={data.whoLeftMaritalHome || ''}
              onChange={(e) => updateField('whoLeftMaritalHome', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select...</option>
              <option value="client">I did</option>
              <option value="spouse">My spouse did</option>
              <option value="both">We both moved</option>
              <option value="neither">Neither (other arrangement)</option>
            </select>
          </div>
        )}
      </section>

      {/* Previous Marriages */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Marriages</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Previous Marriages
            </label>
            <input
              type="number"
              min="0"
              value={data.clientPreviousMarriages || 0}
              onChange={(e) => updateField('clientPreviousMarriages', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spouse&apos;s Previous Marriages
            </label>
            <input
              type="number"
              min="0"
              value={data.spousePreviousMarriages || 0}
              onChange={(e) => updateField('spousePreviousMarriages', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Prenuptial Agreement */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prenuptial Agreement</h3>
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.hasPrenup || false}
              onChange={(e) => updateField('hasPrenup', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">We have a prenuptial agreement</span>
          </label>
        </div>

        {data.hasPrenup && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prenup Details
            </label>
            <textarea
              value={data.prenupDetails || ''}
              onChange={(e) => updateField('prenupDetails', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Describe the main terms of your prenuptial agreement..."
            />
          </div>
        )}
      </section>

      {/* Safety Concerns */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Safety Concerns
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          This information is confidential and helps us provide appropriate support.
        </p>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.domesticViolenceHistory || false}
                onChange={(e) => updateField('domesticViolenceHistory', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">History of domestic violence</span>
            </label>
            {data.domesticViolenceHistory && (
              <textarea
                value={data.domesticViolenceDetails || ''}
                onChange={(e) => updateField('domesticViolenceDetails', e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Please provide details (confidential)..."
              />
            )}
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.restrainingOrders || false}
                onChange={(e) => updateField('restrainingOrders', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Current or past restraining orders</span>
            </label>
            {data.restrainingOrders && (
              <textarea
                value={data.restrainingOrderDetails || ''}
                onChange={(e) => updateField('restrainingOrderDetails', e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Please provide details about any restraining orders..."
              />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
