import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, CheckCircle2, CircleDot, Mail, MapPin, Phone, X } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import TranscriptTimeline from '../components/TranscriptTimeline'
import { useStudentRecords } from '../context/StudentRecordsContext'

export default function StudentProfilePage() {
  const { studentId } = useParams()
  const { students } = useStudentRecords()
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const student = useMemo(
    () => students.find((item) => item.id === studentId) || students[0],
    [studentId, students],
  )

  return (
    <div className="page-wrap">
      <Link to="/students" className="back-link"><ArrowLeft size={16} /> Back to students</Link>
      <SectionHeader
        eyebrow="Student 360"
        title={student.name}
        subtitle={`${student.program} · Goal: ${student.institutionGoal}`}
        actions={<button className="primary-button">Share status update</button>}
      />

      <section className="dashboard-grid profile-grid">
        <article className="panel profile-hero">
          <div className="profile-top">
            <div>
              <h2>{student.preferredName}</h2>
              <p className="muted-copy">{student.summary}</p>
            </div>
            <div className={`badge risk-${student.risk.toLowerCase()}`}>{student.stage}</div>
          </div>

          <div className="detail-grid">
            <span><Mail size={16} /> {student.email}</span>
            <span><Phone size={16} /> {student.phone}</span>
            <span><MapPin size={16} /> {student.city}</span>
            <span>ID {student.id}</span>
          </div>

          <div className="metric-cluster profile-metrics">
            <div><span>Cumulative GPA</span><strong>{student.gpa}</strong></div>
            <div><span>Accepted credits</span><strong>{student.creditsAccepted}</strong></div>
            <div><span>Transcript history</span><strong>{student.transcriptsCount} uploads</strong></div>
            <div><span>Advisor</span><strong>{student.advisor}</strong></div>
          </div>
        </article>

        <article className="panel checklist-panel">
          <div className="panel-header">
            <div>
              <h3>Next best actions</h3>
              <p>A compact task list aligned to the student's current stage.</p>
            </div>
          </div>
          <div className="checklist">
            {student.checklist?.map((item) => (
              <div key={item.label} className="check-row">
                {item.done ? <CheckCircle2 size={18} /> : <CircleDot size={18} />}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid profile-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Transcript lineage</h3>
              <p>Every upload, grouped chronologically by the student record.</p>
            </div>
          </div>
          <TranscriptTimeline transcripts={student.transcripts} onTranscriptSelect={setSelectedTranscript} />
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Academic signal</h3>
              <p>Trend terms, not just one extracted GPA.</p>
            </div>
          </div>
          <div className="chart-box lg">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={student.termGpa}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="term" />
                <YAxis domain={[0, 4]} />
                <Tooltip />
                <Area type="monotone" dataKey="gpa" stroke="#18B7A6" fill="#18B7A622" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mini-table">
            <div className="mini-table-head">
              <span>Term</span><span>GPA</span><span>Credits</span>
            </div>
            {student.termGpa?.map((row) => (
              <div key={row.term} className="mini-table-row">
                <span>{row.term}</span><span>{row.gpa}</span><span>{row.credits}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {selectedTranscript ? (
        <div className="modal-scrim" onClick={() => setSelectedTranscript(null)} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="panel-header">
              <div>
                <h3>{selectedTranscript.institution || selectedTranscript.source}</h3>
                <p>{selectedTranscript.type} · {selectedTranscript.courses?.length || 0} courses</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedTranscript(null)}
                aria-label="Close transcript details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="course-modal-body">
              {selectedTranscript.courses?.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Title</th>
                        <th>Term</th>
                        <th>Credits</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTranscript.courses.map((course) => (
                        <tr key={`${selectedTranscript.id}-${course.courseId}-${course.term}-${course.year}`}>
                          <td><strong>{course.courseId || course.subject}</strong></td>
                          <td>{course.courseTitle}</td>
                          <td>{[course.term, course.year].filter(Boolean).join(' ') || '-'}</td>
                          <td>{course.credit || course.creditAttempted || '-'}</td>
                          <td>{course.grade || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted-copy">No parsed course detail is available for this transcript.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
