import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts'
import StatCard from '../components/StatCard'
import { useAuth } from '../context/AuthContext'

const colors = ['#5b7cfa', '#18b7a6', '#8e7cff', '#ff8b8b']
const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const dashboardUrl = `${apiBaseUrl}/api/v1/dashboard`

function normalizeDashboard(payload) {
  return {
    stats: payload?.stats || payload?.dashboardStats || [],
    funnel: payload?.funnel || payload?.journeyFunnel || [],
    routingMix: payload?.routing_mix || payload?.routingMix || payload?.workloadByStage || [],
    agents: payload?.agents || payload?.outcomeAgents || [],
    activity: payload?.activity || payload?.inboxFeed || [],
  }
}

export default function DashboardPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const [dashboard, setDashboard] = useState({
    stats: [],
    funnel: [],
    routingMix: [],
    agents: [],
    activity: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetchWithTenantAuth(dashboardUrl)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) throw new Error('Your session is no longer valid. Please sign in again.')
        if (response.status === 403) throw new Error('Your account is not authorized for this tenant.')
        throw new Error(payload?.detail || payload?.message || 'Unable to load Command Center.')
      }

      setDashboard(normalizeDashboard(payload))
    } catch (nextError) {
      setError(nextError.message || 'Unable to load Command Center.')
      setDashboard({
        stats: [],
        funnel: [],
        routingMix: [],
        agents: [],
        activity: [],
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithTenantAuth, session])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const hasStats = useMemo(() => dashboard.stats.length > 0, [dashboard.stats])

  return (
    <div className="page-wrap">
      {isLoading ? (
        <section className="panel">
          <p className="muted-copy">Loading Command Center...</p>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="panel">
          <p className="auth-error">{error}</p>
          <button type="button" className="secondary-button" onClick={loadDashboard}>Retry</button>
        </section>
      ) : null}

      {!isLoading && !error ? (
        <>
          <section className="stats-grid">
            {hasStats ? dashboard.stats.map((stat) => <StatCard key={stat.label} stat={stat} />) : (
              <article className="panel">
                <p className="muted-copy">No summary metrics are available yet.</p>
              </article>
            )}
          </section>

          <section className="main-layout">
            <article className="panel chart-panel tall">
              <div className="panel-header">
                <div>
                  <h3>Outcome funnel</h3>
                  <p>Measure the movement from prospect to deposit, not just contact activity.</p>
                </div>
              </div>
              <div className="chart-box lg">
                {dashboard.funnel.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboard.funnel}>
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
              </div>
              <div className="chart-box md">
                {dashboard.routingMix.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dashboard.routingMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
                        {dashboard.routingMix.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted-copy">No routing mix is available yet.</p>
                )}
              </div>
              <div className="legend-list">
                {dashboard.routingMix.map((item, index) => (
                  <div key={item.name} className="legend-row">
                    <span className="legend-dot" style={{ background: colors[index % colors.length] }} />
                    <span>{item.name}</span>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="dashboard-grid two-up">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h3>Outcome agents</h3>
                  <p>Each agent owns a KPI and hands staff a clean, explainable package.</p>
                </div>
              </div>
              <div className="feed-list">
                {dashboard.agents.length ? dashboard.agents.map((agent) => (
                  <div key={agent.name} className="feed-item agent-item">
                    <div>
                      <strong>{agent.name}</strong>
                      <p>{agent.objective}</p>
                      <small>{agent.summary}</small>
                    </div>
                    <span className="badge neutral-badge">{agent.metric}</span>
                  </div>
                )) : <p className="muted-copy">No agent metrics are available yet.</p>}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h3>Live activity</h3>
                  <p>Operational events with outcome context attached.</p>
                </div>
              </div>
              <div className="feed-list">
                {dashboard.activity.length ? dashboard.activity.map((item) => (
                  <div key={`${item.title}-${item.when}`} className="feed-item">
                    <div>
                      <div className="feed-top">
                        <strong>{item.title}</strong>
                        <span className="tag">{item.category}</span>
                      </div>
                      <p>{item.detail}</p>
                    </div>
                    <span className="table-sub">{item.when}</span>
                  </div>
                )) : <p className="muted-copy">No activity has been recorded yet.</p>}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </div>
  )
}
