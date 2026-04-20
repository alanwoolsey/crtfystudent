import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import ReadinessChip from '../components/ReadinessChip'
import { useAuth } from '../context/AuthContext'
import { useStudentRecords } from '../context/StudentRecordsContext'
import { buildWorkItemsFromStudents, sortWorkItems } from '../lib/studentWorkflow'
import { getWorkErrorMessage, normalizeWorkItems, workItemsUrl } from '../lib/workApi'

export default function QueuePage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const { students, updateChecklistItemStatus } = useStudentRecords()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [workItems, setWorkItems] = useState([])
  const [source, setSource] = useState('derived')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [activeActionId, setActiveActionId] = useState('')

  const derivedItems = useMemo(() => sortWorkItems(buildWorkItemsFromStudents(students)), [students])

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

  const loadWorkItems = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetchWithTenantAuth(workItemsUrl)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getWorkErrorMessage(response, payload, 'Unable to load operations queue.'))
      }

      setWorkItems(sortWorkItems(normalizeWorkItems(payload)))
      setSource('live')
    } catch (nextError) {
      setWorkItems(derivedItems)
      setSource('derived')
      setError(nextError.message || 'Unable to load operations queue.')
    } finally {
      setIsLoading(false)
    }
  }, [derivedItems, fetchWithTenantAuth, session])

  useEffect(() => {
    loadWorkItems()
  }, [loadWorkItems])

  const activeItems = source === 'live' ? workItems : derivedItems

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase()
    return activeItems.filter((item) => {
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false

      const haystack = [
        item.studentName,
        item.program,
        item.owner?.name,
        item.reasonToAct?.label,
        item.suggestedAction?.label,
        item.readiness?.label,
        item.section,
      ].filter(Boolean).join(' ').toLowerCase()

      return search ? haystack.includes(search) : true
    })
  }, [activeItems, priorityFilter, query])

  async function handleResolve(item) {
    const primaryBlocker = item.blockingItems?.[0]
    if (!primaryBlocker?.id) return

    setActiveActionId(item.id)
    try {
      await updateChecklistItemStatus({
        studentId: item.studentId,
        itemId: primaryBlocker.id,
        status: 'complete',
      })
      await loadWorkItems()
    } finally {
      setActiveActionId('')
    }
  }

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Operational queue"
        title="Workflows"
        subtitle="One worklist across completion, review, and exceptions with explicit readiness and next action."
        actions={<button type="button" className="secondary-button" onClick={loadWorkItems}>Refresh queue</button>}
      />

      <section className="panel">
        <div className="table-toolbar">
          <input
            className="filter-input"
            placeholder="Search student, owner, readiness, reason, or next action"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
          />
          <div className="today-filter-selects">
            <label className="auth-field compact-field">
              <span>Priority</span>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="all">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="today">Today</option>
                <option value="soon">Soon</option>
              </select>
            </label>
          </div>
          <div className="pill-row compact">
            <span className="tag">{source === 'live' ? 'Live operations queue' : 'Derived from student workflow'}</span>
          </div>
          {error ? <p className="muted-copy">{error}</p> : null}
        </div>

        {isLoading && !filteredItems.length ? <p className="muted-copy">Loading operations queue...</p> : null}

        {!isLoading && filteredItems.length ? (
          <div className="table-wrap">
            <table className="clickable-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Readiness</th>
                  <th>Reason to act</th>
                  <th>Next action</th>
                  <th>Owner</th>
                  <th>Priority</th>
                  <th>Section</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.studentName}</strong>
                      <div className="table-sub">{item.program}</div>
                      <div className="table-sub">
                        <Link to={`/students/${item.studentId}`}>Open student</Link>
                      </div>
                    </td>
                    <td><ReadinessChip readiness={item.readiness} /></td>
                    <td>{item.reasonToAct?.label || '-'}</td>
                    <td>
                      <div>{item.suggestedAction?.label || '-'}</div>
                      {item.blockingItems?.[0]?.id ? (
                        <button
                          type="button"
                          className="secondary-button queue-inline-action"
                          onClick={() => handleResolve(item)}
                          disabled={activeActionId === item.id}
                        >
                          {activeActionId === item.id ? 'Clearing...' : 'Clear blocker'}
                        </button>
                      ) : null}
                    </td>
                    <td>{item.owner?.name || 'Unassigned'}</td>
                    <td><span className={`badge ${item.priority === 'urgent' ? 'risk-high' : item.priority === 'today' ? 'risk-medium' : 'risk-low'}`}>{item.priority}</span></td>
                    <td><span className="tag">{item.section}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!isLoading && !filteredItems.length ? <p className="muted-copy">No workflow items match that filter.</p> : null}
      </section>
    </div>
  )
}
