'use client'

import { FinancialOverview, FINANCIAL_CONCERNS } from '@/types/intake'
import { DollarSign, Building, Car, CreditCard, PiggyBank, Briefcase } from 'lucide-react'

interface FinancialOverviewStepProps {
  data?: Partial<FinancialOverview>
  onChange: (data: Partial<FinancialOverview>) => void
  errors?: string[]
}

const EMPLOYMENT_STATUSES = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
  { value: 'disabled', label: 'Disabled' },
]

export default function FinancialOverviewStep({ data = {}, onChange, errors }: FinancialOverviewStepProps) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value })
  }

  const toggleConcern = (concern: string) => {
    const current = data.financialConcerns || []
    const updated = current.includes(concern)
      ? current.filter((c) => c !== concern)
      : [...current, concern]
    updateField('financialConcerns', updated)
  }

  const formatCurrency = (value: number | undefined) => {
    return value?.toLocaleString() || ''
  }

  const parseCurrency = (value: string) => {
    return parseFloat(value.replace(/,/g, '')) || 0
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

      {/* Your Employment */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-500" />
          Your Employment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employment Status <span className="text-red-500">*</span>
            </label>
            <select
              value={data.clientEmploymentStatus || ''}
              onChange={(e) => updateField('clientEmploymentStatus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              {EMPLOYMENT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {(data.clientEmploymentStatus === 'employed' || data.clientEmploymentStatus === 'self_employed') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {data.clientEmploymentStatus === 'self_employed' ? 'Business Name' : 'Employer'}
                </label>
                <input
                  type="text"
                  value={data.clientEmployer || ''}
                  onChange={(e) => updateField('clientEmployer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={data.clientJobTitle || ''}
                  onChange={(e) => updateField('clientJobTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Annual Income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.clientAnnualIncome)}
                onChange={(e) => updateField('clientAnnualIncome', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="75,000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.clientOtherIncome)}
                onChange={(e) => updateField('clientOtherIncome', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          {(data.clientOtherIncome ?? 0) > 0 && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other Income Source
              </label>
              <input
                type="text"
                value={data.clientOtherIncomeSource || ''}
                onChange={(e) => updateField('clientOtherIncomeSource', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Rental income, Investments"
              />
            </div>
          )}
        </div>
      </section>

      {/* Spouse Employment */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-gray-400" />
          Spouse&apos;s Employment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employment Status <span className="text-red-500">*</span>
            </label>
            <select
              value={data.spouseEmploymentStatus || ''}
              onChange={(e) => updateField('spouseEmploymentStatus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              {EMPLOYMENT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {(data.spouseEmploymentStatus === 'employed' || data.spouseEmploymentStatus === 'self_employed') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {data.spouseEmploymentStatus === 'self_employed' ? 'Business Name' : 'Employer'}
                </label>
                <input
                  type="text"
                  value={data.spouseEmployer || ''}
                  onChange={(e) => updateField('spouseEmployer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={data.spouseJobTitle || ''}
                  onChange={(e) => updateField('spouseJobTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Annual Income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.spouseAnnualIncome)}
                onChange={(e) => updateField('spouseAnnualIncome', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="75,000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.spouseOtherIncome)}
                onChange={(e) => updateField('spouseOtherIncome', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Assets Summary */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-green-500" />
          Assets (Estimated Values)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Provide approximate values. Exact amounts will be determined later.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Number of Properties
            </label>
            <input
              type="number"
              min="0"
              value={data.realEstateProperties || 0}
              onChange={(e) => updateField('realEstateProperties', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {(data.realEstateProperties ?? 0) > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Real Estate Value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="text"
                  value={formatCurrency(data.estimatedRealEstateValue)}
                  onChange={(e) => updateField('estimatedRealEstateValue', parseCurrency(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Bank Accounts
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.bankAccountsValue)}
                onChange={(e) => updateField('bankAccountsValue', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Retirement Accounts
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.retirementAccountsValue)}
                onChange={(e) => updateField('retirementAccountsValue', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Investment Accounts
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.investmentAccountsValue)}
                onChange={(e) => updateField('investmentAccountsValue', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Car className="w-4 h-4" />
              Vehicles
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.vehiclesValue)}
                onChange={(e) => updateField('vehiclesValue', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Assets
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.otherAssetsValue)}
                onChange={(e) => updateField('otherAssetsValue', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Debts Summary */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-red-500" />
          Debts (Estimated Balances)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mortgage Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.mortgageBalance)}
                onChange={(e) => updateField('mortgageBalance', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Loans
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.vehicleLoansBalance)}
                onChange={(e) => updateField('vehicleLoansBalance', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credit Card Debt
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.creditCardBalance)}
                onChange={(e) => updateField('creditCardBalance', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Loans
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.studentLoansBalance)}
                onChange={(e) => updateField('studentLoansBalance', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Debts
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                value={formatCurrency(data.otherDebtsBalance)}
                onChange={(e) => updateField('otherDebtsBalance', parseCurrency(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Business Ownership */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Ownership</h3>
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.ownsBusinesses || false}
              onChange={(e) => updateField('ownsBusinesses', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Either spouse owns a business</span>
          </label>
        </div>

        {data.ownsBusinesses && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Details
            </label>
            <textarea
              value={data.businessDetails || ''}
              onChange={(e) => updateField('businessDetails', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Describe the business(es), ownership percentage, etc."
            />
          </div>
        )}
      </section>

      {/* Financial Concerns */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Concerns</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select all that apply to help us understand your priorities.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          {FINANCIAL_CONCERNS.map((concern) => (
            <label key={concern} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={(data.financialConcerns || []).includes(concern)}
                onChange={() => toggleConcern(concern)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{concern}</span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.suspectedHiddenAssets || false}
              onChange={(e) => updateField('suspectedHiddenAssets', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">I suspect my spouse may have hidden assets</span>
          </label>

          {data.suspectedHiddenAssets && (
            <textarea
              value={data.hiddenAssetsDetails || ''}
              onChange={(e) => updateField('hiddenAssetsDetails', e.target.value)}
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Please describe your concerns..."
            />
          )}
        </div>
      </section>
    </div>
  )
}
