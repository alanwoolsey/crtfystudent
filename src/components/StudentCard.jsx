import { Link } from 'react-router-dom'
import { ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react'
import ChecklistProgress from './ChecklistProgress'
import ReadinessChip from './ReadinessChip'
import { getChecklistStats, getReadiness } from '../lib/studentWorkflow'
import { useAuth } from '../context/AuthContext'

function getDisplayValue(value, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    if (typeof value.name === 'string') return value.name
    if (typeof value.label === 'string') return value.label
    if (typeof value.title === 'string') return value.title
  }
  return fallback || 'Unknown'
}

export default function StudentCard({ student }) {
  const { hasSensitivityTier, hasAnyPermission } = useAuth()
  const nextBestAction = student.recommendation?.nextBestAction || student.nextBestAction || 'Review'
  const checklistStats = getChecklistStats(student)
  const topBlocker = checklistStats.blockingItems[0]
  const readiness = getReadiness(student)
  const showAcademic = hasSensitivityTier('academic_record')
  const canOpenStudent = hasAnyPermission(['view_student_360'])
  const programLabel = getDisplayValue(student.program, 'Program pending')
  const institutionGoalLabel = getDisplayValue(student.institutionGoal, '')
  const riskLabel = getDisplayValue(student.risk, 'Low')
  const stageLabel = getDisplayValue(student.stage, 'Unknown')

  const content = (
    <Link to={`/students/${student.id}`} className="student-card">
      <div className="student-card-top">
        <div>
          <h3>{student.name}</h3>
          <p>{programLabel}{institutionGoalLabel ? ` • ${institutionGoalLabel}` : ''}</p>
        </div>
        <ArrowUpRight size={18} />
      </div>

      <div className="pill-row compact">
        <span className={`badge risk-${riskLabel.toLowerCase()}`}>{stageLabel}</span>
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
        <span><ShieldCheck size={14} /> {riskLabel} risk</span>
      </div>
    </Link>
  )

  if (!canOpenStudent) {
    return <article className="student-card">{content.props.children}</article>
  }

  return content
}
