import { Link } from 'react-router-dom'
import ChecklistProgress from './ChecklistProgress'
import ReadinessChip from './ReadinessChip'
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

function getPriorityLabel(priority) {
  if (priority === 'urgent') return 'Urgent'
  if (priority === 'today') return 'Today'
  return 'Soon'
}

export default function WorkItemRow({ item, onResolvePrimaryAction, isResolving = false }) {
  const { hasAnyPermission } = useAuth()
  const populationLabel = getDisplayValue(item.population, 'general')
  const programLabel = getDisplayValue(item.program, 'Program pending')
  const institutionGoalLabel = getDisplayValue(item.institutionGoal, '')
  const canResolve = typeof onResolvePrimaryAction === 'function'
    && Boolean(item.blockingItems?.[0]?.id)
    && hasAnyPermission(['edit_checklist'])
  const canOpenStudent = hasAnyPermission(['view_student_360'])
  const canOpenDecision = hasAnyPermission(['view_decision_packet', 'release_decision'])

  return (
    <article className="work-item-card">
      <div className="work-item-top">
        <div>
          <div className="work-item-heading">
            <h3>{item.studentName}</h3>
            <span className="tag">{populationLabel}</span>
          </div>
          <p className="muted-copy">{programLabel} {institutionGoalLabel ? `• ${institutionGoalLabel}` : ''}</p>
        </div>
        <div className="pill-row compact">
          <ReadinessChip readiness={item.readiness} />
          <span className={`badge ${item.priority === 'urgent' ? 'risk-high' : item.priority === 'today' ? 'risk-medium' : 'risk-low'}`}>
            {getPriorityLabel(item.priority)}
          </span>
          <span className="badge neutral-badge">{item.reasonToAct?.label || 'Needs review'}</span>
        </div>
      </div>

      <ChecklistProgress
        compact
        summary={{
          completionPercent: item.completionPercent,
          completedCount: item.checklistSummary?.completedCount,
          totalRequired: item.checklistSummary?.totalRequired,
          missingCount: item.checklistSummary?.missingCount,
          needsReviewCount: item.checklistSummary?.needsReviewCount,
          oneItemAway: item.checklistSummary?.oneItemAway,
        }}
      />

      <div className="work-item-meta">
        <div><span>Owner</span><strong>{item.owner?.name || 'Unassigned'}</strong></div>
        <div><span>Next</span><strong>{item.suggestedAction?.label || 'Review student'}</strong></div>
        <div><span>Last activity</span><strong>{item.lastActivity || 'Unknown'}</strong></div>
      </div>

      {item.blockingItems?.length ? (
        <div className="pill-row compact">
          {item.blockingItems.slice(0, 3).map((blocker) => (
            <span key={`${item.id}-${blocker.code || blocker.label}`} className="tag">{blocker.label}</span>
          ))}
        </div>
      ) : null}

      <div className="work-item-actions">
        {canResolve ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => onResolvePrimaryAction(item)}
            disabled={isResolving}
          >
            {isResolving ? 'Clearing...' : 'Clear top blocker'}
          </button>
        ) : null}
        {canOpenStudent ? <Link to={`/students/${item.studentId}`} className="secondary-button">Open student</Link> : null}
        {canOpenDecision ? <Link to="/decisions" className="primary-button">Review queue</Link> : null}
      </div>
    </article>
  )
}
