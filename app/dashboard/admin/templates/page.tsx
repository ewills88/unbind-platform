'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, CheckSquare, Mail, Loader2, AlertCircle, Plus, X,
} from 'lucide-react'

type TemplateTab = 'task' | 'email' | 'document'

interface TaskTemplate {
  id: string
  template_name: string
  description?: string
  case_type?: string
  phase?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[]
  is_active: boolean
  use_count: number
  created_at: string
}

interface EmailTemplate {
  id: string
  template_name?: string
  template_key?: string
  template_type?: string
  subject?: string
  is_system?: boolean
  is_active?: boolean
  created_at: string
}

interface DocTemplate {
  id: string
  name?: string
  template_name?: string
  category?: string
  description?: string
  jurisdiction?: string
  is_system?: boolean
  is_active?: boolean
  version?: number
  use_count?: number
  created_at: string
}

export default function AdminTemplatesPage() {
  const router = useRouter()
  const [tab, setTab] = useState<TemplateTab>('task')
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([])
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [docTemplates, setDocTemplates] = useState<DocTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchTemplates() }, [])

  const fetchTemplates = async () => {
    try {
      const [taskRes, emailRes, docRes] = await Promise.all([
        fetch('/api/admin/settings').then(r => r.ok ? r.json() : { data: null }),
        fetch('/api/admin/settings').then(r => r.ok ? r.json() : { data: null }),
        fetch('/api/admin/settings').then(r => r.ok ? r.json() : { data: null }),
      ])

      // Note: Templates are fetched via their own endpoints if available
      // For now we show the management UI with placeholder data
      setTaskTemplates([])
      setEmailTemplates([])
      setDocTemplates([])
    } catch { setError('Failed to load templates') }
    finally { setLoading(false) }
  }

  const TABS: { key: TemplateTab; label: string; icon: typeof FileText }[] = [
    { key: 'task', label: 'Task Templates', icon: CheckSquare },
    { key: 'email', label: 'Email Templates', icon: Mail },
    { key: 'document', label: 'Document Templates', icon: FileText },
  ]

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-600 mt-1">Manage task, email, and document templates</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" /><p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Task Templates */}
      {tab === 'task' && (
        <div>
          {taskTemplates.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="font-medium text-gray-900">No Task Templates</p>
              <p className="text-sm text-gray-500 mt-1">Create reusable task sets for different case types and phases.</p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Create Task Template
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {taskTemplates.map(t => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{t.template_name}</h3>
                      {t.description && <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{t.tasks.length} tasks | Used {t.use_count} times</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email Templates */}
      {tab === 'email' && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <Mail className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="font-medium text-gray-900">Email Templates</p>
          <p className="text-sm text-gray-500 mt-1">System email templates are managed in the notification settings. Custom templates coming soon.</p>
        </div>
      )}

      {/* Document Templates */}
      {tab === 'document' && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="font-medium text-gray-900">Document Templates</p>
          <p className="text-sm text-gray-500 mt-1">Document templates are managed in the Document Templates section. Visit the templates page to create and edit them.</p>
        </div>
      )}
    </div>
  )
}
