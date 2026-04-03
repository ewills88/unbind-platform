'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState, useEffect } from 'react'
import {
  Lock,
  HelpCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Target,
  Clock,
  Pin,
  MoreVertical,
  MessageCircle,
  MessageSquare,
  Loader2,
  AtSign,
} from 'lucide-react'
import {
  InternalCaseNote,
  InternalNoteType,
  NOTE_TYPE_CONFIG,
  formatRelativeTime,
} from '@/types/collaboration'

const NOTE_TYPE_ICONS: Record<InternalNoteType, React.ReactNode> = {
  question: <HelpCircle className="w-3.5 h-3.5" />,
  concern: <AlertTriangle className="w-3.5 h-3.5" />,
  fyi: <Info className="w-3.5 h-3.5" />,
  decision: <CheckCircle className="w-3.5 h-3.5" />,
  strategy: <Target className="w-3.5 h-3.5" />,
  reminder: <Clock className="w-3.5 h-3.5" />,
}

interface TeamMember {
  user_id: string
  profile?: { id: string; full_name: string; email: string }
}

interface InternalNotesPanelProps {
  caseId: string
}

export default function InternalNotesPanel({ caseId }: InternalNotesPanelProps) {
  const [notes, setNotes] = useState<InternalCaseNote[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState<InternalNoteType>('fyi')
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    loadData()
  }, [caseId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [notesRes, membersRes] = await Promise.all([
        authFetch(`/api/cases/${caseId}/internal-notes`),
        authFetch('/api/firms/members'),
      ])
      const notesData = await notesRes.json()
      const membersData = await membersRes.json()
      setNotes(notesData.notes || [])
      setTeamMembers((membersData.members || []).filter((m: TeamMember & { status: string }) => m.status === 'active'))
    } catch {
      // silently fail - component is additive
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setPosting(true)
    try {
      const res = await authFetch(`/api/cases/${caseId}/internal-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNote,
          note_type: noteType,
          mentioned_users: mentionedUsers,
        }),
      })
      if (res.ok) {
        setNewNote('')
        setMentionedUsers([])
        loadData()
      }
    } finally {
      setPosting(false)
    }
  }

  const handleNoteAction = async (noteId: string, action: 'resolve' | 'pin' | 'unpin') => {
    const body: Record<string, unknown> = {}
    if (action === 'resolve') body.resolved = true
    if (action === 'pin') body.pinned = true
    if (action === 'unpin') body.pinned = false

    await authFetch(`/api/internal-notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    loadData()
  }

  const handleTextChange = (value: string) => {
    setNewNote(value)
    // Show mention suggestions when @ is typed
    const lastAtIndex = value.lastIndexOf('@')
    setShowMentions(lastAtIndex >= 0 && lastAtIndex === value.length - 1)
  }

  const addMention = (userId: string, name: string) => {
    setMentionedUsers([...mentionedUsers, userId])
    setNewNote(newNote.replace(/@$/, `@${name} `))
    setShowMentions(false)
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
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-500" />
              Internal Notes
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Team discussions - not visible to clients
            </p>
          </div>
          <span className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Add new note */}
        <div className="space-y-3 pb-6 border-b border-gray-200 mb-6">
          <div className="flex gap-2">
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as InternalNoteType)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {(Object.entries(NOTE_TYPE_CONFIG) as [InternalNoteType, typeof NOTE_TYPE_CONFIG[InternalNoteType]][]).map(
                ([type, config]) => (
                  <option key={type} value={type}>
                    {config.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="relative">
            <textarea
              value={newNote}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Add an internal note... Use @name to mention team members"
              rows={3}
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />

            {showMentions && teamMembers.length > 0 && (
              <div className="absolute bottom-full mb-1 left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                {teamMembers.map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() =>
                      addMention(
                        member.user_id,
                        member.profile?.full_name || member.profile?.email || ''
                      )
                    }
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                  >
                    <AtSign className="w-3.5 h-3.5 text-gray-400" />
                    <span>{member.profile?.full_name || member.profile?.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || posting}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {posting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Add Note'
              )}
            </button>
          </div>
        </div>

        {/* Notes list */}
        <div className="space-y-4">
          {notes.length > 0 ? (
            notes.map((note) => (
              <InternalNoteCard
                key={note.id}
                note={note}
                teamMembers={teamMembers}
                caseId={caseId}
                onAction={handleNoteAction}
                onReplyAdded={loadData}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="mx-auto mb-2 w-12 h-12 text-gray-300" />
              <p className="text-sm font-medium">No internal notes yet</p>
              <p className="text-xs mt-1">Add notes to discuss strategy with your team</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InternalNoteCard({
  note,
  teamMembers,
  caseId,
  onAction,
  onReplyAdded,
}: {
  note: InternalCaseNote
  teamMembers: TeamMember[]
  caseId: string
  onAction: (noteId: string, action: 'resolve' | 'pin' | 'unpin') => void
  onReplyAdded: () => void
}) {
  const [isReplying, setIsReplying] = useState(false)
  const [reply, setReply] = useState('')
  const [replyPosting, setReplyPosting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const config = NOTE_TYPE_CONFIG[note.note_type]
  const authorName = note.author?.full_name || 'Unknown'

  const handleReply = async () => {
    if (!reply.trim()) return
    setReplyPosting(true)
    try {
      const res = await authFetch(`/api/cases/${caseId}/internal-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: reply,
          parent_note_id: note.id,
          note_type: 'fyi',
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

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()

  return (
    <div
      className={`border-l-4 rounded-lg p-4 ${note.pinned ? 'bg-yellow-50' : 'bg-white border border-gray-100'} ${config.borderColor}`}
    >
      <div className="flex gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-xs">
            {getInitials(authorName)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">
                  {authorName}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}
                >
                  {NOTE_TYPE_ICONS[note.note_type]}
                  {config.label}
                </span>
                {note.pinned && (
                  <Pin className="w-3.5 h-3.5 text-yellow-600" />
                )}
              </div>
              <p className="text-xs text-gray-500">
                {formatRelativeTime(note.created_at)}
              </p>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {!note.resolved_at && (
                    <button
                      onClick={() => {
                        onAction(note.id, 'resolve')
                        setShowMenu(false)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Mark Resolved
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onAction(note.id, note.pinned ? 'unpin' : 'pin')
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    {note.pinned ? 'Unpin' : 'Pin'} Note
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>

          {/* Mentioned users */}
          {note.mentioned_users && note.mentioned_users.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
              <AtSign className="w-3 h-3" />
              <span>
                Mentioned:{' '}
                {note.mentioned_users
                  .map((userId) => {
                    const member = teamMembers.find(
                      (m) => m.user_id === userId
                    )
                    return member?.profile?.full_name || 'Unknown'
                  })
                  .join(', ')}
              </span>
            </div>
          )}

          {/* Resolved indicator */}
          {note.resolved_at && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span>Resolved</span>
            </div>
          )}

          {/* Replies */}
          {note.replies && note.replies.length > 0 && (
            <div className="mt-3 ml-2 space-y-3 border-l-2 border-gray-200 pl-4">
              {note.replies.map((replyNote) => (
                <div key={replyNote.id} className="text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900">
                      {replyNote.author?.full_name || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(replyNote.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-700 mt-0.5">{replyNote.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reply form */}
          <div className="mt-3">
            {!isReplying ? (
              <button
                onClick={() => setIsReplying(true)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Reply
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Add a reply..."
                  rows={2}
                  autoFocus
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReply}
                    disabled={!reply.trim() || replyPosting}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {replyPosting ? 'Posting...' : 'Reply'}
                  </button>
                  <button
                    onClick={() => {
                      setIsReplying(false)
                      setReply('')
                    }}
                    className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
