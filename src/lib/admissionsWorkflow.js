export const LIFECYCLE_STAGES = {
  inquiry: 'Inquiry',
  qualifiedInquiry: 'Qualified inquiry',
  applicationStarted: 'Application started',
  applicationSubmitted: 'Application submitted',
  incompleteApplicant: 'Incomplete applicant',
  completeReadyForReview: 'Complete / ready for review',
  inReview: 'In review',
  decisionPending: 'Decision pending',
  admitted: 'Admitted',
  denied: 'Denied',
  waitlisted: 'Waitlisted',
  deferred: 'Deferred',
  deposited: 'Deposited',
  handoffInProgress: 'Handoff in progress',
  classReady: 'Class-ready',
  enrolledInClasses: 'Enrolled / in classes',
  meltRisk: 'Melt risk',
  withdrawnInactive: 'Withdrawn / inactive',
}

export const LEGACY_STAGE_LABELS = {
  decisionReady: 'Decision-ready',
  pendingEvidence: 'Pending evidence',
  trustHold: 'Trust hold',
  nearlyComplete: 'Nearly complete',
}

export const CHECKLIST_STATUSES = {
  notStarted: 'not_started',
  requested: 'requested',
  received: 'received',
  needsReview: 'needs_review',
  waived: 'waived',
  complete: 'complete',
  blocked: 'blocked',
  rejected: 'rejected',
  expired: 'expired',
  missing: 'missing',
}

export const CHECKLIST_BLOCKING_STATUSES = new Set([
  CHECKLIST_STATUSES.notStarted,
  CHECKLIST_STATUSES.requested,
  CHECKLIST_STATUSES.received,
  CHECKLIST_STATUSES.needsReview,
  CHECKLIST_STATUSES.blocked,
  CHECKLIST_STATUSES.rejected,
  CHECKLIST_STATUSES.expired,
  CHECKLIST_STATUSES.missing,
])

export function isChecklistStatusComplete(status) {
  return status === CHECKLIST_STATUSES.complete || status === CHECKLIST_STATUSES.waived
}

export function isChecklistStatusBlocking(status) {
  return CHECKLIST_BLOCKING_STATUSES.has(status)
}

export const READINESS_STATES = {
  inProgress: 'in_progress',
  incomplete: 'incomplete',
  nearlyComplete: 'nearly_complete',
  readyForReview: 'ready_for_review',
  blockedByDocument: 'blocked_by_document',
  blockedByTrust: 'blocked_by_trust',
  blockedByTransferReview: 'blocked_by_transfer_review',
  blockedByDecisionEvidence: 'blocked_by_decision_evidence',
  blockedByMissingItem: 'blocked_by_missing_item',
  blockedByReview: 'blocked_by_review',
  readyForDecision: 'ready_for_decision',
  readyForRelease: 'ready_for_release',
}

export const READINESS_DISPLAY = {
  [READINESS_STATES.inProgress]: {
    state: READINESS_STATES.inProgress,
    label: 'In progress',
    tone: 'neutral',
    reason: 'This record is still moving through completion work.',
  },
  [READINESS_STATES.incomplete]: {
    state: READINESS_STATES.incomplete,
    label: 'Incomplete',
    tone: 'neutral',
    reason: 'Required evidence is still missing.',
  },
  [READINESS_STATES.nearlyComplete]: {
    state: READINESS_STATES.nearlyComplete,
    label: 'Nearly complete',
    tone: 'medium',
    reason: 'One or two items can move this student into review.',
  },
  [READINESS_STATES.readyForReview]: {
    state: READINESS_STATES.readyForReview,
    label: 'Ready for review',
    tone: 'low',
    reason: 'Required materials are in place for review.',
  },
  [READINESS_STATES.blockedByDocument]: {
    state: READINESS_STATES.blockedByDocument,
    label: 'Document blocked',
    tone: 'medium',
    reason: 'A document issue is blocking progress.',
  },
  [READINESS_STATES.blockedByTrust]: {
    state: READINESS_STATES.blockedByTrust,
    label: 'Blocked by trust',
    tone: 'high',
    reason: 'Trust review must clear before release.',
  },
  [READINESS_STATES.blockedByTransferReview]: {
    state: READINESS_STATES.blockedByTransferReview,
    label: 'Transfer review blocked',
    tone: 'medium',
    reason: 'Transfer evidence needs specialist review.',
  },
  [READINESS_STATES.blockedByDecisionEvidence]: {
    state: READINESS_STATES.blockedByDecisionEvidence,
    label: 'Decision evidence blocked',
    tone: 'medium',
    reason: 'Decision evidence is incomplete.',
  },
  [READINESS_STATES.blockedByMissingItem]: {
    state: READINESS_STATES.blockedByMissingItem,
    label: 'Missing items',
    tone: 'neutral',
    reason: 'Required checklist items are still missing.',
  },
  [READINESS_STATES.blockedByReview]: {
    state: READINESS_STATES.blockedByReview,
    label: 'Needs review',
    tone: 'medium',
    reason: 'A document or requirement still needs staff review.',
  },
  [READINESS_STATES.readyForDecision]: {
    state: READINESS_STATES.readyForDecision,
    label: 'Ready for decision',
    tone: 'low',
    reason: 'Required materials are in place for decision review.',
  },
  [READINESS_STATES.readyForRelease]: {
    state: READINESS_STATES.readyForRelease,
    label: 'Ready for release',
    tone: 'low',
    reason: 'Release gates are clear.',
  },
}

export const WORK_SECTIONS = {
  attention: 'attention',
  close: 'close',
  ready: 'ready',
  exceptions: 'exceptions',
}

export const WORK_BUCKETS = {
  newInquiries: 'new_inquiries',
  noFirstTouch: 'no_first_touch',
  startedNotSubmitted: 'started_not_submitted',
  incompleteApplicants: 'incomplete_applicants',
  oneItemAway: 'one_item_away',
  stalledApplicants: 'stalled_applicants',
  documentBlocked: 'document_blocked',
  trustBlocked: 'trust_blocked',
  readyForReview: 'ready_for_review',
  decisionWaiting: 'decision_waiting',
  admittedNoRecentTouch: 'admitted_no_recent_touch',
  depositRisk: 'deposit_risk',
  meltRisk: 'melt_risk',
  handoffRisk: 'handoff_risk',
}

export const REASON_TO_ACT_CODES = {
  trustBlock: 'trust_block',
  missingOneItem: 'missing_one_item',
  needsReview: 'needs_review',
  readyForDecision: 'ready_for_decision',
  incomplete: 'incomplete',
}

export const PRIORITY_BANDS = {
  urgent: 'urgent',
  today: 'today',
  soon: 'soon',
}

export function normalizeReadinessState(state, overrides = {}) {
  const key = state || READINESS_STATES.inProgress
  const base = READINESS_DISPLAY[key] || READINESS_DISPLAY[READINESS_STATES.inProgress]
  return {
    ...base,
    state: key,
    ...overrides,
  }
}
