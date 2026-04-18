import { Link } from 'react-router-dom'
import { ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react'

export default function StudentCard({ student }) {
  return (
    <Link to={`/students/${student.id}`} className="student-card">
      <div className="student-card-top">
        <div>
          <h3>{student.name}</h3>
          <p>{student.program} · {student.institutionGoal}</p>
        </div>
        <ArrowUpRight size={18} />
      </div>

      <div className="pill-row compact">
        <span className={`badge risk-${student.risk.toLowerCase()}`}>{student.stage}</span>
        <span className="tag">{student.fitScore}% fit</span>
        <span className="tag">{student.depositLikelihood}% deposit</span>
      </div>

      <p className="student-summary">{student.summary}</p>

      <div className="metric-cluster">
        <div><span>GPA</span><strong>{student.gpa}</strong></div>
        <div><span>Credits</span><strong>{student.creditsAccepted}</strong></div>
        <div><span>Uploads</span><strong>{student.transcriptsCount}</strong></div>
      </div>

      <div className="card-footer-row">
        <span><Sparkles size={14} /> Next: {student.recommendation?.nextBestAction || 'Review'}</span>
        <span><ShieldCheck size={14} /> {student.risk} risk</span>
      </div>
    </Link>
  )
}
