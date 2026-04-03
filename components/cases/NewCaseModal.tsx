'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { getAllStates } from '@/lib/data/stateRules'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const allStates = getAllStates()

interface NewCaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCaseCreated?: () => void
}

export default function NewCaseModal({ open, onOpenChange, onCaseCreated }: NewCaseModalProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    clientName: '',
    spouseName: '',
    state: 'MI',
    caseType: 'dissolution',
    status: 'consultation',
    notes: '',
  })

  const resetForm = () => {
    setForm({
      clientName: '',
      spouseName: '',
      state: 'MI',
      caseType: 'dissolution',
      status: 'consultation',
      notes: '',
    })
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!form.clientName.trim()) {
      setError('Client name is required')
      return
    }
    if (!form.spouseName.trim()) {
      setError('Spouse name is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get firm_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', user.id)
        .single()

      const { data, error: insertError } = await supabase
        .from('cases')
        .insert({
          attorney_id: user.id,
          firm_id: profile?.firm_id || null,
          client_name: form.clientName.trim(),
          spouse_name: form.spouseName.trim(),
          state: form.state,
          case_type: form.caseType,
          status: form.status,
          current_step: 'Initial consultation',
          progress_percentage: 0,
          notes: form.notes.trim() || null,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      handleClose()
      onCaseCreated?.()
      router.push(`/dashboard/cases/${data.id}`)
    } catch (err) {
      console.error('Error creating case:', err)
      setError(err instanceof Error ? err.message : 'Failed to create case')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
          <DialogDescription>Enter the case details to get started.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
              <input
                type="text"
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="e.g. Jane Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Name *</label>
              <input
                type="text"
                value={form.spouseName}
                onChange={(e) => setForm({ ...form, spouseName: e.target.value })}
                placeholder="e.g. John Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {allStates.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
              <select
                value={form.caseType}
                onChange={(e) => setForm({ ...form, caseType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="dissolution">Dissolution of Marriage</option>
                <option value="legal_separation">Legal Separation</option>
                <option value="annulment">Annulment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="consultation">Consultation</option>
              <option value="active">Active</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any initial notes about this case..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.clientName.trim() || !form.spouseName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Case
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
