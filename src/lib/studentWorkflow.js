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

    if (status === 'done') status = 'complete'
    if (status === 'received') status = 'needs_review'
    if (status === 'received but not reviewed') status = 'needs_review'

    return {
      id: item?.id || `${student?.id || 'student'}-check-${index}`,
      code: item?.code || normalizeText(item?.label).replace(/[^a-z0-9]+/g, '_'),
      label: item?.label || item?.name || `Checklist item ${index + 1}`,
      required: item?.required !== false,
      status,
      done: status === 'complete',
      sourceDocumentId: item?.sourceDocumentId || null,
      sourceConfidence: item?.sourceConfidence ?? null,
    }
  })
}

export function getChecklistStats(student) {
  const items = normalizeChecklistItems(student)
  const requiredItems = items.filter((item) => item.required)
  const completedItems = requiredItems.filter((item) => item.status === 'complete')
  const needsReviewItems = requiredItems.filter((item) => item.status === 'needs_review')
  const missingItems = requiredItems.filter((item) => item.status === 'missing')
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
    blockingItems: [...needsReviewItems, ...missingItems],
  }
}

function buildReasonToAct(student, checklistStats) {
  const stage = normalizeText(student?.stage)
  const risk = normalizeText(student?.risk)

  if (stage.includes('trust hold') || risk === 'high') {
    return { code: 'trust_block', label: 'Trust review blocking release' }
  }

  if (checklistStats.oneItemAway) {
    const blocker = checklistStats.blockingItems[0]
    return { code: 'missing_one_item', label: blocker ? `One item away: ${blocker.label}` : 'One item away from completion' }
  }

  if (checklistStats.needsReviewCount > 0) {
    return { code: 'needs_review', label: `${checklistStats.needsReviewCount} item${checklistStats.needsReviewCount === 1 ? '' : 's'} need review` }
  }

  if (stage.includes('decision-ready') || stage.includes('ready for review') || checklistStats.completionPercent === 100) {
    return { code: 'ready_for_decision', label: 'Ready for decision' }
  }

  return { code: 'incomplete', label: `${checklistStats.missingCount || checklistStats.totalRequired} item${(checklistStats.missingCount || checklistStats.totalRequired) === 1 ? '' : 's'} still missing` }
}

export function getReadiness(student) {
  const checklistStats = getChecklistStats(student)
  const stage = normalizeText(student?.stage)
  const risk = normalizeText(student?.risk)

  if (stage.includes('trust hold') || risk === 'high') {
    return {
      state: 'blocked_by_trust',
      label: 'Blocked by trust',
      tone: 'high',
      reason: 'Trust review must clear before release.',
    }
  }

  if (stage.includes('pending evidence') || checklistStats.needsReviewCount > 0) {
    return {
      state: 'blocked_by_review',
      label: 'Needs review',
      tone: 'medium',
      reason: 'A document or requirement still needs staff review.',
    }
  }

  if (checklistStats.missingCount > 0) {
    return {
      state: 'blocked_by_missing_item',
      label: 'Missing items',
      tone: 'neutral',
      reason: `${checklistStats.missingCount} required item${checklistStats.missingCount === 1 ? '' : 's'} still missing.`,
    }
  }

  if (stage.includes('decision-ready') || stage.includes('ready for review') || checklistStats.completionPercent === 100) {
    return {
      state: 'ready_for_decision',
      label: 'Ready for decision',
      tone: 'low',
      reason: 'Required materials are in place for decision review.',
    }
  }

  return {
    state: 'in_progress',
    label: 'In progress',
    tone: 'neutral',
    reason: 'This record is still moving through completion work.',
  }
}

function buildSuggestedAction(student, checklistStats, reasonToAct) {
  if (reasonToAct.code === 'trust_block') {
    return { code: 'resolve_trust', label: 'Review trust evidence' }
  }

  if (reasonToAct.code === 'ready_for_decision') {
    return { code: 'open_decision', label: 'Open decision review' }
  }

  if (reasonToAct.code === 'needs_review') {
    const blocker = checklistStats.blockingItems[0]
    return { code: 'review_document', label: blocker ? `Review ${blocker.label}` : 'Review incoming items' }
  }

  if (reasonToAct.code === 'missing_one_item') {
    const blocker = checklistStats.blockingItems[0]
    return { code: 'clear_last_blocker', label: blocker ? `Clear ${blocker.label}` : 'Clear final blocker' }
  }

  return { code: 'follow_up', label: student?.recommendation?.nextBestAction || student?.nextBestAction || 'Follow up on missing items' }
}

function inferSection(student, checklistStats, reasonToAct) {
  const stage = normalizeText(student?.stage)

  if (reasonToAct.code === 'trust_block' || stage.includes('pending evidence')) return 'exceptions'
  if (reasonToAct.code === 'ready_for_decision') return 'ready'
  if (checklistStats.oneItemAway || checklistStats.completionPercent >= 75) return 'close'
  return 'attention'
}

function inferPriority(student, checklistStats, reasonToAct) {
  const fitScore = Number(student?.fitScore) || 0

  if (reasonToAct.code === 'trust_block' || checklistStats.oneItemAway) return 'urgent'
  if (reasonToAct.code === 'ready_for_decision' || fitScore >= 90 || checklistStats.completionPercent >= 75) return 'today'
  return 'soon'
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
  const priorityRank = { urgent: 0, today: 1, soon: 2 }

  return [...(Array.isArray(workItems) ? workItems : [])].sort((left, right) => {
    const priorityDelta = (priorityRank[left.priority] ?? 99) - (priorityRank[right.priority] ?? 99)
    if (priorityDelta !== 0) return priorityDelta
    return (right.completionPercent || 0) - (left.completionPercent || 0)
  })
}
