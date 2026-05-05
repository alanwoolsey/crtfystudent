const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export const incompleteQueueUrl = `${apiBaseUrl}/api/v1/incomplete`
export const reviewReadyUrl = `${apiBaseUrl}/api/v1/review-ready`
export const documentsQueueUrl = `${apiBaseUrl}/api/v1/documents/queue`
export const documentExceptionsUrl = `${apiBaseUrl}/api/v1/documents/exceptions`
export const yieldQueueUrl = `${apiBaseUrl}/api/v1/yield`
export const meltQueueUrl = `${apiBaseUrl}/api/v1/melt`
export const reportingOverviewUrl = `${apiBaseUrl}/api/v1/reporting/overview`
export const transcriptUploadsUrl = `${apiBaseUrl}/api/v1/transcripts/uploads`
export const trustCasesUrl = `${apiBaseUrl}/api/v1/trust/cases`
export const workProjectionStatusUrl = `${apiBaseUrl}/api/v1/work/projection/status`
export const workProjectionRebuildUrl = `${apiBaseUrl}/api/v1/work/projection/rebuild`
export const workProjectionRebuildAllUrl = `${apiBaseUrl}/api/v1/work/projection/rebuild-all`
export const workProjectionJobsUrl = `${apiBaseUrl}/api/v1/work/projection/jobs`

