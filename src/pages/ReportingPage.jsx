import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage, reportingOverviewUrl } from '../lib/operationsApi'

const fallbackMetrics = {
  incompleteToCompleteConversion: 0.62,
  averageDaysToComplete: 11.4,
  averageDaysCompleteToDecision: 3.2,
  autoIndexSuccessRate: 0.71,
  admitToDepositConversion: 0.38,
  meltRate: 0.09,
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}

function buildTrendData(metrics) {
  return [
    { step: 'Incomplete to complete', value: Math.round((metrics.incompleteToCompleteConversion || 0) * 100) },
    { step: 'Auto-index success', value: Math.round((metrics.autoIndexSuccessRate || 0) * 100) },
    { step: 'Admit to deposit', value: Math.round((metrics.admitToDepositConversion || 0) * 100) },
    { step: 'Melt inverse', value: Math.max(0, 100 - Math.round((metrics.meltRate || 0) * 100)) },
  ]
}

export default function ReportingPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const [metrics, setMetrics] = useState(fallbackMetrics)
  const [mode, setMode] = useState('fallback')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadReporting = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetchWithTenantAuth(reportingOverviewUrl)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, 'Unable to load reporting overview.'))
      }

      setMetrics({
        incompleteToCompleteConversion: Number(payload?.incompleteToCompleteConversion) || 0,
        averageDaysToComplete: Number(payload?.averageDaysToComplete) || 0,
        averageDaysCompleteToDecision: Number(payload?.averageDaysCompleteToDecision) || 0,
        autoIndexSuccessRate: Number(payload?.autoIndexSuccessRate) || 0,
        admitToDepositConversion: Number(payload?.admitToDepositConversion) || 0,
        meltRate: Number(payload?.meltRate) || 0,
      })
      setMode('live')
    } catch (nextError) {
      setMetrics(fallbackMetrics)
      setMode('fallback')
      setError(nextError.message || 'Unable to load reporting overview.')
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithTenantAuth, session])

  useEffect(() => {
    loadReporting()
  }, [loadReporting])

  const reportCards = useMemo(() => ([
    { label: 'Incomplete to complete conversion', value: formatPercent(metrics.incompleteToCompleteConversion), detail: 'Share of incomplete applicants moving to operational completeness.' },
    { label: 'Average days to complete', value: metrics.averageDaysToComplete.toFixed(1), detail: 'Operational KPI for the core incomplete workflow.' },
    { label: 'Average days complete to decision', value: metrics.averageDaysCompleteToDecision.toFixed(1), detail: 'Tracks review efficiency after the file is ready.' },
    { label: 'Auto-index success rate', value: formatPercent(metrics.autoIndexSuccessRate), detail: 'Measures document automation quality.' },
    { label: 'Admit to deposit conversion', value: formatPercent(metrics.admitToDepositConversion), detail: 'Critical yield KPI for small-school enrollment teams.' },
    { label: 'Melt rate', value: formatPercent(metrics.meltRate), detail: 'Post-deposit risk measure that supports summer intervention.' },
  ]), [metrics])

  const trendData = useMemo(() => buildTrendData(metrics), [metrics])

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Reporting"
        title="Reporting"
        subtitle="Operational and leadership metrics tied directly to completion, decision speed, yield, and melt."
        actions={<button type="button" className="secondary-button" onClick={loadReporting}>Refresh reporting</button>}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Overview</h3>
            <p>Live value metrics that prove the product is improving application flow and enrollment outcomes.</p>
          </div>
          <div className="pill-row compact">
            <span className="tag">{mode === 'live' ? 'Live reporting API' : 'Fallback reporting values'}</span>
          </div>
        </div>
        {error ? <p className="muted-copy">{error}</p> : null}
      </section>

      <section className="value-grid two-up">
        {reportCards.map((card) => (
          <article key={card.label} className="panel value-card">
            <span className="table-sub">{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid two-up">
        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h3>Operational impact</h3>
              <p>Quick read on the conversion and quality metrics leadership will care about most.</p>
            </div>
          </div>
          <div className="chart-box lg">
            {isLoading && mode === 'fallback' ? (
              <p className="muted-copy">Loading reporting...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="step" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#18b7a6" fill="#18b7a622" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>What to watch</h3>
              <p>These are the metrics that best tie operations to revenue and staffing efficiency.</p>
            </div>
          </div>
          <div className="stack-list">
            <div className="stack-row"><strong>Completion velocity</strong><span>Watch average days to complete alongside incomplete-to-complete conversion.</span></div>
            <div className="stack-row"><strong>Review speed</strong><span>Time from complete to decision is where queue discipline shows up.</span></div>
            <div className="stack-row"><strong>Document quality</strong><span>Auto-index success tells you whether processors are working exceptions or doing basic clerical cleanup.</span></div>
            <div className="stack-row"><strong>Enrollment protection</strong><span>Admit-to-deposit and melt rate are where revenue justification lands.</span></div>
          </div>
        </article>
      </section>
    </div>
  )
}
