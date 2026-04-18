import SectionHeader from '../components/SectionHeader'
import { queueItems } from '../data/mockData'

export default function QueuePage() {
  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Work by exception"
        title="Operational workflows"
        subtitle="Queue design should make it obvious what humans must handle versus what agents and connectors can resolve automatically."
      />

      <section className="panel">
        <div className="table-toolbar">
          <input className="filter-input" placeholder="Search student, institution, owner, or reason" />
          <div className="pill-row">
            <span className="tag active-tag">All work</span>
            <span className="tag">High priority</span>
            <span className="tag">Connector ready</span>
            <span className="tag">Needs staff</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Institution</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Age</th>
                <th>Priority</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {queueItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.student}</strong>
                    <div className="table-sub">{item.studentId}</div>
                  </td>
                  <td>{item.institution}</td>
                  <td><span className="badge neutral-badge">{item.status}</span></td>
                  <td>{item.owner}</td>
                  <td>{item.age}</td>
                  <td><span className={`badge risk-${item.priority.toLowerCase()}`}>{item.priority}</span></td>
                  <td>{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
