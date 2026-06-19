import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download, ExternalLink, Maximize2, Printer, RefreshCw, Search, ZoomIn, ZoomOut } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import StatCard from '../components/StatCard'
import { prospectSubmissions as submissions } from '../data/prospectSubmissions'

const filterFields = [
  { key: 'name', label: 'Student Name' },
  { key: 'email', label: 'Student Email' },
  { key: 'id', label: 'Student ID' },
  { key: 'type', label: 'Type' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'program', label: 'Program' },
  { key: 'term', label: 'Term' },
  { key: 'status', label: 'Status' },
]

function StatusBadge({ status }) {
  return <span className="badge risk-low">{status}</span>
}

function TranscriptDocument({ student, transcript }) {
  return (
    <div className="transcript-document">
      <div className="transcript-page">
        <div className="transcript-school">Shamrock Community College</div>
        <div className="transcript-title">Official Transcript</div>
        <div className="transcript-document-grid">
          <span>Student</span><strong>{student.name}</strong>
          <span>Student ID</span><strong>{student.id}</strong>
          <span>Document ID</span><strong>{transcript.documentId}</strong>
          <span>Issued</span><strong>{transcript.submitted}</strong>
        </div>
        <div className="transcript-line" />
        {student.courses.map((course) => (
          <div key={`${course.course}-${course.source}`} className="transcript-course-line">
            <span>{course.course}</span>
            <span>{course.source}</span>
            <span>{course.credits}.0</span>
            <span>{course.grade}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProspectPortalPage() {
  const [filters, setFilters] = useState({})
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(submissions[0].id)
  const [selectedTranscriptId, setSelectedTranscriptId] = useState(submissions[0].transcripts[0].id)
  const [isStudentInfoOpen, setIsStudentInfoOpen] = useState(true)
  const [isTranscriptsOpen, setIsTranscriptsOpen] = useState(true)
  const [isReviewOpen, setIsReviewOpen] = useState(true)

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      return filterFields.every((field) => {
        const query = String(filters[field.key] || '').trim().toLowerCase()
        if (!query) return true
        return String(submission[field.key] || '').toLowerCase().includes(query)
      })
    })
  }, [filters])

  const selectedSubmission = useMemo(
    () => submissions.find((submission) => submission.id === selectedSubmissionId) || filteredSubmissions[0] || submissions[0],
    [filteredSubmissions, selectedSubmissionId],
  )
  const selectedTranscript = selectedSubmission.transcripts.find((transcript) => transcript.id === selectedTranscriptId) || selectedSubmission.transcripts[0]

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function openSubmission(submission) {
    setSelectedSubmissionId(submission.id)
    setSelectedTranscriptId(submission.transcripts[0]?.id || '')
    setIsStudentInfoOpen(true)
    setIsTranscriptsOpen(true)
    setIsReviewOpen(true)
  }

  const submittedLastSevenDays = submissions.filter((submission) => submission.submitted === '17 Jun 2026' || submission.submitted === '16 Jun 2026').length

  return (
    <div className="page-wrap prospect-school-view">
      <SectionHeader
        eyebrow="Embedded experiences"
        title="Portals"
        subtitle="Configure the client-facing portal experiences schools can embed in their sites. Prospect transcript submissions flow into Student 360."
      />

      <section className="stats-grid">
        <StatCard stat={{ label: 'Total submissions', value: '27', tone: 'indigo' }} />
        <StatCard stat={{ label: 'Submitted in last 7 days', value: submittedLastSevenDays, tone: 'teal' }} />
        <StatCard stat={{ label: 'Processing', value: '0', tone: 'violet' }} />
        <StatCard stat={{ label: 'Completed', value: '0', tone: 'rose' }} />
      </section>

      <section className="panel prospect-submissions-panel">
        <div className="list-pagination-bar">
          <span className="tag">Showing {filteredSubmissions.length} of {submissions.length}</span>
          <div className="search-count">
            <Search size={16} />
            <span>Filter submissions by column</span>
          </div>
        </div>

        <div className="table-wrap prospect-table-wrap">
          <table className="prospect-submissions-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Student Email</th>
                <th>Student ID</th>
                <th>Type</th>
                <th>Assigned To</th>
                <th>Program</th>
                <th>Term</th>
                <th>Submitted <ChevronDown size={14} /></th>
                <th>Updated</th>
                <th>Status</th>
                <th># of Transcripts</th>
                <th>Action</th>
              </tr>
              <tr className="filter-row">
                {filterFields.map((field) => (
                  <th key={field.key}>
                    <input
                      className="filter-input compact-filter"
                      placeholder="Filter"
                      value={filters[field.key] || ''}
                      onChange={(event) => updateFilter(field.key, event.target.value)}
                    />
                  </th>
                ))}
                <th />
                <th />
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className={submission.id === selectedSubmission.id ? 'selected-row' : ''}>
                  <td><strong>{submission.name}</strong></td>
                  <td>{submission.email}</td>
                  <td className="wrap-id">{submission.id}</td>
                  <td>{submission.type}</td>
                  <td>{submission.assignedTo === 'Not available' ? '-' : submission.assignedTo}</td>
                  <td>{submission.program}</td>
                  <td>{submission.term}</td>
                  <td>{submission.submitted}</td>
                  <td>{submission.updated}</td>
                  <td><StatusBadge status={submission.status} /></td>
                  <td>{submission.transcriptCount}</td>
                  <td>
                    <button type="button" className="secondary-button compact-button" onClick={() => openSubmission(submission)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel prospect-detail-panel">
        <button type="button" className="section-toggle" onClick={() => setIsStudentInfoOpen((current) => !current)}>
          <span>Student Information</span>
          {isStudentInfoOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {isStudentInfoOpen ? (
          <>
            <div className="student-info-summary">
              <strong>Program:</strong> {selectedSubmission.program}
              <strong>Term:</strong> {selectedSubmission.term}
            </div>
            <div className="student-info-grid">
              <div><span>Name</span><strong>{selectedSubmission.name}</strong></div>
              <div><span>Email</span><strong>{selectedSubmission.email}</strong></div>
              <div><span>Phone</span><strong>{selectedSubmission.phone}</strong></div>
              <div><span>Goal</span><strong>{selectedSubmission.type}</strong></div>
              <div><span>Assigned To</span><strong>{selectedSubmission.assignedTo}</strong></div>
            </div>
          </>
        ) : null}
      </section>

      <section className="panel prospect-detail-panel">
        <button type="button" className="section-toggle" onClick={() => setIsTranscriptsOpen((current) => !current)}>
          <span>Transcripts</span>
          {isTranscriptsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {isTranscriptsOpen ? (
          <>
            <p className="muted-copy">Submitted transcript records for this student.</p>
            <div className="table-wrap transcript-list-table">
              <table>
                <thead>
                  <tr>
                    <th>Transcript ID</th>
                    <th>Document ID</th>
                    <th>Submitted</th>
                    <th>Updated</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSubmission.transcripts.map((transcript) => (
                    <tr key={transcript.id} className={transcript.id === selectedTranscript.id ? 'selected-row' : ''}>
                      <td>{transcript.id}</td>
                      <td>{transcript.documentId}</td>
                      <td>{transcript.submitted}</td>
                      <td>{transcript.updated}</td>
                      <td><StatusBadge status={transcript.status} /></td>
                      <td>
                        <button type="button" className="secondary-button compact-button" onClick={() => setSelectedTranscriptId(transcript.id)}>
                          Open transcript
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className="panel prospect-detail-panel">
        <button type="button" className="section-toggle" onClick={() => setIsReviewOpen((current) => !current)}>
          <span>Transcript review</span>
          {isReviewOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {isReviewOpen ? (
          <>
            <p className="muted-copy">Inline view for transcript {selectedTranscript.id}</p>
            <div className="transcript-review-grid">
              <article className="review-pane">
                <div className="review-pane-header">
                  <div>
                    <h3>Course mappings</h3>
                    <p>Extracted courses and transfer decisions</p>
                  </div>
                  <div className="review-actions">
                    <button type="button" className="icon-button" aria-label="Expand course mappings"><Maximize2 size={18} /></button>
                    <button type="button" className="secondary-button"><Printer size={16} /> Print</button>
                  </div>
                </div>
                <div className="table-wrap mapping-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Course</th>
                        <th>Credits</th>
                        <th>Grade</th>
                        <th>Mapped to</th>
                        <th>Counts as</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSubmission.courses.map((course) => (
                        <tr key={`${course.source}-${course.course}`}>
                          <td>{course.source}</td>
                          <td>{course.course}</td>
                          <td>{course.credits}</td>
                          <td>{course.grade}</td>
                          <td><span className="tag">{course.mappedTo}</span></td>
                          <td><span className="tag">{course.countsAs}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="review-pane">
                <div className="review-pane-header">
                  <div>
                    <h3>Transcript</h3>
                    <p>Rendered inline using PDF.js</p>
                  </div>
                  <div className="review-actions">
                    <button type="button" className="icon-button" aria-label="Expand transcript"><ExternalLink size={18} /></button>
                    <button type="button" className="secondary-button"><Download size={16} /> Download</button>
                  </div>
                </div>
                <div className="pdf-toolbar">
                  <ZoomOut size={17} />
                  <div className="pdf-slider"><span /></div>
                  <span>105%</span>
                  <ZoomIn size={17} />
                  <span className="pdf-divider" />
                  <RefreshCw size={17} />
                  <span className="pdf-divider" />
                  <Download size={17} />
                </div>
                <TranscriptDocument student={selectedSubmission} transcript={selectedTranscript} />
              </article>
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}
