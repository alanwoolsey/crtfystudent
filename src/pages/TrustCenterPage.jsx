import { useCallback, useEffect, useMemo, useState } from 'react'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'
import {
  getApiErrorMessage,
  getTrustTranscriptActionUrl,
  getTrustTranscriptDetailsUrl,
  normalizeItems,
  trustCasesUrl,
} from '../lib/operationsApi'

function normalizeTrustCases(payload) {
  return normalizeItems(payload, ['cases', 'trustCases'])
}

function getSeverityBadgeClass(severity) {
  const value = String(severity || 'medium').toLowerCase()
  if (value === 'high') return 'risk-high'
  if (value === 'low') return 'risk-low'
  return 'risk-medium'
}

function getStatusBadgeClass(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'completed') return 'risk-low'
  if (value === 'failed') return 'risk-high'
  return 'neutral-badge'
}

function normalizeTrustSummary(summary) {
  if (!summary || typeof summary !== 'object') return null
  return {
    riskLevel: summary.riskLevel || '',
    summary: summary.summary || '',
    rationale: summary.rationale || '',
    recommendedAction: summary.recommendedAction || '',
  }
}

function formatTrustCase(item) {
  const summary = normalizeTrustSummary(item?.summary)
  return {
    id: item?.id || item?.transcriptId || item?.documentId,
    transcriptId: item?.transcriptId || '',
    student: item?.student || item?.studentName || 'Unknown student',
    studentId: item?.studentId || '',
    document: item?.document || item?.documentName || 'Document',
    documentId: item?.documentId || '',
    severity: item?.severity || 'Medium',
    signal: item?.signal || 'Trust signal',
    evidence: item?.evidence || 'No evidence provided.',
    status: item?.status || 'Open',
    trustBlocked: Boolean(item?.trustBlocked),
    latestRunStatus: item?.latestRunStatus || '',
    latestResultCode: item?.latestResultCode || '',
    summary,
    owner: item?.owner && typeof item.owner === 'object' ? item.owner : null,
    openedAt: item?.openedAt || null,
  }
}

