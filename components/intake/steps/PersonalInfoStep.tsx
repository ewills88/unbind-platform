'use client'

import { PersonalInfo } from '@/types/intake'

interface PersonalInfoStepProps {
  data?: Partial<PersonalInfo>
  onChange: (data: Partial<PersonalInfo>) => void
  errors?: string[]
}

export default function PersonalInfoStep({ data = {}, onChange, errors }: PersonalInfoStepProps) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  const updateAddress = (field: string, value: string) => {
    onChange({
      ...data,
      address: { ...data.address, [field]: value } as PersonalInfo['address'],
    })
  }

  const updateSpouseAddress = (field: string, value: string | boolean) => {
    onChange({
      ...data,
      spouseAddress: { ...data.spouseAddress, [field]: value } as PersonalInfo['spouseAddress'],
    })
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

      {/* Your Information */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.firstName || ''}
              onChange={(e) => updateField('firstName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.lastName || ''}
              onChange={(e) => updateField('lastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Name
            </label>
            <input
              type="text"
              value={data.preferredName || ''}
              onChange={(e) => updateField('preferredName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={data.dateOfBirth || ''}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={data.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={data.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(555) 123-4567"
              required
            />
          </div>
        </div>

        {/* Address */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Your Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                value={data.address?.street || ''}
                onChange={(e) => updateAddress('street', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Street Address"
              />
            </div>
            <div>
              <input
                type="text"
                value={data.address?.city || ''}
                onChange={(e) => updateAddress('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="City"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.address?.state || ''}
                onChange={(e) => updateAddress('state', e.target.value)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="State"
                maxLength={2}
              />
              <input
                type="text"
                value={data.address?.zipCode || ''}
                onChange={(e) => updateAddress('zipCode', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Zip Code"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Spouse Information */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spouse Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spouse First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.spouseFirstName || ''}
              onChange={(e) => updateField('spouseFirstName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spouse Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.spouseLastName || ''}
              onChange={(e) => updateField('spouseLastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spouse Date of Birth
            </label>
            <input
              type="date"
              value={data.spouseDateOfBirth || ''}
              onChange={(e) => updateField('spouseDateOfBirth', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spouse Email
            </label>
            <input
              type="email"
              value={data.spouseEmail || ''}
              onChange={(e) => updateField('spouseEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spouse Phone
            </label>
            <input
              type="tel"
              value={data.spousePhone || ''}
              onChange={(e) => updateField('spousePhone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Spouse Address */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="sameAddress"
              checked={data.spouseAddress?.sameAsClient || false}
              onChange={(e) => updateSpouseAddress('sameAsClient', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="sameAddress" className="text-sm text-gray-700">
              Same address as client
            </label>
          </div>

          {!data.spouseAddress?.sameAsClient && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={data.spouseAddress?.street || ''}
                  onChange={(e) => updateSpouseAddress('street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Street Address"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={data.spouseAddress?.city || ''}
                  onChange={(e) => updateSpouseAddress('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="City"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={data.spouseAddress?.state || ''}
                  onChange={(e) => updateSpouseAddress('state', e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="State"
                  maxLength={2}
                />
                <input
                  type="text"
                  value={data.spouseAddress?.zipCode || ''}
                  onChange={(e) => updateSpouseAddress('zipCode', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Zip Code"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Emergency Contact */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <input
              type="text"
              value={data.emergencyContact?.name || ''}
              onChange={(e) =>
                onChange({
                  ...data,
                  emergencyContact: { ...data.emergencyContact, name: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationship
            </label>
            <input
              type="text"
              value={data.emergencyContact?.relationship || ''}
              onChange={(e) =>
                onChange({
                  ...data,
                  emergencyContact: { ...data.emergencyContact, relationship: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Parent, Sibling"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={data.emergencyContact?.phone || ''}
              onChange={(e) =>
                onChange({
                  ...data,
                  emergencyContact: { ...data.emergencyContact, phone: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
