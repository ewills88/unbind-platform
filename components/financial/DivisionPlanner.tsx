'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  User,
  Users,
  GripVertical,
  Save,
  Plus,
  Trash2,
  Star,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Home,
  Car,
  CreditCard,
  Building,
  PiggyBank,
  Briefcase,
  Package,
  MoreHorizontal,
  TrendingUp,
  Loader2,
  FileText,
  X,
  Download,
} from 'lucide-react'
import {
  Asset,
  Debt,
  DivisionScenario,
  formatCurrency,
} from '@/types/financial'

interface DivisionPlannerProps {
  caseId: string
  clientName?: string
  spouseName?: string
}

type AssignmentType = 'client' | 'spouse' | 'unassigned'

interface DraggableItemProps {
  id: string
  type: 'asset' | 'debt'
  name: string
  value: number
  category: string
  assignment: AssignmentType
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
  personal_loan: Building,
  medical: Plus,
  tax: Building,
}

// Draggable Item Component
function DraggableItem({ item, onRemove }: { item: DraggableItemProps; onRemove?: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const Icon = CATEGORY_ICONS[item.category] || MoreHorizontal
  const isDebt = item.type === 'debt'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-3 bg-white rounded-lg border
        ${isDebt ? 'border-red-200' : 'border-green-200'}
        ${isDragging ? 'shadow-lg' : 'shadow-sm'}
        hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing
      `}
    >
      <div {...attributes} {...listeners} className="text-gray-400 hover:text-gray-600">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className={`p-1.5 rounded ${isDebt ? 'bg-red-100' : 'bg-green-100'}`}>
        <Icon className={`w-4 h-4 ${isDebt ? 'text-red-600' : 'text-green-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className={`text-xs ${isDebt ? 'text-red-600' : 'text-green-600'}`}>
          {isDebt ? '-' : '+'}{formatCurrency(item.value)}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// Drop Zone Component
function DropZone({
  title,
  icon: Icon,
  items,
  total,
  color,
  onItemRemove,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: DraggableItemProps[]
  total: { assets: number; debts: number; net: number }
  color: 'blue' | 'orange' | 'gray'
  onItemRemove?: (itemId: string) => void
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    orange: 'bg-orange-50 border-orange-200',
    gray: 'bg-gray-50 border-gray-200',
  }

  const headerColors = {
    blue: 'text-blue-700 bg-blue-100',
    orange: 'text-orange-700 bg-orange-100',
    gray: 'text-gray-700 bg-gray-100',
  }

  return (
    <div className={`rounded-xl border-2 ${colorClasses[color]} min-h-[400px] flex flex-col`}>
      {/* Header */}
      <div className={`p-4 ${headerColors[color]} rounded-t-lg border-b border-current/20`}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-5 h-5" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-green-600 font-medium">Assets</span>
            <p className="font-semibold">{formatCurrency(total.assets)}</p>
          </div>
          <div>
            <span className="text-red-600 font-medium">Debts</span>
            <p className="font-semibold">{formatCurrency(total.debts)}</p>
          </div>
          <div>
            <span className="font-medium">Net</span>
            <p className={`font-bold ${total.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(total.net)}
            </p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[500px]">
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Drag items here
            </div>
          ) : (
            items.map((item) => (
              <DraggableItem
                key={item.id}
                item={item}
                onRemove={onItemRemove ? () => onItemRemove(item.id) : undefined}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}

export default function DivisionPlanner({ caseId, clientName = 'Client', spouseName = 'Spouse' }: DivisionPlannerProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [scenarios, setScenarios] = useState<DivisionScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Current division state
  const [assetAssignments, setAssetAssignments] = useState<Record<string, AssignmentType>>({})
  const [debtAssignments, setDebtAssignments] = useState<Record<string, AssignmentType>>({})

  // Scenario management
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [scenarioName, setScenarioName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Drag state
  const [activeItem, setActiveItem] = useState<DraggableItemProps | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [assetsRes, debtsRes, scenariosRes] = await Promise.all([
        authFetch(`/api/cases/${caseId}/assets`),
        authFetch(`/api/cases/${caseId}/debts`),
        authFetch(`/api/cases/${caseId}/division-scenarios`),
      ])

      if (assetsRes.ok) {
        const data = await assetsRes.json()
        setAssets(data.assets || [])
        // Initialize all assets as unassigned
        const initialAssets: Record<string, AssignmentType> = {}
        for (const asset of data.assets || []) {
          initialAssets[asset.id] = 'unassigned'
        }
        setAssetAssignments(initialAssets)
      }

      if (debtsRes.ok) {
        const data = await debtsRes.json()
        setDebts(data.debts || [])
        // Initialize all debts as unassigned
        const initialDebts: Record<string, AssignmentType> = {}
        for (const debt of data.debts || []) {
          initialDebts[debt.id] = 'unassigned'
        }
        setDebtAssignments(initialDebts)
      }

      if (scenariosRes.ok) {
        const data = await scenariosRes.json()
        setScenarios(data.scenarios || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Load a scenario
  const loadScenario = (scenario: DivisionScenario) => {
    setActiveScenarioId(scenario.id)
    setScenarioName(scenario.name)

    // Set asset assignments
    const newAssetAssignments: Record<string, AssignmentType> = {}
    for (const asset of assets) {
      const assignment = scenario.asset_assignments?.[asset.id]
      newAssetAssignments[asset.id] = (assignment === 'client' || assignment === 'spouse') ? assignment : 'unassigned'
    }
    setAssetAssignments(newAssetAssignments)

    // Set debt assignments
    const newDebtAssignments: Record<string, AssignmentType> = {}
    for (const debt of debts) {
      const assignment = scenario.debt_assignments?.[debt.id]
      newDebtAssignments[debt.id] = (assignment === 'client' || assignment === 'spouse') ? assignment : 'unassigned'
    }
    setDebtAssignments(newDebtAssignments)
  }

  // Save scenario
  const saveScenario = async (name: string, isPreferred = false) => {
    setSaving(true)
    try {
      const filteredAssets: Record<string, 'client' | 'spouse'> = {}
      for (const [id, assignment] of Object.entries(assetAssignments)) {
        if (assignment !== 'unassigned') {
          filteredAssets[id] = assignment
        }
      }

      const filteredDebts: Record<string, 'client' | 'spouse'> = {}
      for (const [id, assignment] of Object.entries(debtAssignments)) {
        if (assignment !== 'unassigned') {
          filteredDebts[id] = assignment
        }
      }

      const body = {
        name,
        asset_assignments: filteredAssets,
        debt_assignments: filteredDebts,
        is_preferred: isPreferred,
      }

      const url = activeScenarioId
        ? `/api/cases/${caseId}/division-scenarios?id=${activeScenarioId}`
        : `/api/cases/${caseId}/division-scenarios`

      const response = await authFetch(url, {
        method: activeScenarioId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const data = await response.json()
        if (activeScenarioId) {
          setScenarios(prev => prev.map(s => s.id === activeScenarioId ? data.scenario : s))
        } else {
          setScenarios(prev => [data.scenario, ...prev])
          setActiveScenarioId(data.scenario.id)
        }
        setShowSaveDialog(false)
      }
    } catch (error) {
      console.error('Error saving scenario:', error)
    } finally {
      setSaving(false)
    }
  }

  // Delete scenario
  const deleteScenario = async (scenarioId: string) => {
    if (!confirm('Delete this scenario?')) return

    try {
      const response = await authFetch(`/api/cases/${caseId}/division-scenarios?id=${scenarioId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setScenarios(prev => prev.filter(s => s.id !== scenarioId))
        if (activeScenarioId === scenarioId) {
          setActiveScenarioId(null)
          setScenarioName('')
        }
      }
    } catch (error) {
      console.error('Error deleting scenario:', error)
    }
  }

  // Export to Excel
  const exportToExcel = async () => {
    try {
      const url = activeScenarioId
        ? `/api/cases/${caseId}/reports/financial-export?scenario=${activeScenarioId}`
        : `/api/cases/${caseId}/reports/financial-export`

      const response = await authFetch(url)

      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `Financial_Report_${caseId}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        a.remove()
      }
    } catch (error) {
      console.error('Error exporting:', error)
    }
  }

  // Reset to unassigned
  const resetDivision = () => {
    const resetAssets: Record<string, AssignmentType> = {}
    for (const asset of assets) {
      resetAssets[asset.id] = 'unassigned'
    }
    setAssetAssignments(resetAssets)

    const resetDebts: Record<string, AssignmentType> = {}
    for (const debt of debts) {
      resetDebts[debt.id] = 'unassigned'
    }
    setDebtAssignments(resetDebts)

    setActiveScenarioId(null)
    setScenarioName('')
  }

  // Create draggable items from data
  const createDraggableItems = (): { client: DraggableItemProps[]; spouse: DraggableItemProps[]; unassigned: DraggableItemProps[] } => {
    const result = {
      client: [] as DraggableItemProps[],
      spouse: [] as DraggableItemProps[],
      unassigned: [] as DraggableItemProps[],
    }

    // Add assets
    for (const asset of assets) {
      const item: DraggableItemProps = {
        id: `asset-${asset.id}`,
        type: 'asset',
        name: asset.name,
        value: asset.estimated_value,
        category: asset.category,
        assignment: assetAssignments[asset.id] || 'unassigned',
      }
      result[item.assignment].push(item)
    }

    // Add debts
    for (const debt of debts) {
      const item: DraggableItemProps = {
        id: `debt-${debt.id}`,
        type: 'debt',
        name: debt.creditor_name,
        value: debt.current_balance,
        category: debt.category,
        assignment: debtAssignments[debt.id] || 'unassigned',
      }
      result[item.assignment].push(item)
    }

    return result
  }

  // Calculate totals for each column
  const calculateTotals = (items: DraggableItemProps[]) => {
    let assets = 0
    let debts = 0
    for (const item of items) {
      if (item.type === 'asset') {
        assets += item.value
      } else {
        debts += item.value
      }
    }
    return { assets, debts, net: assets - debts }
  }

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const items = createDraggableItems()
    const allItems = [...items.client, ...items.spouse, ...items.unassigned]
    const draggedItem = allItems.find(i => i.id === active.id)
    if (draggedItem) {
      setActiveItem(draggedItem)
    }
  }

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveItem(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Determine target zone
    let targetZone: AssignmentType = 'unassigned'
    if (overId === 'client' || overId.startsWith('asset-') || overId.startsWith('debt-')) {
      // Check if dropped on client zone or an item in client zone
      const items = createDraggableItems()
      if (items.client.some(i => i.id === overId) || overId === 'client') {
        targetZone = 'client'
      } else if (items.spouse.some(i => i.id === overId) || overId === 'spouse') {
        targetZone = 'spouse'
      }
    }
    if (overId === 'spouse') targetZone = 'spouse'
    if (overId === 'unassigned') targetZone = 'unassigned'

    // Update assignment
    if (activeId.startsWith('asset-')) {
      const assetId = activeId.replace('asset-', '')
      setAssetAssignments(prev => ({ ...prev, [assetId]: targetZone }))
    } else if (activeId.startsWith('debt-')) {
      const debtId = activeId.replace('debt-', '')
      setDebtAssignments(prev => ({ ...prev, [debtId]: targetZone }))
    }
  }

  // Remove item from zone (move to unassigned)
  const handleItemRemove = (itemId: string) => {
    if (itemId.startsWith('asset-')) {
      const assetId = itemId.replace('asset-', '')
      setAssetAssignments(prev => ({ ...prev, [assetId]: 'unassigned' }))
    } else if (itemId.startsWith('debt-')) {
      const debtId = itemId.replace('debt-', '')
      setDebtAssignments(prev => ({ ...prev, [debtId]: 'unassigned' }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const items = createDraggableItems()
  const clientTotals = calculateTotals(items.client)
  const spouseTotals = calculateTotals(items.spouse)
  const unassignedTotals = calculateTotals(items.unassigned)

  const difference = Math.abs(clientTotals.net - spouseTotals.net)
  const equalizationAmount = difference / 2
  const payerName = clientTotals.net > spouseTotals.net ? clientName : spouseName
  const receiverName = clientTotals.net > spouseTotals.net ? spouseName : clientName
  const isBalanced = difference < 100 // Consider balanced if within $100

  return (
    <div className="space-y-6">
      {/* Header with Scenario Management */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Property Division Planner</h2>
          <p className="text-sm text-gray-600">Drag assets and debts to assign them to each party</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scenario Selector */}
          <select
            value={activeScenarioId || ''}
            onChange={(e) => {
              const scenario = scenarios.find(s => s.id === e.target.value)
              if (scenario) loadScenario(scenario)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">New Scenario</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_preferred && '⭐'}
              </option>
            ))}
          </select>

          <button
            onClick={resetDivision}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>

          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Scenario
          </button>

          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Equalization Banner */}
      <div className={`p-4 rounded-lg border ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          {isBalanced ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600" />
          )}
          <div className="flex-1">
            {isBalanced ? (
              <p className="text-sm text-green-700">
                <span className="font-medium">Division is balanced!</span> Both parties receive approximately equal value.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm text-amber-700">
                <span className="font-medium">Imbalance: {formatCurrency(difference)}</span>
                <ArrowRight className="w-4 h-4" />
                <span>To equalize, <strong>{payerName}</strong> pays <strong>{receiverName}</strong> {formatCurrency(equalizationAmount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Client Column */}
          <DropZone
            title={clientName}
            icon={User}
            items={items.client}
            total={clientTotals}
            color="blue"
            onItemRemove={handleItemRemove}
          />

          {/* Unassigned Column */}
          <DropZone
            title="Unassigned"
            icon={Users}
            items={items.unassigned}
            total={unassignedTotals}
            color="gray"
          />

          {/* Spouse Column */}
          <DropZone
            title={spouseName}
            icon={User}
            items={items.spouse}
            total={spouseTotals}
            color="orange"
            onItemRemove={handleItemRemove}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem && <DraggableItem item={activeItem} />}
        </DragOverlay>
      </DndContext>

      {/* Saved Scenarios List */}
      {scenarios.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Saved Scenarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  activeScenarioId === scenario.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => loadScenario(scenario)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {scenario.is_preferred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                    <span className="font-medium text-gray-900">{scenario.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteScenario(scenario.id)
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-blue-600">{clientName}:</span>
                    <span className="ml-1 font-medium">{formatCurrency(scenario.client_net_total)}</span>
                  </div>
                  <div>
                    <span className="text-orange-600">{spouseName}:</span>
                    <span className="ml-1 font-medium">{formatCurrency(scenario.spouse_net_total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Save Division Scenario</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scenario Name
                </label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g., Equal Split, Wife Keeps House"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="preferred"
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="preferred" className="text-sm text-gray-700">
                  Mark as preferred scenario
                </label>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-2">Summary</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-blue-600">{clientName}:</span>
                    <span className="ml-1 font-medium">{formatCurrency(clientTotals.net)}</span>
                  </div>
                  <div>
                    <span className="text-orange-600">{spouseName}:</span>
                    <span className="ml-1 font-medium">{formatCurrency(spouseTotals.net)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => saveScenario(scenarioName || 'Untitled Scenario')}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
