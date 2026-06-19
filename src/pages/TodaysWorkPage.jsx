import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import SectionHeader from '../components/SectionHeader'
import StatCard from '../components/StatCard'
import WorkItemRow from '../components/WorkItemRow'
import OperationalModeNotice from '../components/OperationalModeNotice'
import { useAuth } from '../context/AuthContext'
import { useStudentRecords } from '../context/StudentRecordsContext'
import { buildWorkItemsFromStudents, buildWorkSummary, sortWorkItems } from '../lib/studentWorkflow'
import { PIPELINE_STATUSES, PIPELINE_STATUS_MEANINGS } from '../lib/admissionsWorkflow'
import {
  getWorkTodayLatestOrchestrationUrl,
  getWorkTodayRecommendationUrl,
  getWorkTodayRouteUrl,
  getWorkErrorMessage,
  normalizeTodayBoardGroups,
  normalizeTodayWorkItems,
  normalizeWorkItems,
  normalizeWorkSummary,
  workTodayBoardUrl,
  legacyWorkTodayUrl,
  workItemsUrl,
  workSummaryUrl,
  workTodayOrchestrateUrl,
  workTodayUrl,
} from '../lib/workApi'

const initialState = {
  summary: null,
  items: [],
  boardGroups: [],
  isLoading: false,
  hasLoaded: false,
  error: '',
  source: 'derived',
}

const chartColors = ['#5b7cfa', '#18b7a6', '#ffb84d', '#f06595']

function toSummaryCards(summary) {
  return [
    { label: 'Needs attention', value: summary.needsAttention || 0, delta: 'Students who need human action now', tone: 'rose' },
    { label: 'Close to completion', value: summary.closeToCompletion || 0, delta: 'One strong touch can move these forward', tone: 'amber' },
    { label: 'Ready for decision', value: summary.readyForDecision || 0, delta: 'Operationally ready for review', tone: 'teal' },
    { label: 'Exceptions', value: summary.exceptions || 0, delta: 'Trust, evidence, or edge-case blockers', tone: 'indigo' },
  ]
}

function groupItems(items) {
  const grouped = {
    attention: [],
    close: [],
    ready: [],
    exceptions: [],
  }

  items.forEach((item) => {
    if (grouped[item.section]) grouped[item.section].push(item)
  })

  return grouped
}

function buildWorkflowFunnel(items, summary) {
  const grouped = groupItems(items)
  return [
    { step: 'Needs attention', count: grouped.attention.length || summary.needsAttention || 0 },
    { step: 'Close to complete', count: grouped.close.length || summary.closeToCompletion || 0 },
    { step: 'Ready for decision', count: grouped.ready.length || summary.readyForDecision || 0 },
    { step: 'Exceptions', count: grouped.exceptions.length || summary.exceptions || 0 },
  ]
}

function buildPriorityMix(items) {
  const priorityCounts = items.reduce((accumulator, item) => {
    const key = item.priority || 'soon'
    accumulator[key] = (accumulator[key] || 0) + 1
    return accumulator
  }, {})

  const labelMap = {
    urgent: 'Urgent',
    today: 'Today',
    soon: 'Soon',
  }

  return Object.entries(priorityCounts).map(([key, value]) => ({
    name: labelMap[key] || key,
    value,
  }))
}

function buildBlockerMix(items) {
  const blockerCounts = items.reduce((accumulator, item) => {
    const labels = item.blockingItems?.length
      ? item.blockingItems.map((blocker) => blocker.label)
      : [item.reasonToAct?.label || 'General follow-up']

    labels.forEach((label) => {
      accumulator[label] = (accumulator[label] || 0) + 1
    })

    return accumulator
  }, {})

  return Object.entries(blockerCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5)
}

