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
} from 'lucide-react'
import { Document } from '@/types/documents'

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

interface DocumentPreviewModalProps {
  document: Document
  allDocuments?: Document[]
  onClose: () => void
  onUpdate: () => void
  onNavigate?: (doc: Document) => void
  userRole: string
}

export default function DocumentPreviewModal({ 
  document, 
  allDocuments = [],
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
  const [toast, setToast] = useState<string | null>(null)
  
  // Image specific states
  const [imageRotation, setImageRotation] = useState(0)
  const [imageScale, setImageScale] = useState(1.0)

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

              {userRole === 'admin' && (
                <>
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
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Document
                  </button>
                </>
              )}
            </div>

            {/* Activity Feed */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity & Comments</h3>
              <div className="space-y-4">
                {activity.map((item) => (
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
                ))}
              </div>
            </div>

            {/* Add Comment */}
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