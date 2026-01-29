// Session 6: Messaging System Types

export interface Message {
  id: string
  case_id: string
  sender_id: string
  content: string
  content_type: 'text' | 'rich_text'
  attachments: string[] // Document IDs
  is_archived: boolean
  archived_at: string | null
  archived_by: string | null
  created_at: string
  updated_at: string
}

// Message with sender profile info (for display)
export interface MessageWithSender extends Message {
  sender?: {
    id: string
    full_name: string
    role: 'client' | 'attorney' | 'admin'
    avatar_url?: string
  }
  // Read status for current user
  is_read?: boolean
  read_at?: string | null
}

// For message list with attached documents
export interface MessageWithAttachments extends MessageWithSender {
  attachment_details?: {
    id: string
    original_filename: string
    mime_type: string
    file_size: number
  }[]
}

export interface MessageRead {
  message_id: string
  user_id: string
  read_at: string
}

export interface TypingIndicator {
  case_id: string
  user_id: string
  started_at: string
  user?: {
    full_name: string
  }
}

export interface UnreadCount {
  case_id: string
  user_id: string
  unread_count: number
  last_updated: string
}

// Case with message info for inbox view
export interface CaseWithMessages {
  id: string
  case_number: string | null
  client_name: string
  spouse_name: string
  status: string
  attorney_id: string
  client_id: string
  // Message summary
  unread_count: number
  last_message?: {
    content: string
    sender_name: string
    created_at: string
  }
}

// API Request/Response types
export interface SendMessageRequest {
  content: string
  content_type?: 'text' | 'rich_text'
  attachments?: string[]
}

export interface SendMessageResponse {
  success: boolean
  message: MessageWithSender
}

export interface MessagesResponse {
  messages: MessageWithSender[]
  has_more: boolean
  total_count: number
}

export interface UnreadCountResponse {
  case_id: string
  count: number
}

export interface MarkReadRequest {
  message_ids: string[]
}

export interface MarkReadResponse {
  success: boolean
  marked_count: number
}

// Real-time event types
export interface MessageEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: Message
  old?: Message
}

export interface TypingEvent {
  eventType: 'INSERT' | 'DELETE'
  new?: TypingIndicator
  old?: TypingIndicator
}

// Message activity for audit
export interface MessageActivity {
  id: string
  message_id: string
  user_id: string
  activity_type: 'sent' | 'read' | 'archived'
  metadata: Record<string, unknown>
  created_at: string
}
