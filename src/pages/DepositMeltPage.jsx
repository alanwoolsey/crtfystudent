import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage, meltQueueUrl, normalizeItems, toMeltCard } from '../lib/operationsApi'

const viewOptions = [
  { key: 'all_clear', label: 'Deposited all-clear' },
  { key: 'at_risk', label: 'At risk' },
  { key: 'missing_fafsa', label: 'Missing FAFSA' },
  { key: 'missing_orientation', label: 'Missing orientation' },
  { key: 'missing_final_transcript', label: 'Missing final transcript' },
  { key: 'registration_incomplete', label: 'Registration incomplete' },
]

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default function DepositMeltPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const [activeView, setActiveView] = useState('at_risk')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadMelt = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      params.set('view', activeView)
      if (query.trim()) params.set('q', query.trim())

      const response = await fetchWithTenantAuth(`${meltQueueUrl}?${params.toString()}`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to load melt watch.'))
      }

      setItems(normalizeItems(payload, ['melt']).map(toMeltCard))
    } catch (nextError) {
      setItems([])
      setError(nextError.message || 'Unable to load melt watch.')
    } finally {
      setIsLoading(false)
    }
  }, [activeView, fetchWithTenantAuth, query, session])

  useEffect(() => {
    loadMelt()
  }, [loadMelt])

  const metrics = useMemo(() => ({
    total: items.length,
    highRisk: items.filter((item) => item.meltRisk >= 70).length,
    blockers: items.filter((item) => item.missingMilestones.length > 0).length,
  }), [items])

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Post-admit"
        title="Deposit / Melt"
        subtitle="Students who need continued intervention between deposit intent and actual enrollment."
        actions={<button type="button" className="secondary-button" onClick={loadMelt}>Refresh melt watch</button>}
      />

      <section className="stats-grid">
        <article className="panel value-card">
          <span className="table-sub">In watchlist</span>
          <strong>{metrics.total}</strong>
          <p>Students in the current post-admit risk segment.</p>
        </article>
        <article className="panel value-card">
          <span className="table-sub">High melt risk</span>
          <strong>{metrics.highRisk}</strong>
          <p>Deposited students needing intervention now.</p>
        </article>
        <article className="panel value-card">
          <span className="table-sub">Missing milestones</span>
          <strong>{metrics.blockers}</strong>
          <p>Students blocked by FAFSA, orientation, final transcript, or registration gaps.</p>
        </article>
      </section>

      <section className="panel">
        <div className="table-toolbar today-filter-bar">
          <input
            className="filter-input"
            placeholder="Search student, program, owner, or missing milestone"
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
        {isLoading && !items.length ? <article className="panel"><p className="muted-copy">Loading melt watch...</p></article> : null}
        {!isLoading && items.length ? items.map((item) => (
          <article key={item.id} className="student-card">
            <div className="student-card-top">
              <div>
                <h3>{item.studentName}</h3>
                <p>{item.program}</p>
              </div>
              <span className={`badge ${item.meltRisk >= 70 ? 'risk-high' : item.meltRisk >= 45 ? 'risk-medium' : 'risk-low'}`}>
                {item.meltRisk} melt risk
              </span>
            </div>

            <div className="metric-cluster">
              <div><span>Deposit date</span><strong>{formatDate(item.depositDate)}</strong></div>
              <div><span>Owner</span><strong>{item.owner?.name || 'Unassigned'}</strong></div>
              <div><span>Open blockers</span><strong>{item.missingMilestones.length}</strong></div>
            </div>

            <div className="pill-row compact">
              {item.missingMilestones.length
                ? item.missingMilestones.map((milestone) => <span key={`${item.id}-${milestone}`} className="tag">{milestone}</span>)
                : <span className="tag">No blockers</span>}
            </div>

            <div className="card-footer-row">
              <span>Last outreach: {formatDate(item.lastOutreachAt)}</span>
              <span>{item.missingMilestones.length ? 'Needs intervention' : 'On track'}</span>
            </div>

            <div className="work-item-actions">
              <Link to={`/students/${item.studentId}`} className="secondary-button">Open student</Link>
              <button type="button" className="primary-button">Log follow-up</button>
            </div>
          </article>
        )) : null}
        {!isLoading && !items.length ? <article className="panel"><p className="muted-copy">No melt-risk students are available yet.</p></article> : null}
      </section>
    </div>
  )
}
