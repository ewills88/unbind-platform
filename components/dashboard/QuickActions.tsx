'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Upload,
  MessageSquare,
  Calendar,
  CheckSquare,
  PlusCircle,
  FileText,
  LucideIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import DocumentUpload from '@/components/dashboard/DocumentUpload'
import NewCaseModal from '@/components/cases/NewCaseModal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface CaseOption {
  id: string
  client_name: string
  spouse_name: string
  status: string
}

type ModalType = 'upload' | 'court-date' | 'task' | 'new-case' | null

export default function QuickActions() {
  const router = useRouter()
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [cases, setCases] = useState<CaseOption[]>([])
  const [casesLoading, setCasesLoading] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Court date form state
  const [courtDateForm, setCourtDateForm] = useState({
    title: '',
    date: '',
    time: '09:00',
    location: '',
    notes: '',
  })
  const [courtDateSaving, setCourtDateSaving] = useState(false)

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  })
  const [taskSaving, setTaskSaving] = useState(false)

  const loadCases = async () => {
    if (cases.length > 0) return
    setCasesLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('cases')
        .select('id, client_name, spouse_name, status')
        .eq('attorney_id', user.id)
        .in('status', ['consultation', 'active', 'settlement'])
        .order('created_at', { ascending: false })
      setCases(data || [])
      if (data && data.length > 0) {
        setSelectedCaseId(data[0].id)
      }
    } catch (err) {
      console.error('Error loading cases:', err)
    } finally {
      setCasesLoading(false)
    }
  }

  const openModal = (type: ModalType) => {
    setActiveModal(type)
    loadCases()
  }

  const closeModal = () => {
    setActiveModal(null)
    setCourtDateForm({ title: '', date: '', time: '09:00', location: '', notes: '' })
    setTaskForm({ title: '', description: '', dueDate: '', priority: 'medium' })
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCourtDateSubmit = async () => {
    if (!selectedCaseId || !courtDateForm.title || !courtDateForm.date) return
    setCourtDateSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const startTime = new Date(`${courtDateForm.date}T${courtDateForm.time}:00`)
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour default

      const { error } = await supabase.from('events').insert({
        case_id: selectedCaseId,
        title: courtDateForm.title,
        event_type: 'court_hearing',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location: courtDateForm.location || null,
        description: courtDateForm.notes || null,
        status: 'upcoming',
        created_by: user.id,
      })
      if (error) throw error
      showToast('Court date added to calendar')
      closeModal()
    } catch (err) {
      console.error('Error creating court date:', err)
      showToast('Failed to create court date', 'error')
    } finally {
      setCourtDateSaving(false)
    }
  }

  const handleTaskSubmit = async () => {
    if (!selectedCaseId || !taskForm.title) return
    setTaskSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('client_tasks').insert({
        case_id: selectedCaseId,
        title: taskForm.title,
        description: taskForm.description || null,
        due_date: taskForm.dueDate || null,
        priority: taskForm.priority,
        status: 'pending',
        task_type: 'review_form',
        created_by: user.id,
      })
      if (error) throw error
      showToast('Task created successfully')
      closeModal()
    } catch (err) {
      console.error('Error creating task:', err)
      showToast('Failed to create task', 'error')
    } finally {
      setTaskSaving(false)
    }
  }

  const actions: { id: string; title: string; icon: LucideIcon; color: string; action: () => void }[] = [
    {
      id: 'upload',
      title: 'Upload Document',
      icon: Upload,
      color: 'blue',
      action: () => openModal('upload'),
    },
    {
      id: 'message',
      title: 'Message Client',
      icon: MessageSquare,
      color: 'green',
      action: () => router.push('/dashboard/messages'),
    },
    {
      id: 'court-date',
      title: 'Court Date',
      icon: Calendar,
      color: 'purple',
      action: () => openModal('court-date'),
    },
    {
      id: 'task',
      title: 'Create Task',
      icon: CheckSquare,
      color: 'orange',
      action: () => openModal('task'),
    },
    {
      id: 'new-case',
      title: 'New Case',
      icon: PlusCircle,
      color: 'indigo',
      action: () => setActiveModal('new-case'),
    },
    {
      id: 'templates',
      title: 'Templates',
      icon: FileText,
      color: 'pink',
      action: () => router.push('/dashboard/templates'),
    },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
      green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
      purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
      orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
      indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
      pink: 'bg-pink-50 text-pink-600 group-hover:bg-pink-100',
    }
    return colors[color] || colors.blue
  }

  const CaseSelector = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Case</label>
      {casesLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading cases...
        </div>
      ) : cases.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">No active cases found.</p>
      ) : (
        <select
          value={selectedCaseId}
          onChange={(e) => setSelectedCaseId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.client_name} v. {c.spouse_name} ({c.status})
            </option>
          ))}
        </select>
      )}
    </div>
  )

  return (
    <>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick Actions</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={action.action}
                className="group bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all text-center"
              >
                <div className={`inline-flex p-3 rounded-lg ${getColorClasses(action.color)} transition-colors mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-sm text-gray-900 group-hover:text-gray-700">
                  {action.title}
                </h3>
              </button>
            )
          })}
        </div>
      </div>

      {/* Upload Document Modal */}
      <Dialog open={activeModal === 'upload'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Select a case and upload files.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <CaseSelector />
            {selectedCaseId && (
              <DocumentUpload
                caseId={selectedCaseId}
                onUploadComplete={() => {
                  showToast('Document uploaded successfully')
                  closeModal()
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Court Date Modal */}
      <Dialog open={activeModal === 'court-date'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Court Date</DialogTitle>
            <DialogDescription>Schedule a court hearing for a case.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <CaseSelector />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={courtDateForm.title}
                onChange={(e) => setCourtDateForm({ ...courtDateForm, title: e.target.value })}
                placeholder="e.g. Status Conference"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={courtDateForm.date}
                  onChange={(e) => setCourtDateForm({ ...courtDateForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={courtDateForm.time}
                  onChange={(e) => setCourtDateForm({ ...courtDateForm, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={courtDateForm.location}
                onChange={(e) => setCourtDateForm({ ...courtDateForm, location: e.target.value })}
                placeholder="e.g. Superior Court, Dept. 12"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={courtDateForm.notes}
                onChange={(e) => setCourtDateForm({ ...courtDateForm, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCourtDateSubmit}
                disabled={courtDateSaving || !selectedCaseId || !courtDateForm.title || !courtDateForm.date}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {courtDateSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Court Date
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Modal */}
      <Dialog open={activeModal === 'task'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Create a new task for a case.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <CaseSelector />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="e.g. Review financial disclosure"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Describe what needs to be done..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTaskSubmit}
                disabled={taskSaving || !selectedCaseId || !taskForm.title}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {taskSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Task
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Case Modal */}
      <NewCaseModal
        open={activeModal === 'new-case'}
        onOpenChange={(open) => !open && closeModal()}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in ${
          toast.type === 'success' ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />
          }
          <span className="text-sm">{toast.message}</span>
        </div>
      )}
    </>
  )
}
