export default function StatCard({ stat, onClick }) {
  const className = `stat-card tone-${stat.tone || 'indigo'}${typeof onClick === 'function' ? ' clickable-stat-card' : ''}`

  if (typeof onClick === 'function') {
    return (
      <button type="button" className={className} onClick={onClick}>
        <span>{stat.label}</span>
        <strong>{stat.value}</strong>
        <p>{stat.delta}</p>
      </button>
    )
  }

  return (
    <article className={className}>
      <span>{stat.label}</span>
      <strong>{stat.value}</strong>
      <p>{stat.delta}</p>
    </article>
  )
}
