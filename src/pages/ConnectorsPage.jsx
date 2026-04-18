import SectionHeader from '../components/SectionHeader'
import { connectorCards } from '../data/mockData'

export default function ConnectorsPage() {
  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Crtfy Integrations"
        title="System fit without system dependency"
        subtitle="crtfy Student should plug into the systems schools already have while owning the decision layer those systems do not."
      />

      <section className="value-grid two-up">
        {connectorCards.map((item) => (
          <article key={item.name} className="panel connector-card">
            <div className="connector-top">
              <div>
                <h3>{item.name}</h3>
                <p>{item.direction} · {item.latency}</p>
              </div>
              <span className="badge neutral-badge">{item.status}</span>
            </div>
            <div className="pill-row compact">
              {item.coverage.map((coverage) => <span key={coverage} className="tag">{coverage}</span>)}
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
          <div className="stack-row"><strong>Land first</strong><span>Prospect portal and transcript evaluation overlay.</span></div>
          <div className="stack-row"><strong>Expand next</strong><span>Decision packets and trust signals into SIS/CRM workflows.</span></div>
          <div className="stack-row"><strong>Own later</strong><span>Conversion operating system and agent-led lifecycle orchestration.</span></div>
        </div>
      </section>
    </div>
  )
}
