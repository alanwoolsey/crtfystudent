import { prospectExperiences } from '../data/mockData'
import SectionHeader from '../components/SectionHeader'

export default function ProspectPortalPage() {
  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Student-facing experience"
        title="Prospect Portal that converts"
        subtitle="This is where crtfy Student beats traditional CRMs: a transcript-led front door that gives value before the application starts."
        actions={<button className="primary-button">Preview microsite</button>}
      />

      <section className="panel portal-hero">
        <div className="portal-left">
          <p className="eyebrow">Prototype journey</p>
          <h2>Upload transcript. See likely fit. Take the next best step.</h2>
          <p>
            The product should feel like guided certainty: not “thanks, we’ll get back to you,” but “here’s your likely transfer path,
            confidence, gaps, and fastest route forward.”
          </p>
          <div className="hero-actions">
            <button className="primary-button">Upload transcript</button>
            <button className="secondary-button">Talk to advisor</button>
          </div>
        </div>
        <div className="portal-preview">
          <div className="preview-card emphasis">
            <span className="table-sub">Best-fit program</span>
            <strong>BS Nursing Transfer</strong>
            <p>94% fit confidence · 42 likely accepted credits · 1 missing clinical prerequisite</p>
          </div>
          <div className="preview-grid">
            <div className="preview-card">
              <span className="table-sub">Estimated completion</span>
              <strong>2.1 years</strong>
            </div>
            <div className="preview-card">
              <span className="table-sub">Scholarship potential</span>
              <strong>$8.5k–$11k</strong>
            </div>
            <div className="preview-card">
              <span className="table-sub">Risk posture</span>
              <strong>Verified</strong>
            </div>
            <div className="preview-card">
              <span className="table-sub">Next step</span>
              <strong>Apply now</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="value-grid three-up">
        {prospectExperiences.map((item) => (
          <article key={item.title} className="panel value-card">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid two-up">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Microsite blocks</h3>
              <p>Dynamic content based on program fit, campus, and student intent.</p>
            </div>
          </div>
          <div className="stack-list">
            <div className="stack-row"><strong>Header</strong><span>“You already have 42 likely transferable credits.”</span></div>
            <div className="stack-row"><strong>Proof</strong><span>Show accepted-credit rationale and course blocks.</span></div>
            <div className="stack-row"><strong>Urgency</strong><span>Highlight upcoming cohort deadline and advisor slots.</span></div>
            <div className="stack-row"><strong>CTA</strong><span>Apply now, upload one missing item, or schedule call.</span></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Why this matters</h3>
              <p>Slate and Element still anchor on internal workflow. This anchors on student momentum.</p>
            </div>
          </div>
          <div className="callout-card">
            <h4>Prototype principle</h4>
            <p>
              Every student-facing screen should answer three questions immediately: “Am I a fit?”, “What transfers?”, and “What should I do next?”
            </p>
          </div>
        </article>
      </section>
    </div>
  )
}
