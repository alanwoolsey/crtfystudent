export default function StatCard({ stat }) {
  return (
    <article className={`stat-card tone-${stat.tone || 'indigo'}`}>
      <span>{stat.label}</span>
      <strong>{stat.value}</strong>
      <p>{stat.delta}</p>
    </article>
  )
}
