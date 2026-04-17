import SectionHeader from '../components/SectionHeader'
import StudentCard from '../components/StudentCard'
import { useStudentRecords } from '../context/StudentRecordsContext'

export default function StudentsPage() {
  const { students } = useStudentRecords()

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Student records"
        title="One canonical student record for every transcript"
        subtitle="Browse students, not files. Each profile aggregates all uploads, workflow events, and outreach."
      />

      <div className="toolbar-row">
        <input className="filter-input" placeholder="Filter by name, program, advisor, institution, risk" />
        <div className="pill-row">
          <span className="tag active-tag">All students</span>
          <span className="tag">Needs review</span>
          <span className="tag">Awaiting student</span>
          <span className="tag">Quarantined history</span>
        </div>
      </div>

      <section className="student-grid">
        {students.map((student) => <StudentCard key={student.id} student={student} />)}
      </section>
    </div>
  )
}
