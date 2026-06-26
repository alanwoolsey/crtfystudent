import { useCallback, useEffect, useState } from 'react'
import SectionHeader from '../components/SectionHeader'
import OperationalModeNotice from '../components/OperationalModeNotice'
import { useAuth } from '../context/AuthContext'
import { connectorCards } from '../data/mockData'
import { activeDocumentStorageProvider } from '../lib/documentStorage'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const connectorsUrl = `${apiBaseUrl}/api/v1/connectors`

function normalizeConnectors(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.connectors)
      ? payload.connectors
      : Array.isArray(payload?.items)
        ? payload.items
        : []

  return items.map((item) => ({
    id: item.id || item.connectorId || item.name,
    name: item.name || item.label || 'Connector',
    status: item.status || item.health || 'Unknown',
    direction: item.direction || item.syncDirection || 'Not configured',
    latency: item.latency || item.syncFrequency || item.lastSyncLabel || 'Sync pending',
    lastSync: item.lastSync || item.lastSyncedAt || '',
    errorCount: Number(item.errorCount || item.errors || 0),
    coverage: Array.isArray(item.coverage)
      ? item.coverage
      : Array.isArray(item.objects)
        ? item.objects
        : [],
  }))
}

function withActiveDocumentStorageConnector(items) {
  const connectors = Array.isArray(items) ? items : []
  const hasDocumentStorage = connectors.some((item) => {
    const value = `${item.id || ''} ${item.name || ''}`.toLowerCase()
    return value.includes('crtfy_documents') || value.includes('crtfy documents')
  })

  return hasDocumentStorage ? connectors : [activeDocumentStorageProvider, ...connectors]
}

export default function ConnectorsPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const [items, setItems] = useState(connectorCards)
  const [mode, setMode] = useState('derived')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadConnectors = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetchWithTenantAuth(connectorsUrl)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.detail || payload?.message || 'Unable to load connectors.')
      }

      const nextItems = normalizeConnectors(payload)
      setItems(withActiveDocumentStorageConnector(nextItems.length ? nextItems : connectorCards))
      setMode(nextItems.length ? 'live' : 'derived')
    } catch (nextError) {
      setItems(withActiveDocumentStorageConnector(connectorCards))
      setMode('derived')
      setError(nextError.message || 'Unable to load connectors.')
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithTenantAuth, session])

  useEffect(() => {
    loadConnectors()
  }, [loadConnectors])

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Crtfy Integrations"
        title="System fit without system dependency"
        subtitle="crtfy Student should plug into the systems schools already have while owning the decision layer those systems do not."
        actions={<button type="button" className="secondary-button" onClick={loadConnectors}>Refresh connectors</button>}
      />

      <section className="panel">
        <OperationalModeNotice
          mode={mode}
          liveLabel="Live connectors"
          derivedLabel="Connector fallback"
          isLoading={isLoading}
          error={error || 'Connector APIs are not available yet. Showing planned connector coverage.'}
          onRetry={loadConnectors}
        />
      </section>

      <section className="value-grid two-up">
        {items.map((item) => (
          <article key={item.id || item.name} className="panel connector-card">
            <div className="connector-top">
              <div>
                <h3>{item.name}</h3>
                <p>{item.direction} - {item.latency}</p>
              </div>
              <span className={`badge ${String(item.status).toLowerCase().includes('error') || item.errorCount > 0 ? 'risk-high' : 'neutral-badge'}`}>
                {item.status}
              </span>
            </div>
            <div className="pill-row compact">
              {item.coverage.map((coverage) => <span key={coverage} className="tag">{coverage}</span>)}
              {item.lastSync ? <span className="tag">Last sync: {item.lastSync}</span> : null}
              {item.errorCount ? <span className="tag">{item.errorCount} errors</span> : null}
            </div>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Connector strategy</h3>
            <p>Show schools they can adopt this without ripping out their current CRM or SIS.</p>
          </div>
        </div>
        <div className="stack-list">
          <div className="stack-row"><strong>Land first</strong><span>Portals and transcript evaluation overlay.</span></div>
          <div className="stack-row"><strong>Expand next</strong><span>Decision packets and trust signals into SIS/CRM workflows.</span></div>
          <div className="stack-row"><strong>Own later</strong><span>Conversion operating system and agent-led lifecycle orchestration.</span></div>
        </div>
      </section>
    </div>
  )
}
