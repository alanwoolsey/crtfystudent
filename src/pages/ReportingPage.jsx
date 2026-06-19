import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'
import { useStudentRecords } from '../context/StudentRecordsContext'
import {
  getApiErrorMessage,
  reportingCounselorWorkloadUrl,
  reportingFunnelUrl,
  reportingHandoffsUrl,
  reportingOverviewUrl,
  reportingStageAgingUrl,
} from '../lib/operationsApi'
import { PIPELINE_STATUSES } from '../lib/admissionsWorkflow'

const fallbackMetrics = {
  incompleteToCompleteConversion: 0.62,
  averageDaysToComplete: 11.4,
  averageDaysCompleteToDecision: 3.2,
  autoIndexSuccessRate: 0.71,
  admitToDepositConversion: 0.38,
  meltRate: 0.09,
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}

function buildTrendData(metrics) {
  return [
    { step: 'Incomplete to complete', value: Math.round((metrics.incompleteToCompleteConversion || 0) * 100) },
    { step: 'Auto-index success', value: Math.round((metrics.autoIndexSuccessRate || 0) * 100) },
    { step: 'Admit to deposit', value: Math.round((metrics.admitToDepositConversion || 0) * 100) },
    { step: 'Melt inverse', value: Math.max(0, 100 - Math.round((metrics.meltRate || 0) * 100)) },
  ]
}

function normalizeStage(value) {
  return Object.values(PIPELINE_STATUSES).find((status) => status.toLowerCase() === String(value || '').toLowerCase()) || value || 'Unknown'
}

function buildStudentFunnel(students) {
  return Object.values(PIPELINE_STATUSES).map((status) => ({
    stage: status,
    count: students.filter((student) => normalizeStage(student.stage) === status).length,
  }))
}

