'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Download, Send, CheckCircle2, XCircle, Clock,
  MessageSquare, PenTool, ArrowLeft, Loader2, Eye,
  ChevronDown, ChevronUp, AlertCircle, RotateCcw,
} from 'lucide-react'
import type {
  SettlementDocument,
  DocumentSignature,
  DocumentReviewComment,
  DocumentVersion,
} from '@/types/settlement'
import {
  SETTLEMENT_DOC_STATUS_INFO,
  SIGNATURE_STATUS_INFO,
  SIGNER_ROLE_INFO,
  COMMENT_TYPE_INFO,
} from '@/types/settlement'

interface Props {
  documentId: string
  onBack?: () => void
}

export default function DocumentDetail({ documentId, onBack }: Props) {
  const [doc, setDoc] = useState<SettlementDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'content' | 'signatures' | 'comments' | 'versions'>('content')
  const [actionLoading, setActionLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentSection, setCommentSection] = useState('')
  const [commentType, setCommentType] = useState<string>('comment')

  const fetchDocument = useCallback(async () => {
    try {
      const res = await fetch(`/api/settlement-documents/${documentId}`)
      if (res.ok) {
        const json = await res.json()
        setDoc(json.data)
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => { fetchDocument() }, [fetchDocument])

  const handleAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/settlement-documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: action, ...extra }),
      })
      if (res.ok) {
        await fetchDocument()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleSignatureUpdate = async (sigId: string, status: string) => {
    setActionLoading(true)
    try {
      await fetch(`/api/settlement-documents/${documentId}/signatures`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_id: sigId, status }),
      })
      await fetchDocument()
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      await fetch(`/api/settlement-documents/${documentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_text: newComment,
          section_key: commentSection || undefined,
          comment_type: commentType,
        }),
      })
      setNewComment('')
      setCommentSection('')
      setCommentType('comment')
      await fetchDocument()
    } catch {
      // Ignore
    }
  }

  const handleResolveComment = async (commentId: string, resolved: boolean) => {
    await fetch(`/api/settlement-documents/${documentId}/comments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: commentId, is_resolved: resolved }),
    })
    await fetchDocument()
  }

  if (loading || !doc) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const statusInfo = SETTLEMENT_DOC_STATUS_INFO[doc.status as keyof typeof SETTLEMENT_DOC_STATUS_INFO]
  const signatures = doc.signatures || []
  const comments = doc.comments || []
  const versions = doc.versions || []
  const renderedSections = (doc.custom_content as Record<string, unknown>)?.rendered_sections as
    { key: string; title: string; content: string }[] || []

  const signedCount = signatures.filter(s => s.status === 'signed').length
  const unresolvedComments = comments.filter(c => !c.is_resolved).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {onBack && (
            <button onClick={onBack} className="mt-1 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{doc.document_title}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusInfo?.bgColor || 'bg-gray-100'} ${statusInfo?.color || 'text-gray-700'}`}>
                {statusInfo?.label || doc.status}
              </span>
              <span className="text-sm text-gray-500">Version {doc.version}</span>
              <span className="text-sm text-gray-500">
                Created {new Date(doc.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {doc.file_path && (
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Download
            </button>
          )}

          {doc.status === 'draft' && (
            <button
              onClick={() => handleAction('submit_review')}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" /> Submit for Review
            </button>
          )}

          {doc.status === 'in_review' && (
            <>
              <button
                onClick={() => handleAction('approve')}
                disabled={actionLoading}
                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
              <button
                onClick={() => {
                  const notes = prompt('Rejection reason:')
                  if (notes) handleAction('reject', { notes })
                }}
                disabled={actionLoading}
                className="px-3 py-1.5 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}

          {doc.status === 'approved' && (
            <button
              onClick={() => handleAction('file')}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" /> Mark as Filed
            </button>
          )}

          {(doc.status === 'in_review' || doc.status === 'rejected') && (
            <button
              onClick={() => handleAction('revert_draft')}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> Back to Draft
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <p className={`text-sm font-medium ${statusInfo?.color || ''}`}>{statusInfo?.label || doc.status}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Signatures</p>
          <p className="text-sm font-medium">{signedCount}/{signatures.length} signed</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Comments</p>
          <p className="text-sm font-medium">{unresolvedComments} unresolved</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Version</p>
          <p className="text-sm font-medium">v{doc.version}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'content', label: 'Content', icon: FileText },
          { key: 'signatures', label: `Signatures (${signatures.length})`, icon: PenTool },
          { key: 'comments', label: `Comments (${comments.length})`, icon: MessageSquare },
          { key: 'versions', label: `Versions (${versions.length})`, icon: Clock },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          {renderedSections.length > 0 ? (
            renderedSections.map(section => (
              <SectionPreview key={section.key} section={section} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No content preview available. Download the document to view.</p>
            </div>
          )}
        </div>
      )}

      {/* Signatures Tab */}
      {activeTab === 'signatures' && (
        <div className="space-y-4">
          {signatures.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No signers added yet.</p>
          ) : (
            <div className="space-y-3">
              {signatures.map(sig => (
                <SignatureCard
                  key={sig.id}
                  signature={sig}
                  onUpdate={(status) => handleSignatureUpdate(sig.id, status)}
                  disabled={actionLoading}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          {/* Add comment form */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment or suggestion..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex items-center gap-3">
              <select
                value={commentType}
                onChange={e => setCommentType(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="comment">Comment</option>
                <option value="suggestion">Suggestion</option>
                <option value="question">Question</option>
                <option value="approval">Approval</option>
                <option value="rejection">Rejection</option>
              </select>
              <input
                type="text"
                value={commentSection}
                onChange={e => setCommentSection(e.target.value)}
                placeholder="Section (optional)"
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex-1"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Add Comment
              </button>
            </div>
          </div>

          {comments.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map(comment => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onResolve={(resolved) => handleResolveComment(comment.id, resolved)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Versions Tab */}
      {activeTab === 'versions' && (
        <div className="space-y-3">
          {versions.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No version history.</p>
          ) : (
            versions.map((version: DocumentVersion) => (
              <div key={version.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Version {version.version_number}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                  </div>
                  {version.change_summary && (
                    <p className="text-sm text-gray-600">{version.change_summary}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Sub-components

function SectionPreview({ section }: { section: { key: string; title: string; content: string } }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = section.content.length > 200

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-t-lg text-left"
      >
        <span className="text-sm font-medium text-gray-900">{section.title}</span>
        {isLong && (expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
      </button>
      <div className={`p-3 text-sm text-gray-700 whitespace-pre-wrap ${
        !expanded && isLong ? 'max-h-24 overflow-hidden' : ''
      }`}>
        {section.content}
      </div>
      {!expanded && isLong && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Show more...
          </button>
        </div>
      )}
    </div>
  )
}

function SignatureCard({
  signature,
  onUpdate,
  disabled,
}: {
  signature: DocumentSignature
  onUpdate: (status: string) => void
  disabled: boolean
}) {
  const roleInfo = SIGNER_ROLE_INFO[signature.signer_role as keyof typeof SIGNER_ROLE_INFO]
  const statusInfo = SIGNATURE_STATUS_INFO[signature.status as keyof typeof SIGNATURE_STATUS_INFO]

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          signature.status === 'signed' ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          {signature.status === 'signed' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <PenTool className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{signature.signer_name}</p>
          <p className="text-xs text-gray-500">
            {roleInfo?.label || signature.signer_role}
            {signature.signer_email && ` · ${signature.signer_email}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusInfo?.bgColor || 'bg-gray-100'} ${statusInfo?.color || 'text-gray-600'}`}>
          {statusInfo?.label || signature.status}
        </span>

        {signature.status === 'pending' && (
          <div className="flex gap-1">
            <button
              onClick={() => onUpdate('sent')}
              disabled={disabled}
              className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
            >
              Send
            </button>
            <button
              onClick={() => onUpdate('signed')}
              disabled={disabled}
              className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
            >
              Mark Signed
            </button>
          </div>
        )}

        {signature.status === 'sent' && (
          <button
            onClick={() => onUpdate('signed')}
            disabled={disabled}
            className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
          >
            Mark Signed
          </button>
        )}

        {signature.signed_at && (
          <span className="text-xs text-gray-500">
            {new Date(signature.signed_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}

function CommentCard({
  comment,
  onResolve,
}: {
  comment: DocumentReviewComment
  onResolve: (resolved: boolean) => void
}) {
  const typeInfo = COMMENT_TYPE_INFO[comment.comment_type as keyof typeof COMMENT_TYPE_INFO]

  return (
    <div className={`border rounded-lg p-4 ${
      comment.is_resolved ? 'border-gray-100 bg-gray-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
            {comment.author_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{comment.author_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo?.bgColor || 'bg-gray-100'} ${typeInfo?.color || 'text-gray-600'}`}>
                {typeInfo?.label || comment.comment_type}
              </span>
              {comment.section_key && (
                <span className="text-xs text-gray-400">on {comment.section_key}</span>
              )}
            </div>
            <p className={`text-sm mt-1 ${comment.is_resolved ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              {comment.comment_text}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(comment.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <button
          onClick={() => onResolve(!comment.is_resolved)}
          className={`text-xs px-2 py-1 rounded ${
            comment.is_resolved
              ? 'text-gray-500 hover:bg-gray-100'
              : 'text-green-600 hover:bg-green-50'
          }`}
        >
          {comment.is_resolved ? 'Unresolve' : 'Resolve'}
        </button>
      </div>
    </div>
  )
}
