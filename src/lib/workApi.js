const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export const workSummaryUrl = `${apiBaseUrl}/api/v1/work/summary`
export const workItemsUrl = `${apiBaseUrl}/api/v1/work/items`

export function getReadinessUrl(studentId) {
  return `${apiBaseUrl}/api/v1/students/${studentId}/readiness`
}

export function getChecklistUrl(studentId) {
  return `${apiBaseUrl}/api/v1/students/${studentId}/checklist`
}

export function getChecklistItemStatusUrl(studentId, itemId) {
  return `${apiBaseUrl}/api/v1/students/${studentId}/checklist/items/${itemId}/status`
}

export function normalizeWorkItems(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.workItems)
        ? payload.workItems
        : []

  return items.map((item) => ({
    ...item,
    population: typeof item?.population === 'object'
      ? item.population?.name || item.population?.label || 'general'
      : item?.population,
    program: typeof item?.program === 'object'
      ? item.program?.name || item.program?.label || 'Program pending'
      : item?.program,
    institutionGoal: typeof item?.institutionGoal === 'object'
      ? item.institutionGoal?.name || item.institutionGoal?.label || ''
      : item?.institutionGoal,
  }))
}

export function normalizeWorkSummary(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (payload.summary && typeof payload.summary === 'object') return payload.summary
  return payload
}

export function getWorkErrorMessage(response, payload, fallback) {
  if (response.status === 401) return 'Your session is no longer valid. Please sign in again.'
  if (response.status === 403) return 'Your account is not authorized for this tenant.'
  if (response.status === 404) return 'Live work queues are not available yet. Showing derived work from student records.'
  return payload?.detail || payload?.message || fallback
}

export function getChecklistErrorMessage(response, payload, fallback) {
  if (response.status === 401) return 'Your session is no longer valid. Please sign in again.'
  if (response.status === 403) return 'Your account is not authorized for this tenant.'
  if (response.status === 404) return 'Checklist service is not available for this student yet.'
  return payload?.detail || payload?.message || fallback
}

export function getReadinessErrorMessage(response, payload, fallback) {
  if (response.status === 401) return 'Your session is no longer valid. Please sign in again.'
  if (response.status === 403) return 'Your account is not authorized for this tenant.'
  if (response.status === 404) return 'Readiness service is not available for this student yet.'
  return payload?.detail || payload?.message || fallback
}
