import {
  CHECKLIST_BLOCKING_STATUSES,
  CHECKLIST_STATUSES,
  PRIORITY_BANDS,
  normalizePipelineStatus,
  READINESS_STATES,
  REASON_TO_ACT_CODES,
  WORK_SECTIONS,
  isChecklistStatusComplete,
  normalizeReadinessState,
} from './admissionsWorkflow'

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

export function inferPopulation(student) {
  const tags = Array.isArray(student?.tags) ? student.tags.map(normalizeText) : []
  const program = normalizeText(student?.program)

  if (tags.includes('transfer') || program.includes('transfer')) return 'transfer'
  if (tags.includes('freshman') || program.includes('first-year')) return 'first-year'
  if (tags.includes('graduate') || program.includes('master') || program.includes('mba')) return 'graduate'
  if (tags.includes('international')) return 'international'
  if (tags.includes('readmit')) return 'readmit'
  return 'general'
}

export function normalizeChecklistItems(student) {
  const items = Array.isArray(student?.checklist) ? student.checklist : []

  return items.map((item, index) => {
    const rawStatus = normalizeText(item?.status)
    let status = rawStatus

    if (!status) {
      status = item?.done ? 'complete' : 'missing'
    }

    if (!status) {
      status = item?.done ? CHECKLIST_STATUSES.complete : CHECKLIST_STATUSES.notStarted
    }

    if (status === 'done') status = CHECKLIST_STATUSES.complete
    if (status === 'missing') status = CHECKLIST_STATUSES.notStarted
    if (status === CHECKLIST_STATUSES.received) status = CHECKLIST_STATUSES.needsReview
    if (status === 'received but not reviewed') status = CHECKLIST_STATUSES.needsReview

    return {
      id: item?.id || `${student?.id || 'student'}-check-${index}`,
      code: item?.code || normalizeText(item?.label).replace(/[^a-z0-9]+/g, '_'),
      label: item?.label || item?.name || `Checklist item ${index + 1}`,
      required: item?.required !== false,
      status,
      done: isChecklistStatusComplete(status),
      sourceDocumentId: item?.sourceDocumentId || null,
      sourceConfidence: item?.sourceConfidence ?? null,
    }
  })
}

export function getChecklistStats(student) {
  const items = normalizeChecklistItems(student)
  const requiredItems = items.filter((item) => item.required)
  const completedItems = requiredItems.filter((item) => isChecklistStatusComplete(item.status))
  const needsReviewItems = requiredItems.filter((item) => item.status === CHECKLIST_STATUSES.needsReview)
  const missingItems = requiredItems.filter((item) => item.status === CHECKLIST_STATUSES.notStarted || item.status === CHECKLIST_STATUSES.requested || item.status === CHECKLIST_STATUSES.missing)
  const blockingItems = requiredItems.filter((item) => CHECKLIST_BLOCKING_STATUSES.has(item.status))
  const totalRequired = requiredItems.length
  const completionPercent = totalRequired ? Math.round((completedItems.length / totalRequired) * 100) : 0

  return {
    items,
    totalRequired,
    completedCount: completedItems.length,
    needsReviewCount: needsReviewItems.length,
    missingCount: missingItems.length,
    completionPercent,
    oneItemAway: totalRequired > 0 && completedItems.length === totalRequired - 1,
    blockingItems,
  }
}

function buildReasonToAct(student, checklistStats) {
  const stage = normalizeText(student?.stage)
  const risk = normalizeText(student?.risk)

  if (stage.includes('trust hold') || risk === 'high') {
    return { code: REASON_TO_ACT_CODES.trustBlock, label: 'Trust review blocking release' }
  }

  if (checklistStats.oneItemAway) {
    const blocker = checklistStats.blockingItems[0]
    return { code: REASON_TO_ACT_CODES.missingOneItem, label: blocker ? `One item away: ${blocker.label}` : 'One item away from completion' }
  }

  if (checklistStats.needsReviewCount > 0) {
    return { code: REASON_TO_ACT_CODES.needsReview, label: `${checklistStats.needsReviewCount} item${checklistStats.needsReviewCount === 1 ? '' : 's'} need review` }
  }

  if (stage.includes('complete') || stage.includes('decision-ready') || stage.includes('ready for review') || checklistStats.completionPercent === 100) {
    return { code: REASON_TO_ACT_CODES.readyForDecision, label: 'Ready for decision' }
  }

  return { code: REASON_TO_ACT_CODES.incomplete, label: `${checklistStats.missingCount || checklistStats.totalRequired} item${(checklistStats.missingCount || checklistStats.totalRequired) === 1 ? '' : 's'} still missing` }
}

export function getReadiness(student) {
  const checklistStats = getChecklistStats(student)
  const stage = normalizeText(student?.stage)
  const risk = normalizeText(student?.risk)

  if (stage.includes('trust hold') || risk === 'high') {
    return normalizeReadinessState(READINESS_STATES.blockedByTrust)
  }

  if (stage.includes('pending evidence') || checklistStats.blockingItems.some((item) => item.status === CHECKLIST_STATUSES.blocked || item.status === CHECKLIST_STATUSES.rejected || item.status === CHECKLIST_STATUSES.expired)) {
    return normalizeReadinessState(READINESS_STATES.blockedByDocument)
  }

  if (checklistStats.needsReviewCount > 0 || checklistStats.blockingItems.some((item) => item.status === CHECKLIST_STATUSES.received)) {
    return normalizeReadinessState(READINESS_STATES.blockedByReview)
  }

  if (checklistStats.blockingItems.length > 0) {
    return normalizeReadinessState(READINESS_STATES.blockedByMissingItem, {
      reason: `${checklistStats.blockingItems.length} required item${checklistStats.blockingItems.length === 1 ? '' : 's'} still blocking completion.`,
    })
  }

  if (stage.includes('complete') || stage.includes('decision-ready') || stage.includes('ready for review') || checklistStats.completionPercent === 100) {
    return normalizeReadinessState(READINESS_STATES.readyForDecision)
  }

  return normalizeReadinessState(READINESS_STATES.inProgress)
}

