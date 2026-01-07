export interface Document {
    id: string
    case_id: string
    uploader_id: string
    
    // File details
    filename: string
    original_filename: string
    file_size: number
    mime_type: string
    storage_path: string
    
    // Organization
    category: 'financial' | 'legal' | 'property' | 'custody' | 'other' | null
    tags: string[] | null
    description: string | null
    
    // Status
    is_encrypted: boolean
    is_shared_with_client: boolean
    
    // Metadata
    uploaded_at: string
    last_accessed_at: string | null
  }
  
  export interface DocumentUpload {
    file: File
    case_id: string
    category?: string
    description?: string
    is_shared_with_client?: boolean
  }
  
  export const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ]
  
  export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes
  
  export const DOCUMENT_CATEGORIES = [
    { value: 'financial', label: 'Financial', color: 'blue' },
    { value: 'legal', label: 'Legal Documents', color: 'purple' },
    { value: 'property', label: 'Property', color: 'green' },
    { value: 'custody', label: 'Custody & Children', color: 'orange' },
    { value: 'other', label: 'Other', color: 'gray' },
  ] as const