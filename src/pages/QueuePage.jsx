import { useCallback, useEffect, useMemo, useState } from 'react'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const workflowsUrl = `${apiBaseUrl}/api/v1/workflows`

function normalizeWorkflows(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.workflows)) return payload.workflows
  if (Array.isArray(payload?.queue)) return payload.queue
  return []
}

export default function QueuePage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const [workflows, setWorkflows] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadWorkflows = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetchWithTenantAuth(workflowsUrl)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) throw new Error('Your session is no longer valid. Please sign in again.')
        if (response.status === 403) throw new Error('Your account is not authorized for this tenant.')
        throw new Error(payload?.detail || payload?.message || 'Unable to load workflows.')
      }

      setWorkflows(normalizeWorkflows(payload))
    } catch (nextError) {
      setError(nextError.message || 'Unable to load workflows.')
      setWorkflows([])
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithTenantAuth, session])

  useEffect(() => {
    loadWorkflows()
  }, [loadWorkflows])

  const filteredWorkflows = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return workflows

    return workflows.filter((item) => {
      const haystack = [
        item.student,
        item.studentId,
        item.institution,
        item.status,
        item.owner,
        item.priority,
        item.reason,
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(search)
    })
  }, [query, workflows])

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Work by exception"
        title="Operational workflows"
        subtitle="Queue design should make it obvious what humans must handle versus what agents and connectors can resolve automatically."
      />

      <section className="panel">
        <div className="table-toolbar">
          <input
            className="filter-input"
            placeholder="Search student, institution, owner, or reason"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="pill-row">
            <span className="tag active-tag">All work</span>
            <span className="tag">High priority</span>
            <span className="tag">Connector ready</span>
            <span className="tag">Needs staff</span>
          </div>
        </div>

        {isLoading ? <p className="muted-copy">Loading workflows...</p> : null}

        {!isLoading && error ? (
          <div className="stack-list">
            <p className="auth-error">{error}</p>
            <button type="button" className="secondary-button" onClick={loadWorkflows}>Retry</button>
          </div>
        ) : null}

        {!isLoading && !error ? (
          filteredWorkflows.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Institution</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Age</th>
                    <th>Priority</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkflows.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.student}</strong>
                        <div className="table-sub">{item.studentId}</div>
                      </td>
                      <td>{item.institution}</td>
                      <td><span className="badge neutral-badge">{item.status}</span></td>
                      <td>{item.owner}</td>
                      <td>{item.age}</td>
                      <td><span className={`badge risk-${item.priority.toLowerCase()}`}>{item.priority}</span></td>
                      <td>{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted-copy">No workflows are available yet.</p>
          )
        ) : null}
      </section>
    </div>
  )
}
