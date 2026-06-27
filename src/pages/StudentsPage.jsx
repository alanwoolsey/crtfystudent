import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import StudentCard from '../components/StudentCard'
import { useStudentRecords } from '../context/StudentRecordsContext'
import { PIPELINE_STATUSES, PIPELINE_STATUS_MEANINGS } from '../lib/admissionsWorkflow'
import useDebouncedValue from '../lib/useDebouncedValue'

const studentsPerPage = 8
const pipelineStatusMeanings = Object.fromEntries(PIPELINE_STATUS_MEANINGS.map((item) => [item.status, item.meaning]))
const quickFilters = [
  { key: 'all', label: 'All students' },
  { key: PIPELINE_STATUSES.inquiry, label: PIPELINE_STATUSES.inquiry },
  { key: PIPELINE_STATUSES.prospect, label: PIPELINE_STATUSES.prospect },
  { key: PIPELINE_STATUSES.applicant, label: PIPELINE_STATUSES.applicant },
  { key: PIPELINE_STATUSES.incomplete, label: PIPELINE_STATUSES.incomplete },
  { key: PIPELINE_STATUSES.complete, label: PIPELINE_STATUSES.complete },
  { key: PIPELINE_STATUSES.admitted, label: PIPELINE_STATUSES.admitted },
  { key: PIPELINE_STATUSES.depositedCommitted, label: PIPELINE_STATUSES.depositedCommitted },
  { key: PIPELINE_STATUSES.registered, label: PIPELINE_STATUSES.registered },
]

function getDisplayValue(value, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    if (typeof value.name === 'string') return value.name
    if (typeof value.label === 'string') return value.label
    if (typeof value.title === 'string') return value.title
  }
  return fallback
}

export default function StudentsPage() {
  const { students, isLoadingStudents, studentsError, loadStudents } = useStudentRecords()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [page, setPage] = useState(1)
  const debouncedQuery = useDebouncedValue(query, 350)

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

  useEffect(() => {
    loadStudents(debouncedQuery.trim()).catch(() => {})
  }, [debouncedQuery, loadStudents])

  const filteredStudents = useMemo(() => {
    const search = query.trim().toLowerCase()
    const quickFilteredStudents = students.filter((student) => {
      const stage = String(student.stage || '')
      if (activeFilter !== 'all') return stage === activeFilter
      return true
    })

    if (!search) return quickFilteredStudents

    return quickFilteredStudents.filter((student) => {
      const haystack = [
        student.id,
        student.name,
        student.email,
        student.source,
        student.stage,
        student.population,
        getDisplayValue(student.program),
        getDisplayValue(student.advisor),
        getDisplayValue(student.institutionGoal),
        getDisplayValue(student.risk),
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
              title={pipelineStatusMeanings[filter.key] || ''}
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

      {!isLoadingStudents && studentsError && !students.length ? (
        <section className="panel">
          <p className="auth-error">{studentsError}</p>
          <button type="button" className="secondary-button" onClick={() => loadStudents()}>
            Retry
          </button>
        </section>
      ) : null}

      {!isLoadingStudents && (!studentsError || students.length) ? (
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
              <p className="muted-copy">
                {students.length ? 'No students match that filter.' : 'No students have been created for this tenant yet.'}
              </p>
            </article>
          )}
        </>
      ) : null}
    </div>
  )
}
