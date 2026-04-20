export default function ChecklistProgress({ summary, compact = false }) {
  if (!summary) return null

  const completionPercent = Number(summary.completionPercent) || 0
  const completedCount = Number(summary.completedCount) || 0
  const totalRequired = Number(summary.totalRequired) || 0
  const missingCount = Number(summary.missingCount) || 0
  const needsReviewCount = Number(summary.needsReviewCount) || 0

  return (
    <div className={`checklist-progress ${compact ? 'compact' : ''}`}>
      <div className="checklist-progress-top">
        <span>Checklist progress</span>
        <strong>{completionPercent}%</strong>
      </div>
      <div className="checklist-progress-bar" aria-hidden="true">
        <div className="checklist-progress-fill" style={{ width: `${Math.max(0, Math.min(100, completionPercent))}%` }} />
      </div>
      <div className="checklist-progress-meta">
        <span>{completedCount}/{totalRequired || 0} complete</span>
        {needsReviewCount ? <span>{needsReviewCount} need review</span> : null}
        {missingCount ? <span>{missingCount} missing</span> : null}
        {summary.oneItemAway ? <span>1 item away</span> : null}
      </div>
    </div>
  )
}
