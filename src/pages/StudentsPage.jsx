import SectionHeader from '../components/SectionHeader'
import StudentCard from '../components/StudentCard'
import { useStudentRecords } from '../context/StudentRecordsContext'

export default function StudentsPage() {
  const { students } = useStudentRecords()

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Canonical student record"
        title="Student 360"
        subtitle="Every upload, fit score, trust signal, and next-best action belongs to one student record — not a loose pile of files."
      />

      <div className="toolbar-row">
        <input className="filter-input" placeholder="Filter by name, program, advisor, institution, risk, or fit" />
        <div className="pill-row">
          <span className="tag active-tag">All students</span>
          <span className="tag">High fit</span>
          <span className="tag">Trust hold</span>
          <span className="tag">Need evidence</span>
        </div>
      </div>

      <section className="student-grid">
        {students.map((student) => <StudentCard key={student.id} student={student} />)}
      </section>
    </div>
  )
}
