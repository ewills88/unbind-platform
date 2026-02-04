'use client'

import { useState, useEffect } from 'react'
import {
  Link2,
  Plus,
  X,
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Search,
  GitBranch,
  FileStack,
  Reply,
  Paperclip,
} from 'lucide-react'
import { RelationshipType } from '@/types/tags'
import { Document } from '@/types/documents'

interface RelatedDocument {
  id: string
  documentId: string
  filename: string
  category: string | null
  mimeType: string
  relationshipType: RelationshipType
  confidence: number
  notes: string | null
  direction: 'incoming' | 'outgoing'
  createdAt: string
}

interface DocumentRelationshipsProps {
  documentId: string
  caseId: string
  onNavigateToDocument?: (documentId: string) => void
}

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'related', label: 'Related', icon: <Link2 className="w-4 h-4" />, description: 'General relationship' },
  { value: 'version', label: 'Version Of', icon: <GitBranch className="w-4 h-4" />, description: 'Different version of same document' },
  { value: 'supersedes', label: 'Supersedes', icon: <FileStack className="w-4 h-4" />, description: 'Replaces an older document' },
  { value: 'references', label: 'References', icon: <FileText className="w-4 h-4" />, description: 'Mentions or cites another document' },
  { value: 'attachment', label: 'Attachment', icon: <Paperclip className="w-4 h-4" />, description: 'Attached to another document' },
  { value: 'response', label: 'Response To', icon: <Reply className="w-4 h-4" />, description: 'Reply or response to a document' },
]

export default function DocumentRelationships({
  documentId,
  caseId,
  onNavigateToDocument
}: DocumentRelationshipsProps) {
  const [relationships, setRelationships] = useState<RelatedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Document[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [selectedType, setSelectedType] = useState<RelationshipType>('related')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch existing relationships
  useEffect(() => {
    fetchRelationships()
  }, [documentId])

  const fetchRelationships = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/relationships`)
      if (response.ok) {
        const data = await response.json()
        setRelationships(data.relationships || [])
      }
    } catch (err) {
      console.error('Error fetching relationships:', err)
    } finally {
      setLoading(false)
    }
  }

  // Search for documents to link
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        // Fetch documents from the same case
        const response = await fetch(`/api/documents?caseId=${caseId}&search=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          // Filter out current document and already linked documents
          const linkedIds = new Set(relationships.map(r => r.documentId))
          linkedIds.add(documentId)
          const filtered = (data.documents || []).filter((d: Document) => !linkedIds.has(d.id))
          setSearchResults(filtered.slice(0, 10))
        }
      } catch (err) {
        console.error('Error searching documents:', err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, caseId, documentId, relationships])

  const handleCreateRelationship = async () => {
    if (!selectedDocument) return

    setCreating(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relatedDocumentId: selectedDocument.id,
          relationshipType: selectedType,
          notes: notes || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.details || 'Failed to create relationship')
      }

      const data = await response.json()
      setRelationships(prev => [...prev, data.relationship])
      setShowAddForm(false)
      setSelectedDocument(null)
      setSearchQuery('')
      setNotes('')
      setSelectedType('related')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship')
    } finally {
      setCreating(false)
    }
  }

  const handleRemoveRelationship = async (relationshipId: string) => {
    try {
      const response = await fetch(
        `/api/documents/${documentId}/relationships?relationshipId=${relationshipId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setRelationships(prev => prev.filter(r => r.id !== relationshipId))
      }
    } catch (err) {
      console.error('Error removing relationship:', err)
    }
  }

  const getRelationshipIcon = (type: RelationshipType) => {
    const rel = RELATIONSHIP_TYPES.find(r => r.value === type)
    return rel?.icon || <Link2 className="w-4 h-4" />
  }

  const getRelationshipLabel = (type: RelationshipType) => {
    const rel = RELATIONSHIP_TYPES.find(r => r.value === type)
    return rel?.label || 'Related'
  }

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      financial: 'bg-blue-100 text-blue-700',
      legal: 'bg-purple-100 text-purple-700',
      property: 'bg-green-100 text-green-700',
      custody: 'bg-orange-100 text-orange-700',
      tax: 'bg-red-100 text-red-700',
      employment: 'bg-cyan-100 text-cyan-700',
      court: 'bg-indigo-100 text-indigo-700'
    }
    return colors[category || ''] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Related Documents</h3>
          {relationships.length > 0 && (
            <span className="text-xs text-gray-500">({relationships.length})</span>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAddForm ? 'Cancel' : 'Link Document'}
        </button>
      </div>

      {/* Add Relationship Form */}
      {showAddForm && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search for a document to link
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search documents..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                {searchResults.map(doc => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDocument(doc)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                  >
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{doc.original_filename}</p>
                      {doc.category && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getCategoryColor(doc.category)}`}>
                          {doc.category}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
              <p className="mt-2 text-xs text-gray-500">No matching documents found</p>
            )}
          </div>

          {/* Selected Document */}
          {selectedDocument && (
            <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-900 flex-1 truncate">{selectedDocument.original_filename}</span>
              <button
                type="button"
                onClick={() => setSelectedDocument(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Relationship Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Relationship Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RELATIONSHIP_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-colors ${
                    selectedType === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {type.icon}
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note about this relationship..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setSelectedDocument(null)
                setSearchQuery('')
                setNotes('')
              }}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateRelationship}
              disabled={!selectedDocument || creating}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Link
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-6">
          <Loader2 className="w-6 h-6 mx-auto text-gray-400 animate-spin" />
          <p className="text-xs text-gray-500 mt-2">Loading relationships...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && relationships.length === 0 && !showAddForm && (
        <div className="text-center py-6 text-gray-500">
          <Link2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No linked documents</p>
          <p className="text-xs mt-1">Link related documents to build connections</p>
        </div>
      )}

      {/* Relationships List */}
      {!loading && relationships.length > 0 && (
        <div className="space-y-2">
          {relationships.map(rel => (
            <div
              key={rel.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
            >
              {/* Direction Icon */}
              <div className={`p-1.5 rounded-lg ${
                rel.direction === 'outgoing' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {rel.direction === 'outgoing' ? (
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                ) : (
                  <ArrowLeft className="w-4 h-4 text-green-600" />
                )}
              </div>

              {/* Document Info */}
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => onNavigateToDocument?.(rel.documentId)}
                  className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block text-left"
                >
                  {rel.filename}
                </button>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    {getRelationshipIcon(rel.relationshipType)}
                    {getRelationshipLabel(rel.relationshipType)}
                  </span>
                  {rel.category && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getCategoryColor(rel.category)}`}>
                      {rel.category}
                    </span>
                  )}
                </div>
                {rel.notes && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{rel.notes}</p>
                )}
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemoveRelationship(rel.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove relationship"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
