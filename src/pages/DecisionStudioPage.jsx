import { useCallback, useEffect, useMemo, useState } from 'react'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const decisionsUrl = `${apiBaseUrl}/api/v1/decisions`

function normalizeDecisions(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.decisions)) return payload.decisions
  if (Array.isArray(payload?.workbench)) return payload.workbench
  return []
}

export default function DecisionStudioPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const [decisions, setDecisions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

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

  const hasDecisions = useMemo(() => decisions.length > 0, [decisions])

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Explainable decisioning"
        title="Decision Studio"
        subtitle="Move beyond notes and queues. Build a decision packet staff can approve, defend, and sync downstream."
        actions={<button className="primary-button">Create decision packet</button>}
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
              <p>Examples of how staff should review and release outcomes.</p>
            </div>
          </div>
          {hasDecisions ? (
            <div className="table-wrap">
              <table>
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
                  {decisions.map((item) => (
                    <tr key={item.id || item.student}>
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
          ) : (
            <p className="muted-copy">No decision packets are available yet.</p>
          )}
        </section>
      ) : null}
    </div>
  )
}
