import { useEffect, useMemo, useState } from 'react'
import SectionHeader from '../components/SectionHeader'
import StudentCard from '../components/StudentCard'
import { useStudentRecords } from '../context/StudentRecordsContext'

const studentsPerPage = 8

export default function StudentsPage() {
  const { students, isLoadingStudents, studentsError, loadStudents } = useStudentRecords()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

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

  useEffect(() => {
    setPage(1)
  }, [query, students.length])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / studentsPerPage))
  const currentPage = Math.min(page, totalPages)
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * studentsPerPage
    return filteredStudents.slice(start, start + studentsPerPage)
  }, [currentPage, filteredStudents])

  const pageStart = filteredStudents.length ? (currentPage - 1) * studentsPerPage + 1 : 0
  const pageEnd = Math.min(currentPage * studentsPerPage, filteredStudents.length)

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
        <>
          {filteredStudents.length ? (
            <>
              <div className="list-pagination-bar">
                <p className="muted-copy">Showing {pageStart}-{pageEnd} of {filteredStudents.length} students</p>
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="pagination-status">Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>

              <section className="student-grid">
                {paginatedStudents.map((student) => <StudentCard key={student.id} student={student} />)}
              </section>
            </>
          ) : (
            <article className="panel">
              <p className="muted-copy">No students match that filter.</p>
            </article>
          )}
        </>
      ) : null}
    </div>
  )
}
