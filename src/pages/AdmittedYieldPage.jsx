import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage, normalizeItems, toYieldCard, yieldQueueUrl } from '../lib/operationsApi'

const viewOptions = [
  { key: 'newly_admitted', label: 'Newly admitted' },
  { key: 'high_likelihood', label: 'High likelihood' },
  { key: 'high_value_transfer', label: 'High-value transfer' },
  { key: 'no_recent_activity', label: 'No recent activity' },
  { key: 'scholarship_sensitive', label: 'Scholarship-sensitive' },
  { key: 'missing_next_step', label: 'Missing next step' },
]

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default function AdmittedYieldPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const [activeView, setActiveView] = useState('high_likelihood')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadYield = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      params.set('view', activeView)
      if (query.trim()) params.set('q', query.trim())

      const response = await fetchWithTenantAuth(`${yieldQueueUrl}?${params.toString()}`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to load admitted and yield students.'))
      }

      setItems(normalizeItems(payload, ['yield']).map(toYieldCard))
    } catch (nextError) {
      setItems([])
      setError(nextError.message || 'Unable to load admitted and yield students.')
    } finally {
      setIsLoading(false)
    }
  }, [activeView, fetchWithTenantAuth, query, session])

  useEffect(() => {
    loadYield()
  }, [loadYield])

  const metrics = useMemo(() => ({
    total: items.length,
    strong: items.filter((item) => item.yieldScore >= 70).length,
    notDeposited: items.filter((item) => item.depositStatus !== 'deposited').length,
  }), [items])

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Yield"
        title="Admitted / Yield"
        subtitle="Students with the strongest conversion potential and the clearest next intervention."
        actions={<button type="button" className="secondary-button" onClick={loadYield}>Refresh yield</button>}
      />

      <section className="stats-grid">
        <article className="panel value-card">
          <span className="table-sub">In view</span>
          <strong>{metrics.total}</strong>
          <p>Students in the current yield segment.</p>
        </article>
        <article className="panel value-card">
          <span className="table-sub">Strong yield score</span>
          <strong>{metrics.strong}</strong>
          <p>Students who are most likely to convert with timely outreach.</p>
        </article>
        <article className="panel value-card">
          <span className="table-sub">Not yet deposited</span>
          <strong>{metrics.notDeposited}</strong>
          <p>Admits still needing a next-step push.</p>
        </article>
      </section>

      <section className="panel">
        <div className="table-toolbar today-filter-bar">
          <input
            className="filter-input"
            placeholder="Search student, program, counselor, or next step"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="pill-row">
            {viewOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`tag ${activeView === option.key ? 'active-tag' : ''}`}
                onClick={() => setActiveView(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {error ? <p className="muted-copy">{error}</p> : null}
        </div>
      </section>

      <section className="student-grid">
        {isLoading && !items.length ? <article className="panel"><p className="muted-copy">Loading yield students...</p></article> : null}
        {!isLoading && items.length ? items.map((item) => (
          <article key={item.id} className="student-card">
            <div className="student-card-top">
              <div>
                <h3>{item.studentName}</h3>
                <p>{item.program}</p>
              </div>
              <span className={`badge ${item.yieldScore >= 70 ? 'risk-low' : item.yieldScore >= 50 ? 'risk-medium' : 'risk-high'}`}>
                {item.yieldScore} yield
              </span>
            </div>

            <div className="metric-cluster">
              <div><span>Admit date</span><strong>{formatDate(item.admitDate)}</strong></div>
              <div><span>Deposit</span><strong>{item.depositStatus}</strong></div>
              <div><span>Milestones</span><strong>{Math.round(item.milestoneCompletion * 100)}%</strong></div>
            </div>

            <div className="student-blocker">
              <span className="table-sub">Assigned counselor</span>
              <strong>{item.assignedCounselor?.name || 'Unassigned'}</strong>
            </div>

            <div className="card-footer-row">
              <span>Last activity: {formatDate(item.lastActivityAt)}</span>
              <span>Next: {item.nextStep}</span>
            </div>

            <div className="work-item-actions">
              <Link to={`/students/${item.studentId}`} className="secondary-button">Open student</Link>
              <button type="button" className="primary-button">Log outreach</button>
            </div>
          </article>
        )) : null}
        {!isLoading && !items.length ? <article className="panel"><p className="muted-copy">No admitted or yield-focused students are available yet.</p></article> : null}
      </section>
    </div>
  )
}
