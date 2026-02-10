'use client'

import { useState, useEffect } from 'react'
import {
  FileText, DollarSign, Calendar, Check, AlertCircle,
  RefreshCw, ChevronRight, X
} from 'lucide-react'
import {
  TimeEntry,
  Expense,
  Invoice,
  formatCurrency,
  formatDate,
  formatDuration,
  getInvoiceDueDate
} from '@/types/billing'

interface InvoiceGeneratorProps {
  caseId: string
  caseName?: string
  onClose: () => void
  onGenerated: (invoice: Invoice) => void
}

export default function InvoiceGenerator({
  caseId,
  caseName,
  onClose,
  onGenerated
}: InvoiceGeneratorProps) {
  const [step, setStep] = useState<'select' | 'configure' | 'preview' | 'generating'>('select')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Available unbilled items
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  // Selected items
  const [selectedTimeIds, setSelectedTimeIds] = useState<string[]>([])
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([])

  // Invoice configuration
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDays, setDueDays] = useState(30)
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchUnbilledItems()
  }, [caseId])

  async function fetchUnbilledItems() {
    try {
      setLoading(true)

      // Fetch unbilled time entries
      const timeResponse = await fetch(`/api/cases/${caseId}/time-entries?billed=false&billable=true`)
      if (timeResponse.ok) {
        const data = await timeResponse.json()
        setTimeEntries(data.entries || [])
        // Select all by default
        setSelectedTimeIds((data.entries || []).map((e: TimeEntry) => e.id))
      }

      // Fetch unbilled expenses
      const expenseResponse = await fetch(`/api/cases/${caseId}/billing/expenses?billed=false&billable=true`)
      if (expenseResponse.ok) {
        const data = await expenseResponse.json()
        setExpenses(data.expenses || [])
        // Select all by default
        setSelectedExpenseIds((data.expenses || []).map((e: Expense) => e.id))
      }
    } catch (err) {
      console.error('Failed to fetch unbilled items:', err)
      setError('Failed to load unbilled items')
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const selectedTime = timeEntries.filter(t => selectedTimeIds.includes(t.id))
  const selectedExpenses = expenses.filter(e => selectedExpenseIds.includes(e.id))

  const subtotalServices = selectedTime.reduce((sum, t) => sum + Number(t.amount), 0)
  const subtotalExpenses = selectedExpenses.reduce((sum, e) => sum + Number(e.billed_amount || e.amount), 0)
  const subtotal = subtotalServices + subtotalExpenses
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const dueDate = getInvoiceDueDate(issueDate, dueDays)

  function toggleTimeEntry(id: string) {
    setSelectedTimeIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function toggleExpense(id: string) {
    setSelectedExpenseIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function selectAllTime() {
    setSelectedTimeIds(timeEntries.map(t => t.id))
  }

  function selectAllExpenses() {
    setSelectedExpenseIds(expenses.map(e => e.id))
  }

  async function generateInvoice() {
    if (selectedTimeIds.length === 0 && selectedExpenseIds.length === 0) {
      setError('Please select at least one item to invoice')
      return
    }

    try {
      setStep('generating')
      setError(null)

      const response = await fetch(`/api/cases/${caseId}/billing/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time_entry_ids: selectedTimeIds.length > 0 ? selectedTimeIds : undefined,
          expense_ids: selectedExpenseIds.length > 0 ? selectedExpenseIds : undefined,
          issue_date: issueDate,
          due_date: dueDate,
          tax_rate: taxRate,
          notes: notes || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate invoice')
      }

      const data = await response.json()
      onGenerated(data.invoice)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice')
      setStep('preview')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading unbilled items...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-gray-900">Generate Invoice</h3>
              {caseName && (
                <p className="text-sm text-gray-500">{caseName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {['select', 'configure', 'preview'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${step === s ? 'bg-blue-600 text-white' :
                    ['configure', 'preview'].indexOf(step) > i ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600'}`}>
                  {['configure', 'preview'].indexOf(step) > i ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`ml-2 text-sm ${step === s ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  {s === 'select' ? 'Select Items' : s === 'configure' ? 'Configure' : 'Preview'}
                </span>
                {i < 2 && <ChevronRight className="w-4 h-4 text-gray-300 mx-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Step 1: Select Items */}
          {step === 'select' && (
            <div className="space-y-6">
              {/* Time Entries */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    Time Entries ({selectedTimeIds.length} of {timeEntries.length} selected)
                  </h4>
                  <button
                    onClick={selectAllTime}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Select all
                  </button>
                </div>

                {timeEntries.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                    No unbilled time entries
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
                    {timeEntries.map(entry => (
                      <label
                        key={entry.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTimeIds.includes(entry.id)}
                          onChange={() => toggleTimeEntry(entry.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {entry.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(entry.entry_date)} • {formatDuration(entry.duration_minutes)}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(entry.amount)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Expenses */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    Expenses ({selectedExpenseIds.length} of {expenses.length} selected)
                  </h4>
                  <button
                    onClick={selectAllExpenses}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Select all
                  </button>
                </div>

                {expenses.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                    No unbilled expenses
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                    {expenses.map(expense => (
                      <label
                        key={expense.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedExpenseIds.includes(expense.id)}
                          onChange={() => toggleExpense(expense.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {expense.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(expense.expense_date)} • {expense.expense_type}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(expense.billed_amount || expense.amount)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Selected Total:</span>
                  <span className="text-lg font-semibold text-blue-700">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={dueDays}
                    onChange={(e) => setDueDays(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="0">Due on receipt</option>
                    <option value="15">Net 15</option>
                    <option value="30">Net 30</option>
                    <option value="45">Net 45</option>
                    <option value="60">Net 60</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  step="0.25"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes to Client (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or special instructions..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Issue Date</p>
                    <p className="font-medium text-gray-900">{formatDate(issueDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Due Date</p>
                    <p className="font-medium text-gray-900">{formatDate(dueDate)}</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600">Description</th>
                      <th className="px-4 py-2 text-right text-gray-600">Qty/Hrs</th>
                      <th className="px-4 py-2 text-right text-gray-600">Rate</th>
                      <th className="px-4 py-2 text-right text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedTime.map(entry => (
                      <tr key={entry.id}>
                        <td className="px-4 py-2 text-gray-900">{entry.description}</td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {(entry.duration_minutes / 60).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {formatCurrency(entry.hourly_rate)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">
                          {formatCurrency(entry.amount)}
                        </td>
                      </tr>
                    ))}
                    {selectedExpenses.map(expense => (
                      <tr key={expense.id}>
                        <td className="px-4 py-2 text-gray-900">{expense.description}</td>
                        <td className="px-4 py-2 text-right text-gray-600">1</td>
                        <td className="px-4 py-2 text-right text-gray-600">-</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">
                          {formatCurrency(expense.billed_amount || expense.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal - Services</span>
                  <span className="text-gray-900">{formatCurrency(subtotalServices)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal - Expenses</span>
                  <span className="text-gray-900">{formatCurrency(subtotalExpenses)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax ({taxRate}%)</span>
                    <span className="text-gray-900">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total Due</span>
                  <span className="text-gray-900">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Generating */}
          {step === 'generating' && (
            <div className="py-12 text-center">
              <RefreshCw className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
              <p className="mt-4 text-gray-600">Generating invoice...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          {step === 'select' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('configure')}
                disabled={selectedTimeIds.length === 0 && selectedExpenseIds.length === 0}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </>
          )}
          {step === 'configure' && (
            <>
              <button
                onClick={() => setStep('select')}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={() => setStep('preview')}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Preview Invoice
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('configure')}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={generateInvoice}
                className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Generate Invoice
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
