// Tag System Types for Session 5

export interface Tag {
  id: string
  name: string
  color: TagColor
  created_by: string | null
  created_at: string
  usage_count: number
}

export interface DocumentTag {
  document_id: string
  tag_id: string
  added_by: string | null
  added_at: string
  // Joined data
  tag?: Tag
}

export interface DocumentRelationship {
  id: string
  source_document_id: string
  related_document_id: string
  relationship_type: RelationshipType
  confidence: number
  notes: string | null
  created_by: string | null
  created_at: string
}

export type TagColor =
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'cyan'

export type RelationshipType =
  | 'related'
  | 'version'
  | 'supersedes'
  | 'references'
  | 'attachment'
  | 'response'

// API Request/Response types
export interface CreateTagRequest {
  name: string
  color?: TagColor
}

export interface AddTagsToDocumentRequest {
  tagIds: string[]
}

export interface RemoveTagFromDocumentRequest {
  tagId: string
}

export interface BulkTagRequest {
  documentIds: string[]
  addTagIds?: string[]
  removeTagIds?: string[]
}

export interface TagWithDocuments extends Tag {
  documents?: {
    id: string
    filename: string
  }[]
}

// Color mapping for UI
export const TAG_COLORS: Record<TagColor, { bg: string; text: string; border: string }> = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
}

// Default tags that come pre-seeded
export const DEFAULT_TAGS = [
  { name: 'urgent', color: 'red' as TagColor },
  { name: 'review-needed', color: 'orange' as TagColor },
  { name: 'approved', color: 'green' as TagColor },
  { name: 'pending-signature', color: 'yellow' as TagColor },
  { name: 'confidential', color: 'purple' as TagColor },
  { name: 'draft', color: 'gray' as TagColor },
  { name: 'final', color: 'blue' as TagColor },
  { name: 'discovery', color: 'cyan' as TagColor },
  { name: 'exhibit', color: 'indigo' as TagColor },
]
