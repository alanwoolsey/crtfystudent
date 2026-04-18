import SectionHeader from '../components/SectionHeader'
import { trustCases } from '../data/mockData'

export default function TrustCenterPage() {
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

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Active trust cases</h3>
            <p>Trust is a product surface, not a background log.</p>
          </div>
        </div>
        <div className="feed-list">
          {trustCases.map((item) => (
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
          ))}
        </div>
      </section>
    </div>
  )
}