export function normalizeItems(payload, fallbackKeys = []) {
  if (Array.isArray(payload)) return payload
  for (const key of fallbackKeys) {
    if (Array.isArray(payload?.[key])) return payload[key]
  }
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

export function getApiErrorMessage(response, payload, fallback) {
  if (response.status === 401) return 'Your session is no longer valid. Please sign in again.'
  if (response.status === 403) return 'Your account is not authorized for this tenant.'
  if (response.status === 404) return 'This admissions service is not available yet.'
  return payload?.error || payload?.detail || payload?.message || fallback
}

function normalizeReadinessState(state) {
  if (state === 'ready_for_decision') return { state, label: 'Ready for decision', tone: 'low' }
  if (state === 'blocked_by_trust') return { state, label: 'Blocked by trust', tone: 'high' }
  if (state === 'blocked_by_review') return { state, label: 'Needs review', tone: 'medium' }
  if (state === 'blocked_by_missing_item') return { state, label: 'Missing items', tone: 'neutral' }
  return { state: state || 'in_progress', label: 'In progress', tone: 'neutral' }
}

function normalizePercentScore(value) {
  if (value === null || value === undefined || value === '') return 0
  const number = Number(value)
  if (Number.isNaN(number)) return 0
  const score = number <= 1 ? number * 100 : number
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function toWorkItemFromIncomplete(item, activeView) {
  const missingItems = Array.isArray(item?.missingItems) ? item.missingItems : []
  const missingItemsCount = Number(item?.missingItemsCount ?? missingItems.length) || 0
  const completionPercent = Number(item?.completionPercent) || Math.max(0, Math.min(100, 100 - (missingItemsCount * 20)))
  const priorityScore = Number(item?.priorityScore) || 0
  const priority = item?.priority || (priorityScore >= 85 ? 'urgent' : priorityScore >= 65 ? 'today' : 'soon')
  const readiness = normalizeReadinessState(item?.readinessState)

  return {
    id: item?.id || `incomplete-${item?.studentId}`,
    studentId: item?.studentId,
    studentName: item?.studentName || 'Unknown student',
    population: item?.population || item?.studentType || 'general',
    program: item?.program || 'Program pending',
    institutionGoal: item?.campus || item?.territory || '',
    completionPercent,
    priority,
    section: activeView === 'nearly_complete' ? 'close' : 'attention',
    readiness,
    owner: item?.assignedOwner || item?.owner || { id: 'unassigned', name: 'Unassigned' },
    reasonToAct: {
      label: item?.reasonToAct || (missingItemsCount > 0 ? `${missingItemsCount} missing item${missingItemsCount === 1 ? '' : 's'}` : 'Incomplete application'),
    },
    suggestedAction: {
      label: item?.suggestedNextAction || item?.suggestedAction || 'Open student',
    },
    checklistSummary: {
      completedCount: Number(item?.completedItemsCount) || 0,
      totalRequired: Number(item?.totalRequired) || (Number(item?.completedItemsCount) || 0) + missingItemsCount,
      missingCount: missingItemsCount,
      needsReviewCount: Number(item?.needsReviewCount) || 0,
      oneItemAway: Boolean(item?.closestToComplete) || missingItemsCount === 1,
    },
    blockingItems: missingItems.map((value, index) => ({
      id: `${item?.studentId || 'student'}-missing-${index}`,
      code: String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      label: value,
      status: 'missing',
    })),
    lastActivity: item?.lastActivityAt
      ? new Date(item.lastActivityAt).toLocaleDateString()
      : item?.daysStalled !== undefined
        ? `${item.daysStalled} day${item.daysStalled === 1 ? '' : 's'} stalled`
        : 'Unknown',
  }
}

export function toWorkItemFromReady(item) {
  return {
    id: item?.id || `review-ready-${item?.studentId}`,
    studentId: item?.studentId,
    studentName: item?.studentName || 'Unknown student',
    population: item?.population || item?.studentType || 'general',
    program: item?.program || 'Program pending',
    institutionGoal: item?.campus || '',
    completionPercent: Number(item?.completionPercent) || 100,
    priority: item?.daysWaiting > 3 ? 'urgent' : item?.daysWaiting > 1 ? 'today' : 'soon',
    section: 'ready',
    readiness: normalizeReadinessState('ready_for_decision'),
    owner: item?.assignedReviewer || { id: 'unassigned', name: 'Unassigned reviewer' },
    reasonToAct: {
      label: item?.reviewSlaHours ? `${item.reviewSlaHours}h review SLA` : 'Ready for evaluator review',
    },
    suggestedAction: {
      label: item?.transferCredits ? 'Open packet and review transfer mapping' : 'Claim review',
    },
    checklistSummary: {
      completedCount: Number(item?.completedItemsCount) || Number(item?.totalRequired) || 0,
      totalRequired: Number(item?.totalRequired) || Number(item?.completedItemsCount) || 0,
      missingCount: 0,
      needsReviewCount: 0,
      oneItemAway: false,
    },
    blockingItems: [],
    lastActivity: item?.daysWaiting !== undefined ? `${item.daysWaiting} day${item.daysWaiting === 1 ? '' : 's'} waiting` : 'Ready now',
  }
}

export function toYieldCard(item) {
  return {
    id: item?.studentId || item?.id,
    studentId: item?.studentId || item?.id,
    studentName: item?.studentName || 'Unknown student',
    admitDate: item?.admitDate || null,
    depositStatus: item?.depositStatus || 'unknown',
    yieldScore: normalizePercentScore(item?.yieldScore ?? item?.depositLikelihood),
    lastActivityAt: item?.lastActivityAt || null,
    milestoneCompletion: normalizePercentScore(item?.milestoneCompletion),
    assignedCounselor: item?.assignedCounselor || { id: 'unassigned', name: 'Unassigned' },
    program: item?.program || 'Program pending',
    nextStep: item?.nextStep || item?.suggestedAction || 'Open student',
  }
}

export function toMeltCard(item) {
  return {
    id: item?.studentId || item?.id,
    studentId: item?.studentId || item?.id,
    studentName: item?.studentName || 'Unknown student',
    depositDate: item?.depositDate || null,
    meltRisk: normalizePercentScore(item?.meltRisk),
    missingMilestones: Array.isArray(item?.missingMilestones) ? item.missingMilestones : [],
    lastOutreachAt: item?.lastOutreachAt || null,
    owner: item?.owner || { id: 'unassigned', name: 'Unassigned' },
    program: item?.program || 'Program pending',
  }
}

export function getDocumentActionUrl(documentId, action) {
  return `${apiBaseUrl}/api/v1/documents/${documentId}/${action}`
}

export function getDocumentReprocessUploadUrl(documentId) {
  return `${apiBaseUrl}/api/v1/documents/${documentId}/reprocess-upload`
}

export function getDocumentExceptionSummaryUrl(documentId) {
  return `${apiBaseUrl}/api/v1/documents/${documentId}/exception-summary`
}

export function getDocumentRunDetailsUrl(documentId) {
  return `${apiBaseUrl}/api/v1/documents/${documentId}/run-details`
}

export function getAgentRunUrl(agentRunId) {
  return `${apiBaseUrl}/api/v1/agent-runs/${agentRunId}`
}

export function getAgentRunActionsUrl(agentRunId) {
  return `${apiBaseUrl}/api/v1/agent-runs/${agentRunId}/actions`
}

export function getTranscriptUploadStatusUrl(transcriptId) {
  return `${transcriptUploadsUrl}/${transcriptId}/status`
}

export function getTrustTranscriptDetailsUrl(transcriptId) {
  return `${apiBaseUrl}/api/v1/trust/transcripts/${transcriptId}/details`
}

export function getTrustTranscriptActionUrl(transcriptId, action) {
  return `${apiBaseUrl}/api/v1/trust/transcripts/${transcriptId}/${action}`
}

export function getDecisionRecommendationUrl(decisionId) {
  return `${apiBaseUrl}/api/v1/decisions/${decisionId}/recommendation`
}

export function getDecisionReviewUrl(decisionId) {
  return `${apiBaseUrl}/api/v1/decisions/${decisionId}/review`
}

export function getDecisionSnapshotUrl(decisionId) {
  return `${apiBaseUrl}/api/v1/decisions/${decisionId}/snapshot`
}

export function getDecisionAgentDetailsUrl(decisionId) {
  return `${apiBaseUrl}/api/v1/decisions/${decisionId}/agent-details`
}

export function getWorkProjectionJobUrl(jobId) {
  return `${workProjectionJobsUrl}/${jobId}`
}

export function getWorkProjectionJobRetryUrl(jobId) {
  return `${workProjectionJobsUrl}/${jobId}/retry`
}

export function getWorkProjectionJobCancelUrl(jobId) {
  return `${workProjectionJobsUrl}/${jobId}/cancel`
}

export function toDocumentQueueItem(item) {
  return {
    id: item?.id || item?.documentId,
    documentType: item?.documentType || item?.type || 'Document',
    studentMatch: item?.studentMatch || {
      studentId: item?.studentId || null,
      studentName: item?.studentName || 'Unmatched',
    },
    confidence: Number(item?.confidence) || 0,
    uploadSource: item?.uploadSource || item?.source || 'Unknown source',
    status: item?.status || 'received_not_indexed',
    documentStatus: item?.documentStatus || item?.status || '',
    transcriptStatus: item?.transcriptStatus || '',
    latestRunStatus: item?.latestRunStatus || item?.latestRun?.status || '',
    reason: item?.reason || item?.issueLabel || item?.failureMessage || '',
    suggestedAction: item?.suggestedAction || '',
    trustFlag: Boolean(item?.trustFlag),
    receivedAt: item?.receivedAt || item?.uploadedAt || null,
  }
}
