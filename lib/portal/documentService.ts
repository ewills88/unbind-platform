// Session 20 CP2: Portal Document Service
// Shared documents, document requests, view/download tracking

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================
// Get shared documents for a client
// ============================================================

export async function getSharedDocuments(clientId: string, caseId?: string) {
  const supabase = getServiceClient()

  let query = supabase
    .from('shared_documents')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)

  if (caseId) {
    query = query.eq('case_id', caseId)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (query as any).order('created_at', { ascending: false })

  if (error) throw error

  // Enrich with document info
  const docs = data || []
  const docIds = docs.map((d: { document_id: string }) => d.document_id).filter(Boolean)
  const sharedByIds = Array.from(new Set(docs.map((d: { shared_by: string }) => d.shared_by)))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let docMap: Record<string, any> = {}
  if (docIds.length > 0) {
    const { data: documents } = await supabase
      .from('documents')
      .select('id, file_name, file_size')
      .in('id', docIds)
    if (documents) {
      docMap = Object.fromEntries(documents.map(d => [d.id, d]))
    }
  }

  let nameMap: Record<string, string> = {}
  if (sharedByIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', sharedByIds)
    if (profiles) {
      nameMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || 'Unknown']))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return docs.map((d: any) => ({
    ...d,
    document: docMap[d.document_id] || null,
    shared_by_name: nameMap[d.shared_by] || 'Unknown',
  }))
}

// ============================================================
// Record document view
// ============================================================

export async function recordDocumentView(
  sharedDocumentId: string,
  clientId: string,
  deviceInfo: { ipAddress: string; userAgent: string }
) {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('document_views').insert({
    shared_document_id: sharedDocumentId,
    client_id: clientId,
    viewed_at: new Date().toISOString(),
    ip_address: deviceInfo.ipAddress,
    user_agent: deviceInfo.userAgent,
  })

  // Update shared document stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: shared } = await (supabase as any)
    .from('shared_documents')
    .select('view_count, first_viewed_at')
    .eq('id', sharedDocumentId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('shared_documents')
    .update({
      view_count: (shared?.view_count || 0) + 1,
      first_viewed_at: shared?.first_viewed_at || new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
    })
    .eq('id', sharedDocumentId)
}

// ============================================================
// Get document requests for a client
// ============================================================

export async function getDocumentRequests(clientId: string, caseId?: string) {
  const supabase = getServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('document_requests')
    .select('*')
    .eq('client_id', clientId)

  if (caseId) {
    query = query.eq('case_id', caseId)
  }

  const { data, error } = await query.order('deadline', { ascending: true, nullsFirst: false })

  if (error) throw error

  // Enrich with requester names
  const requests = data || []
  const requesterIds = Array.from(new Set(requests.map((r: { requested_by: string }) => r.requested_by)))

  let nameMap: Record<string, string> = {}
  if (requesterIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', requesterIds)
    if (profiles) {
      nameMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || 'Unknown']))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return requests.map((r: any) => ({
    ...r,
    requested_by_name: nameMap[r.requested_by] || 'Unknown',
  }))
}

// ============================================================
// Submit document for a request
// ============================================================

export async function submitDocumentForRequest(
  requestId: string,
  clientId: string,
  filePath: string,
  fileUrl: string,
  fileName: string,
  fileType: string,
  fileSize: number
) {
  const supabase = getServiceClient()

  // Get request details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: request } = await (supabase as any)
    .from('document_requests')
    .select('*')
    .eq('id', requestId)
    .eq('client_id', clientId)
    .single()

  if (!request) {
    return { success: false, error: 'Request not found' }
  }

  if (request.status !== 'pending' && request.status !== 'rejected') {
    return { success: false, error: 'Request is no longer pending' }
  }

  // Validate file size
  if (fileSize > (request.max_file_size_mb || 25) * 1024 * 1024) {
    return { success: false, error: `File size exceeds ${request.max_file_size_mb}MB limit` }
  }

  // Create document record
  const { data: document } = await supabase
    .from('documents')
    .insert({
      case_id: request.case_id,
      file_name: fileName,
      file_path: filePath,
      file_type: fileType,
      file_size: fileSize,
    })
    .select()
    .single()

  if (!document) {
    return { success: false, error: 'Failed to create document record' }
  }

  // Update request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('document_requests')
    .update({
      status: 'submitted',
      fulfilled_document_id: document.id,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  // Log activity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('case_activity_log').insert({
    case_id: request.case_id,
    user_id: clientId,
    activity_type: 'document_uploaded',
    title: `Document submitted: ${fileName}`,
    description: `Client submitted "${fileName}" for request "${request.title}"`,
    is_visible_to_client: true,
    metadata: { request_id: requestId, document_id: document.id },
  })

  // Notify the requester
  await supabase.from('notifications').insert({
    user_id: request.requested_by,
    title: 'Client Document Submitted',
    message: `Client submitted "${fileName}" for "${request.title}"`,
    notification_type: 'document',
    action_url: `/dashboard/cases/${request.case_id}`,
  })

  return { success: true, documentId: document.id }
}
