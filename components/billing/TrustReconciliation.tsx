'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/types/billing'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function TrustReconciliation() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const [bankBeginningBalance, setBankBeginningBalance] = useState('')
  const [bankEndingBalance, setBankEndingBalance] = useState('')

  const [registerBeginningBalance, setRegisterBeginningBalance] = useState(0)
  const [registerEndingBalance, setRegisterEndingBalance] = useState(0)
  const [totalDeposits, setTotalDeposits] = useState(0)
  const [totalWithdrawals, setTotalWithdrawals] = useState(0)
  const [sumClientBalances, setSumClientBalances] = useState(0)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const bankEnd = parseFloat(bankEndingBalance) || 0
  const discrepancy = bankEnd - registerEndingBalance
  const clientDiscrepancy = registerEndingBalance - sumClientBalances
  const isReconciled = bankEndingBalance !== '' && Math.abs(discrepancy) < 0.01 && Math.abs(clientDiscrepancy) < 0.01

  useEffect(() => {
    loadRegisterData()
  }, [selectedMonth])

  const loadRegisterData = async () => {
    setLoading(true)
    setSaved(false)
    try {
      const monthStart = selectedMonth.toISOString()
      const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString()

      // Get all trust transactions in this month
      const { data: transactions } = await supabase
        .from('trust_transactions')
        .select('transaction_type, amount, balance_after, transaction_date')
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd)
        .order('transaction_date', { ascending: true })

      const txns = transactions || []

      const deposits = txns
        .filter((t) => t.transaction_type === 'deposit' || t.transaction_type === 'interest')
        .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0)

      const withdrawals = txns
        .filter((t) => t.transaction_type === 'withdrawal' || t.transaction_type === 'refund' || t.transaction_type === 'fee')
        .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0)

      setTotalDeposits(deposits)
      setTotalWithdrawals(withdrawals)

      // Get beginning balance: last balance_after before this month
      const { data: priorTxn } = await supabase
        .from('trust_transactions')
        .select('balance_after')
        .lt('transaction_date', monthStart)
        .order('transaction_date', { ascending: false })
        .limit(1)
        .single()

      const beginning = priorTxn ? parseFloat(String(priorTxn.balance_after)) : 0
      setRegisterBeginningBalance(beginning)
      setRegisterEndingBalance(beginning + deposits - withdrawals)

      // Sum of all current client trust balances
      const { data: trustAccounts } = await supabase
        .from('trust_accounts')
        .select('current_balance')

      const clientSum = (trustAccounts || []).reduce(
        (sum, ta) => sum + parseFloat(String(ta.current_balance)), 0
      )
      setSumClientBalances(clientSum)

      // Check if already reconciled for this month
      const { data: existingRecon } = await supabase
        .from('trust_reconciliations')
        .select('*')
        .eq('reconciliation_month', selectedMonth.toISOString().split('T')[0])
        .single()

      if (existingRecon) {
        setBankBeginningBalance(String(existingRecon.bank_beginning_balance))
        setBankEndingBalance(String(existingRecon.bank_ending_balance))
        setSaved(true)
      } else {
        setBankBeginningBalance('')
        setBankEndingBalance('')
      }
    } catch (error) {
      console.error('Error loading reconciliation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('trust_reconciliations').upsert({
        reconciliation_month: selectedMonth.toISOString().split('T')[0],
        bank_beginning_balance: parseFloat(bankBeginningBalance) || 0,
        bank_ending_balance: bankEnd,
        register_beginning_balance: registerBeginningBalance,
        register_ending_balance: registerEndingBalance,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        sum_client_balances: sumClientBalances,
        is_reconciled: isReconciled,
        discrepancy: Math.abs(discrepancy),
        reconciled_by: user.id,
      }, { onConflict: 'reconciliation_month' })

      setSaved(true)
    } catch (error) {
      console.error('Error saving reconciliation:', error)
    } finally {
      setSaving(false)
    }
  }

  const navigateMonth = (direction: number) => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + direction, 1))
  }

  const formatMonth = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Trust Account Reconciliation</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
            {formatMonth(selectedMonth)}
          </span>
          <button onClick={() => navigateMonth(1)} className="p-1.5 hover:bg-gray-100 rounded">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Three-column comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bank Statement */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Bank Statement</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Beginning Balance</label>
              <input
                type="number"
                step="0.01"
                value={bankBeginningBalance}
                onChange={(e) => setBankBeginningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ending Balance</label>
              <input
                type="number"
                step="0.01"
                value={bankEndingBalance}
                onChange={(e) => setBankEndingBalance(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Trust Register */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Trust Register</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Beginning Balance</dt>
              <dd className="font-medium text-gray-900">{formatCurrency(registerBeginningBalance)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">+ Deposits</dt>
              <dd className="font-medium text-green-600">{formatCurrency(totalDeposits)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">- Withdrawals</dt>
              <dd className="font-medium text-red-600">{formatCurrency(totalWithdrawals)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <dt className="font-semibold text-gray-900">Ending Balance</dt>
              <dd className="font-bold text-gray-900">{formatCurrency(registerEndingBalance)}</dd>
            </div>
          </dl>
        </div>

        {/* Client Ledgers */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Client Ledgers</h4>
          <div className="mb-4">
            <p className="text-sm text-gray-500">Sum of Client Balances</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(sumClientBalances)}</p>
          </div>

          {bankEndingBalance !== '' ? (
            isReconciled ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Reconciled</p>
                    <p className="text-xs text-green-700">All three balances match.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Out of Balance</p>
                    <p className="text-xs text-red-700">
                      Bank vs Register: {formatCurrency(Math.abs(discrepancy))}
                    </p>
                    {Math.abs(clientDiscrepancy) >= 0.01 && (
                      <p className="text-xs text-red-700">
                        Register vs Clients: {formatCurrency(Math.abs(clientDiscrepancy))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <p className="text-xs text-gray-400">Enter bank balances to compare</p>
          )}
        </div>
      </div>

      {/* Discrepancy help */}
      {bankEndingBalance !== '' && !isReconciled && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Identify Discrepancy</h4>
          <p className="text-sm text-gray-600 mb-2">Review these potential issues:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>Outstanding checks not yet cleared</li>
            <li>Deposits in transit</li>
            <li>Bank fees not recorded in register</li>
            <li>Recording errors in client ledgers</li>
          </ul>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || bankEndingBalance === ''}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : saved ? 'Update Reconciliation' : 'Save Reconciliation Report'}
        </button>
      </div>
    </div>
  )
}
