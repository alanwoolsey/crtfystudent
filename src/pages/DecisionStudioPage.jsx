import SectionHeader from '../components/SectionHeader'
import { decisionWorkbench } from '../data/mockData'

export default function DecisionStudioPage() {
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

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Decision workbench</h3>
            <p>Examples of how staff should review and release outcomes.</p>
          </div>
        </div>
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
              {decisionWorkbench.map((item) => (
                <tr key={item.student}>
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
      </section>
    </div>
  )
}
