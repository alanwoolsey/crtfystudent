import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ArrowRight, CalendarClock, FileCheck2, ShieldAlert, Sparkles } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import StatCard from '../components/StatCard'
import { dashboardStats, inboxFeed, studentJourney, students, workloadByStage } from '../data/mockData'
import { Link } from 'react-router-dom'

const palette = ['#5B7CFA', '#18B7A6', '#8E7CFF', '#FFB84D', '#F06595']

export default function DashboardPage() {
  const spotlight = students[0]

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Reimagined dashboard"
        title="A student-first command center"
        subtitle="See health, bottlenecks, and the next best action without opening a single file."
        actions={<button className="primary-button">Create intake batch</button>}
      />

      <section className="hero-banner">
        <div>
          <p className="eyebrow">Today’s signal</p>
          <h2>146 transcripts landed, but only 14 need intervention.</h2>
          <p>Most work is flowing normally. The main risk is a small cluster of authenticity exceptions and two students awaiting follow-up documents.</p>
        </div>
        <div className="hero-stats">
          <span><Sparkles size={16} /> Auto-grouping success 93%</span>
          <span><FileCheck2 size={16} /> Ready for review 78%</span>
          <span><ShieldAlert size={16} /> Trust exceptions 14</span>
        </div>
      </section>

      <section className="stats-grid">
        {dashboardStats.map((item) => <StatCard key={item.label} {...item} />)}
      </section>

      <section className="dashboard-grid two-up">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Student journey funnel</h3>
              <p>Spot where students fall out of the transcript-to-decision flow.</p>
            </div>
          </div>
          <div className="chart-box lg">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="count" data={studentJourney} isAnimationActive>
                  {studentJourney.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Work by stage</h3>
              <p>Operational load across the transcript lifecycle.</p>
            </div>
          </div>
          <div className="chart-box lg">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={workloadByStage} innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value">
                  {workloadByStage.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="dashboard-grid main-layout">
        <article className="panel spotlight-panel">
          <div className="panel-header">
            <div>
              <h3>Student spotlight</h3>
              <p>A 360° record that rolls every transcript into one story.</p>
            </div>
            <Link to={`/students/${spotlight.id}`} className="text-link">Open full profile <ArrowRight size={16} /></Link>
          </div>
          <div className="spotlight-grid">
            <div>
              <h2>{spotlight.name}</h2>
              <p>{spotlight.program}</p>
              <p className="muted-copy">{spotlight.summary}</p>
              <div className="tag-row">
                {spotlight.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
              </div>
            </div>
            <div className="metric-cluster">
              <div><span>Stage</span><strong>{spotlight.stage}</strong></div>
              <div><span>Credits accepted</span><strong>{spotlight.creditsAccepted}</strong></div>
              <div><span>Transcript history</span><strong>{spotlight.transcriptsCount} files</strong></div>
              <div><span>Advisor</span><strong>{spotlight.advisor}</strong></div>
            </div>
          </div>
        </article>

        <article className="panel side-feed">
          <div className="panel-header">
            <div>
              <h3>What changed</h3>
              <p>Activity feed for operators and advisors.</p>
            </div>
          </div>
          <div className="feed-list">
            {inboxFeed.map((item) => (
              <div key={item.title} className="feed-item">
                <div className="feed-chip">{item.category}</div>
                <h4>{item.title}</h4>
                <p>{item.detail}</p>
                <span>{item.when}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid two-up">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Throughput this week</h3>
              <p>Uploads compared with completed reviews.</p>
            </div>
            <div className="mini-kpi"><CalendarClock size={16} /> Weekly cadence</div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spotlight.workflow}>
                <defs>
                  <linearGradient id="colorUploaded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B7CFA" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#5B7CFA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="uploaded" stroke="#5B7CFA" fill="url(#colorUploaded)" />
                <Area type="monotone" dataKey="reviewed" stroke="#18B7A6" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Top programs by transcript demand</h3>
              <p>Useful for staffing and advising alignment.</p>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { program: 'Nursing', files: 61 },
                { program: 'Computer Science', files: 48 },
                { program: 'Business', files: 37 },
                { program: 'Biology', files: 29 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="program" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="files" fill="#8E7CFF" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </div>
  )
}
