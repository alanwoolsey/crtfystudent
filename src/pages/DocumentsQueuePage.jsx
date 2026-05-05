import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'
import {
  getAgentRunActionsUrl,
  documentsQueueUrl,
  getAgentRunUrl,
  getApiErrorMessage,
  getDocumentActionUrl,
  getDocumentExceptionSummaryUrl,
  getDocumentReprocessUploadUrl,
  getTranscriptUploadStatusUrl,
  normalizeItems,
  toDocumentQueueItem,
} from '../lib/operationsApi'

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

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getTranscriptStatus(payload) {
  if (payload?.status) return payload.status
  if (payload?.completed === true) return 'completed'
  return 'processing'
}

function getOperationMessage({ agentPayload, transcriptPayload, fallback }) {
  return transcriptPayload?.error
    || transcriptPayload?.detail
    || transcriptPayload?.message
    || agentPayload?.error
    || agentPayload?.detail
    || agentPayload?.message
    || fallback
}

function getActionsFailureMessage(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : []
  const failedItem = items.find((item) => item?.status === 'failed')
  return failedItem?.error || ''
}

function normalizeExceptionSummary(payload) {
  if (!payload || typeof payload !== 'object') return null
  return {
    documentId: payload.documentId || '',
    transcriptId: payload.transcriptId || '',
    studentId: payload.studentId || '',
    studentName: payload.studentName || '',
    documentStatus: payload.documentStatus || '',
    transcriptStatus: payload.transcriptStatus || '',
    parserConfidence: payload.parserConfidence,
    issueType: payload.issueType || '',
    issueLabel: payload.issueLabel || '',
    issueStatus: payload.issueStatus || '',
    suggestedAction: payload.suggestedAction || '',
    failureCode: payload.failureCode || '',
    failureMessage: payload.failureMessage || '',
    createdAt: payload.createdAt || '',
    updatedAt: payload.updatedAt || '',
    latestRun: payload.latestRun || null,
    recentActions: Array.isArray(payload.recentActions) ? payload.recentActions : [],
  }
}

