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

function getRouteButtonLabel(agentKey) {
  if (agentKey === 'document_agent') return 'Route to document'
  if (agentKey === 'trust_agent') return 'Route to trust'
  if (agentKey === 'decision_agent') return 'Route to decision'
  return 'Route'
}

export default function WorkItemRow({
  item,
  onResolvePrimaryAction,
  isResolving = false,
  onRouteWorkItem,
  onRecommendRoute,
  isRouting = false,
  isLoadingRecommendation = false,
  routeNote = '',
  routeRecommendation = null,
  onRouteNoteChange,
}) {
  const { hasAnyPermission } = useAuth()
  const populationLabel = getDisplayValue(item.population, 'general')
  const programLabel = getDisplayValue(item.program, 'Program pending')
  const institutionGoalLabel = getDisplayValue(item.institutionGoal, '')
  const canResolve = typeof onResolvePrimaryAction === 'function'
    && Boolean(item.blockingItems?.[0]?.id)
    && hasAnyPermission(['edit_checklist'])
  const canOpenStudent = hasAnyPermission(['view_student_360'])
  const canOpenDecision = hasAnyPermission(['view_decision_packet', 'release_decision'])
  const canRoute = typeof onRouteWorkItem === 'function' && Boolean(item.studentId)
  const canRecommendRoute = typeof onRecommendRoute === 'function' && Boolean(item.studentId)
  const routeTargets = ['document_agent', 'trust_agent', 'decision_agent']

  return (
    <article className="work-item-card">
      <div className="work-item-top">
        <div>
          <div className="work-item-heading">
            <h3>{item.studentName}</h3>
            <span className="tag">{populationLabel}</span>
          </div>
          <p className="muted-copy">{programLabel} {institutionGoalLabel ? `- ${institutionGoalLabel}` : ''}</p>
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
        {item.currentOwnerAgent ? <div><span>Owner agent</span><strong>{item.currentOwnerAgent}</strong></div> : null}
        {item.currentStage ? <div><span>Current stage</span><strong>{item.currentStage}</strong></div> : null}
        {item.recommendedAgent ? <div><span>Recommended agent</span><strong>{item.recommendedAgent}</strong></div> : null}
        {item.queueGroup ? <div><span>Queue group</span><strong>{item.queueGroup}</strong></div> : null}
        {item.priorityScore ? <div><span>Priority score</span><strong>{item.priorityScore}</strong></div> : null}
      </div>

      {item.blockingItems?.length ? (
        <div className="pill-row compact">
          {item.blockingItems.slice(0, 3).map((blocker) => (
            <span key={`${item.id}-${blocker.code || blocker.label}`} className="tag">{blocker.label}</span>
          ))}
        </div>
      ) : null}

      {item.documentAgent || item.trustAgent || item.decisionAgent ? (
        <div className="pill-row compact">
          {item.documentAgent?.resultCode ? <span className="tag">Document: {item.documentAgent.resultCode}</span> : null}
          {item.trustAgent?.resultCode ? <span className="tag">Trust: {item.trustAgent.resultCode}</span> : null}
          {item.decisionAgent?.resultCode ? <span className="tag">Decision: {item.decisionAgent.resultCode}</span> : null}
        </div>
      ) : null}

      {canRoute ? (
        <div className="stack-row">
          <input
            className="filter-input"
            placeholder="Routing note (optional)"
            value={routeNote}
            onChange={(event) => onRouteNoteChange?.(item, event.target.value)}
            disabled={isRouting}
          />
          <div className="pill-row compact">
            {canRecommendRoute ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onRecommendRoute(item)}
                disabled={isRouting || isLoadingRecommendation}
              >
                {isLoadingRecommendation ? 'Checking...' : 'Get route recommendation'}
              </button>
            ) : null}
            {routeRecommendation?.recommendedAgent ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => onRouteWorkItem(item, routeRecommendation.recommendedAgent)}
                disabled={isRouting}
              >
                {isRouting ? 'Routing...' : `Use ${getRouteButtonLabel(routeRecommendation.recommendedAgent).replace('Route to ', '')} recommendation`}
              </button>
            ) : null}
          </div>
          {routeRecommendation ? (
            <div className="callout-card accent-soft">
              <h4>Recommended route</h4>
              <p>{routeRecommendation.reason || 'No recommendation reason provided.'}</p>
              <div className="pill-row compact">
                {routeRecommendation.recommendedAgent ? <span className="tag">Next: {routeRecommendation.recommendedAgent}</span> : null}
                {routeRecommendation.currentOwnerAgent ? <span className="tag">Current: {routeRecommendation.currentOwnerAgent}</span> : null}
                {routeRecommendation.currentStage ? <span className="tag">Stage: {routeRecommendation.currentStage}</span> : null}
              </div>
            </div>
          ) : null}
          <div className="pill-row compact">
            {routeTargets.map((agentKey) => (
              <button
                key={`${item.id}-${agentKey}`}
                type="button"
                className="secondary-button"
                onClick={() => onRouteWorkItem(item, agentKey)}
                disabled={isRouting}
              >
                {isRouting ? 'Routing...' : getRouteButtonLabel(agentKey)}
              </button>
            ))}
          </div>
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
