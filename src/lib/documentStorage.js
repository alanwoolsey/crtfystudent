const crtfyDocumentsBaseUrl = (import.meta.env.VITE_DOCUMENT_STORAGE_URL || 'https://api.crtfydocuments.com').replace(/\/+$/, '')
const crtfyDocumentsPublicUrl = (import.meta.env.VITE_DOCUMENT_STORAGE_PUBLIC_URL || crtfyDocumentsBaseUrl).replace(/\/+$/, '')
const documentStorageTenantId = import.meta.env.VITE_DOCUMENT_STORAGE_TENANT_ID || ''
const documentStorageActor = import.meta.env.VITE_DOCUMENT_STORAGE_ACTOR || 'crtfy-student'
const documentStorageUserEmail = import.meta.env.VITE_DOCUMENT_STORAGE_USER_EMAIL || 'system@crtfystudent.com'
const documentStorageRole = import.meta.env.VITE_DOCUMENT_STORAGE_ROLE || 'admin'

export const activeDocumentStorageProvider = {
  id: 'crtfy_documents',
  name: 'crtfy Documents',
  status: 'Active',
  direction: 'Outbound storage + retrieval',
  latency: 'Real-time',
  coverage: ['Transcript storage', 'Document viewer', 'ECM document IDs', 'Extraction handoff'],
}

export function buildDocumentStorageHeaders(overrides = {}) {
  const tenantId = overrides.tenantId || documentStorageTenantId
  return {
    ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
    'X-Actor': overrides.actor || documentStorageActor,
    'X-User-Email': overrides.userEmail || documentStorageUserEmail,
    'X-Role': overrides.role || documentStorageRole,
    'X-Department': overrides.department || 'General',
  }
}

export function normalizeDocumentCategory(value, { isFinancialAid = false } = {}) {
  if (isFinancialAid) return 'Financial Aid'
  const category = String(value || '').trim()
  if (!category || category === 'auto') return 'Transcript'
  return category
}

export function getDocumentDepartment(documentType) {
  return String(documentType || '').toLowerCase() === 'financial aid' ? 'Financial Aid' : 'General'
}

export function getStoredDocumentId(payload) {
  return payload?.document_id || payload?.documentId || payload?.id || ''
}

export function getStoredDocumentContentLocation(payload) {
  return normalizeDocumentStorageUrl(payload?.content_url || payload?.contentUrl || payload?.content?.url || '')
}

export function normalizeDocumentStorageUrl(value) {
  const url = String(value || '').trim()
  if (!url) return ''
  try {
    const parsedUrl = new URL(url)
    const publicUrl = new URL(crtfyDocumentsPublicUrl)
    const storageUrl = new URL(crtfyDocumentsBaseUrl)
    if (parsedUrl.hostname.toLowerCase() === storageUrl.hostname.toLowerCase()) {
      parsedUrl.protocol = publicUrl.protocol
      parsedUrl.host = publicUrl.host
      return parsedUrl.toString()
    }
  } catch {
    return url
  }
  return url
}

export async function parseDocumentStorageResponse(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

export async function uploadStoredDocument(file, options = {}) {
  const documentType = normalizeDocumentCategory(options.documentType || options.document_type, {
    isFinancialAid: options.isFinancialAid,
  })
  const department = options.department || getDocumentDepartment(documentType)
  const formData = new FormData()

  formData.append('file', file, file.name)
  formData.append('title', options.title || file.name)
  formData.append('document_type', documentType)
  formData.append('department', department)
  formData.append('source', 'crtfy_student')

  if (options.personId) formData.append('person_id', options.personId)
  if (options.tags) formData.append('tags', Array.isArray(options.tags) ? options.tags.join(',') : options.tags)
  if (options.notes) formData.append('notes', options.notes)

  const response = await fetch(`${crtfyDocumentsBaseUrl}/api/intake/files`, {
    method: 'POST',
    headers: buildDocumentStorageHeaders({
      tenantId: options.tenantId,
      actor: options.actor,
      userEmail: options.userEmail,
      role: options.role,
      department,
    }),
    body: formData,
  })
  const payload = await parseDocumentStorageResponse(response)

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || payload?.error || 'Unable to upload document to crtfy Documents.')
  }

  const documentId = getStoredDocumentId(payload)
  if (!documentId) throw new Error('crtfy Documents did not return a document_id.')

  return {
    provider: activeDocumentStorageProvider.id,
    documentId,
    contentUrl: getStoredDocumentContentLocation(payload),
    tenantId: options.tenantId || documentStorageTenantId,
    documentType,
    department,
    payload,
  }
}

export function getStoredDocumentContentUrl(documentId) {
  return `${crtfyDocumentsBaseUrl}/api/documents/${encodeURIComponent(documentId)}/content`
}

export function getStoredDocumentMetadataUrl(documentId) {
  return `${crtfyDocumentsBaseUrl}/api/documents/${encodeURIComponent(documentId)}`
}

export function getStoredDocumentDownloadUrl(documentId) {
  return `${crtfyDocumentsBaseUrl}/api/documents/${encodeURIComponent(documentId)}/download`
}

export async function fetchStoredDocumentContent(documentId, options = {}) {
  const department = options.department || 'General'
  return fetch(getStoredDocumentContentUrl(documentId), {
    headers: buildDocumentStorageHeaders({
      tenantId: options.tenantId,
      actor: options.actor,
      userEmail: options.userEmail,
      role: options.role,
      department,
    }),
  })
}

export async function fetchStoredDocumentContentUrl(contentUrl, options = {}) {
  const department = options.department || 'General'
  return fetch(normalizeDocumentStorageUrl(contentUrl), {
    headers: buildDocumentStorageHeaders({
      tenantId: options.tenantId,
      actor: options.actor,
      userEmail: options.userEmail,
      role: options.role,
      department,
    }),
  })
}

export async function fetchStoredDocumentMetadata(documentId, options = {}) {
  const department = options.department || 'General'
  return fetch(getStoredDocumentMetadataUrl(documentId), {
    headers: buildDocumentStorageHeaders({
      tenantId: options.tenantId,
      actor: options.actor,
      userEmail: options.userEmail,
      role: options.role,
      department,
    }),
  })
}

export async function fetchStoredDocumentDownload(documentId, options = {}) {
  const department = options.department || 'General'
  return fetch(getStoredDocumentDownloadUrl(documentId), {
    headers: buildDocumentStorageHeaders({
      tenantId: options.tenantId,
      actor: options.actor,
      userEmail: options.userEmail,
      role: options.role,
      department,
    }),
  })
}