function buildCounselorWorkload(students) {
  const counts = students.reduce((accumulator, student) => {
    const owner = student.advisor || 'Unassigned'
    accumulator[owner] = (accumulator[owner] || 0) + 1
    return accumulator
  }, {})

  return Object.entries(counts)
    .map(([owner, count]) => ({ owner, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8)
}

function buildSourcePerformance(students) {
  const counts = students.reduce((accumulator, student) => {
    const source = student.source || student.sourceSchool || student.partnerSchool || 'Unknown'
    accumulator[source] = (accumulator[source] || 0) + 1
    return accumulator
  }, {})

  return Object.entries(counts)
    .map(([source, count]) => ({ source, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8)
}

function buildHandoffAging(students) {
  const now = Date.now()
  const handoffs = students.flatMap((student) => Array.isArray(student.handoffs) ? student.handoffs : [])
  const open = handoffs.filter((handoff) => String(handoff.status || '').toLowerCase() !== 'complete')
  const overdue = open.filter((handoff) => {
    const due = new Date(handoff.dueAt || '').getTime()
    return Number.isFinite(due) && due < now
  })

  return {
    open: open.length,
    overdue: overdue.length,
    completionRate: handoffs.length ? (handoffs.length - open.length) / handoffs.length : 0,
  }
}

function normalizeFunnelPayload(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.stages)
      ? payload.stages
      : Array.isArray(payload?.funnel)
        ? payload.funnel
        : Array.isArray(payload?.items)
          ? payload.items
          : []

  return rows.map((row) => ({
    stage: row.stage || row.pipelineStatus || row.label || 'Unknown',
    count: Number(row.count ?? row.students ?? row.total) || 0,
  }))
}

function normalizeWorkloadPayload(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.counselors)
      ? payload.counselors
      : Array.isArray(payload?.items)
        ? payload.items
        : []

  return rows.map((row) => ({
    owner: row.ownerName || row.owner?.name || row.counselor || row.owner || 'Unassigned',
    count: Number(row.count ?? row.students ?? row.assignedStudents) || 0,
  }))
}

function normalizeSourcePayload(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.sources)
      ? payload.sources
      : Array.isArray(payload?.items)
        ? payload.items
        : []

  return rows.map((row) => ({
    source: row.source || row.territory || row.label || 'Unknown',
    count: Number(row.count ?? row.students ?? row.total) || 0,
  }))
}

function normalizeHandoffPayload(payload) {
  const source = payload?.summary || payload || {}
  return {
    open: Number(source.open ?? source.openCount ?? source.active) || 0,
    overdue: Number(source.overdue ?? source.overdueCount) || 0,
    completionRate: Number(source.completionRate ?? source.completedRate) || 0,
  }
}

export default function ReportingPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const { students } = useStudentRecords()
  const [metrics, setMetrics] = useState(fallbackMetrics)
  const [mode, setMode] = useState('fallback')
  const [liveFunnel, setLiveFunnel] = useState([])
  const [liveWorkload, setLiveWorkload] = useState([])
  const [liveSources, setLiveSources] = useState([])
  const [liveHandoffAging, setLiveHandoffAging] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadReporting = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetchWithTenantAuth(reportingOverviewUrl)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to load reporting overview.'))
      }

      setMetrics({
        incompleteToCompleteConversion: Number(payload?.incompleteToCompleteConversion) || 0,
        averageDaysToComplete: Number(payload?.averageDaysToComplete) || 0,
        averageDaysCompleteToDecision: Number(payload?.averageDaysCompleteToDecision) || 0,
        autoIndexSuccessRate: Number(payload?.autoIndexSuccessRate) || 0,
        admitToDepositConversion: Number(payload?.admitToDepositConversion) || 0,
        meltRate: Number(payload?.meltRate) || 0,
      })

      const [funnelResult, workloadResult, handoffResult, stageAgingResult] = await Promise.allSettled([
        fetchWithTenantAuth(reportingFunnelUrl),
        fetchWithTenantAuth(reportingCounselorWorkloadUrl),
        fetchWithTenantAuth(reportingHandoffsUrl),
        fetchWithTenantAuth(reportingStageAgingUrl),
      ])

      if (funnelResult.status === 'fulfilled' && funnelResult.value.ok) {
        setLiveFunnel(normalizeFunnelPayload(await funnelResult.value.json().catch(() => ({}))))
      }
      if (workloadResult.status === 'fulfilled' && workloadResult.value.ok) {
        setLiveWorkload(normalizeWorkloadPayload(await workloadResult.value.json().catch(() => ({}))))
      }
      if (handoffResult.status === 'fulfilled' && handoffResult.value.ok) {
        setLiveHandoffAging(normalizeHandoffPayload(await handoffResult.value.json().catch(() => ({}))))
      }
      if (stageAgingResult.status === 'fulfilled' && stageAgingResult.value.ok) {
        setLiveSources(normalizeSourcePayload(await stageAgingResult.value.json().catch(() => ({}))))
      }
      setMode('live')
    } catch (nextError) {
      setMetrics(fallbackMetrics)
      setMode('fallback')
      setLiveFunnel([])
      setLiveWorkload([])
      setLiveSources([])
      setLiveHandoffAging(null)
      setError(nextError.message || 'Unable to load reporting overview.')
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithTenantAuth, session])

  useEffect(() => {
    loadReporting()
  }, [loadReporting])

  const reportCards = useMemo(() => ([
    { label: 'Incomplete to complete conversion', value: formatPercent(metrics.incompleteToCompleteConversion), detail: 'Share of incomplete applicants moving to operational completeness.' },
    { label: 'Average days to complete', value: metrics.averageDaysToComplete.toFixed(1), detail: 'Operational KPI for the core incomplete workflow.' },
    { label: 'Average days complete to decision', value: metrics.averageDaysCompleteToDecision.toFixed(1), detail: 'Tracks review efficiency after the file is ready.' },
    { label: 'Auto-index success rate', value: formatPercent(metrics.autoIndexSuccessRate), detail: 'Measures document automation quality.' },
    { label: 'Admit to deposit conversion', value: formatPercent(metrics.admitToDepositConversion), detail: 'Critical yield KPI for small-school enrollment teams.' },
    { label: 'Melt rate', value: formatPercent(metrics.meltRate), detail: 'Post-deposit risk measure that supports summer intervention.' },
  ]), [metrics])

  const trendData = useMemo(() => buildTrendData(metrics), [metrics])
  const studentFunnel = useMemo(() => liveFunnel.length ? liveFunnel : buildStudentFunnel(students), [liveFunnel, students])
  const counselorWorkload = useMemo(() => liveWorkload.length ? liveWorkload : buildCounselorWorkload(students), [liveWorkload, students])
  const sourcePerformance = useMemo(() => liveSources.length ? liveSources : buildSourcePerformance(students), [liveSources, students])
  const handoffAging = useMemo(() => liveHandoffAging || buildHandoffAging(students), [liveHandoffAging, students])

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Reporting"
        title="Reporting"
        subtitle="Operational and leadership metrics tied directly to completion, decision speed, yield, and melt."
        actions={<button type="button" className="secondary-button" onClick={loadReporting}>Refresh reporting</button>}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Overview</h3>
            <p>Live value metrics that prove the product is improving application flow and enrollment outcomes.</p>
          </div>
          <div className="pill-row compact">
            <span className="tag">{mode === 'live' ? 'Live reporting API' : 'Fallback reporting values'}</span>
          </div>
        </div>
        {error ? <p className="muted-copy">{error}</p> : null}
      </section>

      <section className="value-grid two-up">
        {reportCards.map((card) => (
          <article key={card.label} className="panel value-card">
            <span className="table-sub">{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid two-up">
        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h3>Operational impact</h3>
              <p>Quick read on the conversion and quality metrics leadership will care about most.</p>
            </div>
          </div>
          <div className="chart-box lg">
            {isLoading && mode === 'fallback' ? (
              <p className="muted-copy">Loading reporting...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="step" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#18b7a6" fill="#18b7a622" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>What to watch</h3>
              <p>These are the metrics that best tie operations to revenue and staffing efficiency.</p>
            </div>
          </div>
          <div className="stack-list">
            <div className="stack-row"><strong>Completion velocity</strong><span>Watch average days to complete alongside incomplete-to-complete conversion.</span></div>
            <div className="stack-row"><strong>Review speed</strong><span>Time from complete to decision is where queue discipline shows up.</span></div>
            <div className="stack-row"><strong>Document quality</strong><span>Auto-index success tells you whether processors are working exceptions or doing basic clerical cleanup.</span></div>
            <div className="stack-row"><strong>Enrollment protection</strong><span>Admit-to-deposit and melt rate are where revenue justification lands.</span></div>
          </div>
        </article>
      </section>

      <section className="dashboard-grid two-up">
        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h3>Inquiry to registered funnel</h3>
              <p>Student counts across the canonical admissions pipeline.</p>
            </div>
          </div>
          <div className="chart-box lg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentFunnel}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="stage" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#5b7cfa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Handoff SLA</h3>
              <p>Open handoffs, overdue ownership, and completion signal.</p>
            </div>
          </div>
          <div className="metric-cluster profile-metrics">
            <div><span>Open</span><strong>{handoffAging.open}</strong></div>
            <div><span>Overdue</span><strong>{handoffAging.overdue}</strong></div>
            <div><span>Completed</span><strong>{formatPercent(handoffAging.completionRate)}</strong></div>
          </div>
          <div className="stack-list">
            {counselorWorkload.map((row) => (
              <div key={row.owner} className="stack-row"><strong>{row.owner}</strong><span>{row.count} assigned students</span></div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid two-up">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Counselor workload</h3>
              <p>Assigned students by counselor or queue owner.</p>
            </div>
          </div>
          <div className="mini-table reporting-mini-table">
            <div className="mini-table-head"><span>Owner</span><span>Students</span></div>
            {counselorWorkload.map((row) => (
              <div key={row.owner} className="mini-table-row"><span>{row.owner}</span><span>{row.count}</span></div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Source performance</h3>
              <p>Recruitment, partner, and source volume for attribution reporting.</p>
            </div>
          </div>
          <div className="mini-table reporting-mini-table">
            <div className="mini-table-head"><span>Source</span><span>Students</span></div>
            {sourcePerformance.map((row) => (
              <div key={row.source} className="mini-table-row"><span>{row.source}</span><span>{row.count}</span></div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