function formatDateTime(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function getMessageFromResult(result, fallback) {
  return result?.message || result?.error || fallback || ''
}

export default function TrustCenterPage() {
  const { currentUser, session, fetchWithTenantAuth } = useAuth()
  const [trustCases, setTrustCases] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedTranscriptId, setSelectedTranscriptId] = useState('')
  const [details, setDetails] = useState(null)
  const [detailsError, setDetailsError] = useState('')
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [trustActionError, setTrustActionError] = useState('')
  const [trustActionSuccess, setTrustActionSuccess] = useState('')
  const [activeTrustAction, setActiveTrustAction] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [actionNote, setActionNote] = useState('')

  const loadTrustCases = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetchWithTenantAuth(trustCasesUrl)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to load Trust Center.'))
      }

      const items = normalizeTrustCases(payload).map(formatTrustCase)
      setTrustCases(items)
      setSelectedTranscriptId((current) => {
        if (current && items.some((item) => item.transcriptId === current)) return current
        return items[0]?.transcriptId || ''
      })
    } catch (nextError) {
      setError(nextError.message || 'Unable to load Trust Center.')
      setTrustCases([])
      setSelectedTranscriptId('')
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithTenantAuth, session])

  const loadTrustDetails = useCallback(async (transcriptId) => {
    if (!session?.access_token || !session?.tenant_id || !transcriptId) return

    setIsDetailsLoading(true)
    setDetailsError('')

    try {
      const response = await fetchWithTenantAuth(getTrustTranscriptDetailsUrl(transcriptId))
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to load trust case details.'))
      }

      setDetails(payload)
    } catch (nextError) {
      setDetails(null)
      setDetailsError(nextError.message || 'Unable to load trust case details.')
    } finally {
      setIsDetailsLoading(false)
    }
  }, [fetchWithTenantAuth, session])

  useEffect(() => {
    loadTrustCases()
  }, [loadTrustCases])

  useEffect(() => {
    if (!selectedTranscriptId) {
      setDetails(null)
      setDetailsError('')
      return
    }

    loadTrustDetails(selectedTranscriptId)
  }, [loadTrustDetails, selectedTranscriptId])

  const hasTrustCases = useMemo(() => trustCases.length > 0, [trustCases])
  const selectedCase = useMemo(
    () => trustCases.find((item) => item.transcriptId === selectedTranscriptId) || null,
    [selectedTranscriptId, trustCases],
  )
  const topLevelResult = details?.latestRun?.result || null
  const actions = Array.isArray(details?.actions) ? details.actions : []
  const selectedOwner = details?.owner || selectedCase?.owner || null
  const detailsSummary = normalizeTrustSummary(details?.summary) || selectedCase?.summary || null

  useEffect(() => {
    setTrustActionError('')
    setTrustActionSuccess('')
    setActionNote('')
    setAssignUserId(details?.owner?.id || currentUser?.userId || '')
  }, [currentUser?.userId, details?.owner?.id, selectedTranscriptId])

  async function handleTrustAction(action) {
    if (!selectedTranscriptId) return

    setActiveTrustAction(action)
    setTrustActionError('')
    setTrustActionSuccess('')

    try {
      const body = {}
      const trimmedNote = actionNote.trim()

      if (action === 'assign') {
        if (!assignUserId.trim()) {
          throw new Error('Enter a user ID to assign this trust case.')
        }
        body.userId = assignUserId.trim()
      }

      if (trimmedNote) {
        body.note = trimmedNote
      }

      const response = await fetchWithTenantAuth(getTrustTranscriptActionUrl(selectedTranscriptId, action), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, `Unable to ${action} trust case.`))
      }

      setTrustActionSuccess(payload?.detail || `Trust case ${action}d.`)
      await Promise.all([
        loadTrustCases(),
        loadTrustDetails(selectedTranscriptId),
      ])
    } catch (nextError) {
      setTrustActionError(nextError.message || `Unable to ${action} trust case.`)
    } finally {
      setActiveTrustAction('')
    }
  }

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Certified trust fabric"
        title="Trust Center"
        subtitle="This is a real differentiator. Instead of just reading files, the platform should prove what can be trusted before it recommends anything."
        actions={<button type="button" className="primary-button" onClick={loadTrustCases}>Refresh trust queue</button>}
      />

      <section className="dashboard-grid two-up">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Trust checks</h3>
              <p>Signals that protect schools from bad data and bad decisions.</p>
            </div>
          </div>
          <div className="stack-list">
            <div className="stack-row"><strong>Issuer validation</strong><span>Seal, metadata, and institution cross-check.</span></div>
            <div className="stack-row"><strong>Lineage tracking</strong><span>Every upload linked to one student record and prior evidence.</span></div>
            <div className="stack-row"><strong>Synthetic detection</strong><span>Edited PDF and generated image heuristics.</span></div>
            <div className="stack-row"><strong>Release policy</strong><span>No outcome released while trust hold is open.</span></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Release posture</h3>
              <p>Certified means explainable, policy-bound, and revocable.</p>
            </div>
          </div>
          <div className="callout-card accent-soft">
            <h4>Audit-first default</h4>
            <p>Every recommendation should carry timestamps, model and rule references, and source evidence for later review.</p>
          </div>
        </article>
      </section>

      {isLoading ? (
        <section className="panel">
          <p className="muted-copy">Loading Trust Center...</p>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="panel">
          <p className="auth-error">{error}</p>
          <button type="button" className="secondary-button" onClick={loadTrustCases}>Retry</button>
        </section>
      ) : null}

      {!isLoading && !error ? (
        <section className="dashboard-grid two-up">
          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Active trust cases</h3>
                <p>Queue rows now reflect the latest trust agent outcome directly from the backend.</p>
              </div>
              <span className="badge neutral-badge">{trustCases.length}</span>
            </div>
            <div className="feed-list">
              {hasTrustCases ? trustCases.map((item) => {
                const isSelected = item.transcriptId === selectedTranscriptId
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="feed-item trust-item"
                    onClick={() => setSelectedTranscriptId(item.transcriptId)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: isSelected ? '1px solid var(--ink-900, #111827)' : undefined,
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: '100%' }}>
                      <div className="feed-top">
                        <strong>{item.student}</strong>
                        <span className={`badge ${getSeverityBadgeClass(item.summary?.riskLevel || item.severity)}`}>{item.summary?.riskLevel || item.severity}</span>
                      </div>
                      <p><strong>{item.summary?.summary || item.signal}:</strong> {item.summary?.rationale || item.evidence}</p>
                      <div className="pill-row compact">
                        <span className="tag">{item.status}</span>
                        <span className={`badge ${item.trustBlocked ? 'risk-high' : 'risk-low'}`}>
                          {item.trustBlocked ? 'Trust blocked' : 'Not blocked'}
                        </span>
                        {item.latestRunStatus ? <span className={`badge ${getStatusBadgeClass(item.latestRunStatus)}`}>{item.latestRunStatus}</span> : null}
                        {item.latestResultCode ? <span className="tag">{item.latestResultCode}</span> : null}
                        {item.summary?.recommendedAction ? <span className="tag">{item.summary.recommendedAction}</span> : null}
                        {item.owner?.name ? <span className="tag">Owner: {item.owner.name}</span> : null}
                      </div>
                    </div>
                  </button>
                )
              }) : <p className="muted-copy">No trust cases are available yet.</p>}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Trust case details</h3>
                <p>Top-level outcome comes from the trust agent run. Step history comes from normalized action results.</p>
              </div>
            </div>

            {!selectedCase ? <p className="muted-copy">Select a trust case to inspect details.</p> : null}
            {selectedCase ? (
              <div className="stack-list">
                <div className="stack-row"><strong>Student</strong><span>{selectedCase.student}</span></div>
                <div className="stack-row"><strong>Student ID</strong><span>{selectedCase.studentId || 'Unknown'}</span></div>
                <div className="stack-row"><strong>Document</strong><span>{selectedCase.document}</span></div>
                <div className="stack-row"><strong>Owner</strong><span>{selectedOwner?.name || selectedOwner?.id || 'Unassigned'}</span></div>
                <div className="stack-row"><strong>Opened</strong><span>{formatDateTime(selectedCase.openedAt)}</span></div>
                {detailsSummary?.recommendedAction ? (
                  <div className="stack-row"><strong>Recommended action</strong><span>{detailsSummary.recommendedAction}</span></div>
                ) : null}
              </div>
            ) : null}

            {isDetailsLoading ? <p className="muted-copy">Loading trust case details...</p> : null}
            {!isDetailsLoading && detailsError ? <p className="auth-error">{detailsError}</p> : null}

            {!isDetailsLoading && !detailsError && details ? (
              <>
                <div className="callout-card accent-soft" style={{ marginTop: '1rem' }}>
                  <div className="feed-top">
                    <h4 style={{ margin: 0 }}>Latest trust outcome</h4>
                    <span className={`badge ${detailsSummary?.riskLevel ? getSeverityBadgeClass(detailsSummary.riskLevel) : getStatusBadgeClass(details?.latestRun?.status)}`}>
                      {detailsSummary?.riskLevel || details?.latestRun?.status || 'unknown'}
                    </span>
                  </div>
                  <p>{detailsSummary?.summary || getMessageFromResult(topLevelResult, details?.latestRun?.error || 'No outcome message provided.')}</p>
                  {detailsSummary?.rationale ? <p>{detailsSummary.rationale}</p> : null}
                  <div className="pill-row compact">
                    {topLevelResult?.code ? <span className="tag">{topLevelResult.code}</span> : null}
                    <span className={`badge ${details?.trustBlocked ? 'risk-high' : 'risk-low'}`}>
                      {details?.trustBlocked ? 'Trust blocked' : 'Released'}
                    </span>
                    {details?.latestRun?.triggerEvent ? <span className="tag">{details.latestRun.triggerEvent}</span> : null}
                  </div>
                </div>

                <div className="panel-header" style={{ marginTop: '1.5rem' }}>
                  <div>
                    <h3>Case actions</h3>
                    <p>Block, unblock, resolve, escalate, or assign the active trust case through the normalized transcript endpoints.</p>
                  </div>
                </div>
                <div className="stack-list">
                  <label className="auth-field">
                    <span>Action note</span>
                    <textarea
                      value={actionNote}
                      onChange={(event) => setActionNote(event.target.value)}
                      placeholder="Add a review note for assignment, resolution, or escalation"
                      rows={3}
                    />
                  </label>
                  <label className="auth-field">
                    <span>Assign user ID</span>
                    <input
                      value={assignUserId}
                      onChange={(event) => setAssignUserId(event.target.value)}
                      placeholder="Enter a reviewer user ID"
                    />
                  </label>
                  <div className="work-item-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleTrustAction(details?.trustBlocked ? 'unblock' : 'block')}
                      disabled={activeTrustAction !== ''}
                    >
                      {activeTrustAction === 'block'
                        ? 'Blocking...'
                        : activeTrustAction === 'unblock'
                          ? 'Unblocking...'
                          : details?.trustBlocked
                            ? 'Unblock case'
                            : 'Block case'}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleTrustAction('assign')}
                      disabled={activeTrustAction !== ''}
                    >
                      {activeTrustAction === 'assign' ? 'Assigning...' : 'Assign case'}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleTrustAction('escalate')}
                      disabled={activeTrustAction !== ''}
                    >
                      {activeTrustAction === 'escalate' ? 'Escalating...' : 'Escalate case'}
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => handleTrustAction('resolve')}
                      disabled={activeTrustAction !== ''}
                    >
                      {activeTrustAction === 'resolve' ? 'Resolving...' : 'Resolve case'}
                    </button>
                  </div>
                  {trustActionError ? <p className="auth-error">{trustActionError}</p> : null}
                  {trustActionSuccess ? <p className="auth-success">{trustActionSuccess}</p> : null}
                </div>

                <div className="panel-header" style={{ marginTop: '1.5rem' }}>
                  <div>
                    <h3>Step history</h3>
                    <p>Per-step messages prefer action-level normalized result data over raw output.</p>
                  </div>
                </div>
                <div className="feed-list">
                  {actions.length ? actions.map((action) => {
                    const actionResult = action?.result || action?.output || {}
                    return (
                      <div key={action.actionId || `${action.actionType}-${action.startedAt}`} className="feed-item">
                        <div>
                          <div className="feed-top">
                            <strong>{action.actionType || action.toolName || 'Action'}</strong>
                            <span className={`badge ${getStatusBadgeClass(action.status)}`}>{action.status || 'unknown'}</span>
                          </div>
                          <p>{getMessageFromResult(actionResult, action?.error || 'No action message provided.')}</p>
                          <div className="pill-row compact">
                            {actionResult?.code ? <span className="tag">{actionResult.code}</span> : null}
                            {action.toolName ? <span className="tag">{action.toolName}</span> : null}
                          </div>
                        </div>
                        <span className="tag">{formatDateTime(action.completedAt || action.startedAt)}</span>
                      </div>
                    )
                  }) : <p className="muted-copy">No trust actions are available for this case yet.</p>}
                </div>
              </>
            ) : null}
          </article>
        </section>
      ) : null}
    </div>
  )
}
