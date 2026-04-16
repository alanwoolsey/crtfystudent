import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'

export default function StudentCard({ student }) {
  return (
    <article className="student-card">
      <div className="student-card-top">
        <div>
          <div className="student-card-title">
            <h3>{student.name}</h3>
            <span className={`badge risk-${student.risk?.toLowerCase() || 'low'}`}>{student.stage}</span>
          </div>
          <p>{student.program} · Goal: {student.institutionGoal}</p>
        </div>
        <div className="score-pill">{student.transcriptsCount} transcripts</div>
      </div>

      <p className="muted-copy">{student.summary}</p>

      <div className="student-meta-grid">
        <span><MapPin size={14} /> {student.city}</span>
        <span>GPA {student.gpa}</span>
        <span>{student.creditsAccepted} credits accepted</span>
        <span>Updated {student.lastActivity}</span>
      </div>

      <div className="tag-row">
        {student.tags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}
      </div>

      <Link to={`/students/${student.id}`} className="text-link">
        Open student 360 <ArrowRight size={16} />
      </Link>
    </article>
  )
}
