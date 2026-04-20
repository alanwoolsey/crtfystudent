import SectionHeader from '../components/SectionHeader'

export default function AccessDeniedPage() {
  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="403"
        title="Access Denied"
        subtitle="Your account does not have permission to view this screen."
      />
      <section className="panel">
        <p className="muted-copy">If you believe this is incorrect, contact an administrator.</p>
      </section>
    </div>
  )
}
