import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import WorkItemRow from '../components/WorkItemRow'
import { useAuth } from '../context/AuthContext'
import { useStudentRecords } from '../context/StudentRecordsContext'
import { buildWorkItemsFromStudents, sortWorkItems } from '../lib/studentWorkflow'
import { getWorkErrorMessage, normalizeWorkItems, workItemsUrl } from '../lib/workApi'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const trustCasesUrl = `${apiBaseUrl}/api/v1/trust/cases`

function normalizeTrustCases(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.cases)) return payload.cases
  return []
}

export default function ExceptionsPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const { students, updateChecklistItemStatus } = useStudentRecords()
  const [searchParams, setSearchParams] = useSearchParams()
  const [trustCases, setTrustCases] = useState([])
  const [trustError, setTrustError] = useState('')
  const [queueError, setQueueError] = useState('')
  const [query, setQuery] = useState('')
  const [activeActionId, setActiveActionId] = useState('')
  const [exceptionItems, setExceptionItems] = useState([])
  const [exceptionSource, setExceptionSource] = useState('derived')

  const derivedExceptionItems = useMemo(
    () => sortWorkItems(buildWorkItemsFromStudents(students).filter((item) => item.section === 'exceptions')),
    [students],
  )

  useEffect(() => {
    setQuery(searchParams.get('q') || '')
  }, [searchParams])

  function handleQueryChange(nextQuery) {
    setQuery(nextQuery)
    const nextParams = new URLSearchParams(searchParams)
    if (nextQuery.trim()) nextParams.set('q', nextQuery)
    else nextParams.delete('q')
    setSearchParams(nextParams, { replace: true })
  }

  const loadExceptionItems = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    try {
      const response = await fetchWithTenantAuth(`${workItemsUrl}?section=exceptions`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getWorkErrorMessage(response, payload, 'Unable to load exceptions queue.'))
      }

      setExceptionItems(sortWorkItems(normalizeWorkItems(payload)))
      setExceptionSource('live')
      setQueueError('')
    } catch (error) {
      setExceptionItems(derivedExceptionItems)
      setExceptionSource('derived')
      setQueueError(error.message || 'Unable to load exceptions queue.')
    }
  }, [derivedExceptionItems, fetchWithTenantAuth, session])

  const loadTrustCases = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    try {
      const response = await fetchWithTenantAuth(trustCasesUrl)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 404) {
          setTrustCases([])
          setTrustError('')
          return
        }

        throw new Error(payload?.detail || payload?.message || 'Unable to load trust cases.')
      }

      setTrustCases(normalizeTrustCases(payload))
      setTrustError('')
    } catch (error) {
      setTrustCases([])
      setTrustError(error.message || 'Unable to load trust cases.')
    }
  }, [fetchWithTenantAuth, session])

  useEffect(() => {
    loadExceptionItems()
  }, [loadExceptionItems])

  useEffect(() => {
    loadTrustCases()
  }, [loadTrustCases])

  const activeExceptionItems = exceptionSource === 'live' ? exceptionItems : derivedExceptionItems
  const searchedExceptionItems = useMemo(() => {
    const search = query.trim().toLowerCase()
    return activeExceptionItems.filter((item) => {
      const haystack = [
        item.studentName,
        item.reasonToAct?.label,
        item.suggestedAction?.label,
        item.readiness?.label,
        item.program,
      ].filter(Boolean).join(' ').toLowerCase()
      return search ? haystack.includes(search) : true
    })
  }, [activeExceptionItems, query])

  const trustBlockedItems = useMemo(
    () => searchedExceptionItems.filter((item) => item.readiness?.state === 'blocked_by_trust'),
    [searchedExceptionItems],
  )

  const reviewBlockedItems = useMemo(
    () => searchedExceptionItems.filter((item) => item.readiness?.state !== 'blocked_by_trust'),
    [searchedExceptionItems],
  )

  async function handleResolveBlocker(item) {
    const primaryBlocker = item.blockingItems?.[0]
    if (!primaryBlocker?.id) return

    setActiveActionId(item.id)
    try {
      await updateChecklistItemStatus({
        studentId: item.studentId,
        itemId: primaryBlocker.id,
        status: 'complete',
      })
      await loadExceptionItems()
    } finally {
      setActiveActionId('')
    }
  }

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Exceptions"
        title="Exceptions Queue"
        subtitle="Trust holds, pending evidence, and review blockers that stop students from moving forward."
        actions={<button type="button" className="secondary-button" onClick={() => { loadExceptionItems(); loadTrustCases() }}>Refresh exceptions</button>}
      />

      <section className="panel">
        <div className="table-toolbar">
          <input
            className="filter-input"
            placeholder="Search student, blocker, readiness, or next action"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
          />
          <div className="pill-row compact">
            <span className="tag">{exceptionSource === 'live' ? 'Live exceptions queue' : 'Derived from workflow state'}</span>
          </div>
          {queueError ? <p className="muted-copy">{queueError}</p> : null}
        </div>
      </section>

      <section className="dashboard-grid two-up">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Trust blocked</h3>
              <p>Students who cannot move until trust issues are resolved.</p>
            </div>
            <span className="badge risk-high">{trustBlockedItems.length}</span>
          </div>
          <div className="work-item-list">
            {trustBlockedItems.length ? trustBlockedItems.map((item) => (
              <WorkItemRow
                key={item.id}
                item={item}
                onResolvePrimaryAction={handleResolveBlocker}
                isResolving={activeActionId === item.id}
              />
            )) : <p className="muted-copy">No trust-blocked students right now.</p>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Needs evidence or review</h3>
              <p>Students blocked by missing evidence or document review.</p>
            </div>
            <span className="badge risk-medium">{reviewBlockedItems.length}</span>
          </div>
          <div className="work-item-list">
            {reviewBlockedItems.length ? reviewBlockedItems.map((item) => (
              <WorkItemRow
                key={item.id}
                item={item}
                onResolvePrimaryAction={handleResolveBlocker}
                isResolving={activeActionId === item.id}
              />
            )) : <p className="muted-copy">No review-blocked students right now.</p>}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Active trust cases</h3>
            <p>Case feed from the trust service when available.</p>
          </div>
        </div>
        {trustError ? <p className="auth-error">{trustError}</p> : null}
        <div className="feed-list">
          {trustCases.length ? trustCases.map((item) => (
            <div key={item.id} className="feed-item trust-item">
              <div>
                <div className="feed-top">
                  <strong>{item.student}</strong>
                  <span className={`badge risk-${String(item.severity || 'medium').toLowerCase()}`}>{item.severity}</span>
                </div>
                <p><strong>{item.signal}:</strong> {item.evidence}</p>
              </div>
              <span className="tag">{item.status}</span>
            </div>
          )) : <p className="muted-copy">No trust cases are available yet.</p>}
        </div>
      </section>
    </div>
  )
}
