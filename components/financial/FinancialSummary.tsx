'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Car,
  CreditCard,
  Building,
  PiggyBank,
  Briefcase,
  Package,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Wallet,
  User,
  Users,
  Zap,
  Shield,
  Heart,
  Utensils,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Asset,
  Debt,
  IncomeSource,
  ExpenseItem,
  FinancialSummary as FinancialSummaryType,
  ASSET_CATEGORY_CONFIG,
  DEBT_CATEGORY_CONFIG,
  INCOME_TYPE_CONFIG,
  EXPENSE_CATEGORY_CONFIG,
  OWNERSHIP_CONFIG,
  FREQUENCY_CONFIG,
  formatCurrency,
  calculateMonthlyAmount,
} from '@/types/financial'
import AssetForm from './AssetForm'
import DebtForm from './DebtForm'
import IncomeForm from './IncomeForm'
import ExpenseForm from './ExpenseForm'
import DivisionPlanner from './DivisionPlanner'

interface FinancialSummaryProps {
  caseId: string
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  real_estate: Home,
  vehicle: Car,
  bank_account: Building,
  investment: TrendingUp,
  retirement: PiggyBank,
  business: Briefcase,
  personal_property: Package,
  other: MoreHorizontal,
  mortgage: Home,
  auto_loan: Car,
  credit_card: CreditCard,
  student_loan: Building,
  personal_loan: DollarSign,
  medical: Plus,
  tax: Building,
  housing: Home,
  utilities: Zap,
  transportation: Car,
  insurance: Shield,
  healthcare: Heart,
  childcare: Users,
  education: Building,
  food: Utensils,
  clothing: Package,
  entertainment: MoreHorizontal,
  debt_payment: CreditCard,
  savings: PiggyBank,
}

const CHART_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
]

type TabType = 'overview' | 'assets' | 'debts' | 'income' | 'expenses' | 'division'

