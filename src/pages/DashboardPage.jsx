import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts'
import StatCard from '../components/StatCard'
import { useAuth } from '../context/AuthContext'

const colors = ['#5b7cfa', '#18b7a6', '#8e7cff', '#ff8b8b']
const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const dashboardStatsUrl = `${apiBaseUrl}/api/v1/dashboard/stats`
const dashboardFunnelUrl = `${apiBaseUrl}/api/v1/dashboard/funnel`
const dashboardRoutingMixUrl = `${apiBaseUrl}/api/v1/dashboard/routing-mix`

const initialSectionState = {
  data: [],
  isLoading: false,
  error: '',
}

function getDashboardErrorMessage(response, payload, fallback) {
  if (response.status === 401) return 'Your session is no longer valid. Please sign in again.'
  if (response.status === 403) return 'Your account is not authorized for this tenant.'
  return payload?.detail || payload?.message || fallback
}

function retryButton(onClick) {
  return (
    <button type="button" className="secondary-button" onClick={onClick}>
      Retry
    </button>
  )
}

export default function DashboardPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const [statsState, setStatsState] = useState(initialSectionState)
  const [funnelState, setFunnelState] = useState(initialSectionState)
  const [routingMixState, setRoutingMixState] = useState(initialSectionState)

  const loadSection = useCallback(async ({ url, fallbackMessage, normalize = (payload) => payload, setState }) => {
    if (!session?.access_token || !session?.tenant_id) return

    setState((current) => ({
      ...current,
      isLoading: true,
      error: '',
    }))

    try {
      const response = await fetchWithTenantAuth(url)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getDashboardErrorMessage(response, payload, fallbackMessage))
      }

      setState({
        data: normalize(payload),
        isLoading: false,
        error: '',
      })
    } catch (error) {
      setState({
        data: [],
        isLoading: false,
        error: error.message || fallbackMessage,
      })
    }
  }, [fetchWithTenantAuth, session])

  const loadStats = useCallback(() => loadSection({
    url: dashboardStatsUrl,
    fallbackMessage: 'Unable to load summary metrics.',
    normalize: (payload) => Array.isArray(payload) ? payload : payload?.stats || [],
    setState: setStatsState,
  }), [loadSection])

  const loadFunnel = useCallback(() => loadSection({
    url: dashboardFunnelUrl,
    fallbackMessage: 'Unable to load outcome funnel.',
    normalize: (payload) => Array.isArray(payload) ? payload : payload?.funnel || payload?.items || [],
    setState: setFunnelState,
  }), [loadSection])

  const loadRoutingMix = useCallback(() => loadSection({
    url: dashboardRoutingMixUrl,
    fallbackMessage: 'Unable to load routing mix.',
    normalize: (payload) => Array.isArray(payload) ? payload : payload?.routing_mix || payload?.routingMix || payload?.items || [],
    setState: setRoutingMixState,
  }), [loadSection])

  useEffect(() => {
    loadStats()
    loadFunnel()
    loadRoutingMix()
  }, [loadFunnel, loadRoutingMix, loadStats])

  const hasStats = useMemo(() => statsState.data.length > 0, [statsState.data])

  return (
    <div className="page-wrap">
      <section className="stats-grid">
        {statsState.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <article key={`stat-loading-${index}`} className="panel">
              <p className="muted-copy">Loading summary metrics...</p>
            </article>
          ))
        ) : null}
        {!statsState.isLoading && statsState.error ? (
          <article className="panel">
            <p className="auth-error">{statsState.error}</p>
            {retryButton(loadStats)}
          </article>
        ) : null}
        {!statsState.isLoading && !statsState.error ? (
          hasStats ? statsState.data.map((stat) => <StatCard key={stat.label} stat={stat} />) : (
            <article className="panel">
              <p className="muted-copy">No summary metrics are available yet.</p>
            </article>
          )
        ) : null}
      </section>

      <section className="main-layout">
        <article className="panel chart-panel tall">
          <div className="panel-header">
            <div>
              <h3>Outcome funnel</h3>
              <p>Measure the movement from prospect to deposit, not just contact activity.</p>
            </div>
            {funnelState.error ? retryButton(loadFunnel) : null}
          </div>
          <div className="chart-box lg">
            {funnelState.isLoading ? (
              <p className="muted-copy">Loading outcome funnel...</p>
            ) : funnelState.error ? (
              <p className="auth-error">{funnelState.error}</p>
            ) : funnelState.data.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={funnelState.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="step" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#5b7cfa" fill="#5b7cfa22" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted-copy">No funnel data is available yet.</p>
            )}
          </div>
        </article>

        <article className="panel chart-panel tall">
          <div className="panel-header">
            <div>
              <h3>Routing mix</h3>
              <p>Keep humans focused on exceptions while outcomes flow through automatically.</p>
            </div>
            {routingMixState.error ? retryButton(loadRoutingMix) : null}
          </div>
          <div className="chart-box md">
            {routingMixState.isLoading ? (
              <p className="muted-copy">Loading routing mix...</p>
            ) : routingMixState.error ? (
              <p className="auth-error">{routingMixState.error}</p>
            ) : routingMixState.data.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={routingMixState.data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
                    {routingMixState.data.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted-copy">No routing mix is available yet.</p>
            )}
          </div>
          <div className="legend-list">
            {!routingMixState.isLoading && !routingMixState.error ? routingMixState.data.map((item, index) => (
              <div key={item.name} className="legend-row">
                <span className="legend-dot" style={{ background: colors[index % colors.length] }} />
                <span>{item.name}</span>
                <strong>{item.value}%</strong>
              </div>
            )) : null}
          </div>
        </article>
      </section>
    </div>
  )
}