function buildSuggestedAction(student, checklistStats, reasonToAct) {
  if (reasonToAct.code === REASON_TO_ACT_CODES.trustBlock) {
    return { code: 'resolve_trust', label: 'Review trust evidence' }
  }

  if (reasonToAct.code === REASON_TO_ACT_CODES.readyForDecision) {
    return { code: 'open_decision', label: 'Open decision review' }
  }

  if (reasonToAct.code === REASON_TO_ACT_CODES.needsReview) {
    const blocker = checklistStats.blockingItems[0]
    return { code: 'review_document', label: blocker ? `Review ${blocker.label}` : 'Review incoming items' }
  }

  if (reasonToAct.code === REASON_TO_ACT_CODES.missingOneItem) {
    const blocker = checklistStats.blockingItems[0]
    return { code: 'clear_last_blocker', label: blocker ? `Clear ${blocker.label}` : 'Clear final blocker' }
  }

  return { code: 'follow_up', label: student?.recommendation?.nextBestAction || student?.nextBestAction || 'Follow up on missing items' }
}

function inferSection(student, checklistStats, reasonToAct) {
  const stage = normalizeText(student?.stage)

  if (reasonToAct.code === REASON_TO_ACT_CODES.trustBlock || stage.includes('pending evidence')) return WORK_SECTIONS.exceptions
  if (reasonToAct.code === REASON_TO_ACT_CODES.readyForDecision) return WORK_SECTIONS.ready
  if (checklistStats.oneItemAway || checklistStats.completionPercent >= 75) return WORK_SECTIONS.close
  return WORK_SECTIONS.attention
}

function inferPriority(student, checklistStats, reasonToAct) {
  const fitScore = Number(student?.fitScore) || 0

  if (reasonToAct.code === REASON_TO_ACT_CODES.trustBlock || checklistStats.oneItemAway) return PRIORITY_BANDS.urgent
  if (reasonToAct.code === REASON_TO_ACT_CODES.readyForDecision || fitScore >= 90 || checklistStats.completionPercent >= 75) return PRIORITY_BANDS.today
  return PRIORITY_BANDS.soon
}

export function buildWorkItemFromStudent(student) {
  const checklistStats = getChecklistStats(student)
  const reasonToAct = buildReasonToAct(student, checklistStats)
  const suggestedAction = buildSuggestedAction(student, checklistStats, reasonToAct)
  const readiness = getReadiness(student)
  const population = inferPopulation(student)
  const priority = inferPriority(student, checklistStats, reasonToAct)
  const section = inferSection(student, checklistStats, reasonToAct)

  return {
    id: `work-${student.id}`,
    studentId: student.id,
    studentName: student.name,
    population,
    pipelineStatus: normalizePipelineStatus(student.stage),
    stage: normalizeText(student.stage).replace(/\s+/g, '_') || 'incomplete',
    completionPercent: checklistStats.completionPercent,
    priority,
    owner: {
      id: student.advisor ? normalizeText(student.advisor).replace(/[^a-z0-9]+/g, '_') : 'unassigned',
      name: student.advisor || 'Unassigned',
    },
    section,
    readiness,
    reasonToAct,
    suggestedAction,
    blockingItems: checklistStats.blockingItems.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.label,
      status: item.status,
    })),
    checklistSummary: {
      totalRequired: checklistStats.totalRequired,
      completedCount: checklistStats.completedCount,
      missingCount: checklistStats.missingCount,
      needsReviewCount: checklistStats.needsReviewCount,
      oneItemAway: checklistStats.oneItemAway,
    },
    fitScore: student.fitScore ?? null,
    depositLikelihood: student.depositLikelihood ?? null,
    program: student.program || '',
    institutionGoal: student.institutionGoal || '',
    risk: student.risk || 'Low',
    lastActivity: student.lastActivity || 'Unknown',
    lastContactedAt: student.lastContactedAt || student.last_contacted_at || '',
    nextFollowUpAt: student.nextFollowUpAt || student.next_follow_up_at || '',
    nextAction: student.nextAction || student.next_action || student.nextBestAction || '',
    contactOutcome: student.contactOutcome || student.contact_outcome || '',
  }
}

export function buildWorkItemsFromStudents(students) {
  return (Array.isArray(students) ? students : []).map(buildWorkItemFromStudent)
}

export function buildWorkSummary(workItems) {
  const items = Array.isArray(workItems) ? workItems : []
  const summary = {
    needsAttention: 0,
    closeToCompletion: 0,
    readyForDecision: 0,
    exceptions: 0,
  }

  items.forEach((item) => {
    if (item.section === 'attention') summary.needsAttention += 1
    if (item.section === 'close') summary.closeToCompletion += 1
    if (item.section === 'ready') summary.readyForDecision += 1
    if (item.section === 'exceptions') summary.exceptions += 1
  })

  return summary
}

export function sortWorkItems(workItems) {
  const priorityRank = {
    [PRIORITY_BANDS.urgent]: 0,
    [PRIORITY_BANDS.today]: 1,
    [PRIORITY_BANDS.soon]: 2,
  }

  return [...(Array.isArray(workItems) ? workItems : [])].sort((left, right) => {
    const priorityDelta = (priorityRank[left.priority] ?? 99) - (priorityRank[right.priority] ?? 99)
    if (priorityDelta !== 0) return priorityDelta
    return (right.completionPercent || 0) - (left.completionPercent || 0)
  })
}
