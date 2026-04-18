import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, FunnelChart, Funnel, LabelList, PieChart, Pie, Cell } from 'recharts'
import StatCard from '../components/StatCard'
import { dashboardStats, inboxFeed, journeyFunnel, outcomeAgents, workloadByStage } from '../data/mockData'

const colors = ['#5b7cfa', '#18b7a6', '#8e7cff', '#ff8b8b']

export default function DashboardPage() {
  return (
    <div className="page-wrap">
      <section className="stats-grid">
        {dashboardStats.map((stat) => <StatCard key={stat.label} stat={stat} />)}
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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={journeyFunnel}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="step" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#5b7cfa" fill="#5b7cfa22" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chart-panel tall">
          <div className="panel-header">
            <div>
              <h3>Routing mix</h3>
              <p>Keep humans focused on exceptions while certified outcomes flow through automatically.</p>
            </div>
          </div>
          <div className="chart-box md">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={workloadByStage} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
                  {workloadByStage.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-list">
            {workloadByStage.map((item, index) => (
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
            {outcomeAgents.map((agent) => (
              <div key={agent.name} className="feed-item agent-item">
                <div>
                  <strong>{agent.name}</strong>
                  <p>{agent.objective}</p>
                  <small>{agent.summary}</small>
                </div>
                <span className="badge neutral-badge">{agent.metric}</span>
              </div>
            ))}
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
            {inboxFeed.map((item) => (
              <div key={item.title} className="feed-item">
                <div>
                  <div className="feed-top">
                    <strong>{item.title}</strong>
                    <span className="tag">{item.category}</span>
                  </div>
                  <p>{item.detail}</p>
                </div>
                <span className="table-sub">{item.when}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
