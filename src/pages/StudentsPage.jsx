import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import StudentCard from '../components/StudentCard'
import { useStudentRecords } from '../context/StudentRecordsContext'
import { PIPELINE_STATUSES, PIPELINE_STATUS_MEANINGS } from '../lib/admissionsWorkflow'
import useDebouncedValue from '../lib/useDebouncedValue'

const studentsPerPage = 8
const initialStudentForm = {
  studentId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  program: '',
  termInterest: '',
  stage: PIPELINE_STATUSES.inquiry,
  advisor: '',
  population: '',
  source: '',
  institutionGoal: '',
}
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
  const { students, isLoadingStudents, studentsError, loadStudents, createStudent } = useStudentRecords()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [studentForm, setStudentForm] = useState(initialStudentForm)
  const [createError, setCreateError] = useState('')
  const [isSavingStudent, setIsSavingStudent] = useState(false)
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

  function updateStudentForm(field, value) {
    setStudentForm((current) => ({ ...current, [field]: value }))
  }

  function openCreateModal() {
    setStudentForm(initialStudentForm)
    setCreateError('')
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (isSavingStudent) return
    setIsCreateModalOpen(false)
    setCreateError('')
  }

  async function handleCreateStudentSubmit(event) {
    event.preventDefault()
    setCreateError('')
    setIsSavingStudent(true)

    try {
      await createStudent(studentForm)
      setIsCreateModalOpen(false)
      setStudentForm(initialStudentForm)
      setQuery('')
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('q')
      setSearchParams(nextParams, { replace: true })
      setActiveFilter('all')
    } catch (error) {
      setCreateError(error.message || 'Unable to create student.')
    } finally {
      setIsSavingStudent(false)
    }
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
        actions={(
          <button type="button" className="primary-button" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Add student</span>
          </button>
        )}
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

      {isCreateModalOpen ? (
        <div className="modal-scrim" onClick={closeCreateModal} role="presentation">
          <div className="modal-panel create-student-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="panel-header">
              <div>
                <h3>Add student</h3>
                <p>Create the minimum Student 360 record needed to start admissions work.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeCreateModal} aria-label="Close add student">
                <X size={18} />
              </button>
            </div>

            <form className="auth-form create-student-form" onSubmit={handleCreateStudentSubmit}>
              <div className="create-student-grid">
                <label className="auth-field">
                  <span>First name</span>
                  <input value={studentForm.firstName} onChange={(event) => updateStudentForm('firstName', event.target.value)} required />
                </label>
                <label className="auth-field">
                  <span>Last name</span>
                  <input value={studentForm.lastName} onChange={(event) => updateStudentForm('lastName', event.target.value)} required />
                </label>
                <label className="auth-field">
                  <span>Email</span>
                  <input type="email" value={studentForm.email} onChange={(event) => updateStudentForm('email', event.target.value)} required />
                </label>
                <label className="auth-field">
                  <span>Phone</span>
                  <input value={studentForm.phone} onChange={(event) => updateStudentForm('phone', event.target.value)} />
                </label>
                <label className="auth-field">
                  <span>Student ID</span>
                  <input value={studentForm.studentId} onChange={(event) => updateStudentForm('studentId', event.target.value)} />
                </label>
                <label className="auth-field">
                  <span>Lifecycle stage</span>
                  <select value={studentForm.stage} onChange={(event) => updateStudentForm('stage', event.target.value)}>
                    {quickFilters.filter((filter) => filter.key !== 'all').map((filter) => (
                      <option key={filter.key} value={filter.key}>{filter.label}</option>
                    ))}
                  </select>
                </label>
                <label className="auth-field">
                  <span>Program</span>
                  <input value={studentForm.program} onChange={(event) => updateStudentForm('program', event.target.value)} />
                </label>
                <label className="auth-field">
                  <span>Term</span>
                  <input value={studentForm.termInterest} onChange={(event) => updateStudentForm('termInterest', event.target.value)} placeholder="Fall 2026" />
                </label>
                <label className="auth-field">
                  <span>Owner / advisor</span>
                  <input value={studentForm.advisor} onChange={(event) => updateStudentForm('advisor', event.target.value)} />
                </label>
                <label className="auth-field">
                  <span>Population</span>
                  <input value={studentForm.population} onChange={(event) => updateStudentForm('population', event.target.value)} placeholder="Transfer, first-year, adult learner" />
                </label>
                <label className="auth-field">
                  <span>Source</span>
                  <input value={studentForm.source} onChange={(event) => updateStudentForm('source', event.target.value)} placeholder="Manual entry, event, partner" />
                </label>
                <label className="auth-field">
                  <span>Institution goal</span>
                  <input value={studentForm.institutionGoal} onChange={(event) => updateStudentForm('institutionGoal', event.target.value)} />
                </label>
              </div>

              {createError ? <p className="auth-error">{createError}</p> : null}

              <div className="password-actions">
                <button type="button" className="secondary-button" onClick={closeCreateModal} disabled={isSavingStudent}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSavingStudent}>
                  {isSavingStudent ? 'Saving...' : 'Save student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
