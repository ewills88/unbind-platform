'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  X,
  Download,
  MessageSquare,
  Send,
  Eye,
  Share2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Edit3,
  Archive,
  ArchiveRestore,
  Check,
  XCircle,
  Sparkles,
  History,
  Link2,
} from 'lucide-react'
import { Document, DOCUMENT_CATEGORIES } from '@/types/documents'
import DocumentAIInsights from './DocumentAIInsights'
import DocumentRelationships from './DocumentRelationships'
import DocumentTagEditor from './DocumentTagEditor'

const supabase = createClient(
  'https://rpbjravqgflidnwjkgvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'
)

interface Activity {
  id: string
  user_id: string
  activity_type: string
  comment: string | null
  created_at: string
  user: {
    full_name: string
  }
}

interface Case {
  id: string
  client_name: string
  spouse_name: string
}

interface DocumentPreviewModalProps {
  document: Document
  allDocuments?: Document[]
  cases?: Case[]
  onClose: () => void
  onUpdate: () => void
  onNavigate?: (doc: Document) => void
  userRole: string
}

export default function DocumentPreviewModal({
  document,
  allDocuments = [],
  cases = [],
  onClose,
  onUpdate,
  onNavigate,
  userRole
}: DocumentPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(document.is_shared_with_client)
  const [archived, setArchived] = useState(document.is_archived || false)
  const [toast, setToast] = useState<string | null>(null)

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false)
  const [editCategory, setEditCategory] = useState<string>(document.category || '')
  const [editCaseId, setEditCaseId] = useState<string>(document.case_id)
  const [saving, setSaving] = useState(false)

  // Image specific states
  const [imageRotation, setImageRotation] = useState(0)
  const [imageScale, setImageScale] = useState(1.0)

  // Sidebar tab state
  const [activeTab, setActiveTab] = useState<'activity' | 'ai' | 'relations'>('activity')

  const isPDF = document.mime_type === 'application/pdf'
  const isImage = document.mime_type.startsWith('image/')
  
  const currentIndex = allDocuments.findIndex(d => d.id === document.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allDocuments.length - 1

  useEffect(() => {
    loadPreview()
    loadActivity()
    logView()
    
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        handlePrevDocument()
      } else if (e.key === 'ArrowRight' && hasNext) {
        handleNextDocument()
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn()
      } else if (e.key === '-') {
        handleZoomOut()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [document.id])

  const loadPreview = async () => {
    try {
      const { data } = await supabase.storage
        .from('case-documents')
        .createSignedUrl(document.storage_path, 3600)

      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl)
      }
    } catch (error) {
      console.error('Error loading preview:', error)
      showToast('Failed to load preview')
    } finally {
      setLoading(false)
    }
  }

  const loadActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('document_activity')
        .select(`
          *,
          user:user_id(full_name)
        `)
        .eq('document_id', document.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setActivity(data || [])
    } catch (error) {
      console.error('Error loading activity:', error)
    }
  }

  const logView = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('document_activity')
        .insert({
          document_id: document.id,
          user_id: user.id,
          activity_type: 'viewed',
        })

      await supabase
        .from('documents')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', document.id)
    } catch (error) {
      console.error('Error logging view:', error)
    }
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const handleDownload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      showToast(`Downloading ${document.original_filename}...`)

      const { data, error } = await supabase.storage
        .from('case-documents')
        .download(document.storage_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = window.document.createElement('a')
      a.href = url
      a.download = document.original_filename
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      URL.revokeObjectURL(url)

      await supabase
        .from('document_activity')
        .insert({
          document_id: document.id,
          user_id: user.id,
          activity_type: 'downloaded',
        })

      loadActivity()
      showToast('Download complete!')
    } catch (error) {
      console.error('Error downloading:', error)
      showToast('Download failed')
    }
  }

  const handlePrint = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank')
      showToast('Opening in new tab for printing')
    }
  }

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank')
    }
  }

  const handleAddComment = async () => {
    if (!comment.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('document_activity')
        .insert({
          document_id: document.id,
          user_id: user.id,
          activity_type: 'comment',
          comment: comment.trim(),
        })

      setComment('')
      loadActivity()
      showToast('Comment added')
    } catch (error) {
      console.error('Error adding comment:', error)
      showToast('Failed to add comment')
    }
  }

  const handleToggleShare = async () => {
    try {
      const newShareState = !sharing

      const { error } = await supabase
        .from('documents')
        .update({ is_shared_with_client: newShareState })
        .eq('id', document.id)

      if (error) throw error

      setSharing(newShareState)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('document_activity')
          .insert({
            document_id: document.id,
            user_id: user.id,
            activity_type: 'shared',
            comment: newShareState ? 'Shared with client' : 'Unshared with client',
          })
      }

      loadActivity()
      onUpdate()
      showToast(newShareState ? 'Document shared with client' : 'Document unshared')
    } catch (error) {
      console.error('Error toggling share:', error)
      showToast('Failed to update sharing')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      return
    }

    try {
      await supabase.storage
        .from('case-documents')
        .remove([document.storage_path])

      await supabase
        .from('documents')
        .delete()
        .eq('id', document.id)

      showToast('Document deleted')
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error deleting document:', error)
      showToast('Failed to delete document')
    }
  }

  const handleSaveChanges = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const updates: Record<string, unknown> = {}
      const activityComments: string[] = []

      // Check for category change
      if (editCategory !== (document.category || '')) {
        updates.category = editCategory || null
        const oldCat = DOCUMENT_CATEGORIES.find(c => c.value === document.category)?.label || 'None'
        const newCat = DOCUMENT_CATEGORIES.find(c => c.value === editCategory)?.label || 'None'
        activityComments.push(`Category changed from "${oldCat}" to "${newCat}"`)
      }

      // Check for case change
      if (editCaseId !== document.case_id) {
        updates.case_id = editCaseId
        activityComments.push('Moved to different case')
      }

      if (Object.keys(updates).length === 0) {
        setIsEditing(false)
        return
      }

      const { error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', document.id)

      if (error) throw error

      // Log activity
      if (activityComments.length > 0) {
        await supabase
          .from('document_activity')
          .insert({
            document_id: document.id,
            user_id: user.id,
            activity_type: 'updated',
            comment: activityComments.join('; '),
          })
      }

      setIsEditing(false)
      loadActivity()
      onUpdate()
      showToast('Changes saved')
    } catch (error) {
      console.error('Error saving changes:', error)
      showToast('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditCategory(document.category || '')
    setEditCaseId(document.case_id)
    setIsEditing(false)
  }

  const handleToggleArchive = async () => {
    try {
      const newArchiveState = !archived

      const updates: Record<string, unknown> = {
        is_archived: newArchiveState,
        archived_at: newArchiveState ? new Date().toISOString() : null,
      }

      const { error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', document.id)

      if (error) throw error

      setArchived(newArchiveState)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('document_activity')
          .insert({
            document_id: document.id,
            user_id: user.id,
            activity_type: newArchiveState ? 'archived' : 'restored',
            comment: newArchiveState ? 'Document archived' : 'Document restored from archive',
          })
      }

      loadActivity()
      onUpdate()
      showToast(newArchiveState ? 'Document archived' : 'Document restored')
    } catch (error) {
      console.error('Error toggling archive:', error)
      showToast('Failed to update archive status')
    }
  }

  const handlePrevDocument = () => {
    if (hasPrev && onNavigate) {
      onNavigate(allDocuments[currentIndex - 1])
    }
  }

  const handleNextDocument = () => {
    if (hasNext && onNavigate) {
      onNavigate(allDocuments[currentIndex + 1])
    }
  }

  const handleZoomIn = () => {
    if (isImage) {
      setImageScale(prev => Math.min(prev + 0.2, 3.0))
    }
  }

  const handleZoomOut = () => {
    if (isImage) {
      setImageScale(prev => Math.max(prev - 0.2, 0.5))
    }
  }

  const handleRotate = () => {
    setImageRotation(prev => (prev + 90) % 360)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return date.toLocaleDateString()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'viewed': return <Eye className="w-4 h-4 text-blue-600" />
      case 'downloaded': return <Download className="w-4 h-4 text-green-600" />
      case 'comment': return <MessageSquare className="w-4 h-4 text-purple-600" />
      case 'shared': return <Share2 className="w-4 h-4 text-orange-600" />
      case 'updated': return <Edit3 className="w-4 h-4 text-indigo-600" />
      case 'archived': return <Archive className="w-4 h-4 text-amber-600" />
      case 'restored': return <ArchiveRestore className="w-4 h-4 text-emerald-600" />
      default: return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {allDocuments.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevDocument}
                  disabled={!hasPrev}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous document (←)"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextDocument}
                  disabled={!hasNext}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next document (→)"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{document.original_filename}</h2>
              <p className="text-sm text-gray-500">
                {document.description} • {(document.file_size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Preview Area */}
          <div className="flex-1 bg-gray-50 overflow-auto relative">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : isPDF && previewUrl ? (
              <div className="h-full flex flex-col">
                {/* PDF Controls */}
                <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-center gap-4">
                  <button
                    onClick={handleOpenInNewTab}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>

                {/* PDF Viewer */}
                <iframe
                  src={`${previewUrl}#view=FitH`}
                  className="w-full flex-1 border-0"
                  title={document.original_filename}
                />
              </div>
            ) : isImage && previewUrl ? (
              <div className="flex flex-col items-center justify-center h-full p-6">
                {/* Image Controls */}
                <div className="mb-4 flex items-center gap-4 bg-white rounded-lg shadow-sm p-3">
                  <button
                    onClick={handleZoomOut}
                    className="p-2 rounded hover:bg-gray-100"
                    title="Zoom out (-)"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium">{Math.round(imageScale * 100)}%</span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 rounded hover:bg-gray-100"
                    title="Zoom in (+)"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-gray-300" />
                  <button
                    onClick={handleRotate}
                    className="p-2 rounded hover:bg-gray-100"
                    title="Rotate"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-auto max-h-full">
                  <img
                    src={previewUrl}
                    alt={document.original_filename}
                    className="max-w-full h-auto"
                    style={{
                      transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                      transition: 'transform 0.2s',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="mb-4">Preview not available for this file type</p>
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Download to View
                </button>
              </div>
            )}
          </div>

          {/* Sidebar - Activity & Comments */}
          <div className="w-96 border-l border-gray-200 flex flex-col">
            {/* Actions */}
            <div className="p-4 border-b border-gray-200 space-y-2">
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>

              {(userRole === 'admin' || userRole === 'attorney') && (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isEditing
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    {isEditing ? 'Editing...' : 'Edit Details'}
                  </button>

                  <button
                    onClick={handleToggleShare}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      sharing
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    {sharing ? 'Shared with Client' : 'Share with Client'}
                  </button>

                  <button
                    onClick={handleToggleArchive}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      archived
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {archived ? (
                      <>
                        <ArchiveRestore className="w-4 h-4" />
                        Restore from Archive
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4" />
                        Archive Document
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Document
                  </button>
                </>
              )}
            </div>

            {/* Edit Panel */}
            {isEditing && (userRole === 'admin' || userRole === 'attorney') && (
              <div className="p-4 border-b border-gray-200 bg-blue-50 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Edit Document</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">No category</option>
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/analyze-document`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              document_id: document.id,
                              analysis_type: 'categorize'
                            })
                          })
                          if (res.ok) {
                            const data = await res.json()
                            if (data.category) {
                              setEditCategory(data.category)
                              setToast(`AI suggests: ${DOCUMENT_CATEGORIES.find(c => c.value === data.category)?.label || data.category} (${Math.round((data.confidence || 0) * 100)}% confident)`)
                            }
                          }
                        } catch {
                          setToast('AI classification failed')
                        }
                      }}
                      className="px-3 py-2 text-xs font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors whitespace-nowrap flex items-center gap-1"
                      title="Ask AI to suggest a category"
                    >
                      <Sparkles className="w-3 h-3" />
                      AI Suggest
                    </button>
                  </div>
                  {document.ai_category && document.ai_confidence && (
                    <p className="text-xs text-gray-500 mt-1">
                      AI previously suggested: {DOCUMENT_CATEGORIES.find(c => c.value === document.ai_category)?.label || document.ai_category}
                      {' '}({Math.round(document.ai_confidence * 100)}% confident)
                    </p>
                  )}
                </div>

                {cases.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign to Case
                    </label>
                    <select
                      value={editCaseId}
                      onChange={(e) => setEditCaseId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      {cases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.client_name} v. {c.spouse_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 text-sm font-medium"
                  >
                    <Check className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Tags Section */}
            <div className="p-4 border-b border-gray-200">
              <DocumentTagEditor
                documentId={document.id}
                onTagsChange={onUpdate}
              />
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'activity'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <History className="w-4 h-4" />
                Activity
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'ai'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI
              </button>
              <button
                onClick={() => setActiveTab('relations')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'relations'
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Link2 className="w-4 h-4" />
                Links
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'activity' && (
                <>
                  {/* Activity Feed */}
                  <div className="p-4">
                    <div className="space-y-4">
                      {activity.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
                      ) : (
                        activity.map((item) => (
                          <div key={item.id} className="flex gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getActivityIcon(item.activity_type)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {item.user?.full_name || 'Unknown User'}
                              </p>
                              {item.comment ? (
                                <p className="text-sm text-gray-700 mt-1">{item.comment}</p>
                              ) : (
                                <p className="text-sm text-gray-500 mt-1 capitalize">{item.activity_type}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">{formatDate(item.created_at)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'ai' && (
                /* AI Insights Tab */
                <div className="p-4">
                  <DocumentAIInsights
                    documentId={document.id}
                    fileUrl={previewUrl || ''}
                    filename={document.original_filename}
                    mimeType={document.mime_type}
                    onAnalysisComplete={onUpdate}
                  />
                </div>
              )}

              {activeTab === 'relations' && (
                /* Document Relationships Tab */
                <div className="p-4">
                  <DocumentRelationships
                    documentId={document.id}
                    caseId={document.case_id}
                    onNavigateToDocument={(docId) => {
                      const targetDoc = allDocuments.find(d => d.id === docId)
                      if (targetDoc && onNavigate) {
                        onNavigate(targetDoc)
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Add Comment - Only show on Activity tab */}
            {activeTab === 'activity' && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!comment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-center gap-6">
          <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">Esc</kbd> Close</span>
          {allDocuments.length > 1 && (
            <>
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">←</kbd> Previous</span>
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">→</kbd> Next</span>
            </>
          )}
          {isImage && (
            <>
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">+</kbd> Zoom In</span>
              <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">-</kbd> Zoom Out</span>
            </>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}