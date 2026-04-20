export default function ReadinessChip({ readiness }) {
  if (!readiness) return null

  const toneClass = readiness.tone === 'high'
    ? 'risk-high'
    : readiness.tone === 'medium'
      ? 'risk-medium'
      : readiness.tone === 'low'
        ? 'risk-low'
        : 'neutral-badge'

  return (
    <span className={`badge ${toneClass}`} title={readiness.reason || readiness.label}>
      {readiness.label}
    </span>
  )
}
