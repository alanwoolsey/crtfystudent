import { normalizePipelineStatus } from './admissionsWorkflow'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export const workSummaryUrl = `${apiBaseUrl}/api/v1/work/summary`
export const workItemsUrl = `${apiBaseUrl}/api/v1/work/items`
export const workTodayUrl = `${apiBaseUrl}/api/v1/work/counselor/today`
export const legacyWorkTodayUrl = `${apiBaseUrl}/api/v1/work/today`
export const workTodayBoardUrl = `${workTodayUrl}/board`
export const workTodayOrchestrateUrl = `${workTodayUrl}/orchestrate`
export const workTodayLatestOrchestrationUrl = `${workTodayUrl}/orchestrations/latest`

export function getWorkTodayRouteUrl(studentId) {
  return `${workTodayUrl}/${studentId}/route`
}

export function getWorkTodayRecommendationUrl(studentId) {
  return `${workTodayUrl}/${studentId}/recommendation`
}

export function getWorkTodayLatestOrchestrationUrl(studentId) {
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''
  return `${workTodayLatestOrchestrationUrl}${query}`
}

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
    pipelineStatus: item?.pipelineStatus || item?.pipeline_status || normalizePipelineStatus(item?.stage || item?.currentStage),
    lastContactedAt: item?.lastContactedAt || item?.last_contacted_at || '',
    nextFollowUpAt: item?.nextFollowUpAt || item?.next_follow_up_at || '',
    nextAction: item?.nextAction || item?.next_action || item?.suggestedAction?.label || '',
    contactOutcome: item?.contactOutcome || item?.contact_outcome || '',
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

export function normalizeTodayWorkItems(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : []

  return items.map((item) => ({
    ...item,
    pipelineStatus: item?.pipelineStatus || item?.pipeline_status || normalizePipelineStatus(item?.stage || item?.currentStage),
    lastContactedAt: item?.lastContactedAt || item?.last_contacted_at || '',
    nextFollowUpAt: item?.nextFollowUpAt || item?.next_follow_up_at || '',
    nextAction: item?.nextAction || item?.next_action || item?.suggestedAction?.label || '',
    contactOutcome: item?.contactOutcome || item?.contact_outcome || '',
    owner: item?.owner || { id: 'unassigned', name: 'Unassigned' },
    readiness: item?.readiness || { state: item?.section || 'in_progress', label: item?.reasonToAct?.label || 'In progress', tone: 'neutral' },
    checklistSummary: item?.checklistSummary || {
      completedCount: 0,
      totalRequired: 0,
      missingCount: 0,
      needsReviewCount: 0,
      oneItemAway: false,
    },
    completionPercent: Number(item?.completionPercent) || 0,
    priorityScore: Number(item?.priorityScore) || 0,
    recommendedAgent: item?.recommendedAgent || '',
    queueGroup: item?.queueGroup || '',
    blockingItems: Array.isArray(item?.blockingItems) ? item.blockingItems : [],
    lastActivity: item?.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'Unknown',
  }))
}

export function normalizeTodayBoardGroups(payload) {
  const source = payload?.board && typeof payload.board === 'object' ? payload.board : payload
  const groups = Array.isArray(source?.groups) ? source.groups : []

  return groups.map((group) => ({
    key: group?.key || 'group',
    label: group?.label || 'Work group',
    total: Number(group?.total) || 0,
    routeHint: group?.routeHint && typeof group.routeHint === 'object'
      ? {
          nextAgent: group.routeHint.nextAgent || '',
          reason: group.routeHint.reason || '',
          actionLabel: group.routeHint.actionLabel || 'Route bucket',
        }
      : null,
    items: normalizeTodayWorkItems({ items: Array.isArray(group?.items) ? group.items : [] }),
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
