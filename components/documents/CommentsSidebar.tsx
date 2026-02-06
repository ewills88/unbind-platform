'use client'

import { useState, useEffect, useRef } from 'react'
import {
  MessageSquare, Send, Check, X, Reply, MoreHorizontal,
  Trash2, Edit2, ChevronDown, ChevronUp
} from 'lucide-react'
import { DocumentComment, formatVersionDate } from '@/types/document-collaboration'

interface CommentsSidebarProps {
  caseId: string
  documentId: string
  currentUserId: string
  isAttorney: boolean
}

export default function CommentsSidebar({
  caseId,
  documentId,
  currentUserId,
  isAttorney
}: CommentsSidebarProps) {
  const [comments, setComments] = useState<DocumentComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showResolved, setShowResolved] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    fetchComments()
  }, [caseId, documentId, showResolved])

  async function fetchComments() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/comments?include_resolved=${showResolved}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }

      const data = await response.json()
      setComments(data.comments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  async function submitComment(parentId?: string) {
    const content = parentId ? (document.getElementById(`reply-${parentId}`) as HTMLTextAreaElement)?.value : newComment
    if (!content?.trim()) return

    try {
      setSubmitting(true)
      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            parent_comment_id: parentId
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to post comment')
      }

      if (parentId) {
        setReplyingTo(null)
      } else {
        setNewComment('')
      }

      await fetchComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  async function resolveComment(commentId: string, resolve: boolean) {
    try {
      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/comments`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comment_id: commentId,
            action: resolve ? 'resolve' : 'unresolve'
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update comment')
      }

      await fetchComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment')
    }
  }

  async function deleteComment(commentId: string) {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/comments?comment_id=${commentId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete comment')
      }

      await fetchComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  async function updateComment(commentId: string) {
    if (!editContent.trim()) return

    try {
      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/comments`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comment_id: commentId,
            action: 'edit',
            content: editContent.trim()
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update comment')
      }

      setEditingId(null)
      setEditContent('')
      await fetchComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment')
    }
  }

  const unresolvedCount = comments.filter(c => !c.resolved).length

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-900">Comments</span>
            {unresolvedCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {unresolvedCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showResolved ? 'Hide' : 'Show'} resolved
          </button>
        </div>
      </div>

      {/* New Comment Input */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg resize-none
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => submitComment()}
            disabled={!newComment.trim() || submitting}
            className="absolute right-2 bottom-2 p-1.5 text-blue-600 hover:bg-blue-50
                     rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : comments.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {comments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                isAttorney={isAttorney}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                editingId={editingId}
                setEditingId={setEditingId}
                editContent={editContent}
                setEditContent={setEditContent}
                onSubmitReply={submitComment}
                onResolve={resolveComment}
                onDelete={deleteComment}
                onUpdate={updateComment}
                submitting={submitting}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface CommentThreadProps {
  comment: DocumentComment
  currentUserId: string
  isAttorney: boolean
  replyingTo: string | null
  setReplyingTo: (id: string | null) => void
  editingId: string | null
  setEditingId: (id: string | null) => void
  editContent: string
  setEditContent: (content: string) => void
  onSubmitReply: (parentId: string) => void
  onResolve: (id: string, resolve: boolean) => void
  onDelete: (id: string) => void
  onUpdate: (id: string) => void
  submitting: boolean
}

function CommentThread({
  comment,
  currentUserId,
  isAttorney,
  replyingTo,
  setReplyingTo,
  editingId,
  setEditingId,
  editContent,
  setEditContent,
  onSubmitReply,
  onResolve,
  onDelete,
  onUpdate,
  submitting
}: CommentThreadProps) {
  const [showReplies, setShowReplies] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isOwner = comment.created_by === currentUserId
  const canDelete = isOwner || isAttorney
  const canEdit = isOwner

  return (
    <div className={`p-4 ${comment.resolved ? 'bg-gray-50 opacity-75' : ''}`}>
      {/* Main Comment */}
      <div className="flex gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-blue-600">
            {comment.created_by_user?.full_name?.charAt(0) || '?'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {comment.created_by_user?.full_name || 'Unknown'}
              </span>
              <span className="text-xs text-gray-500">
                {formatVersionDate(comment.created_at)}
              </span>
              {comment.resolved && (
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                  Resolved
                </span>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200
                              rounded-lg shadow-lg z-10">
                  {!comment.resolved ? (
                    <button
                      onClick={() => { onResolve(comment.id, true); setShowMenu(false) }}
                      className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50
                               flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Resolve
                    </button>
                  ) : (
                    <button
                      onClick={() => { onResolve(comment.id, false); setShowMenu(false) }}
                      className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50
                               flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Unresolve
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditingId(comment.id)
                        setEditContent(comment.content)
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50
                               flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => { onDelete(comment.id); setShowMenu(false) }}
                      className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50
                               flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {editingId === comment.id ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onUpdate(comment.id)}
                  className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg
                           hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingId(null); setEditContent('') }}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg
                           hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}

          {!comment.resolved && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="mt-2 text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
          )}
        </div>
      </div>

      {/* Reply Input */}
      {replyingTo === comment.id && (
        <div className="ml-11 mt-3">
          <textarea
            id={`reply-${comment.id}`}
            placeholder="Write a reply..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onSubmitReply(comment.id)}
              disabled={submitting}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg
                       hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Reply'}
            </button>
            <button
              onClick={() => setReplyingTo(null)}
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg
                       hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 mt-3">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
          >
            {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </button>

          {showReplies && (
            <div className="space-y-3 border-l-2 border-gray-100 pl-3">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-2">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-gray-600">
                      {reply.created_by_user?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-900">
                        {reply.created_by_user?.full_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatVersionDate(reply.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">
                      {reply.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
