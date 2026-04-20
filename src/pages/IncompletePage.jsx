import { useCallback, useEffect, useMemo, useState } from 'react'
import SectionHeader from '../components/SectionHeader'
import WorkItemRow from '../components/WorkItemRow'
import { useAuth } from '../context/AuthContext'
import { useStudentRecords } from '../context/StudentRecordsContext'
import { buildWorkItemsFromStudents, sortWorkItems } from '../lib/studentWorkflow'
import { getApiErrorMessage, incompleteQueueUrl, normalizeItems, toWorkItemFromIncomplete } from '../lib/operationsApi'

const viewOptions = [
  { key: 'submitted_missing_items', label: 'Submitted missing items' },
  { key: 'nearly_complete', label: 'Nearly complete' },
  { key: 'aging', label: 'Aging / stalled' },
  { key: 'missing_transcript', label: 'Missing transcript' },
  { key: 'missing_residency', label: 'Missing residency' },
  { key: 'missing_fafsa', label: 'Missing FAFSA' },
]

export default function IncompletePage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const { students, updateChecklistItemStatus } = useStudentRecords()
  const [activeView, setActiveView] = useState('submitted_missing_items')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [mode, setMode] = useState('derived')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeActionId, setActiveActionId] = useState('')

  const derivedItems = useMemo(
    () => sortWorkItems(buildWorkItemsFromStudents(students).filter((item) => item.section === 'attention' || item.section === 'close')),
    [students],
  )

  const activeItems = mode === 'live' ? items : derivedItems

  const loadQueue = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      params.set('view', activeView)
      if (query.trim()) params.set('q', query.trim())

      const response = await fetchWithTenantAuth(`${incompleteQueueUrl}?${params.toString()}`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to load incomplete applications.'))
      }

      setItems(sortWorkItems(normalizeItems(payload, ['incomplete']).map((item) => toWorkItemFromIncomplete(item, activeView))))
      setMode('live')
    } catch (nextError) {
      setItems([])
      setMode('derived')
      setError(nextError.message || 'Unable to load incomplete applications.')
    } finally {
      setIsLoading(false)
    }
  }, [activeView, fetchWithTenantAuth, query, session])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

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
      await loadQueue()
    } finally {
      setActiveActionId('')
    }
  }

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Core workflow"
        title="Incomplete Applications"
        subtitle="Operational queue for started applications, missing items, and students closest to complete."
        actions={<button type="button" className="secondary-button" onClick={loadQueue}>Refresh queue</button>}
      />

      <section className="panel">
        <div className="table-toolbar today-filter-bar">
          <input
            className="filter-input"
            placeholder="Search student, program, owner, or missing item"
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
          <div className="pill-row compact">
            <span className="tag">{mode === 'live' ? 'Live incomplete queue' : 'Derived from Student 360'}</span>
          </div>
          {error ? <p className="muted-copy">{error}</p> : null}
        </div>
      </section>

      <section className="panel">
        {isLoading && !activeItems.length ? <p className="muted-copy">Loading incomplete applications...</p> : null}
        {!isLoading && activeItems.length ? (
          <div className="work-item-list">
            {activeItems.map((item) => (
              <WorkItemRow
                key={item.id}
                item={item}
                onResolvePrimaryAction={handleResolve}
                isResolving={activeActionId === item.id}
              />
            ))}
          </div>
        ) : null}
        {!isLoading && !activeItems.length ? <p className="muted-copy">No incomplete students are available right now.</p> : null}
      </section>
    </div>
  )
}
