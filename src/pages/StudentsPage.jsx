import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import StudentCard from '../components/StudentCard'
import { useStudentRecords } from '../context/StudentRecordsContext'

const studentsPerPage = 8
const quickFilters = [
  { key: 'all', label: 'All students' },
  { key: 'high-fit', label: 'High fit' },
  { key: 'trust-hold', label: 'Trust hold' },
  { key: 'need-evidence', label: 'Need evidence' },
]

export default function StudentsPage() {
  const { students, isLoadingStudents, studentsError, loadStudents } = useStudentRecords()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setQuery(searchParams.get('q') || '')
  }, [searchParams])

  function handleQueryChange(nextQuery) {
    setQuery(nextQuery)
    const nextParams = new URLSearchParams(searchParams)
    if (nextQuery.trim()) nextParams.set('q', nextQuery)
    else nextParams.delete('q')
    setSearchParams(nextParams, { replace: true })
  }

  const filteredStudents = useMemo(() => {
    const search = query.trim().toLowerCase()
    const quickFilteredStudents = students.filter((student) => {
      const stage = String(student.stage || '').toLowerCase()
      const risk = String(student.risk || '').toLowerCase()
      const nextAction = String(student.nextBestAction || student.recommendation?.nextBestAction || '').toLowerCase()
      const tags = Array.isArray(student.tags) ? student.tags.map((tag) => String(tag).toLowerCase()) : []
      const fitScore = Number(student.fitScore) || 0

      if (activeFilter === 'high-fit') return fitScore >= 85
      if (activeFilter === 'trust-hold') {
        return stage.includes('trust hold') || risk === 'high' || tags.includes('trust hold')
      }
      if (activeFilter === 'need-evidence') {
        return stage.includes('pending evidence') || stage.includes('needs evidence') || nextAction.includes('request') || nextAction.includes('evidence')
      }
      return true
    })

    if (!search) return quickFilteredStudents

    return quickFilteredStudents.filter((student) => {
      const haystack = [
        student.name,
        student.program,
        student.advisor,
        student.institutionGoal,
        student.risk,
        String(student.fitScore),
        student.nextBestAction,
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(search)
    })
  }, [activeFilter, query, students])

  useEffect(() => {
    setPage(1)
  }, [activeFilter, query, students.length])

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
          onChange={(event) => handleQueryChange(event.target.value)}
        />
        <div className="pill-row">
          {quickFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`tag ${activeFilter === filter.key ? 'active-tag' : ''}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
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
