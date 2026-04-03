'use client'

import { useState, useEffect } from 'react'
import {
  Receipt, Plus, Filter, Search, Calendar,
  RefreshCw, Edit2, Trash2, Check,
  Paperclip
} from 'lucide-react'
import {
  Expense,
  ExpenseType,
  EXPENSE_TYPE_INFO,
  formatCurrency,
  formatDate
} from '@/types/billing'
import ExpenseForm from './ExpenseForm'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface ExpensesListProps {
  caseId: string
  onExpenseAdded?: () => void
}

export default function ExpensesList({
  caseId,
  onExpenseAdded
}: ExpensesListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [summary, setSummary] = useState({
    total_expenses: 0,
    total_amount: 0,
    billable_amount: 0,
    unbilled_amount: 0
  })

  // Filters
  const [filterBilled, setFilterBilled] = useState<'all' | 'billed' | 'unbilled'>('all')
  const [filterType, setFilterType] = useState<ExpenseType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchExpenses()
  }, [caseId, filterBilled, filterType])

  async function fetchExpenses() {
    try {
      setLoading(true)
      let url = `/api/cases/${caseId}/billing/expenses?`

      if (filterBilled === 'billed') {
        url += 'billed=true&'
      } else if (filterBilled === 'unbilled') {
        url += 'billed=false&'
      }

      if (filterType !== 'all') {
        url += `expense_type=${filterType}&`
      }

      const response = await authFetch(url)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
        setSummary(data.summary || {
          total_expenses: 0,
          total_amount: 0,
          billable_amount: 0,
          unbilled_amount: 0
        })
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(expenseId: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const response = await authFetch(`/api/cases/${caseId}/billing/expenses?id=${expenseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchExpenses()
      }
    } catch (err) {
      console.error('Failed to delete expense:', err)
    }
  }

  // Filter expenses by search
  const filteredExpenses = expenses.filter(expense => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        expense.description.toLowerCase().includes(query) ||
        expense.expense_type.toLowerCase().includes(query) ||
        (expense.vendor && expense.vendor.toLowerCase().includes(query))
      )
    }
    return true
  })

  // Group expenses by date
  const expensesByDate = filteredExpenses.reduce((groups, expense) => {
    const date = expense.expense_date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(expense)
    return groups
  }, {} as Record<string, Expense[]>)

  const dates = Object.keys(expensesByDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white
                   bg-purple-600 rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-semibold text-gray-900">
            {summary.total_expenses}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.total_amount)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Billable</p>
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.billable_amount)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Unbilled</p>
          <p className="text-2xl font-semibold text-green-600">
            {formatCurrency(summary.unbilled_amount)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filters:</span>
        </div>

        <select
          value={filterBilled}
          onChange={(e) => setFilterBilled(e.target.value as typeof filterBilled)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="all">All expenses</option>
          <option value="unbilled">Unbilled only</option>
          <option value="billed">Billed only</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as typeof filterType)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="all">All types</option>
          {Object.entries(EXPENSE_TYPE_INFO).map(([key, info]) => (
            <option key={key} value={key}>{info.label}</option>
          ))}
        </select>

        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        <button
          onClick={fetchExpenses}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">No expenses found</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-purple-600 hover:text-purple-700"
            >
              Add your first expense
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dates.map(date => (
              <div key={date}>
                {/* Date header */}
                <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {formatDate(date)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({expensesByDate[date].length} expenses,{' '}
                    {formatCurrency(expensesByDate[date].reduce((sum, e) => sum + e.billed_amount, 0))})
                  </span>
                </div>

                {/* Expenses for this date */}
                {expensesByDate[date].map(expense => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onDelete={() => handleDelete(expense.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <ExpenseForm
          caseId={caseId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            fetchExpenses()
            onExpenseAdded?.()
          }}
        />
      )}
    </div>
  )
}

interface ExpenseRowProps {
  expense: Expense
  onDelete: () => void
}

function ExpenseRow({ expense, onDelete }: ExpenseRowProps) {
  const typeInfo = EXPENSE_TYPE_INFO[expense.expense_type]

  return (
    <div className="px-4 py-3 hover:bg-gray-50 flex items-center gap-4">
      {/* Expense type icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        expense.billable ? 'bg-purple-100' : 'bg-gray-100'
      }`}>
        <Receipt className={`w-5 h-5 ${expense.billable ? 'text-purple-600' : 'text-gray-400'}`} />
      </div>

      {/* Expense details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">
            {expense.description}
          </span>
          {expense.billed_at && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              <Check className="w-3 h-3" />
              Billed
            </span>
          )}
          {expense.receipt_path && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              <Paperclip className="w-3 h-3" />
              Receipt
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span>{typeInfo?.label || expense.expense_type}</span>
          {expense.vendor && (
            <>
              <span>•</span>
              <span>{expense.vendor}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0 w-28">
        {expense.billable ? (
          <>
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(expense.billed_amount)}
            </p>
            {expense.markup_percentage > 0 && (
              <p className="text-xs text-gray-500">
                {formatCurrency(expense.amount)} + {expense.markup_percentage}%
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400">
              {formatCurrency(expense.amount)}
            </p>
            <p className="text-xs text-gray-400">Non-billable</p>
          </>
        )}
      </div>

      {/* Actions */}
      {!expense.billed_at && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