export default function FinancialSummary({ caseId }: FinancialSummaryProps) {
  const [summary, setSummary] = useState<FinancialSummaryType | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [incomes, setIncomes] = useState<IncomeSource[]>([])
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Form states
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [showDebtForm, setShowDebtForm] = useState(false)
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>()
  const [editingDebt, setEditingDebt] = useState<Debt | undefined>()
  const [editingIncome, setEditingIncome] = useState<IncomeSource | undefined>()
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | undefined>()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [summaryRes, assetsRes, debtsRes, incomeRes, expenseRes] = await Promise.all([
        fetch(`/api/cases/${caseId}/financial-summary`),
        fetch(`/api/cases/${caseId}/assets`),
        fetch(`/api/cases/${caseId}/debts`),
        fetch(`/api/cases/${caseId}/income`),
        fetch(`/api/cases/${caseId}/expenses`),
      ])

      if (summaryRes.ok) {
        const data = await summaryRes.json()
        setSummary(data.summary)
      }

      if (assetsRes.ok) {
        const data = await assetsRes.json()
        setAssets(data.assets || [])
      }

      if (debtsRes.ok) {
        const data = await debtsRes.json()
        setDebts(data.debts || [])
      }

      if (incomeRes.ok) {
        const data = await incomeRes.json()
        setIncomes(data.incomes || [])
      }

      if (expenseRes.ok) {
        const data = await expenseRes.json()
        setExpenses(data.expenses || [])
      }
    } catch (error) {
      console.error('Error loading financial data:', error)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      const response = await fetch(`/api/cases/${caseId}/assets?id=${assetId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAssets(prev => prev.filter(a => a.id !== assetId))
        loadData()
      }
    } catch (error) {
      console.error('Error deleting asset:', error)
    }
  }

  const handleDeleteDebt = async (debtId: string) => {
    if (!confirm('Are you sure you want to delete this debt?')) return

    try {
      const response = await fetch(`/api/cases/${caseId}/debts?id=${debtId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDebts(prev => prev.filter(d => d.id !== debtId))
        loadData()
      }
    } catch (error) {
      console.error('Error deleting debt:', error)
    }
  }

  const handleDeleteIncome = async (incomeId: string) => {
    if (!confirm('Are you sure you want to delete this income source?')) return

    try {
      const response = await fetch(`/api/cases/${caseId}/income?id=${incomeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setIncomes(prev => prev.filter(i => i.id !== incomeId))
        loadData()
      }
    } catch (error) {
      console.error('Error deleting income:', error)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const response = await fetch(`/api/cases/${caseId}/expenses?id=${expenseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setExpenses(prev => prev.filter(e => e.id !== expenseId))
        loadData()
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  // Calculate totals for income/expenses
  const calculateMonthlyTotals = () => {
    const clientIncome = incomes
      .filter(i => i.party === 'client')
      .reduce((sum, i) => sum + calculateMonthlyAmount(i.gross_amount, i.frequency), 0)

    const spouseIncome = incomes
      .filter(i => i.party === 'spouse')
      .reduce((sum, i) => sum + calculateMonthlyAmount(i.gross_amount, i.frequency), 0)

    const clientExpenses = expenses
      .filter(e => e.party === 'client')
      .reduce((sum, e) => sum + calculateMonthlyAmount(e.amount, e.frequency), 0)

    const spouseExpenses = expenses
      .filter(e => e.party === 'spouse')
      .reduce((sum, e) => sum + calculateMonthlyAmount(e.amount, e.frequency), 0)

    const jointExpenses = expenses
      .filter(e => e.party === 'joint')
      .reduce((sum, e) => sum + calculateMonthlyAmount(e.amount, e.frequency), 0)

    return {
      clientIncome,
      spouseIncome,
      totalIncome: clientIncome + spouseIncome,
      clientExpenses,
      spouseExpenses,
      jointExpenses,
      totalExpenses: clientExpenses + spouseExpenses + jointExpenses,
    }
  }

  const monthlyTotals = calculateMonthlyTotals()

  // Prepare chart data
  const assetChartData = summary?.assets_by_category?.map((item, index) => ({
    name: ASSET_CATEGORY_CONFIG[item.category as keyof typeof ASSET_CATEGORY_CONFIG]?.label || item.category,
    value: item.total,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  })) || []

  const debtChartData = summary?.debts_by_category?.map((item, index) => ({
    name: DEBT_CATEGORY_CONFIG[item.category as keyof typeof DEBT_CATEGORY_CONFIG]?.label || item.category,
    value: item.total,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  })) || []

  const incomeComparisonData = [
    { name: 'Client', income: monthlyTotals.clientIncome, expenses: monthlyTotals.clientExpenses },
    { name: 'Spouse', income: monthlyTotals.spouseIncome, expenses: monthlyTotals.spouseExpenses },
    { name: 'Joint', income: 0, expenses: monthlyTotals.jointExpenses },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards - 4 columns now */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Total Assets</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary?.total_assets || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{assets.length} items</p>
        </div>

        {/* Total Debts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Total Debts</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary?.total_debts || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{debts.length} items</p>
        </div>

        {/* Monthly Income */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Monthly Income</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(monthlyTotals.totalIncome)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{incomes.length} sources</p>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Receipt className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Monthly Expenses</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(monthlyTotals.totalExpenses)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{expenses.length} items</p>
        </div>
      </div>

      {/* Net Worth Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Net Worth (Assets - Debts)</p>
            <p className={`text-3xl font-bold mt-1 ${(summary?.net_worth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary?.net_worth || 0)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Monthly Cash Flow</p>
            <p className={`text-3xl font-bold mt-1 ${(monthlyTotals.totalIncome - monthlyTotals.totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(monthlyTotals.totalIncome - monthlyTotals.totalExpenses)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'assets', label: `Assets (${assets.length})` },
            { id: 'debts', label: `Debts (${debts.length})` },
            { id: 'income', label: `Income (${incomes.length})` },
            { id: 'expenses', label: `Expenses (${expenses.length})` },
            { id: 'division', label: 'Division Planner' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets Pie Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assets by Category</h3>
              {assetChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={assetChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {assetChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-12">No assets recorded yet</p>
              )}
            </div>

            {/* Debts Pie Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Debts by Category</h3>
              {debtChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={debtChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {debtChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-12">No debts recorded yet</p>
              )}
            </div>
          </div>

          {/* Income vs Expenses Bar Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Income vs Expenses</h3>
            {(monthlyTotals.totalIncome > 0 || monthlyTotals.totalExpenses > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="income" fill="#10B981" name="Income" />
                  <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 text-center py-12">Add income and expense data to see comparison</p>
            )}
          </div>

          {/* Ownership Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Ownership Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {summary?.assets_by_ownership?.map((item) => {
                const config = OWNERSHIP_CONFIG[item.ownership]
                return (
                  <div key={item.ownership} className={`p-4 rounded-lg ${config?.bgColor || 'bg-gray-100'}`}>
                    <p className={`text-sm font-medium ${config?.color || 'text-gray-700'}`}>
                      {config?.label || item.ownership} Assets
                    </p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {formatCurrency(item.total)}
                    </p>
                    <p className="text-xs text-gray-500">{item.count} items</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Party Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Summary */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Client Financial Summary</h3>
              </div>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Monthly Income</dt>
                  <dd className="text-sm font-semibold text-green-600">{formatCurrency(monthlyTotals.clientIncome)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Monthly Expenses</dt>
                  <dd className="text-sm font-semibold text-red-600">{formatCurrency(monthlyTotals.clientExpenses)}</dd>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200">
                  <dt className="text-sm font-medium text-gray-700">Net Monthly</dt>
                  <dd className={`text-sm font-bold ${(monthlyTotals.clientIncome - monthlyTotals.clientExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(monthlyTotals.clientIncome - monthlyTotals.clientExpenses)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Spouse Summary */}
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Spouse Financial Summary</h3>
              </div>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Monthly Income</dt>
                  <dd className="text-sm font-semibold text-green-600">{formatCurrency(monthlyTotals.spouseIncome)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Monthly Expenses</dt>
                  <dd className="text-sm font-semibold text-red-600">{formatCurrency(monthlyTotals.spouseExpenses)}</dd>
                </div>
                <div className="flex justify-between pt-2 border-t border-orange-200">
                  <dt className="text-sm font-medium text-gray-700">Net Monthly</dt>
                  <dd className={`text-sm font-bold ${(monthlyTotals.spouseIncome - monthlyTotals.spouseExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(monthlyTotals.spouseIncome - monthlyTotals.spouseExpenses)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="space-y-4">
          {/* Add Asset Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingAsset(undefined)
                setShowAssetForm(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Asset
            </button>
          </div>

          {/* Assets List */}
          {assets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assets yet</h3>
              <p className="text-gray-600">Add your first asset to get started</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {assets.map((asset) => {
                const config = ASSET_CATEGORY_CONFIG[asset.category]
                const ownershipConfig = OWNERSHIP_CONFIG[asset.ownership]
                const Icon = CATEGORY_ICONS[asset.category] || MoreHorizontal

                return (
                  <div key={asset.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100">
                          <Icon className={`w-5 h-5 ${config?.color || 'text-gray-500'}`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{asset.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{config?.label}</span>
                            <span>·</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${ownershipConfig?.bgColor} ${ownershipConfig?.color}`}>
                              {ownershipConfig?.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-gray-900">
                          {formatCurrency(asset.estimated_value)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingAsset(asset)
                              setShowAssetForm(true)
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'debts' && (
        <div className="space-y-4">
          {/* Add Debt Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingDebt(undefined)
                setShowDebtForm(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Debt
            </button>
          </div>

          {/* Debts List */}
          {debts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No debts recorded</h3>
              <p className="text-gray-600">Add debts to track the complete financial picture</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {debts.map((debt) => {
                const config = DEBT_CATEGORY_CONFIG[debt.category]
                const ownershipConfig = OWNERSHIP_CONFIG[debt.ownership]
                const Icon = CATEGORY_ICONS[debt.category] || MoreHorizontal

                return (
                  <div key={debt.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100">
                          <Icon className={`w-5 h-5 ${config?.color || 'text-gray-500'}`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{debt.creditor_name}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{config?.label}</span>
                            <span>·</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${ownershipConfig?.bgColor} ${ownershipConfig?.color}`}>
                              {ownershipConfig?.label}
                            </span>
                            {debt.interest_rate && (
                              <>
                                <span>·</span>
                                <span>{debt.interest_rate}% APR</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-lg font-semibold text-gray-900">
                            {formatCurrency(debt.current_balance)}
                          </span>
                          {debt.monthly_payment && (
                            <p className="text-xs text-gray-500">
                              {formatCurrency(debt.monthly_payment)}/mo
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingDebt(debt)
                              setShowDebtForm(true)
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDebt(debt.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'income' && (
        <div className="space-y-4">
          {/* Add Income Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingIncome(undefined)
                setShowIncomeForm(true)
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Income Source
            </button>
          </div>

          {/* Income Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <p className="text-sm font-medium text-blue-700">Client Monthly Income</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{formatCurrency(monthlyTotals.clientIncome)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
              <p className="text-sm font-medium text-orange-700">Spouse Monthly Income</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{formatCurrency(monthlyTotals.spouseIncome)}</p>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <p className="text-sm font-medium text-green-700">Total Monthly Income</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(monthlyTotals.totalIncome)}</p>
            </div>
          </div>

          {/* Income List */}
          {incomes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No income sources</h3>
              <p className="text-gray-600">Add income sources to track monthly finances</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {incomes.map((income) => {
                const typeConfig = INCOME_TYPE_CONFIG[income.income_type]
                const monthlyAmount = calculateMonthlyAmount(income.gross_amount, income.frequency)

                return (
                  <div key={income.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${income.party === 'client' ? 'bg-blue-100' : 'bg-orange-100'}`}>
                          <DollarSign className={`w-5 h-5 ${income.party === 'client' ? 'text-blue-600' : 'text-orange-600'}`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{income.source_name}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{typeConfig?.label}</span>
                            <span>·</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                              income.party === 'client' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {income.party}
                            </span>
                            <span>·</span>
                            <span>{FREQUENCY_CONFIG[income.frequency].label}</span>
                            {income.is_variable && (
                              <>
                                <span>·</span>
                                <span className="text-amber-600">Variable</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-lg font-semibold text-gray-900">
                            {formatCurrency(income.gross_amount)}
                          </span>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(monthlyAmount)}/mo
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingIncome(income)
                              setShowIncomeForm(true)
                            }}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteIncome(income.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Add Expense Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingExpense(undefined)
                setShowExpenseForm(true)
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>

          {/* Expense Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <p className="text-sm font-medium text-blue-700">Client Expenses</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{formatCurrency(monthlyTotals.clientExpenses)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
              <p className="text-sm font-medium text-orange-700">Spouse Expenses</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{formatCurrency(monthlyTotals.spouseExpenses)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
              <p className="text-sm font-medium text-purple-700">Joint Expenses</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{formatCurrency(monthlyTotals.jointExpenses)}</p>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <p className="text-sm font-medium text-red-700">Total Monthly</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{formatCurrency(monthlyTotals.totalExpenses)}</p>
            </div>
          </div>

          {/* Expenses List */}
          {expenses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses recorded</h3>
              <p className="text-gray-600">Add expenses to track monthly spending</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {expenses.map((expense) => {
                const categoryConfig = EXPENSE_CATEGORY_CONFIG[expense.category]
                const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency)
                const Icon = CATEGORY_ICONS[expense.category] || MoreHorizontal

                return (
                  <div key={expense.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          expense.party === 'client' ? 'bg-blue-100' :
                          expense.party === 'spouse' ? 'bg-orange-100' : 'bg-purple-100'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            expense.party === 'client' ? 'text-blue-600' :
                            expense.party === 'spouse' ? 'text-orange-600' : 'text-purple-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{expense.description}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{categoryConfig?.label}</span>
                            <span>·</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                              expense.party === 'client' ? 'bg-blue-100 text-blue-700' :
                              expense.party === 'spouse' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {expense.party}
                            </span>
                            <span>·</span>
                            <span>{FREQUENCY_CONFIG[expense.frequency].label}</span>
                            {expense.is_essential && (
                              <>
                                <span>·</span>
                                <span className="text-green-600">Essential</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-lg font-semibold text-gray-900">
                            {formatCurrency(expense.amount)}
                          </span>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(monthlyAmount)}/mo
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingExpense(expense)
                              setShowExpenseForm(true)
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Division Planner Tab */}
      {activeTab === 'division' && (
        <DivisionPlanner caseId={caseId} />
      )}

      {/* Asset Form Modal */}
      {showAssetForm && (
        <AssetForm
          caseId={caseId}
          asset={editingAsset}
          onSuccess={(asset) => {
            if (editingAsset) {
              setAssets(prev => prev.map(a => a.id === asset.id ? asset : a))
            } else {
              setAssets(prev => [asset, ...prev])
            }
            setShowAssetForm(false)
            setEditingAsset(undefined)
            loadData()
          }}
          onCancel={() => {
            setShowAssetForm(false)
            setEditingAsset(undefined)
          }}
        />
      )}

      {/* Debt Form Modal */}
      {showDebtForm && (
        <DebtForm
          caseId={caseId}
          debt={editingDebt}
          onSuccess={(debt) => {
            if (editingDebt) {
              setDebts(prev => prev.map(d => d.id === debt.id ? debt : d))
            } else {
              setDebts(prev => [debt, ...prev])
            }
            setShowDebtForm(false)
            setEditingDebt(undefined)
            loadData()
          }}
          onCancel={() => {
            setShowDebtForm(false)
            setEditingDebt(undefined)
          }}
        />
      )}

      {/* Income Form Modal */}
      {showIncomeForm && (
        <IncomeForm
          caseId={caseId}
          income={editingIncome}
          onSuccess={(income) => {
            if (editingIncome) {
              setIncomes(prev => prev.map(i => i.id === income.id ? income : i))
            } else {
              setIncomes(prev => [income, ...prev])
            }
            setShowIncomeForm(false)
            setEditingIncome(undefined)
            loadData()
          }}
          onCancel={() => {
            setShowIncomeForm(false)
            setEditingIncome(undefined)
          }}
        />
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          caseId={caseId}
          expense={editingExpense}
          onSuccess={(expense) => {
            if (editingExpense) {
              setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e))
            } else {
              setExpenses(prev => [expense, ...prev])
            }
            setShowExpenseForm(false)
            setEditingExpense(undefined)
            loadData()
          }}
          onCancel={() => {
            setShowExpenseForm(false)
            setEditingExpense(undefined)
          }}
        />
      )}
    </div>
  )
}
