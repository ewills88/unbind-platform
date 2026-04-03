'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState, useEffect } from 'react'
import {
  Wallet, Plus, Minus, RefreshCw, Calendar, ArrowUpRight,
  ArrowDownRight, FileText, AlertCircle, DollarSign, X
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/types/billing'
import {
  TrustAccount,
  TrustTransaction,
  TRUST_TRANSACTION_INFO
} from '@/types/payments'

interface TrustAccountLedgerProps {
  caseId: string
  caseNumber?: string
}

export default function TrustAccountLedger({
  caseId,
  caseNumber
}: TrustAccountLedgerProps) {
  const [trustAccount, setTrustAccount] = useState<TrustAccount | null>(null)
  const [transactions, setTransactions] = useState<TrustTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  useEffect(() => {
    fetchTrustAccount()
  }, [caseId])

  async function fetchTrustAccount() {
    try {
      setLoading(true)
      const response = await authFetch(`/api/cases/${caseId}/trust`)
      if (response.ok) {
        const data = await response.json()
        setTrustAccount(data.trust_account)
        setTransactions(data.transactions || [])
      }
    } catch (err) {
      console.error('Failed to fetch trust account:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeposit(amount: number, description: string) {
    try {
      const response = await authFetch(`/api/cases/${caseId}/trust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deposit',
          amount,
          description
        })
      })

      if (response.ok) {
        setShowDepositModal(false)
        fetchTrustAccount()
      }
    } catch (err) {
      console.error('Failed to record deposit:', err)
    }
  }

  async function handleWithdraw(amount: number, description: string) {
    try {
      const response = await authFetch(`/api/cases/${caseId}/trust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdrawal',
          amount,
          description
        })
      })

      if (response.ok) {
        setShowWithdrawModal(false)
        fetchTrustAccount()
      }
    } catch (err) {
      console.error('Failed to record withdrawal:', err)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading trust account...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Trust Account {caseNumber && `- Case ${caseNumber}`}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!trustAccount || trustAccount.current_balance <= 0}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600
                     bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50
                     disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4" />
            Withdraw
          </button>
          <button
            onClick={() => setShowDepositModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white
                     bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Add Deposit
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Current Balance</p>
          <p className={`text-2xl font-semibold ${
            (trustAccount?.current_balance || 0) > 0
              ? 'text-emerald-600'
              : 'text-gray-400'
          }`}>
            {formatCurrency(trustAccount?.current_balance || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Deposited</p>
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(trustAccount?.total_deposits || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Earned</p>
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(trustAccount?.total_withdrawals || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Last Activity</p>
          <p className="text-lg font-medium text-gray-900">
            {trustAccount?.last_transaction_date
              ? formatDate(trustAccount.last_transaction_date)
              : 'No activity'
            }
          </p>
        </div>
      </div>

      {/* Low balance warning */}
      {trustAccount && trustAccount.current_balance > 0 && trustAccount.current_balance < 500 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-700">
            Trust balance is low. Consider requesting a retainer replenishment.
          </span>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Transaction History</h3>
          <button
            onClick={fetchTrustAccount}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">No transactions yet</p>
            <button
              onClick={() => setShowDepositModal(true)}
              className="mt-3 text-sm text-emerald-600 hover:text-emerald-700"
            >
              Record first deposit
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => {
                  const info = TRUST_TRANSACTION_INFO[tx.transaction_type]
                  const isCredit = info?.isCredit

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(tx.transaction_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                          isCredit
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {isCredit ? (
                            <ArrowDownRight className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          {info?.label || tx.transaction_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {tx.description}
                          {tx.reference_invoice_id && (
                            <FileText className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        isCredit ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                        {formatCurrency(tx.balance_after)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <TransactionModal
          type="deposit"
          onClose={() => setShowDepositModal(false)}
          onSubmit={handleDeposit}
        />
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <TransactionModal
          type="withdrawal"
          maxAmount={trustAccount?.current_balance}
          onClose={() => setShowWithdrawModal(false)}
          onSubmit={handleWithdraw}
        />
      )}
    </div>
  )
}

interface TransactionModalProps {
  type: 'deposit' | 'withdrawal'
  maxAmount?: number
  onClose: () => void
  onSubmit: (amount: number, description: string) => void
}

function TransactionModal({ type, maxAmount, onClose, onSubmit }: TransactionModalProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDeposit = type === 'deposit'
  const parsedAmount = parseFloat(amount) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (parsedAmount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    if (!isDeposit && maxAmount && parsedAmount > maxAmount) {
      setError(`Amount cannot exceed available balance of ${formatCurrency(maxAmount)}`)
      return
    }

    if (!description.trim()) {
      setError('Description is required')
      return
    }

    setLoading(true)
    await onSubmit(parsedAmount, description.trim())
    setLoading(false)
  }

  // Quick amount buttons for deposits
  const quickAmounts = isDeposit
    ? [1000, 2500, 5000, 10000]
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {isDeposit ? (
              <Plus className="w-5 h-5 text-emerald-600" />
            ) : (
              <Minus className="w-5 h-5 text-red-600" />
            )}
            <h3 className="font-medium text-gray-900">
              {isDeposit ? 'Add Retainer Deposit' : 'Withdraw from Trust'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Quick amounts for deposits */}
          {isDeposit && quickAmounts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Amount
              </label>
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      parsedAmount === amt
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={maxAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            {!isDeposit && maxAmount && (
              <p className="mt-1 text-sm text-gray-500">
                Available: {formatCurrency(maxAmount)}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isDeposit
                  ? 'e.g., Initial retainer deposit'
                  : 'e.g., Transfer to operating for Invoice #123'
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg
                       hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || parsedAmount <= 0}
              className={`flex-1 px-4 py-2 text-white rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed ${
                         isDeposit
                           ? 'bg-emerald-600 hover:bg-emerald-700'
                           : 'bg-red-600 hover:bg-red-700'
                       }`}
            >
              {loading ? 'Processing...' : isDeposit ? 'Add Deposit' : 'Withdraw'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
