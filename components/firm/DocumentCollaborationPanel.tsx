'use client'

import { useState, useEffect } from 'react'
import {
  MessageSquare,
  History,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import {
  DocumentComment,
  DocCommentType,
  DOC_COMMENT_TYPE_INFO,
  DocumentVersionCollab,
  formatRelativeTime,
} from '@/types/collaboration'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface DocumentCollaborationPanelProps {
  documentId: string
}

export default function DocumentCollaborationPanel({
  documentId,
}: DocumentCollaborationPanelProps) {
  const [comments, setComments] = useState<DocumentComment[]>([])
  const [versions, setVersions] = useState<DocumentVersionCollab[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [documentId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [commentsRes, versionsRes] = await Promise.all([
        authFetch(`/api/documents/${documentId}/comments`),
        authFetch(`/api/documents/${documentId}/versions`),
      ])
      const commentsData = await commentsRes.json()
      const versionsData = await versionsRes.json()
      setComments(commentsData.comments || [])
      setVersions(versionsData.versions || [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <Tabs defaultValue="comments">
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comments" className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Comments ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="versions" className="flex items-center gap-1.5">
              <History className="w-4 h-4" />
              Versions ({versions.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-6">
          <TabsContent value="comments">
            <DocumentCommentsTab
              documentId={documentId}
              comments={comments}
              onCommentAdded={loadData}
            />
          </TabsContent>

          <TabsContent value="versions">
            <DocumentVersionsTab versions={versions} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function DocumentCommentsTab({
  documentId,
  comments,
  onCommentAdded,
}: {
  documentId: string
  comments: DocumentComment[]
  onCommentAdded: () => void
}) {
  const [newComment, setNewComment] = useState('')
  const [commentType, setCommentType] = useState<DocCommentType>('comment')
  const [posting, setPosting] = useState(false)

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setPosting(true)
    try {
      const res = await authFetch(`/api/documents/${documentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          comment_type: commentType,
        }),
      })
      if (res.ok) {
        setNewComment('')
        onCommentAdded()
      }
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Add comment */}
      <div className="space-y-3 pb-4 border-b border-gray-200">
        <div className="flex gap-2">
          <select
            value={commentType}
            onChange={(e) => setCommentType(e.target.value as DocCommentType)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {(
              Object.entries(DOC_COMMENT_TYPE_INFO) as [
                DocCommentType,
                typeof DOC_COMMENT_TYPE_INFO[DocCommentType]
              ][]
            ).map(([type, info]) => (
              <option key={type} value={type}>
                {info.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim() || posting}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Comment'}
          </button>
        </div>
      </div>

      {/* Comments list */}
      {comments.length > 0 ? (
        comments.map((comment) => (
          <CommentCard key={comment.id} comment={comment} documentId={documentId} onReplyAdded={onCommentAdded} />
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="mx-auto mb-2 w-10 h-10 text-gray-300" />
          <p className="text-sm">No comments yet</p>
        </div>
      )}
    </div>
  )
}

function CommentCard({
  comment,
  documentId,
  onReplyAdded,
}: {
  comment: DocumentComment
  documentId: string
  onReplyAdded: () => void
}) {
  const [isReplying, setIsReplying] = useState(false)
  const [reply, setReply] = useState('')
  const [replyPosting, setReplyPosting] = useState(false)

  const typeInfo = DOC_COMMENT_TYPE_INFO[comment.comment_type]

  const handleReply = async () => {
    if (!reply.trim()) return
    setReplyPosting(true)
    try {
      const res = await authFetch(`/api/documents/${documentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: reply,
          parent_comment_id: comment.id,
          comment_type: 'comment',
        }),
      })
      if (res.ok) {
        setReply('')
        setIsReplying(false)
        onReplyAdded()
      }
    } finally {
      setReplyPosting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-xs">
            {(comment.author?.full_name || '?')[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-gray-900">
              {comment.author?.full_name || 'Unknown'}
            </span>
            <span className={`px-1.5 py-0.5 text-xs rounded ${typeInfo.color} ${typeInfo.bgColor}`}>
              {typeInfo.label}
            </span>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>
          <p className="text-sm text-gray-700">{comment.content}</p>

          {comment.resolved_at && (
            <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              Resolved
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 ml-2 space-y-2 border-l-2 border-gray-200 pl-3">
              {comment.replies.map((r) => (
                <div key={r.id} className="text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900">
                      {r.author?.full_name || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(r.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-700">{r.content}</p>
                </div>
              ))}
            </div>
          )}

          {!isReplying ? (
            <button
              onClick={() => setIsReplying(true)}
              className="mt-1 text-xs text-gray-500 hover:text-blue-600"
            >
              Reply
            </button>
          ) : (
            <div className="mt-2 space-y-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Reply..."
                rows={2}
                autoFocus
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReply}
                  disabled={!reply.trim() || replyPosting}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  Reply
                </button>
                <button
                  onClick={() => { setIsReplying(false); setReply('') }}
                  className="px-3 py-1 text-xs text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DocumentVersionsTab({
  versions,
}: {
  versions: DocumentVersionCollab[]
}) {
  return (
    <div className="space-y-3">
      {versions.length > 0 ? (
        versions.map((version) => (
          <div
            key={version.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  Version {version.version_number}
                </span>
                <span className="text-xs text-gray-500">
                  by {version.creator?.full_name || 'Unknown'}
                </span>
              </div>
              {version.change_summary && (
                <p className="text-xs text-gray-600 mt-0.5">
                  {version.change_summary}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {formatRelativeTime(version.created_at)}
              </p>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          <History className="mx-auto mb-2 w-10 h-10 text-gray-300" />
          <p className="text-sm">No version history yet</p>
        </div>
      )}
    </div>
  )
}
