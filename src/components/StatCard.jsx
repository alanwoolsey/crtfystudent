export default function StatCard({ label, value, delta, tone = 'indigo' }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <div className="stat-row">
        <h3>{value}</h3>
        <span className="stat-delta">{delta}</span>
      </div>
    </article>
  )
}
