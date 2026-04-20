import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import SectionHeader from '../components/SectionHeader'
import StatCard from '../components/StatCard'
import WorkItemRow from '../components/WorkItemRow'
import { useAuth } from '../context/AuthContext'
import { useStudentRecords } from '../context/StudentRecordsContext'
import { buildWorkItemsFromStudents, buildWorkSummary, sortWorkItems } from '../lib/studentWorkflow'
import { getWorkErrorMessage, normalizeWorkItems, normalizeWorkSummary, workItemsUrl, workSummaryUrl } from '../lib/workApi'

const initialState = {
  summary: null,
  items: [],
  isLoading: false,
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

export default function TodaysWorkPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const { students, isLoadingStudents, studentsError, loadStudents, updateChecklistItemStatus } = useStudentRecords()
  const [state, setState] = useState(initialState)
  const [activeWorkTab, setActiveWorkTab] = useState('attention')
  const [attentionQuery, setAttentionQuery] = useState('')
  const [actionError, setActionError] = useState('')
  const [activeActionId, setActiveActionId] = useState('')

  const derivedItems = useMemo(() => sortWorkItems(buildWorkItemsFromStudents(students)), [students])
  const derivedSummary = useMemo(() => buildWorkSummary(derivedItems), [derivedItems])

  const loadWork = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setState((current) => ({
      ...current,
      isLoading: true,
      error: '',
    }))

    try {
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

      setState({
        summary: normalizeWorkSummary(summaryPayload),
        items: sortWorkItems(normalizeWorkItems(itemsPayload)),
        isLoading: false,
        error: '',
        source: 'live',
      })
    } catch (error) {
      setState({
        summary: derivedSummary,
        items: derivedItems,
        isLoading: false,
        error: error.message || '',
        source: 'derived',
      })
    }
  }, [derivedItems, derivedSummary, fetchWithTenantAuth, session])

  useEffect(() => {
    if (!students.length && !isLoadingStudents && session?.access_token && session?.tenant_id) {
      loadStudents().catch(() => {})
    }
  }, [isLoadingStudents, loadStudents, session, students.length])

  useEffect(() => {
    loadWork()
  }, [loadWork])

  const activeItems = state.source === 'live' ? state.items : derivedItems
  const activeSummary = state.source === 'live' ? (state.summary || derivedSummary) : derivedSummary
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
  const workTabs = useMemo(() => ([
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
  const activeTab = workTabs.find((tab) => tab.key === activeWorkTab) || workTabs[0]

  async function handleResolveBlocker(item) {
    const primaryBlocker = item.blockingItems?.[0]
    if (!primaryBlocker?.id) return

    setActiveActionId(item.id)
    setActionError('')

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

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Daily operating system"
        title="Today's Work"
        subtitle="Start with what can move now: incomplete apps close to done, students ready for decision, and exceptions blocking release."
        actions={<button type="button" className="secondary-button" onClick={loadWork}>Refresh work</button>}
      />

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
          <p className="muted-copy">Loading today&apos;s work...</p>
        </section>
      ) : null}

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
          <div className="pill-row compact">
            <span className="tag">{state.source === 'live' ? 'Live work queue' : 'Derived from Student 360'}</span>
            {studentsError ? <span className="badge risk-high">{studentsError}</span> : null}
          </div>
          <div className="panel-header">
            <div>
              <h3>{activeTab?.label}</h3>
              <p>{activeTab?.subtitle}</p>
            </div>
          </div>

          {actionError ? <p className="auth-error">{actionError}</p> : null}
          {state.error ? <p className="muted-copy">{state.error}</p> : null}

          {activeWorkTab === 'attention' ? (
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
                isResolving={activeActionId === item.id}
              />
            )) : <p className="muted-copy">{activeWorkTab === 'attention' ? 'No students in this section match that search.' : 'No students in this section.'}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
