import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const decisionsUrl = `${apiBaseUrl}/api/v1/decisions`
const decisionsPerPage = 10

function normalizeDecisions(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.decisions)) return payload.decisions
  if (Array.isArray(payload?.workbench)) return payload.workbench
  return []
}

export default function DecisionStudioPage() {
  const navigate = useNavigate()
  const { session, fetchWithTenantAuth } = useAuth()
  const [decisions, setDecisions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [createForm, setCreateForm] = useState({
    student: '',
    program: '',
    fit: '',
    creditEstimate: '',
    readiness: 'Draft',
    reason: '',
  })

  const loadDecisions = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetchWithTenantAuth(decisionsUrl)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) throw new Error('Your session is no longer valid. Please sign in again.')
        if (response.status === 403) throw new Error('Your account is not authorized for this tenant.')
        throw new Error(payload?.detail || payload?.message || 'Unable to load Decision Studio.')
      }

      setDecisions(normalizeDecisions(payload))
    } catch (nextError) {
      setError(nextError.message || 'Unable to load Decision Studio.')
      setDecisions([])
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithTenantAuth, session])

  useEffect(() => {
    loadDecisions()
  }, [loadDecisions])

  const filteredDecisions = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return decisions

    return decisions.filter((item) => {
      const haystack = [
        item.student,
        item.program,
        item.readiness,
        item.reason,
        String(item.fit),
        String(item.creditEstimate),
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(search)
    })
  }, [decisions, query])

  useEffect(() => {
    setPage(1)
  }, [query, decisions.length])

  const hasDecisions = useMemo(() => filteredDecisions.length > 0, [filteredDecisions])
  const totalPages = Math.max(1, Math.ceil(filteredDecisions.length / decisionsPerPage))
  const currentPage = Math.min(page, totalPages)
  const paginatedDecisions = useMemo(() => {
    const start = (currentPage - 1) * decisionsPerPage
    return filteredDecisions.slice(start, start + decisionsPerPage)
  }, [currentPage, filteredDecisions])
  const pageStart = filteredDecisions.length ? (currentPage - 1) * decisionsPerPage + 1 : 0
  const pageEnd = Math.min(currentPage * decisionsPerPage, filteredDecisions.length)

  function openCreateModal() {
    setCreateError('')
    setCreateSuccess('')
    setCreateForm({
      student: '',
      program: '',
      fit: '',
      creditEstimate: '',
      readiness: 'Draft',
      reason: '',
    })
    setIsCreateOpen(true)
  }

  function closeCreateModal() {
    setIsCreateOpen(false)
    setCreateError('')
    setCreateSuccess('')
  }

  function handleCreateChange(event) {
    const { name, value } = event.target
    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleCreateSubmit(event) {
    event.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    if (!createForm.student.trim() || !createForm.program.trim() || !createForm.reason.trim()) {
      setCreateError('Enter the student, program, and rationale.')
      return
    }

    setIsCreating(true)

    try {
      const response = await fetchWithTenantAuth(decisionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student: createForm.student.trim(),
          program: createForm.program.trim(),
          fit: createForm.fit === '' ? null : Number(createForm.fit),
          creditEstimate: createForm.creditEstimate === '' ? null : Number(createForm.creditEstimate),
          readiness: createForm.readiness,
          reason: createForm.reason.trim(),
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) throw new Error('Your session is no longer valid. Please sign in again.')
        if (response.status === 403) throw new Error('Your account is not authorized for this tenant.')
        throw new Error(payload?.detail || payload?.message || 'Unable to create the decision packet.')
      }

      const createdItems = normalizeDecisions(payload)
      if (createdItems.length > 0) {
        setDecisions((current) => [...createdItems, ...current])
      } else if (payload && typeof payload === 'object') {
        setDecisions((current) => [payload, ...current])
      } else {
        await loadDecisions()
      }

      setCreateSuccess('Decision packet created.')
      window.setTimeout(() => {
        closeCreateModal()
        if (payload?.id) {
          navigate(`/decision-studio/${payload.id}`)
        }
      }, 300)
    } catch (nextError) {
      setCreateError(nextError.message || 'Unable to create the decision packet.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Explainable decisioning"
        title="Decision Studio"
        subtitle="Move beyond notes and queues. Build a decision packet staff can approve, defend, and sync downstream."
        actions={(
          <button type="button" className="primary-button" onClick={openCreateModal}>
            Create decision packet
          </button>
        )}
      />

      <section className="panel decision-hero">
        <div className="decision-summary">
          <h3>Decision packet anatomy</h3>
          <div className="stack-list">
            <div className="stack-row"><strong>Academic fit</strong><span>Program alignment, rubric score, and missing requirements.</span></div>
            <div className="stack-row"><strong>Transfer certainty</strong><span>Likely accepted credits with evidence and exceptions.</span></div>
            <div className="stack-row"><strong>Trust evidence</strong><span>Document provenance, risk signals, and quarantine history.</span></div>
            <div className="stack-row"><strong>Next action</strong><span>Admit, hold, request item, route to counselor, or sync to SIS.</span></div>
          </div>
        </div>
        <div className="callout-card accent">
          <span className="table-sub">Prototype rule</span>
          <h4>No black-box recommendation ships without reasons</h4>
          <p>Every outcome includes human-readable rationale, source evidence, confidence, and connector-ready payloads.</p>
        </div>
      </section>

      {isLoading ? (
        <section className="panel">
          <p className="muted-copy">Loading Decision Studio...</p>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="panel">
          <p className="auth-error">{error}</p>
          <button type="button" className="secondary-button" onClick={loadDecisions}>Retry</button>
        </section>
      ) : null}

      {!isLoading && !error ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Decision workbench</h3>
              <p>Search and page through packet summaries, then open a decision for the full review surface.</p>
            </div>
          </div>
          <div className="toolbar-row">
            <input
              className="filter-input"
              placeholder="Search by student, program, readiness, rationale, fit, or credit estimate"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {hasDecisions ? (
            <>
              <div className="list-pagination-bar">
                <p className="muted-copy">Showing {pageStart}-{pageEnd} of {filteredDecisions.length} decision packets</p>
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="pagination-status">Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="table-wrap">
                <table className="clickable-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Program</th>
                      <th>Fit</th>
                      <th>Credit estimate</th>
                      <th>Readiness</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDecisions.map((item) => (
                      <tr
                        key={item.id || item.student}
                        className="clickable-row"
                        onClick={() => item.id && navigate(`/decision-studio/${item.id}`)}
                        onKeyDown={(event) => {
                          if (!item.id) return
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            navigate(`/decision-studio/${item.id}`)
                          }
                        }}
                        tabIndex={item.id ? 0 : -1}
                        role={item.id ? 'button' : undefined}
                      >
                        <td><strong>{item.student}</strong></td>
                        <td>{item.program}</td>
                        <td>{item.fit}%</td>
                        <td>{item.creditEstimate}</td>
                        <td><span className="badge neutral-badge">{item.readiness}</span></td>
                        <td>{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="muted-copy">No decision packets match that search.</p>
          )}
        </section>
      ) : null}

      {isCreateOpen ? (
        <div className="modal-scrim" onClick={closeCreateModal} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="create-decision-title">
            <div className="panel-header">
              <div>
                <h3 id="create-decision-title">Create decision packet</h3>
                <p>Capture a review-ready packet and sync it once the backend create route is available.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeCreateModal} aria-label="Close create decision packet">
                <X size={18} />
              </button>
            </div>

            <form className="auth-form password-form course-modal-body" onSubmit={handleCreateSubmit}>
              <label className="auth-field">
                <span>Student</span>
                <input
                  name="student"
                  type="text"
                  value={createForm.student}
                  onChange={handleCreateChange}
                  placeholder="Avery Carter"
                  required
                />
              </label>

              <label className="auth-field">
                <span>Program</span>
                <input
                  name="program"
                  type="text"
                  value={createForm.program}
                  onChange={handleCreateChange}
                  placeholder="Nursing transfer review"
                  required
                />
              </label>

              <div className="detail-grid">
                <label className="auth-field">
                  <span>Fit score</span>
                  <input
                    name="fit"
                    type="number"
                    min="0"
                    max="100"
                    value={createForm.fit}
                    onChange={handleCreateChange}
                    placeholder="92"
                  />
                </label>

                <label className="auth-field">
                  <span>Credit estimate</span>
                  <input
                    name="creditEstimate"
                    type="number"
                    min="0"
                    value={createForm.creditEstimate}
                    onChange={handleCreateChange}
                    placeholder="38"
                  />
                </label>
              </div>

              <label className="auth-field">
                <span>Readiness</span>
                <select name="readiness" value={createForm.readiness} onChange={handleCreateChange}>
                  <option value="Draft">Draft</option>
                  <option value="Auto-certify">Auto-certify</option>
                  <option value="Counselor review">Counselor review</option>
                  <option value="Hold">Hold</option>
                </select>
              </label>

              <label className="auth-field">
                <span>Rationale</span>
                <textarea
                  name="reason"
                  rows="5"
                  value={createForm.reason}
                  onChange={handleCreateChange}
                  placeholder="Explain the evidence, fit, trust signals, and what should happen next."
                  required
                />
              </label>

              {createError ? <p className="auth-error">{createError}</p> : null}
              {createSuccess ? <p className="auth-success">{createSuccess}</p> : null}

              <div className="password-actions">
                <button type="button" className="secondary-button" onClick={closeCreateModal}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create packet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
