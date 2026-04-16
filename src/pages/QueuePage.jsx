import SectionHeader from '../components/SectionHeader'
import { queueItems } from '../data/mockData'

export default function QueuePage({ trustView = false }) {
  const title = trustView ? 'Trust and authenticity workspace' : 'Workflow and exceptions'
  const subtitle = trustView
    ? 'A focused surface for fraud signals, institution mismatches, and synthetic-document review.'
    : 'Manage work by exception, age, and owner while keeping student context visible.'

  return (
    <div className="page-wrap">
      <SectionHeader eyebrow={trustView ? 'Trust desk' : 'Operations queue'} title={title} subtitle={subtitle} />

      <section className="panel">
        <div className="table-toolbar">
          <input className="filter-input" placeholder="Search student, institution, owner, reason" />
          <div className="pill-row">
            <span className="tag active-tag">All</span>
            <span className="tag">High priority</span>
            <span className="tag">Aging &gt; 24h</span>
            <span className="tag">My work</span>
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
