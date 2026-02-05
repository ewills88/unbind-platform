'use client'

import { useState } from 'react'
import { ChildrenCustody, ChildInfo, CUSTODY_PRIORITIES } from '@/types/intake'
import { Plus, Trash2, Users } from 'lucide-react'

interface ChildrenCustodyStepProps {
  data?: Partial<ChildrenCustody>
  onChange: (data: Partial<ChildrenCustody>) => void
  errors?: string[]
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export default function ChildrenCustodyStep({ data = {}, onChange, errors }: ChildrenCustodyStepProps) {
  const [children, setChildren] = useState<Partial<ChildInfo>[]>(data.children || [])

  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  const addChild = () => {
    const newChild: Partial<ChildInfo> = {
      id: generateId(),
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      age: 0,
    }
    const updatedChildren = [...children, newChild]
    setChildren(updatedChildren)
    onChange({ ...data, children: updatedChildren as ChildInfo[] })
  }

  const updateChild = (index: number, field: string, value: unknown) => {
    const updatedChildren = [...children]
    updatedChildren[index] = { ...updatedChildren[index], [field]: value }

    // Auto-calculate age when DOB changes
    if (field === 'dateOfBirth' && typeof value === 'string' && value) {
      updatedChildren[index].age = calculateAge(value)
    }

    setChildren(updatedChildren)
    onChange({ ...data, children: updatedChildren as ChildInfo[] })
  }

  const removeChild = (index: number) => {
    const updatedChildren = children.filter((_, i) => i !== index)
    setChildren(updatedChildren)
    onChange({ ...data, children: updatedChildren as ChildInfo[] })
  }

  const togglePriority = (priority: string) => {
    const current = data.custodyPriorities || []
    const updated = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority]
    updateField('custodyPriorities', updated)
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

      {/* Has Minor Children */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Children</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Do you have minor children (under 18)?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="hasMinorChildren"
                checked={data.hasMinorChildren === true}
                onChange={() => updateField('hasMinorChildren', true)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="hasMinorChildren"
                checked={data.hasMinorChildren === false}
                onChange={() => updateField('hasMinorChildren', false)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
        </div>
      </section>

      {data.hasMinorChildren && (
        <>
          {/* Children List */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Child Information</h3>
              <button
                type="button"
                onClick={addChild}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Child
              </button>
            </div>

            {children.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">No children added yet</p>
                <button
                  type="button"
                  onClick={addChild}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add your first child
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {children.map((child, index) => (
                  <div key={child.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Child {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeChild(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={child.firstName || ''}
                          onChange={(e) => updateChild(index, 'firstName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={child.lastName || ''}
                          onChange={(e) => updateChild(index, 'lastName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={child.dateOfBirth || ''}
                          onChange={(e) => updateChild(index, 'dateOfBirth', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          value={child.age || 0}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          School
                        </label>
                        <input
                          type="text"
                          value={child.school || ''}
                          onChange={(e) => updateChild(index, 'school', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Grade
                        </label>
                        <input
                          type="text"
                          value={child.grade || ''}
                          onChange={(e) => updateChild(index, 'grade', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Special Needs / Medical Conditions
                        </label>
                        <textarea
                          value={child.specialNeeds || child.medicalConditions || ''}
                          onChange={(e) => {
                            updateChild(index, 'specialNeeds', e.target.value)
                            updateChild(index, 'medicalConditions', e.target.value)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                          placeholder="Any relevant information..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Custody Preferences */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Custody Preferences</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Custody Arrangement
              </label>
              <select
                value={data.preferredCustodyArrangement || ''}
                onChange={(e) => updateField('preferredCustodyArrangement', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select preference...</option>
                <option value="sole_client">Sole custody (me)</option>
                <option value="sole_spouse">Sole custody (spouse)</option>
                <option value="joint">Joint custody</option>
                <option value="undecided">Undecided / Need guidance</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custody Priorities (select all that apply)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {CUSTODY_PRIORITIES.map((priority) => (
                  <label key={priority} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(data.custodyPriorities || []).includes(priority)}
                      onChange={() => togglePriority(priority)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{priority}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Parenting Schedule */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Parenting Schedule</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Parenting Schedule
                </label>
                <textarea
                  value={data.currentParentingSchedule || ''}
                  onChange={(e) => updateField('currentParentingSchedule', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe your current arrangement for time with children..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proposed Parenting Schedule
                </label>
                <textarea
                  value={data.proposedParentingSchedule || ''}
                  onChange={(e) => updateField('proposedParentingSchedule', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="What schedule would you like to propose?"
                />
              </div>
            </div>
          </section>

          {/* Child Support */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Child Support</h3>
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.existingChildSupport || false}
                  onChange={(e) => updateField('existingChildSupport', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">There is existing child support</span>
              </label>
            </div>

            {data.existingChildSupport && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={data.childSupportAmount || ''}
                      onChange={(e) => updateField('childSupportAmount', parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Who Pays?
                  </label>
                  <select
                    value={data.childSupportPayer || ''}
                    onChange={(e) => updateField('childSupportPayer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="client">I pay</option>
                    <option value="spouse">Spouse pays</option>
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* Additional Concerns */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Concerns</h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={data.relocationConcerns || false}
                    onChange={(e) => updateField('relocationConcerns', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Concerns about relocation</span>
                </label>
                {data.relocationConcerns && (
                  <textarea
                    value={data.relocationDetails || ''}
                    onChange={(e) => updateField('relocationDetails', e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Describe relocation concerns..."
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other Parenting Concerns
                </label>
                <textarea
                  value={data.parentingConcerns || ''}
                  onChange={(e) => updateField('parentingConcerns', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Any other concerns about parenting or custody..."
                />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
