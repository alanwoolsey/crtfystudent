import { useCallback, useEffect, useMemo, useState } from 'react'
import SectionHeader from '../components/SectionHeader'
import WorkItemRow from '../components/WorkItemRow'
import { useAuth } from '../context/AuthContext'
import { useStudentRecords } from '../context/StudentRecordsContext'
import { buildWorkItemsFromStudents, sortWorkItems } from '../lib/studentWorkflow'
import { getApiErrorMessage, normalizeItems, reviewReadyUrl, toWorkItemFromReady } from '../lib/operationsApi'

export default function ReadyForReviewPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const { students } = useStudentRecords()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [mode, setMode] = useState('derived')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const derivedItems = useMemo(
    () => sortWorkItems(buildWorkItemsFromStudents(students).filter((item) => item.section === 'ready')),
    [students],
  )
  const activeItems = mode === 'live' ? items : derivedItems

  const loadQueue = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())

      const response = await fetchWithTenantAuth(`${reviewReadyUrl}${params.toString() ? `?${params.toString()}` : ''}`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to load review-ready files.'))
      }

      setItems(sortWorkItems(normalizeItems(payload, ['reviewReady']).map(toWorkItemFromReady)))
      setMode('live')
    } catch (nextError) {
      setItems([])
      setMode('derived')
      setError(nextError.message || 'Unable to load review-ready files.')
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithTenantAuth, query, session])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const queueMetrics = useMemo(() => ({
    total: activeItems.length,
    urgent: activeItems.filter((item) => item.priority === 'urgent').length,
    transfer: activeItems.filter((item) => String(item.program || '').toLowerCase().includes('transfer')).length,
  }), [activeItems])

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Review queue"
        title="Ready for Review"
        subtitle="Files that are complete enough to move into evaluator review and recommendation work."
        actions={<button type="button" className="secondary-button" onClick={loadQueue}>Refresh queue</button>}
      />

      <section className="stats-grid">
        <article className="panel value-card">
          <span className="table-sub">Ready files</span>
          <strong>{queueMetrics.total}</strong>
          <p>Students currently available for evaluator review.</p>
        </article>
        <article className="panel value-card">
          <span className="table-sub">Urgent review</span>
          <strong>{queueMetrics.urgent}</strong>
          <p>Files that are sitting long enough to need immediate review attention.</p>
        </article>
        <article className="panel value-card">
          <span className="table-sub">Transfer-heavy</span>
          <strong>{queueMetrics.transfer}</strong>
          <p>Files likely to require transfer mapping or registrar attention.</p>
        </article>
      </section>

      <section className="panel">
        <div className="table-toolbar">
          <input
            className="filter-input"
            placeholder="Search student, program, reviewer, or review state"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="pill-row compact">
            <span className="tag">{mode === 'live' ? 'Live review queue' : 'Derived from Student 360'}</span>
          </div>
          {error ? <p className="muted-copy">{error}</p> : null}
        </div>
      </section>

      <section className="panel">
        {isLoading && !activeItems.length ? <p className="muted-copy">Loading review-ready files...</p> : null}
        {!isLoading && activeItems.length ? (
          <div className="work-item-list">
            {activeItems.map((item) => <WorkItemRow key={item.id} item={item} />)}
          </div>
        ) : null}
        {!isLoading && !activeItems.length ? <p className="muted-copy">No students are ready for review right now.</p> : null}
      </section>
    </div>
  )
}
