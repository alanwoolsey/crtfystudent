import { useMemo, useState } from 'react'
import SectionHeader from '../components/SectionHeader'
import StudentCard from '../components/StudentCard'
import { useStudentRecords } from '../context/StudentRecordsContext'

export default function StudentsPage() {
  const { students, isLoadingStudents, studentsError, loadStudents } = useStudentRecords()
  const [query, setQuery] = useState('')

  const filteredStudents = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return students

    return students.filter((student) => {
      const haystack = [
        student.name,
        student.program,
        student.advisor,
        student.institutionGoal,
        student.risk,
        String(student.fitScore),
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(search)
    })
  }, [query, students])

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Canonical student record"
        title="Student 360"
        subtitle="Every upload, fit score, trust signal, and next-best action belongs to one student record — not a loose pile of files."
      />

      <div className="toolbar-row">
        <input
          className="filter-input"
          placeholder="Filter by name, program, advisor, institution, risk, or fit"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="pill-row">
          <span className="tag active-tag">All students</span>
          <span className="tag">High fit</span>
          <span className="tag">Trust hold</span>
          <span className="tag">Need evidence</span>
        </div>
      </div>

      {isLoadingStudents ? (
        <section className="panel">
          <p className="muted-copy">Loading students...</p>
        </section>
      ) : null}

      {!isLoadingStudents && studentsError ? (
        <section className="panel">
          <p className="auth-error">{studentsError}</p>
          <button type="button" className="secondary-button" onClick={() => loadStudents()}>
            Retry
          </button>
        </section>
      ) : null}

      {!isLoadingStudents && !studentsError ? (
        <section className="student-grid">
          {filteredStudents.length ? (
            filteredStudents.map((student) => <StudentCard key={student.id} student={student} />)
          ) : (
            <article className="panel">
              <p className="muted-copy">No students match that filter.</p>
            </article>
          )}
        </section>
      ) : null}
    </div>
  )
}
