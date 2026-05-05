import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3, RefreshCw, Send, Sparkles, UserPlus } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'
import {
  getApiErrorMessage,
  getDecisionAgentDetailsUrl,
  getDecisionRecommendationUrl,
  getDecisionReviewUrl,
  getDecisionSnapshotUrl,
} from '../lib/operationsApi'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const decisionBaseUrl = `${apiBaseUrl}/api/v1/decisions`
function formatDateTime(value) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatPercent(value, digits = 0) {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return '-'
  return `${(number * (digits > 0 || number <= 1 ? 100 : 1)).toFixed(digits)}%`
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

function normalizeTimeline(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.timeline)) return payload.timeline
  return []
}

function getResultMessage(result, fallback) {
  return result?.message || result?.error || fallback || ''
}

function normalizeRationale(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

export default function DecisionStudioDetailPage() {
  const { decisionId } = useParams()
  const { session, fetchWithTenantAuth } = useAuth()
  const [detail, setDetail] = useState(null)
  const [agentDetails, setAgentDetails] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAgentDetailsLoading, setIsAgentDetailsLoading] = useState(false)
  const [isTimelineLoading, setIsTimelineLoading] = useState(false)
  const [error, setError] = useState('')
  const [agentError, setAgentError] = useState('')
  const [timelineError, setTimelineError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [mutationSuccess, setMutationSuccess] = useState('')
  const [reviewSnapshotVersion, setReviewSnapshotVersion] = useState('')
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false)
  const [activeReviewAction, setActiveReviewAction] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [noteBody, setNoteBody] = useState('')
  const [assigneeUserId, setAssigneeUserId] = useState('')
  const [assignQueue, setAssignQueue] = useState('')
  const [reviewNote, setReviewNote] = useState('')

  const detailUrl = `${decisionBaseUrl}/${decisionId}`
  const timelineUrl = `${decisionBaseUrl}/${decisionId}/timeline`

  const loadAgentDetails = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id || !decisionId) return

    setIsAgentDetailsLoading(true)
    setAgentError('')

    try {
      const response = await fetchWithTenantAuth(getDecisionAgentDetailsUrl(decisionId))
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 404) {
          setAgentDetails(null)
          return
        }
        throw new Error(getApiErrorMessage(response, payload, 'Unable to load decision agent details.'))
      }

      setAgentDetails(payload)
    } catch (nextError) {
      setAgentDetails(null)
      setAgentError(nextError.message || 'Unable to load decision agent details.')
    } finally {
      setIsAgentDetailsLoading(false)
    }
  }, [decisionId, fetchWithTenantAuth, session])

  const loadDecision = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id || !decisionId) return

    setIsLoading(true)
    setError('')
    setTimelineError('')

    try {
      let response = await fetchWithTenantAuth(getDecisionSnapshotUrl(decisionId))
      let payload = await response.json().catch(() => ({}))

      if (response.status === 404) {
        response = await fetchWithTenantAuth(detailUrl)
        payload = await response.json().catch(() => ({}))
      }

      if (!response.ok) {
        if (response.status === 401) throw new Error('Your session is no longer valid. Please sign in again.')
        if (response.status === 403) throw new Error('Your account is not authorized for this tenant.')
        if (response.status === 404) throw new Error('Decision packet not found.')
        throw new Error(payload?.detail || payload?.message || 'Unable to load the decision packet.')
      }

      setDetail(payload)
      setAssignQueue(payload?.queue || '')
      setTimeline(normalizeTimeline(payload?.timelinePreview))
    } catch (nextError) {
      setError(nextError.message || 'Unable to load the decision packet.')
      setDetail(null)
      setTimeline([])
    } finally {
      setIsLoading(false)
    }

    setIsTimelineLoading(true)

    try {
      const response = await fetchWithTenantAuth(timelineUrl)
      const payload = await response.json().catch(() => ([]))

      if (!response.ok) {
        if (response.status === 401) throw new Error('Your session is no longer valid. Please sign in again.')
        if (response.status === 403) throw new Error('Your account is not authorized for this tenant.')
        throw new Error(payload?.detail || payload?.message || 'Unable to load the decision timeline.')
      }

      setTimeline(normalizeTimeline(payload))
    } catch (nextError) {
      setTimelineError(nextError.message || 'Unable to load the decision timeline.')
    } finally {
      setIsTimelineLoading(false)
    }
  }, [decisionId, detailUrl, fetchWithTenantAuth, session, timelineUrl])

  useEffect(() => {
    loadDecision()
  }, [loadDecision])

  useEffect(() => {
    loadAgentDetails()
  }, [loadAgentDetails])

  async function postDecisionAction(url, body, messages) {
    setMutationError('')
    setMutationSuccess('')

    const response = await fetchWithTenantAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (response.status === 401) throw new Error('Your session is no longer valid. Please sign in again.')
      if (response.status === 403) throw new Error('Your account is not authorized for this tenant.')
      throw new Error(payload?.detail || payload?.message || messages.error)
    }

    setMutationSuccess(messages.success)
    await loadDecision()
    return payload
  }

  async function handleNoteSubmit(event) {
    event.preventDefault()
    if (!noteBody.trim()) {
      setMutationError('Enter a note before submitting.')
      return
    }

    setIsAddingNote(true)

    try {
      await postDecisionAction(`${detailUrl}/notes`, { body: noteBody.trim() }, {
        success: 'Note added.',
        error: 'Unable to add note.',
      })
      setNoteBody('')
    } catch (nextError) {
      setMutationError(nextError.message || 'Unable to add note.')
    } finally {
      setIsAddingNote(false)
    }
  }

  async function handleAssignSubmit(event) {
    event.preventDefault()
    if (!assigneeUserId.trim()) {
      setMutationError('Enter an assignee user id.')
      return
    }

    setIsAssigning(true)

    try {
      await postDecisionAction(`${detailUrl}/assign`, {
        assignee_user_id: assigneeUserId.trim(),
        ...(assignQueue.trim() ? { queue: assignQueue.trim() } : {}),
      }, {
        success: 'Assignment updated.',
        error: 'Unable to assign the packet.',
      })
      setAssigneeUserId('')
    } catch (nextError) {
      setMutationError(nextError.message || 'Unable to assign the packet.')
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleGenerateRecommendation() {
    setMutationError('')
    setMutationSuccess('')
    setIsGeneratingRecommendation(true)

    try {
      const response = await fetchWithTenantAuth(getDecisionRecommendationUrl(decisionId), {
        method: 'POST',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to generate the decision recommendation.'))
      }

      setMutationSuccess(payload?.status === 'completed'
        ? 'Decision recommendation generated.'
        : payload?.detail || 'Decision recommendation queued.')
      await Promise.all([
        loadDecision(),
        loadAgentDetails(),
      ])
    } catch (nextError) {
      setMutationError(nextError.message || 'Unable to generate the decision recommendation.')
    } finally {
      setIsGeneratingRecommendation(false)
    }
  }

  async function handleReviewAction(action) {
    setMutationError('')
    setMutationSuccess('')
    setActiveReviewAction(action)

    try {
      const response = await fetchWithTenantAuth(getDecisionReviewUrl(decisionId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...(reviewNote.trim() ? { note: reviewNote.trim() } : {}),
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to review the decision recommendation.'))
      }

      setReviewSnapshotVersion(payload?.snapshotVersion || '')
      setMutationSuccess(
        action === 'accept_recommendation'
          ? payload?.detail || 'Recommendation accepted.'
          : payload?.detail || 'Evidence requested.',
      )
      setReviewNote('')
      await Promise.all([
        loadDecision(),
        loadAgentDetails(),
      ])
    } catch (nextError) {
      setMutationError(nextError.message || 'Unable to review the decision recommendation.')
    } finally {
      setActiveReviewAction('')
    }
  }

  const trustSignals = useMemo(() => detail?.trust?.signals || [], [detail])
  const notes = useMemo(() => detail?.notes || [], [detail])
  const decisionRecommendation = agentDetails?.recommendation || detail?.recommendation || null
  const decisionRunResult = agentDetails?.latestRun?.result || null
  const decisionRunMetrics = decisionRunResult?.metrics || {}
  const decisionRunArtifacts = decisionRunResult?.artifacts || {}
  const decisionActions = useMemo(() => Array.isArray(agentDetails?.actions) ? agentDetails.actions : [], [agentDetails?.actions])
  const lastReviewedSnapshot = agentDetails?.lastReviewedSnapshot || null
  const recommendationRationale = normalizeRationale(decisionRecommendation?.rationale)
  const reviewedRecommendationRationale = normalizeRationale(lastReviewedSnapshot?.snapshot?.recommendation?.rationale)
  const runRecommendationRationale = normalizeRationale(decisionRunArtifacts.recommendationRationale)

  if (isLoading && !detail) {
    return (
      <div className="page-wrap">
        <Link to="/decisions" className="back-link"><ArrowLeft size={16} /> Back to Decision Studio</Link>
        <section className="panel">
          <p className="muted-copy">Loading decision packet...</p>
        </section>
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="page-wrap">
        <Link to="/decisions" className="back-link"><ArrowLeft size={16} /> Back to Decision Studio</Link>
        <section className="panel">
          <p className="auth-error">{error}</p>
          <button type="button" className="secondary-button" onClick={loadDecision}>Retry</button>
        </section>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="page-wrap">
        <Link to="/decisions" className="back-link"><ArrowLeft size={16} /> Back to Decision Studio</Link>
        <section className="panel">
          <p className="muted-copy">Decision packet not found.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <Link to="/decisions" className="back-link"><ArrowLeft size={16} /> Back to Decision Studio</Link>

      <SectionHeader
        eyebrow="Decision packet"
        title={detail.student?.name || 'Decision packet'}
        subtitle={`${detail.program?.name || 'Program not set'} - Updated ${formatDateTime(detail.updatedAt)}`}
        actions={(
          <>
            <button type="button" className="primary-button" onClick={handleGenerateRecommendation} disabled={isGeneratingRecommendation}>
              <Sparkles size={16} />
              {isGeneratingRecommendation ? 'Generating...' : 'Generate recommendation'}
            </button>
            <button type="button" className="secondary-button" onClick={loadDecision}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </>
        )}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Packet status</h3>
            <p>Live review state, ownership, and queue context.</p>
          </div>
          <div className="pill-row compact">
            <span className="badge neutral-badge">{detail.status}</span>
            <span className="badge neutral-badge">{detail.readiness}</span>
            <span className="badge neutral-badge">{detail.queue || 'No queue'}</span>
          </div>
        </div>

        <div className="metric-cluster profile-metrics">
          <div><span>Assigned to</span><strong>{detail.assignedTo?.name || 'Unassigned'}</strong></div>
          <div><span>Created</span><strong>{formatDateTime(detail.createdAt)}</strong></div>
          <div><span>Updated</span><strong>{formatDateTime(detail.updatedAt)}</strong></div>
          <div><span>External student id</span><strong>{detail.student?.externalId || 'Not provided'}</strong></div>
        </div>

        {(mutationError || mutationSuccess) ? (
          <div className="decision-inline-feedback">
            {mutationError ? <p className="auth-error">{mutationError}</p> : null}
            {mutationSuccess ? <p className="auth-success">{mutationSuccess}</p> : null}
            {reviewSnapshotVersion ? <p className="muted-copy">Reviewed snapshot version: {reviewSnapshotVersion}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="decision-detail-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Student</h3>
              <p>Primary identity and contact data tied to this packet.</p>
            </div>
          </div>
          <div className="detail-grid">
            <span><strong>Name</strong> {detail.student?.name || '-'}</span>
            <span><strong>Email</strong> {detail.student?.email || '-'}</span>
            <span><strong>Student id</strong> {detail.student?.id || '-'}</span>
            <span><strong>External id</strong> {detail.student?.externalId || '-'}</span>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Program</h3>
              <p>Target review program for this decision packet.</p>
            </div>
          </div>
          <div className="callout-card accent-soft">
            <h4>{detail.program?.name || 'Program not set'}</h4>
            <p>Queue: {detail.queue || 'No queue assigned'}</p>
          </div>
        </article>
      </section>

      <section className="decision-detail-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Recommendation</h3>
              <p>Explainable outcome guidance with fit and transfer estimate.</p>
            </div>
          </div>
          <div className="metric-cluster">
            <div><span>Fit</span><strong>{formatPercent(decisionRecommendation?.fit)}</strong></div>
            <div><span>Confidence</span><strong>{formatPercent(decisionRecommendation?.confidence)}</strong></div>
            <div><span>Credit estimate</span><strong>{formatNumber(decisionRecommendation?.creditEstimate)}</strong></div>
            <div><span>Readiness</span><strong>{detail.readiness || '-'}</strong></div>
          </div>
          <div className="callout-card">
            <h4>Why this packet is landing here</h4>
            <p>{decisionRecommendation?.reason || 'No recommendation rationale has been recorded yet.'}</p>
            {recommendationRationale.length ? (
              <div className="stack-list" style={{ marginTop: '0.75rem' }}>
                {recommendationRationale.map((item, index) => (
                  <div key={`${item}-${index}`} className="stack-row">
                    <strong>{index + 1}</strong>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Decision agent</h3>
              <p>Normalized recommendation run and step history for explicit agent-generated outcomes.</p>
            </div>
          </div>
          {agentError ? <p className="auth-error">{agentError}</p> : null}
          {agentDetails ? (
            <>
              <div className="metric-cluster">
                <div><span>Run status</span><strong>{agentDetails.latestRun?.status || '-'}</strong></div>
                <div><span>Run code</span><strong>{decisionRunResult?.code || '-'}</strong></div>
                <div><span>Status snapshot</span><strong>{decisionRunMetrics.status || '-'}</strong></div>
                <div><span>Readiness snapshot</span><strong>{decisionRunMetrics.readiness || '-'}</strong></div>
                <div><span>Trust status</span><strong>{decisionRunMetrics.trustStatus || '-'}</strong></div>
                <div><span>Fit</span><strong>{formatNumber(decisionRunMetrics.fit)}</strong></div>
                <div><span>Recommendation confidence</span><strong>{formatPercent(decisionRunMetrics.recommendationConfidence)}</strong></div>
                <div><span>Credit estimate</span><strong>{formatNumber(decisionRunMetrics.creditEstimate)}</strong></div>
                <div><span>Documents</span><strong>{formatNumber(decisionRunMetrics.documentCount)}</strong></div>
                <div><span>Trust signals</span><strong>{formatNumber(decisionRunMetrics.trustSignalCount)}</strong></div>
                <div><span>Active trust signals</span><strong>{formatNumber(decisionRunMetrics.activeTrustSignalCount)}</strong></div>
                <div><span>Agent run id</span><strong>{agentDetails.latestRun?.runId || '-'}</strong></div>
              </div>
              <div className="callout-card">
                <h4>Latest agent outcome</h4>
                <p>{getResultMessage(decisionRunResult, agentDetails.latestRun?.error || 'No decision agent outcome has been recorded yet.')}</p>
              </div>
              {lastReviewedSnapshot ? (
                <div className="callout-card accent-soft">
                  <h4>Last reviewed snapshot</h4>
                  <p>{lastReviewedSnapshot.action || 'reviewed'} on {formatDateTime(lastReviewedSnapshot.reviewedAt)}</p>
                  <div className="pill-row compact">
                    {lastReviewedSnapshot.snapshotVersion ? <span className="tag">{lastReviewedSnapshot.snapshotVersion}</span> : null}
                    {lastReviewedSnapshot.reviewedByUserId ? <span className="tag">Reviewer: {lastReviewedSnapshot.reviewedByUserId}</span> : null}
                  </div>
                  <div className="metric-cluster" style={{ marginTop: '0.75rem' }}>
                    <div><span>Status</span><strong>{lastReviewedSnapshot.snapshot?.status || '-'}</strong></div>
                    <div><span>Readiness</span><strong>{lastReviewedSnapshot.snapshot?.readiness || '-'}</strong></div>
                    <div><span>Trust</span><strong>{lastReviewedSnapshot.snapshot?.trust?.status || '-'}</strong></div>
                    <div><span>Fit</span><strong>{formatPercent(lastReviewedSnapshot.snapshot?.recommendation?.fit)}</strong></div>
                    <div><span>Confidence</span><strong>{formatPercent(lastReviewedSnapshot.snapshot?.recommendation?.confidence)}</strong></div>
                    <div><span>Credit estimate</span><strong>{formatNumber(lastReviewedSnapshot.snapshot?.recommendation?.creditEstimate)}</strong></div>
                    <div><span>Documents</span><strong>{formatNumber(lastReviewedSnapshot.snapshot?.evidence?.documentCount)}</strong></div>
                  </div>
                  {reviewedRecommendationRationale.length ? (
                    <div className="stack-list" style={{ marginTop: '0.75rem' }}>
                      {reviewedRecommendationRationale.map((item, index) => (
                        <div key={`${item}-${index}`} className="stack-row">
                          <strong>{index + 1}</strong>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="metric-cluster">
                <div><span>Institution</span><strong>{decisionRunArtifacts.institution || detail.evidence?.institution || '-'}</strong></div>
                <div><span>GPA</span><strong>{formatNumber(decisionRunArtifacts.gpa ?? detail.evidence?.gpa)}</strong></div>
                <div><span>Credits earned</span><strong>{formatNumber(decisionRunArtifacts.creditsEarned ?? detail.evidence?.creditsEarned)}</strong></div>
                <div><span>Parser confidence</span><strong>{formatPercent(decisionRunArtifacts.parserConfidence ?? detail.evidence?.parserConfidence, 0)}</strong></div>
                <div><span>Readiness reason</span><strong>{decisionRunArtifacts.readinessReason || '-'}</strong></div>
                <div><span>Recommendation reason</span><strong>{decisionRunArtifacts.recommendationReason || '-'}</strong></div>
              </div>
              {runRecommendationRationale.length ? (
                <div className="callout-card">
                  <h4>Recommendation rationale</h4>
                  <div className="stack-list">
                    {runRecommendationRationale.map((item, index) => (
                      <div key={`${item}-${index}`} className="stack-row">
                        <strong>{index + 1}</strong>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="timeline-list">
                {decisionActions.length ? decisionActions.map((action) => {
                  const actionRationale = normalizeRationale(action.result?.artifacts?.recommendationRationale)

                  return (
                    <div key={action.actionId || `${action.actionType}-${action.startedAt}`} className="timeline-content">
                      <div className="timeline-top">
                        <strong>{action.actionType || action.toolName || 'Action'}</strong>
                        <span className="badge neutral-badge">{action.status || 'unknown'}</span>
                      </div>
                      <p>{getResultMessage(action.result, action.error || 'No action message provided.')}</p>
                      {actionRationale.length ? (
                        <div className="stack-list" style={{ marginTop: '0.75rem' }}>
                          {actionRationale.map((item, index) => (
                            <div key={`${action.actionId || action.actionType}-${item}-${index}`} className="stack-row">
                              <strong>{index + 1}</strong>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="timeline-meta">
                        {action.result?.code ? <span>Code: {action.result.code}</span> : null}
                        {action.result?.metrics?.readiness ? <span>Readiness: {action.result.metrics.readiness}</span> : null}
                        {action.result?.metrics?.trustStatus ? <span>Trust: {action.result.metrics.trustStatus}</span> : null}
                        <span>{formatDateTime(action.completedAt || action.startedAt)}</span>
                      </div>
                    </div>
                  )
                }) : <p className="muted-copy">No recommendation actions are available yet.</p>}
              </div>
            </>
          ) : (
            <p className="muted-copy">{isAgentDetailsLoading ? 'Loading decision agent details...' : 'No decision agent run has been recorded yet.'}</p>
          )}
        </article>
      </section>

      <section className="decision-detail-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Evidence</h3>
              <p>Academic and parser evidence supporting the packet.</p>
            </div>
          </div>
          <div className="metric-cluster">
            <div><span>Institution</span><strong>{detail.evidence?.institution || '-'}</strong></div>
            <div><span>GPA</span><strong>{formatNumber(detail.evidence?.gpa)}</strong></div>
            <div><span>Credits earned</span><strong>{formatNumber(detail.evidence?.creditsEarned)}</strong></div>
            <div><span>Parser confidence</span><strong>{formatPercent(detail.evidence?.parserConfidence, 0)}</strong></div>
            <div><span>Documents</span><strong>{formatNumber(detail.evidence?.documentCount)}</strong></div>
            <div><span>Packet id</span><strong>{detail.id}</strong></div>
          </div>
        </article>
      </section>

      <section className="decision-detail-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Trust</h3>
              <p>Risk posture and any trust signals attached to the packet.</p>
            </div>
            <span className="badge neutral-badge">{detail.trust?.status || 'Unknown'}</span>
          </div>

          {trustSignals.length ? (
            <div className="timeline-list">
              {trustSignals.map((signal) => (
                <div key={signal.id} className="timeline-content">
                  <div className="timeline-top">
                    <strong>{signal.signal}</strong>
                    <span className="badge neutral-badge">{signal.severity}</span>
                  </div>
                  <p>{signal.evidence}</p>
                  <div className="timeline-meta">
                    <span>Status: {signal.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No trust signals are active on this packet.</p>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Actions</h3>
              <p>Accept or send back the recommendation, then manage assignment separately.</p>
            </div>
          </div>

          <div className="decision-actions-grid">
            <div className="auth-form">
              <label className="auth-field">
                <span>Review note</span>
                <textarea
                  rows="4"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Add context for accepting the recommendation or requesting more evidence."
                />
              </label>
              <div className="work-item-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => handleReviewAction('accept_recommendation')}
                  disabled={activeReviewAction !== ''}
                >
                  {activeReviewAction === 'accept_recommendation' ? 'Applying...' : 'Accept recommendation'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleReviewAction('request_evidence')}
                  disabled={activeReviewAction !== ''}
                >
                  {activeReviewAction === 'request_evidence' ? 'Applying...' : 'Request evidence'}
                </button>
              </div>
            </div>

            <form className="auth-form" onSubmit={handleAssignSubmit}>
              <label className="auth-field">
                <span>Assign packet</span>
                <input
                  type="text"
                  value={assigneeUserId}
                  onChange={(event) => setAssigneeUserId(event.target.value)}
                  placeholder="Temporary: enter assignee user id"
                />
              </label>
              <label className="auth-field">
                <span>Queue</span>
                <input
                  type="text"
                  value={assignQueue}
                  onChange={(event) => setAssignQueue(event.target.value)}
                  placeholder="Admissions Review"
                />
              </label>
              <button type="submit" className="secondary-button" disabled={isAssigning}>
                <UserPlus size={16} />
                {isAssigning ? 'Assigning...' : 'Assign packet'}
              </button>
            </form>
          </div>
        </article>
      </section>

      <section className="decision-detail-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Notes</h3>
              <p>Review notes stay with the packet and refresh after each save.</p>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleNoteSubmit}>
            <label className="auth-field">
              <span>Add note</span>
              <textarea
                rows="4"
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Manual review needed for lab sequence."
              />
            </label>
            <div className="password-actions">
              <button type="submit" className="primary-button" disabled={isAddingNote}>
                <Send size={16} />
                {isAddingNote ? 'Saving...' : 'Add note'}
              </button>
            </div>
          </form>

          {notes.length ? (
            <div className="timeline-list">
              {notes.map((note) => (
                <div key={note.id} className="timeline-content">
                  <p>{note.body}</p>
                  <div className="timeline-meta">
                    <span>{note.authorName || 'Unknown author'}</span>
                    <span>{formatDateTime(note.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No notes have been added yet.</p>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Timeline</h3>
              <p>Fast preview from packet detail, replaced by the full event stream.</p>
            </div>
            {isTimelineLoading ? (
              <span className="table-sub"><Clock3 size={14} /> Refreshing timeline...</span>
            ) : null}
          </div>

          {timelineError ? <p className="auth-error">{timelineError}</p> : null}

          {timeline.length ? (
            <div className="timeline-list">
              {timeline.map((event) => (
                <div key={event.id} className="timeline-content">
                  <div className="timeline-top">
                    <strong>{event.label}</strong>
                    <span className="table-sub">{formatDateTime(event.at)}</span>
                  </div>
                  {event.detail ? <p>{event.detail}</p> : null}
                  <div className="timeline-meta">
                    <span>Type: {event.type}</span>
                    <span>{event.actorName || 'System'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No timeline events are available yet.</p>
          )}
        </article>
      </section>
    </div>
  )
}