function formatDateTime(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function getItemPipelineStatus(item) {
  return item.pipelineStatus || PIPELINE_STATUSES.incomplete
}

function buildCounselorBuckets(items) {
  const now = Date.now()
  const overdueFollowUp = items.filter((item) => {
    const due = new Date(item.nextFollowUpAt || '').getTime()
    return Number.isFinite(due) && due <= now
  })
  const byStatus = Object.values(PIPELINE_STATUSES).map((status) => ({
    key: status,
    label: status,
    meaning: PIPELINE_STATUS_MEANINGS.find((item) => item.status === status)?.meaning || '',
    items: items.filter((item) => getItemPipelineStatus(item) === status),
  }))

  return [
    {
      key: 'overdue',
      label: 'Due follow-up',
      meaning: 'Students with follow-up due now or earlier.',
      items: overdueFollowUp,
    },
    ...byStatus,
  ]
}

function buildHandoffQueueFromStudents(students) {
  return (Array.isArray(students) ? students : []).flatMap((student) => (
    Array.isArray(student.handoffs) ? student.handoffs.map((handoff) => ({
      ...handoff,
      studentId: student.id,
      studentName: student.name,
      program: student.program || student.degreeProgram || '',
    })) : []
  )).filter((handoff) => String(handoff.status || '').toLowerCase() !== 'complete')
}

function buildPostAdmitBlockersFromStudents(students) {
  return (Array.isArray(students) ? students : []).flatMap((student) => (
    Array.isArray(student.postAdmitMilestones) ? student.postAdmitMilestones.map((milestone) => ({
      ...milestone,
      studentId: student.id,
      studentName: student.name,
      program: student.program || student.degreeProgram || '',
    })) : []
  )).filter((milestone) => String(milestone.status || '').toLowerCase() === 'blocked')
}

function buildRecruitmentFollowUpsFromStudents(students) {
  return (Array.isArray(students) ? students : []).flatMap((student) => (
    Array.isArray(student.interactions) ? student.interactions.filter((item) => item.type === 'recruitment_event').map((event) => ({
      ...event,
      studentId: student.id,
      studentName: student.name,
      program: student.program || student.degreeProgram || '',
    })) : []
  ))
}

const counselorActionTypes = [
  { value: 'contacted', label: 'Log contact' },
  { value: 'follow_up', label: 'Set follow-up' },
  { value: 'request_document', label: 'Request missing document' },
  { value: 'route_handoff', label: 'Route / handoff note' },
]

export default function TodaysWorkPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const { students, isLoadingStudents, studentsError, loadStudents, updateChecklistItemStatus, updateStudentWorkState } = useStudentRecords()
  const [state, setState] = useState(initialState)
  const [activeWorkTab, setActiveWorkTab] = useState('attention')
  const [attentionQuery, setAttentionQuery] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionDetail, setActionDetail] = useState('')
  const [activeActionId, setActiveActionId] = useState('')
  const [activeRouteId, setActiveRouteId] = useState('')
  const [activeRecommendationId, setActiveRecommendationId] = useState('')
  const [routeNotes, setRouteNotes] = useState({})
  const [routeRecommendations, setRouteRecommendations] = useState({})
  const [isOrchestrating, setIsOrchestrating] = useState(false)
  const [isLoadingLatestOrchestration, setIsLoadingLatestOrchestration] = useState(false)
  const [orchestrationRun, setOrchestrationRun] = useState(null)
  const [activeCounselorBucket, setActiveCounselorBucket] = useState('overdue')
  const [counselorActionItem, setCounselorActionItem] = useState(null)
  const [counselorActionType, setCounselorActionType] = useState('contacted')
  const [counselorActionNote, setCounselorActionNote] = useState('')
  const [counselorNextAction, setCounselorNextAction] = useState('')
  const [counselorFollowUpAt, setCounselorFollowUpAt] = useState('')
  const [isSavingCounselorAction, setIsSavingCounselorAction] = useState(false)

  const derivedItems = useMemo(() => sortWorkItems(buildWorkItemsFromStudents(students)), [students])
  const derivedSummary = useMemo(() => buildWorkSummary(derivedItems), [derivedItems])
  const derivedItemsRef = useRef(derivedItems)
  const derivedSummaryRef = useRef(derivedSummary)

  useEffect(() => {
    derivedItemsRef.current = derivedItems
    derivedSummaryRef.current = derivedSummary
  }, [derivedItems, derivedSummary])

  const loadWork = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setState((current) => ({
      ...current,
      ...(!current.hasLoaded && derivedItemsRef.current.length ? {
        summary: derivedSummaryRef.current,
        items: derivedItemsRef.current,
        boardGroups: [],
        hasLoaded: true,
        source: 'derived',
      } : {}),
      isLoading: true,
      error: '',
    }))

    try {
      let items = []
      let summary = null

      let todayResponse = await fetchWithTenantAuth(`${workTodayUrl}?limit=100`)
      let todayPayload = await todayResponse.json().catch(() => ({}))

      if (todayResponse.status === 404 || todayResponse.status === 405) {
        todayResponse = await fetchWithTenantAuth(`${legacyWorkTodayUrl}?limit=100`)
        todayPayload = await todayResponse.json().catch(() => ({}))
      }

      if (todayResponse.ok) {
        items = sortWorkItems(normalizeTodayWorkItems(todayPayload))
        summary = buildWorkSummary(items)

        setState({
          summary,
          items,
          boardGroups: [],
          isLoading: false,
          hasLoaded: true,
          error: '',
          source: 'live',
        })

        fetchWithTenantAuth(`${workTodayBoardUrl}?limit=100`)
          .then(async (boardResponse) => {
            const boardPayload = await boardResponse.json().catch(() => ({}))
            if (!boardResponse.ok) return
            const boardGroups = normalizeTodayBoardGroups(boardPayload).map((group) => ({
              ...group,
              items: sortWorkItems(group.items),
            }))
            setState((current) => current.source === 'live' ? { ...current, boardGroups } : current)
          })
          .catch(() => {})
        return
      } else if (todayResponse.status === 404) {
        const [summaryResponse, itemsResponse] = await Promise.all([
          fetchWithTenantAuth(workSummaryUrl),
          fetchWithTenantAuth(workItemsUrl),
        ])

        const summaryPayload = await summaryResponse.json().catch(() => ({}))
        const itemsPayload = await itemsResponse.json().catch(() => ({}))

        if (!summaryResponse.ok || !itemsResponse.ok) {
          const response = !summaryResponse.ok ? summaryResponse : itemsResponse
          const payload = !summaryResponse.ok ? summaryPayload : itemsPayload
          throw new Error(getWorkErrorMessage(response, payload, 'Unable to load today\'s work.'))
        }

        summary = normalizeWorkSummary(summaryPayload)
        items = sortWorkItems(normalizeWorkItems(itemsPayload))
        setState({
          summary,
          items,
          boardGroups: [],
          isLoading: false,
          hasLoaded: true,
          error: '',
          source: 'live',
        })
        return
      } else {
        throw new Error(getWorkErrorMessage(todayResponse, todayPayload, 'Unable to load today\'s work.'))
      }
    } catch (error) {
      setState({
        summary: derivedSummaryRef.current,
        items: derivedItemsRef.current,
        boardGroups: [],
        isLoading: false,
        hasLoaded: true,
        error: error.message || '',
        source: 'derived',
      })
    }
  }, [fetchWithTenantAuth, session])

  useEffect(() => {
    if (!students.length && !isLoadingStudents && session?.access_token && session?.tenant_id) {
      loadStudents().catch(() => {})
    }
  }, [isLoadingStudents, loadStudents, session, students.length])

  useEffect(() => {
    loadWork()
  }, [loadWork])

  const isInitialWorkLoading = state.isLoading && !state.hasLoaded
  const activeItems = state.hasLoaded ? state.items : []
  const activeSummary = state.hasLoaded ? (state.summary || buildWorkSummary(activeItems)) : buildWorkSummary([])
  const liveBoardTabs = useMemo(() => state.boardGroups.map((group) => ({
    key: group.key,
    label: group.label,
    subtitle: `Backend-grouped queue bucket with ${group.total || group.items.length} student${(group.total || group.items.length) === 1 ? '' : 's'}.`,
    routeHint: group.routeHint,
    items: group.items,
  })), [state.boardGroups])
  const groupedItems = useMemo(() => groupItems(activeItems), [activeItems])
  const attentionItems = useMemo(() => {
    const search = attentionQuery.trim().toLowerCase()
    if (!search) return groupedItems.attention

    return groupedItems.attention.filter((item) => {
      const haystack = [
        item.studentName,
        item.program,
        item.institutionGoal,
        item.reasonToAct?.label,
        item.suggestedAction?.label,
        item.owner?.name,
        ...(Array.isArray(item.blockingItems) ? item.blockingItems.map((blocker) => blocker.label) : []),
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(search)
    })
  }, [attentionQuery, groupedItems.attention])
  const summaryCards = useMemo(() => toSummaryCards(activeSummary), [activeSummary])
  const workflowFunnel = useMemo(() => buildWorkflowFunnel(activeItems, activeSummary), [activeItems, activeSummary])
  const priorityMix = useMemo(() => buildPriorityMix(activeItems), [activeItems])
  const blockerMix = useMemo(() => buildBlockerMix(activeItems), [activeItems])
  const counselorBuckets = useMemo(() => buildCounselorBuckets(activeItems), [activeItems])
  const activeCounselorBucketModel = counselorBuckets.find((bucket) => bucket.key === activeCounselorBucket) || counselorBuckets[0]
  const handoffQueue = useMemo(() => buildHandoffQueueFromStudents(students), [students])
  const postAdmitBlockers = useMemo(() => buildPostAdmitBlockersFromStudents(students), [students])
  const recruitmentFollowUps = useMemo(() => buildRecruitmentFollowUpsFromStudents(students), [students])
  const fallbackTabs = useMemo(() => ([
    {
      key: 'attention',
      label: 'Needs attention now',
      subtitle: 'Students with incomplete files that need staff action.',
      items: attentionItems,
    },
    {
      key: 'close',
      label: 'Close to completion',
      subtitle: 'The fastest opportunities to move from incomplete to ready.',
      items: groupedItems.close,
    },
    {
      key: 'ready',
      label: 'Ready for decision',
      subtitle: 'Students whose materials are in place and can move into review.',
      items: groupedItems.ready,
    },
    {
      key: 'exceptions',
      label: 'Exceptions',
      subtitle: 'Trust holds, evidence gaps, and edge cases that block release.',
      items: groupedItems.exceptions,
    },
  ]), [attentionItems, groupedItems.close, groupedItems.exceptions, groupedItems.ready])
  const workTabs = state.source === 'live' && liveBoardTabs.length ? liveBoardTabs : fallbackTabs
  const activeTab = workTabs.find((tab) => tab.key === activeWorkTab) || workTabs[0]

  useEffect(() => {
    if (workTabs.length && !workTabs.some((tab) => tab.key === activeWorkTab)) {
      setActiveWorkTab(workTabs[0].key)
    }
  }, [activeWorkTab, workTabs])

  useEffect(() => {
    if (counselorBuckets.length && !counselorBuckets.some((bucket) => bucket.key === activeCounselorBucket)) {
      setActiveCounselorBucket(counselorBuckets[0].key)
    }
  }, [activeCounselorBucket, counselorBuckets])

  function openCounselorAction(item, actionType = 'contacted') {
    setCounselorActionItem(item)
    setCounselorActionType(actionType)
    setCounselorActionNote('')
    setCounselorNextAction(item.nextAction || item.suggestedAction?.label || '')
    setCounselorFollowUpAt('')
    setActionError('')
    setActionDetail('')
  }

  function closeCounselorAction() {
    setCounselorActionItem(null)
    setCounselorActionType('contacted')
    setCounselorActionNote('')
    setCounselorNextAction('')
    setCounselorFollowUpAt('')
  }

  async function handleSaveCounselorAction(event) {
    event.preventDefault()
    if (!counselorActionItem?.studentId) return

    setIsSavingCounselorAction(true)
    setActionError('')
    setActionDetail('')

    try {
      const nowIso = new Date().toISOString()
      const patch = {
        actionType: counselorActionType,
        note: counselorActionNote.trim(),
        nextAction: counselorNextAction.trim() || counselorActionItem.suggestedAction?.label || 'Follow up',
        contactOutcome: counselorActionType,
        lastContactedAt: counselorActionType === 'contacted' ? nowIso : counselorActionItem.lastContactedAt || '',
        nextFollowUpAt: counselorFollowUpAt ? new Date(counselorFollowUpAt).toISOString() : counselorActionItem.nextFollowUpAt || '',
      }

      await updateStudentWorkState({ studentId: counselorActionItem.studentId, patch })
      await loadWork()
      setActionDetail(`${counselorActionItem.studentName} updated.`)
      closeCounselorAction()
    } catch (error) {
      setActionError(error.message || 'Unable to save counselor action.')
    } finally {
      setIsSavingCounselorAction(false)
    }
  }

  async function handleResolveBlocker(item) {
    const primaryBlocker = item.blockingItems?.[0]
    if (!primaryBlocker?.id) return

    setActiveActionId(item.id)
    setActionError('')
    setActionDetail('')

    try {
      await updateChecklistItemStatus({
        studentId: item.studentId,
        itemId: primaryBlocker.id,
        status: 'complete',
      })
      await loadWork()
    } catch (error) {
      setActionError(error.message || 'Unable to clear blocker.')
    } finally {
      setActiveActionId('')
    }
  }

  function handleRouteNoteChange(item, value) {
    setRouteNotes((current) => ({
      ...current,
      [item.studentId]: value,
    }))
  }

  async function handleRecommendRoute(item) {
    if (!item?.studentId) return

    setActiveRecommendationId(item.id)
    setActionError('')
    setActionDetail('')

    try {
      const response = await fetchWithTenantAuth(getWorkTodayRecommendationUrl(item.studentId))
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getWorkErrorMessage(response, payload, 'Unable to load route recommendation.'))
      }

      setRouteRecommendations((current) => ({
        ...current,
        [item.studentId]: payload,
      }))
      setActionDetail(payload?.reason || 'Route recommendation loaded.')
    } catch (error) {
      setActionError(error.message || 'Unable to load route recommendation.')
    } finally {
      setActiveRecommendationId('')
    }
  }

  async function handleRouteWorkItem(item, nextAgent) {
    if (!item?.studentId) return

    setActiveRouteId(item.id)
    setActionError('')
    setActionDetail('')

    try {
      const note = (routeNotes[item.studentId] || '').trim()
      const response = await fetchWithTenantAuth(getWorkTodayRouteUrl(item.studentId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nextAgent,
          ...(note ? { note } : {}),
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getWorkErrorMessage(response, payload, 'Unable to route work item.'))
      }

      setActionDetail(payload?.detail || `Work item routed to ${nextAgent}.`)
      setRouteNotes((current) => ({
        ...current,
        [item.studentId]: '',
      }))
      setRouteRecommendations((current) => ({
        ...current,
        [item.studentId]: null,
      }))
      await loadWork()
    } catch (error) {
      setActionError(error.message || 'Unable to route work item.')
    } finally {
      setActiveRouteId('')
    }
  }

  function applyOrchestrationPayload(payload, fallbackDetail) {
    const groups = normalizeTodayBoardGroups(payload).map((group) => ({
      ...group,
      items: sortWorkItems(group.items),
    }))

    if (!groups.length) {
      setActionDetail(fallbackDetail)
      return
    }

    const items = sortWorkItems(groups.flatMap((group) => group.items))
    setState((current) => ({
      ...current,
      summary: buildWorkSummary(items),
      items,
      boardGroups: groups,
      isLoading: false,
      hasLoaded: true,
      error: '',
      source: 'live',
    }))
    setOrchestrationRun(payload?.run || null)
    setActionDetail(payload?.run?.result?.message || fallbackDetail)
  }

  async function handleOrchestrateWork() {
    setIsOrchestrating(true)
    setActionError('')
    setActionDetail('')

    try {
      const response = await fetchWithTenantAuth(`${workTodayOrchestrateUrl}?limit=100`, { method: 'POST' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getWorkErrorMessage(response, payload, 'Unable to orchestrate today\'s work.'))
      }

      applyOrchestrationPayload(payload, 'Today\'s work orchestration completed.')
    } catch (error) {
      setActionError(error.message || 'Unable to orchestrate today\'s work.')
    } finally {
      setIsOrchestrating(false)
    }
  }

  async function handleLoadLatestOrchestration() {
    setIsLoadingLatestOrchestration(true)
    setActionError('')
    setActionDetail('')

    try {
      const response = await fetchWithTenantAuth(getWorkTodayLatestOrchestrationUrl())
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getWorkErrorMessage(response, payload, 'Unable to load the latest orchestration.'))
      }

      applyOrchestrationPayload(payload, 'Latest orchestration loaded.')
    } catch (error) {
      setActionError(error.message || 'Unable to load the latest orchestration.')
    } finally {
      setIsLoadingLatestOrchestration(false)
    }
  }

  async function handleRouteActiveBucket() {
    if (!activeTab?.routeHint?.nextAgent || !activeTab.items?.length) return

    setActiveRouteId(activeTab.key)
    setActionError('')
    setActionDetail('')

    try {
      const routeNote = activeTab.routeHint.reason || `Bucket route from ${activeTab.label}.`
      await Promise.all(activeTab.items.map(async (item) => {
        if (!item?.studentId) return
        const response = await fetchWithTenantAuth(getWorkTodayRouteUrl(item.studentId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nextAgent: activeTab.routeHint.nextAgent,
            note: routeNote,
          }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(getWorkErrorMessage(response, payload, `Unable to route ${item.studentName || item.studentId}.`))
        }
      }))

      setActionDetail(`${activeTab.items.length} work item${activeTab.items.length === 1 ? '' : 's'} routed to ${activeTab.routeHint.nextAgent}.`)
      await loadWork()
    } catch (error) {
      setActionError(error.message || 'Unable to route this bucket.')
    } finally {
      setActiveRouteId('')
    }
  }

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Daily operating system"
        title="Today's Work"
        subtitle="Start with what can move now: incomplete apps close to done, students ready for decision, and exceptions blocking release."
        actions={(
          <div className="pill-row compact">
            <button type="button" className="secondary-button" onClick={loadWork} disabled={state.isLoading}>
              {state.isLoading ? 'Refreshing...' : 'Refresh work'}
            </button>
            <button type="button" className="secondary-button" onClick={handleLoadLatestOrchestration} disabled={isLoadingLatestOrchestration || isOrchestrating}>
              {isLoadingLatestOrchestration ? 'Loading...' : 'Load latest orchestration'}
            </button>
            <button type="button" className="primary-button" onClick={handleOrchestrateWork} disabled={isOrchestrating || isLoadingLatestOrchestration}>
              {isOrchestrating ? 'Orchestrating...' : 'Orchestrate work'}
            </button>
          </div>
        )}
      />

      {isInitialWorkLoading ? (
        <section className="panel">
          <p className="muted-copy">Loading today's work...</p>
        </section>
      ) : (
        <>
          <section className="stats-grid">
            {summaryCards.map((stat) => <StatCard key={stat.label} stat={stat} />)}
          </section>

          <section className="todays-insight-grid three-up">
            <article className="panel chart-panel">
              <div className="panel-header">
                <div>
                  <h3>Blocker mix</h3>
                  <p>See the reasons students are stuck so the team can attack the biggest bottlenecks first.</p>
                </div>
              </div>
              <div className="chart-box md">
                {blockerMix.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={blockerMix} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#8e7cff" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted-copy">No blocker data is available yet.</p>
                )}
              </div>
            </article>

            <article className="panel chart-panel">
              <div className="panel-header">
                <div>
                  <h3>Work funnel</h3>
                  <p>See where today&apos;s load is sitting across the operational path.</p>
                </div>
              </div>
              <div className="chart-box md">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={workflowFunnel}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="step" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#5b7cfa" fill="#5b7cfa22" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel chart-panel">
              <div className="panel-header">
                <div>
                  <h3>Priority mix</h3>
                  <p>Know how much of the queue is truly urgent versus work that can wait.</p>
                </div>
              </div>
              <div className="chart-box md">
                {priorityMix.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={priorityMix} dataKey="value" nameKey="name" innerRadius={42} outerRadius={76} paddingAngle={4}>
                        {priorityMix.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted-copy">No priority data is available yet.</p>
                )}
              </div>
              <div className="legend-list">
                {priorityMix.map((item, index) => (
                  <div key={item.name} className="legend-row">
                    <span className="legend-dot" style={{ background: chartColors[index % chartColors.length] }} />
                    <span>{item.name}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          {state.isLoading && !activeItems.length ? (
            <section className="panel">
              <p className="muted-copy">Refreshing today's work...</p>
            </section>
          ) : null}

          <section className="panel counselor-workbench-panel">
            <div className="panel-header">
              <div>
                <h3>Counselor workbench</h3>
                <p>Pipeline-focused follow-up buckets for the counselor day: first touch, missing items, review readiness, admit yield, and registration movement.</p>
              </div>
            </div>

            <div className="counselor-bucket-grid">
              {counselorBuckets.map((bucket) => (
                <button
                  key={bucket.key}
                  type="button"
                  className={`counselor-bucket-card ${activeCounselorBucket === bucket.key ? 'active' : ''}`}
                  onClick={() => setActiveCounselorBucket(bucket.key)}
                >
                  <span>{bucket.label}</span>
                  <strong>{bucket.items.length}</strong>
                  <small>{bucket.meaning}</small>
                </button>
              ))}
            </div>

            <div className="panel-header counselor-bucket-header">
              <div>
                <h3>{activeCounselorBucketModel?.label}</h3>
                <p>{activeCounselorBucketModel?.meaning}</p>
              </div>
            </div>

            <div className="counselor-followup-list">
              {activeCounselorBucketModel?.items.length ? activeCounselorBucketModel.items.slice(0, 6).map((item) => (
                <article key={`${activeCounselorBucketModel.key}-${item.id}`} className="counselor-followup-row">
                  <div>
                    <h4>{item.studentName}</h4>
                    <p>{item.program || 'Program pending'} - {item.reasonToAct?.label || item.suggestedAction?.label || 'Follow up'}</p>
                  </div>
                  <div className="counselor-followup-meta">
                    <span>Next follow-up: {formatDateTime(item.nextFollowUpAt)}</span>
                    <span>Last contact: {formatDateTime(item.lastContactedAt)}</span>
                  </div>
                  <div className="pill-row compact">
                    <button type="button" className="secondary-button" onClick={() => openCounselorAction(item, 'contacted')}>Log contact</button>
                    <button type="button" className="secondary-button" onClick={() => openCounselorAction(item, 'follow_up')}>Set follow-up</button>
                  </div>
                </article>
              )) : (
                <p className="muted-copy">No students are currently in this counselor bucket.</p>
              )}
            </div>
          </section>

          <section className="dashboard-grid three-up work-queue-grid">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h3>Handoff queue</h3>
                  <p>Open cross-office ownership for admissions operations, aid, registrar, advising, housing, and accounts.</p>
                </div>
                <span className="badge neutral-badge">{handoffQueue.length}</span>
              </div>
              <div className="stack-list compact-stack-list">
                {handoffQueue.slice(0, 5).map((handoff) => (
                  <div key={handoff.id} className="stack-row">
                    <strong>{handoff.studentName}</strong>
                    <span>{handoff.targetTeam || 'Handoff'} - {handoff.owner || 'Unassigned'} - {handoff.dueAt ? formatDateTime(handoff.dueAt) : 'No due date'}</span>
                  </div>
                ))}
                {!handoffQueue.length ? <div className="stack-row"><strong>No active handoffs</strong><span>Open handoffs will appear here.</span></div> : null}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h3>Post-admit blockers</h3>
                  <p>Blocked financial aid, orientation, advising, registration, housing, or account milestones.</p>
                </div>
                <span className="badge neutral-badge">{postAdmitBlockers.length}</span>
              </div>
              <div className="stack-list compact-stack-list">
                {postAdmitBlockers.slice(0, 5).map((milestone) => (
                  <div key={`${milestone.studentId}-${milestone.id}`} className="stack-row">
                    <strong>{milestone.studentName}</strong>
                    <span>{milestone.label || milestone.id} - {milestone.owner || 'Unassigned'}</span>
                  </div>
                ))}
                {!postAdmitBlockers.length ? <div className="stack-row"><strong>No blocked milestones</strong><span>Blocked post-admit steps will appear here.</span></div> : null}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h3>Recruitment follow-up</h3>
                  <p>Recent event and territory attribution tied to student follow-up.</p>
                </div>
                <span className="badge neutral-badge">{recruitmentFollowUps.length}</span>
              </div>
              <div className="stack-list compact-stack-list">
                {recruitmentFollowUps.slice(0, 5).map((event) => (
                  <div key={event.id} className="stack-row">
                    <strong>{event.studentName}</strong>
                    <span>{event.eventType || event.title} - {event.territory || 'No territory'} - {formatDateTime(event.occurredAt)}</span>
                  </div>
                ))}
                {!recruitmentFollowUps.length ? <div className="stack-row"><strong>No recruitment activity</strong><span>Logged events and source attribution will appear here.</span></div> : null}
              </div>
            </article>
          </section>

          <div className="work-tabs-stack">
            <div className="tab-switcher">
              {workTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`tab-button ${activeWorkTab === tab.key ? 'active-tab-button' : ''}`}
                  onClick={() => setActiveWorkTab(tab.key)}
                >
                  <span>{tab.label}</span>
                  <strong>{tab.items.length}</strong>
                </button>
              ))}
            </div>

            <section className="panel work-section-panel tabbed-work-panel">
          <OperationalModeNotice
            mode={state.source}
            error={state.error || studentsError}
            liveLabel="Live Today's Work"
            derivedLabel="Derived from Student 360"
            isLoading={state.isLoading}
            onRetry={loadWork}
          />
          {(orchestrationRun?.runId || orchestrationRun?.result?.code) ? (
            <div className="pill-row compact">
              {orchestrationRun?.runId ? <span className="tag">Run: {orchestrationRun.runId}</span> : null}
              {orchestrationRun?.result?.code ? <span className="tag">Outcome: {orchestrationRun.result.code}</span> : null}
            </div>
          ) : null}
          <div className="panel-header">
            <div>
              <h3>{activeTab?.label}</h3>
              <p>{activeTab?.subtitle}</p>
            </div>
            {activeTab?.routeHint?.nextAgent ? (
              <button
                type="button"
                className="secondary-button"
                onClick={handleRouteActiveBucket}
                disabled={activeRouteId === activeTab.key || !activeTab.items.length}
              >
                {activeRouteId === activeTab.key ? 'Routing...' : activeTab.routeHint.actionLabel || 'Route bucket'}
              </button>
            ) : null}
          </div>

          {activeTab?.routeHint ? (
            <div className="callout-card accent-soft">
              <h4>Bucket route hint</h4>
              <p>{activeTab.routeHint.reason || 'Backend did not provide a route reason.'}</p>
              {activeTab.routeHint.nextAgent ? <span className="tag">Next: {activeTab.routeHint.nextAgent}</span> : null}
            </div>
          ) : null}

          {actionError ? <p className="auth-error">{actionError}</p> : null}
          {actionDetail ? <p className="muted-copy">{actionDetail}</p> : null}

          {activeWorkTab === 'attention' && !(state.source === 'live' && liveBoardTabs.length) ? (
            <input
              className="filter-input"
              placeholder="Search this section by student, blocker, owner, or next action"
              value={attentionQuery}
              onChange={(event) => setAttentionQuery(event.target.value)}
            />
          ) : null}

          <div className="work-item-list tabbed-work-list">
            {activeTab?.items.length ? activeTab.items.map((item) => (
              <WorkItemRow
                key={item.id}
                item={item}
                onResolvePrimaryAction={handleResolveBlocker}
                onOpenCounselorAction={openCounselorAction}
                isResolving={activeActionId === item.id}
                onRouteWorkItem={state.source === 'live' ? handleRouteWorkItem : undefined}
                onRecommendRoute={state.source === 'live' ? handleRecommendRoute : undefined}
                isRouting={activeRouteId === item.id}
                isLoadingRecommendation={activeRecommendationId === item.id}
                routeNote={routeNotes[item.studentId] || ''}
                routeRecommendation={routeRecommendations[item.studentId] || null}
                onRouteNoteChange={handleRouteNoteChange}
              />
            )) : <p className="muted-copy">{activeWorkTab === 'attention' ? 'No students in this section match that search.' : 'No students in this section.'}</p>}
          </div>
            </section>
          </div>
        </>
      )}

      {counselorActionItem ? (
        <div className="modal-scrim" onClick={closeCounselorAction} role="presentation">
          <div className="modal-panel counselor-action-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="panel-header">
              <div>
                <h3>{counselorActionItem.studentName}</h3>
                <p>{counselorActionItem.program || 'Program pending'} - {counselorActionItem.reasonToAct?.label || 'Counselor action'}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeCounselorAction} aria-label="Close counselor action">x</button>
            </div>

            <form className="auth-form password-form" onSubmit={handleSaveCounselorAction}>
              <label className="auth-field">
                <span>Action</span>
                <select value={counselorActionType} onChange={(event) => setCounselorActionType(event.target.value)}>
                  {counselorActionTypes.map((action) => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </select>
              </label>

              <label className="auth-field">
                <span>Next action</span>
                <input value={counselorNextAction} onChange={(event) => setCounselorNextAction(event.target.value)} placeholder="Follow up on missing transcript" />
              </label>

              <label className="auth-field">
                <span>Next follow-up</span>
                <input type="datetime-local" value={counselorFollowUpAt} onChange={(event) => setCounselorFollowUpAt(event.target.value)} />
              </label>

              <label className="auth-field">
                <span>Note</span>
                <textarea value={counselorActionNote} onChange={(event) => setCounselorActionNote(event.target.value)} placeholder="Student asked about transcript status, aid, deposit, or registration next steps." />
              </label>

              <div className="password-actions">
                <button type="button" className="secondary-button" onClick={closeCounselorAction}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSavingCounselorAction}>
                  {isSavingCounselorAction ? 'Saving...' : 'Save action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
