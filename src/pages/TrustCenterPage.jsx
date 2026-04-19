import { useCallback, useEffect, useMemo, useState } from 'react'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const trustCasesUrl = `${apiBaseUrl}/api/v1/trust/cases`

function normalizeTrustCases(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.cases)) return payload.cases
  if (Array.isArray(payload?.trustCases)) return payload.trustCases
  return []
}

export default function TrustCenterPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const [trustCases, setTrustCases] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadTrustCases = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetchWithTenantAuth(trustCasesUrl)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) throw new Error('Your session is no longer valid. Please sign in again.')
        if (response.status === 403) throw new Error('Your account is not authorized for this tenant.')
        throw new Error(payload?.detail || payload?.message || 'Unable to load Trust Center.')
      }

      setTrustCases(normalizeTrustCases(payload))
    } catch (nextError) {
      setError(nextError.message || 'Unable to load Trust Center.')
      setTrustCases([])
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithTenantAuth, session])

  useEffect(() => {
    loadTrustCases()
  }, [loadTrustCases])

  const hasTrustCases = useMemo(() => trustCases.length > 0, [trustCases])

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Certified trust fabric"
        title="Trust Center"
        subtitle="This is a real differentiator. Instead of just reading files, the platform should prove what can be trusted before it recommends anything."
        actions={<button className="primary-button">Open trust policy</button>}
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
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Active trust cases</h3>
              <p>Trust is a product surface, not a background log.</p>
            </div>
          </div>
          <div className="feed-list">
            {hasTrustCases ? trustCases.map((item) => (
              <div key={item.id} className="feed-item trust-item">
                <div>
                  <div className="feed-top">
                    <strong>{item.student}</strong>
                    <span className={`badge risk-${item.severity.toLowerCase()}`}>{item.severity}</span>
                  </div>
                  <p><strong>{item.signal}:</strong> {item.evidence}</p>
                </div>
                <span className="tag">{item.status}</span>
              </div>
            )) : <p className="muted-copy">No trust cases are available yet.</p>}
          </div>
        </section>
      ) : null}
    </div>
  )
}
