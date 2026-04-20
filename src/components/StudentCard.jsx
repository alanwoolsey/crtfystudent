import { Link } from 'react-router-dom'
import { ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react'
import ChecklistProgress from './ChecklistProgress'
import ReadinessChip from './ReadinessChip'
import { getChecklistStats, getReadiness } from '../lib/studentWorkflow'
import { useAuth } from '../context/AuthContext'

export default function StudentCard({ student }) {
  const { hasSensitivityTier, hasAnyPermission } = useAuth()
  const nextBestAction = student.recommendation?.nextBestAction || student.nextBestAction || 'Review'
  const checklistStats = getChecklistStats(student)
  const topBlocker = checklistStats.blockingItems[0]
  const readiness = getReadiness(student)
  const showAcademic = hasSensitivityTier('academic_record')
  const canOpenStudent = hasAnyPermission(['view_student_360'])

  const content = (
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
        <ReadinessChip readiness={readiness} />
        {showAcademic ? <span className="tag">{student.fitScore}% fit</span> : null}
        <span className="tag">{student.depositLikelihood}% deposit</span>
      </div>

      <p className="student-summary">{student.summary}</p>

      <ChecklistProgress
        compact
        summary={{
          completionPercent: checklistStats.completionPercent,
          completedCount: checklistStats.completedCount,
          totalRequired: checklistStats.totalRequired,
          missingCount: checklistStats.missingCount,
          needsReviewCount: checklistStats.needsReviewCount,
          oneItemAway: checklistStats.oneItemAway,
        }}
      />

      {topBlocker ? (
        <div className="student-blocker">
          <span className="table-sub">Current blocker</span>
          <strong>{topBlocker.label}</strong>
        </div>
      ) : null}

      <div className="metric-cluster">
        <div><span>GPA</span><strong>{showAcademic ? student.gpa : '-'}</strong></div>
        <div><span>Credits</span><strong>{showAcademic ? student.creditsAccepted : '-'}</strong></div>
        <div><span>Uploads</span><strong>{student.transcriptsCount}</strong></div>
      </div>

      <div className="card-footer-row">
        <span><Sparkles size={14} /> Next: {nextBestAction}</span>
        <span><ShieldCheck size={14} /> {student.risk} risk</span>
      </div>
    </Link>
  )

  if (!canOpenStudent) {
    return <article className="student-card">{content.props.children}</article>
  }

  return content
}