export default function DocumentsQueuePage() {
  const { session, fetchWithTenantAuth, hasAnyPermission } = useAuth()
  const reprocessInputRef = useRef(null)
  const pollRunIdRef = useRef(0)
  const [activeView, setActiveView] = useState('needs_human_review')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeDocumentId, setActiveDocumentId] = useState('')
  const [pendingReprocessDocumentId, setPendingReprocessDocumentId] = useState('')
  const [reprocessState, setReprocessState] = useState(null)
  const [expandedDocumentId, setExpandedDocumentId] = useState('')
  const [exceptionSummaryByDocumentId, setExceptionSummaryByDocumentId] = useState({})
  const [exceptionSummaryLoadingId, setExceptionSummaryLoadingId] = useState('')

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

  useEffect(() => () => {
    pollRunIdRef.current += 1
  }, [])

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

  async function loadExceptionSummary(documentId) {
    if (!documentId) return null

    setExceptionSummaryLoadingId(documentId)

    try {
      const response = await fetchWithTenantAuth(getDocumentExceptionSummaryUrl(documentId))
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 404) {
          setExceptionSummaryByDocumentId((current) => ({ ...current, [documentId]: null }))
          return null
        }
        throw new Error(getApiErrorMessage(response, payload, 'Unable to load document exception details.'))
      }

      const summary = normalizeExceptionSummary(payload)
      setExceptionSummaryByDocumentId((current) => ({ ...current, [documentId]: summary }))
      return summary
    } catch (nextError) {
      setError(nextError.message || 'Unable to load document exception details.')
      return null
    } finally {
      setExceptionSummaryLoadingId((current) => current === documentId ? '' : current)
    }
  }

  async function toggleExceptionDetails(documentId) {
    if (!documentId) return

    if (expandedDocumentId === documentId) {
      setExpandedDocumentId('')
      return
    }

    setExpandedDocumentId(documentId)
    if (!(documentId in exceptionSummaryByDocumentId)) {
      await loadExceptionSummary(documentId)
    }
  }

  async function runReprocessPolling({ documentId, agentRunId, transcriptId, initialMessage, initialStatus, runToken }) {
    setReprocessState({
      documentId,
      state: 'processing',
      message: initialMessage,
      agentRunId,
      transcriptId,
      agentStatus: initialStatus || 'queued',
      transcriptStatus: 'processing',
      error: '',
    })

    while (pollRunIdRef.current === runToken) {
      await sleep(2000)

      const [agentResponse, transcriptResponse] = await Promise.all([
        fetchWithTenantAuth(getAgentRunUrl(agentRunId)),
        fetchWithTenantAuth(getTranscriptUploadStatusUrl(transcriptId)),
      ])

      const agentPayload = await agentResponse.json().catch(() => ({}))
      const transcriptPayload = await transcriptResponse.json().catch(() => ({}))

      if (!agentResponse.ok) {
        throw new Error(getApiErrorMessage(agentResponse, agentPayload, 'Unable to read reprocess agent status.'))
      }

      if (!transcriptResponse.ok) {
        throw new Error(getApiErrorMessage(transcriptResponse, transcriptPayload, 'Unable to read transcript processing status.'))
      }

      const agentStatus = agentPayload?.status || 'queued'
      const transcriptStatus = getTranscriptStatus(transcriptPayload)
      let failureMessage = getOperationMessage({
        agentPayload,
        transcriptPayload,
        fallback: 'Document reprocessing failed.',
      })

      if (agentStatus === 'failed') {
        try {
          const actionsResponse = await fetchWithTenantAuth(getAgentRunActionsUrl(agentRunId))
          const actionsPayload = await actionsResponse.json().catch(() => ({}))
          if (actionsResponse.ok) {
            failureMessage = getActionsFailureMessage(actionsPayload) || failureMessage
          }
        } catch {
          // Ignore action lookup failure and use the base failure message.
        }
      }

      setReprocessState({
        documentId,
        state: 'processing',
        message: getOperationMessage({
          agentPayload,
          transcriptPayload,
          fallback: 'Reprocessing document and persisting transcript updates.',
        }),
        agentRunId,
        transcriptId,
        agentStatus,
        transcriptStatus,
        error: '',
      })

      if (agentStatus === 'failed' || transcriptStatus === 'failed') {
        const exceptionSummary = await loadExceptionSummary(documentId)
        failureMessage = exceptionSummary?.failureMessage || exceptionSummary?.issueLabel || failureMessage
        throw new Error(failureMessage)
      }

      if (agentStatus === 'completed' && transcriptStatus === 'completed') {
        setReprocessState({
          documentId,
          state: 'completed',
          message: 'Document reprocessing completed.',
          agentRunId,
          transcriptId,
          agentStatus,
          transcriptStatus,
          error: '',
        })
        await loadDocuments()
        break
      }
    }
  }

  async function handleStoredReprocess(documentId) {
    if (!documentId) return

    const runToken = Date.now()
    pollRunIdRef.current = runToken
    setActiveDocumentId(documentId)
    setError('')
    setReprocessState({
      documentId,
      state: 'processing',
      message: 'Queuing stored-file reprocess.',
      agentRunId: '',
      transcriptId: '',
      agentStatus: '',
      transcriptStatus: '',
      error: '',
    })

    try {
      const response = await fetchWithTenantAuth(getDocumentActionUrl(documentId, 'reprocess'), {
        method: 'POST',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to reprocess document.'))
      }

      const agentRunId = payload?.agentRunId || ''
      const transcriptId = payload?.transcriptId || ''

      if (!agentRunId || !transcriptId) {
        setReprocessState({
          documentId,
          state: 'processing',
          message: payload?.detail || 'Document queued for reprocessing.',
          agentRunId: '',
          transcriptId: '',
          agentStatus: payload?.status || 'processing',
          transcriptStatus: '',
          error: '',
        })
        await loadDocuments()
        return
      }

      await runReprocessPolling({
        documentId,
        agentRunId,
        transcriptId,
        initialMessage: payload?.detail || 'Document queued for reprocessing.',
        initialStatus: payload?.status || 'queued',
        runToken,
      })
    } catch (nextError) {
      if (pollRunIdRef.current === runToken) {
        setReprocessState((current) => current && current.documentId === documentId ? {
          ...current,
          state: 'failed',
          message: nextError.message || 'Unable to reprocess document.',
          error: nextError.message || 'Unable to reprocess document.',
        } : current)
        setError(nextError.message || 'Unable to reprocess document.')
        await loadDocuments().catch(() => {})
      }
    } finally {
      if (pollRunIdRef.current === runToken) {
        setActiveDocumentId('')
      }
    }
  }

  function openReprocessPicker(documentId) {
    if (!documentId) return
    setError('')
    setPendingReprocessDocumentId(documentId)
    reprocessInputRef.current?.click()
  }

  async function handleReprocessFileChange(event) {
    const file = event.target.files?.[0]
    const documentId = pendingReprocessDocumentId

    event.target.value = ''
    setPendingReprocessDocumentId('')

    if (!file || !documentId) return

    const runToken = Date.now()
    pollRunIdRef.current = runToken
    setActiveDocumentId(documentId)
    setError('')
    setReprocessState({
      documentId,
      state: 'uploading',
      message: `Uploading ${file.name} for reprocessing`,
      agentRunId: '',
      transcriptId: '',
      agentStatus: '',
      transcriptStatus: '',
      error: '',
    })

    try {
      const formData = new FormData()
      formData.append('file', file, file.name)
      formData.append('document_type', 'auto')
      formData.append('use_bedrock', 'true')

      const uploadResponse = await fetchWithTenantAuth(getDocumentReprocessUploadUrl(documentId), {
        method: 'POST',
        body: formData,
      })
      const uploadPayload = await uploadResponse.json().catch(() => ({}))

      if (!uploadResponse.ok) {
        throw new Error(getApiErrorMessage(uploadResponse, uploadPayload, 'Unable to start document reprocessing.'))
      }

      const agentRunId = uploadPayload?.agentRunId || ''
      const transcriptId = uploadPayload?.transcriptId || ''

      if (!agentRunId || !transcriptId) {
        throw new Error(uploadPayload?.detail || 'Reprocess upload did not return the required tracking ids.')
      }

      await runReprocessPolling({
        documentId,
        agentRunId,
        transcriptId,
        initialMessage: uploadPayload?.detail || 'Document queued for agent reprocessing.',
        initialStatus: uploadPayload?.status || 'queued',
        runToken,
      })
    } catch (nextError) {
      if (pollRunIdRef.current === runToken) {
        setReprocessState((current) => current && current.documentId === documentId ? {
          ...current,
          state: 'failed',
          message: nextError.message || 'Document reprocessing failed.',
          error: nextError.message || 'Document reprocessing failed.',
        } : current)
        setError(nextError.message || 'Document reprocessing failed.')
        await loadDocuments().catch(() => {})
      }
    } finally {
      if (pollRunIdRef.current === runToken) {
        setActiveDocumentId('')
      }
    }
  }

  return (
    <div className="page-wrap">
      <input
        ref={reprocessInputRef}
        type="file"
        className="file-input-hidden"
        onChange={handleReprocessFileChange}
      />
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
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleStoredReprocess(item.id)}
                        disabled={activeDocumentId === item.id}
                      >
                        {reprocessState?.documentId === item.id && reprocessState?.state === 'processing' && !reprocessState?.agentRunId
                          ? 'Reprocessing...'
                          : 'Reprocess'}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => openReprocessPicker(item.id)}
                        disabled={activeDocumentId === item.id}
                      >
                        {reprocessState?.documentId === item.id && reprocessState?.state !== 'completed' && reprocessState?.state !== 'failed' && Boolean(reprocessState?.agentRunId)
                          ? 'Replacing...'
                          : 'Replace file'}
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

                {reprocessState?.documentId === item.id ? (
                  <div className="stack-list">
                    <div className="stack-row">
                      <strong>Reprocess status</strong>
                      <span>{reprocessState.state}</span>
                    </div>
                    {reprocessState.agentStatus ? (
                      <div className="stack-row">
                        <strong>Agent run</strong>
                        <span>{reprocessState.agentStatus}</span>
                      </div>
                    ) : null}
                    {reprocessState.transcriptStatus ? (
                      <div className="stack-row">
                        <strong>Transcript persistence</strong>
                        <span>{reprocessState.transcriptStatus}</span>
                      </div>
                    ) : null}
                    {reprocessState.agentRunId ? (
                      <div className="stack-row">
                        <strong>Agent run ID</strong>
                        <span>{reprocessState.agentRunId}</span>
                      </div>
                    ) : null}
                    {reprocessState.transcriptId ? (
                      <div className="stack-row">
                        <strong>Transcript ID</strong>
                        <span>{reprocessState.transcriptId}</span>
                      </div>
                    ) : null}
                    {reprocessState.error ? (
                      <p className="auth-error">{reprocessState.error}</p>
                    ) : (
                      <p className="muted-copy">{reprocessState.message}</p>
                    )}
                  </div>
                ) : null}

                <div className="work-item-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => toggleExceptionDetails(item.id)}
                    disabled={exceptionSummaryLoadingId === item.id}
                  >
                    {exceptionSummaryLoadingId === item.id ? 'Loading details...' : expandedDocumentId === item.id ? 'Hide details' : 'View exception details'}
                  </button>
                </div>

                {expandedDocumentId === item.id ? (
                  <div className="stack-list">
                    {exceptionSummaryByDocumentId[item.id] ? (
                      <>
                        <div className="stack-row">
                          <strong>Issue</strong>
                          <span>{exceptionSummaryByDocumentId[item.id].issueLabel || 'No issue label returned'}</span>
                        </div>
                        {exceptionSummaryByDocumentId[item.id].suggestedAction ? (
                          <div className="stack-row">
                            <strong>Suggested action</strong>
                            <span>{exceptionSummaryByDocumentId[item.id].suggestedAction}</span>
                          </div>
                        ) : null}
                        {exceptionSummaryByDocumentId[item.id].failureCode ? (
                          <div className="stack-row">
                            <strong>Failure code</strong>
                            <span>{exceptionSummaryByDocumentId[item.id].failureCode}</span>
                          </div>
                        ) : null}
                        {exceptionSummaryByDocumentId[item.id].failureMessage ? (
                          <p className="auth-error">{exceptionSummaryByDocumentId[item.id].failureMessage}</p>
                        ) : null}
                        {exceptionSummaryByDocumentId[item.id].latestRun ? (
                          <div className="stack-row">
                            <strong>Latest run</strong>
                            <span>{exceptionSummaryByDocumentId[item.id].latestRun.status || 'unknown'}</span>
                          </div>
                        ) : null}
                        {exceptionSummaryByDocumentId[item.id].recentActions?.length ? (
                          <div className="stack-list">
                            {exceptionSummaryByDocumentId[item.id].recentActions.map((action) => (
                              <div key={action.actionId || `${item.id}-${action.actionType}`} className="stack-row">
                                <strong>{action.actionType || action.toolName || 'action'}</strong>
                                <span>{action.error || action.status || 'No details'}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="muted-copy">No exception summary is available for this document yet.</p>
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        {!isLoading && !items.length ? <p className="muted-copy">No documents match the selected view.</p> : null}
      </section>
    </div>
  )
}
