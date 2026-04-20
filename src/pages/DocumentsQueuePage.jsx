import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'
import { documentsQueueUrl, getApiErrorMessage, getDocumentActionUrl, normalizeItems, toDocumentQueueItem } from '../lib/operationsApi'

const viewOptions = [
  { key: 'received_not_indexed', label: 'Received not indexed' },
  { key: 'auto_matched', label: 'Auto-matched' },
  { key: 'needs_human_review', label: 'Needs human review' },
  { key: 'processing_failed', label: 'Processing failed' },
  { key: 'duplicate_uploads', label: 'Duplicate uploads' },
  { key: 'quarantined', label: 'Quarantined' },
]

function formatDateTime(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatConfidence(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}

export default function DocumentsQueuePage() {
  const { session, fetchWithTenantAuth, hasAnyPermission } = useAuth()
  const [activeView, setActiveView] = useState('needs_human_review')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeDocumentId, setActiveDocumentId] = useState('')

  const canIndex = hasAnyPermission(['edit_checklist', 'view_sensitive_docs'])
  const canTrust = hasAnyPermission(['manage_trust_cases'])

  const loadDocuments = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      params.set('view', activeView)
      if (query.trim()) params.set('q', query.trim())

      const response = await fetchWithTenantAuth(`${documentsQueueUrl}?${params.toString()}`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to load documents queue.'))
      }

      setItems(normalizeItems(payload, ['documents']).map(toDocumentQueueItem))
    } catch (nextError) {
      setItems([])
      setError(nextError.message || 'Unable to load documents queue.')
    } finally {
      setIsLoading(false)
    }
  }, [activeView, fetchWithTenantAuth, query, session])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const metrics = useMemo(() => ({
    total: items.length,
    flagged: items.filter((item) => item.trustFlag).length,
    review: items.filter((item) => item.status === 'needs_human_review').length,
  }), [items])

  async function handleAction(documentId, action) {
    if (!documentId) return
    setActiveDocumentId(documentId)
    setError('')

    try {
      const response = await fetchWithTenantAuth(getDocumentActionUrl(documentId, action), {
        method: 'POST',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, `Unable to ${action} document.`))
      }

      await loadDocuments()
    } catch (nextError) {
      setError(nextError.message || `Unable to ${action} document.`)
    } finally {
      setActiveDocumentId('')
    }
  }

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Document operations"
        title="Documents Queue"
        subtitle="Processing, matching, indexing, and quarantine work for transcript and admissions documents."
        actions={<button type="button" className="secondary-button" onClick={loadDocuments}>Refresh documents</button>}
      />

      <section className="stats-grid">
        <article className="panel value-card">
          <span className="table-sub">In view</span>
          <strong>{metrics.total}</strong>
          <p>Documents currently in the selected queue view.</p>
        </article>
        <article className="panel value-card">
          <span className="table-sub">Trust flagged</span>
          <strong>{metrics.flagged}</strong>
          <p>Documents with trust issues requiring special handling.</p>
        </article>
        <article className="panel value-card">
          <span className="table-sub">Needs human review</span>
          <strong>{metrics.review}</strong>
          <p>Documents that could not cleanly complete automated matching or indexing.</p>
        </article>
      </section>

      <section className="panel">
        <div className="table-toolbar today-filter-bar">
          <input
            className="filter-input"
            placeholder="Search document type, student, source, or status"
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

      <section className="panel">
        {isLoading && !items.length ? <p className="muted-copy">Loading documents queue...</p> : null}

        {!isLoading && items.length ? (
          <div className="documents-queue-list">
            {items.map((item) => (
              <article key={item.id} className="documents-queue-card">
                <div className="documents-queue-top">
                  <div>
                    <h3>{item.documentType}</h3>
                    <p>{item.studentMatch?.studentName || 'Unmatched document'}</p>
                  </div>
                  <div className="pill-row compact">
                    <span className={`badge ${item.trustFlag ? 'risk-high' : 'risk-low'}`}>
                      {item.trustFlag ? 'Trust flagged' : 'Clear'}
                    </span>
                    <span className="badge neutral-badge">{item.status}</span>
                  </div>
                </div>

                <div className="metric-cluster">
                  <div><span>Confidence</span><strong>{formatConfidence(item.confidence)}</strong></div>
                  <div><span>Source</span><strong>{item.uploadSource}</strong></div>
                  <div><span>Received</span><strong>{formatDateTime(item.receivedAt)}</strong></div>
                </div>

                <div className="card-footer-row">
                  <span>
                    {item.studentMatch?.studentId
                      ? <Link to={`/students/${item.studentMatch.studentId}`}>Open student</Link>
                      : 'No student matched'}
                  </span>
                  <span>Document ID: {item.id}</span>
                </div>

                <div className="work-item-actions">
                  {canIndex ? (
                    <>
                      <button type="button" className="secondary-button" onClick={() => handleAction(item.id, 'confirm-match')} disabled={activeDocumentId === item.id}>
                        {activeDocumentId === item.id ? 'Working...' : 'Confirm match'}
                      </button>
                      <button type="button" className="secondary-button" onClick={() => handleAction(item.id, 'reject-match')} disabled={activeDocumentId === item.id}>
                        Reject match
                      </button>
                      <button type="button" className="secondary-button" onClick={() => handleAction(item.id, 'reprocess')} disabled={activeDocumentId === item.id}>
                        Reprocess
                      </button>
                      <button type="button" className="primary-button" onClick={() => handleAction(item.id, 'index')} disabled={activeDocumentId === item.id}>
                        Index document
                      </button>
                    </>
                  ) : null}

                  {canTrust ? (
                    item.status === 'quarantined' ? (
                      <button type="button" className="secondary-button" onClick={() => handleAction(item.id, 'release')} disabled={activeDocumentId === item.id}>
                        Release
                      </button>
                    ) : (
                      <button type="button" className="secondary-button" onClick={() => handleAction(item.id, 'quarantine')} disabled={activeDocumentId === item.id}>
                        Quarantine
                      </button>
                    )
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!isLoading && !items.length ? <p className="muted-copy">No documents match the selected view.</p> : null}
      </section>
    </div>
  )
}
