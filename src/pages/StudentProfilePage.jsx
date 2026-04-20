import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, CheckCircle2, CircleDot, Mail, MapPin, Phone, X } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import TranscriptTimeline from '../components/TranscriptTimeline'
import { useStudentRecords } from '../context/StudentRecordsContext'
import { useAuth } from '../context/AuthContext'
import Can from '../components/Can'
import ChecklistProgress from '../components/ChecklistProgress'
import ReadinessChip from '../components/ReadinessChip'
import SensitivityGuard from '../components/SensitivityGuard'
import { getChecklistStats, getReadiness } from '../lib/studentWorkflow'
import { getReadinessErrorMessage, getReadinessUrl } from '../lib/workApi'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

function getProgramName(student) {
  if (!student) return ''
  if (typeof student.program === 'string') return student.program
  return student.program?.name || ''
}

function getNextBestAction(student) {
  return student?.recommendation?.nextBestAction || student?.nextBestAction || 'Review'
}

export default function StudentProfilePage() {
  const { studentId } = useParams()
  const { students, isLoadingStudents, studentsError, loadStudentChecklist, updateChecklistItemStatus } = useStudentRecords()
  const { session, fetchWithTenantAuth, hasAnyPermission, hasSensitivityTier } = useAuth()
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const [studentDetail, setStudentDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [checklistActionError, setChecklistActionError] = useState('')
  const [activeChecklistItemId, setActiveChecklistItemId] = useState('')
  const [liveReadiness, setLiveReadiness] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const summaryStudent = useMemo(() => students.find((item) => item.id === studentId) || null, [studentId, students])
  const visibleTabs = useMemo(() => {
    const tabs = [
      { key: 'overview', label: 'Overview', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'checklist', label: 'Checklist', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'documents', label: 'Documents', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'evaluation', label: 'Evaluation', allowed: hasSensitivityTier('academic_record') },
      { key: 'decisions', label: 'Decisions', allowed: hasAnyPermission(['view_decision_packet', 'release_decision']) },
      { key: 'trust', label: 'Trust', allowed: hasAnyPermission(['view_trust_flags', 'manage_trust_cases']) && hasSensitivityTier('trust_fraud_flags') },
      { key: 'yield', label: 'Yield / Deposit', allowed: hasAnyPermission(['view_student_360', 'view_dashboards']) },
      { key: 'handoff', label: 'Handoff', allowed: hasAnyPermission(['manage_integrations', 'view_dashboards']) },
    ]

    return tabs.filter((tab) => tab.allowed)
  }, [hasAnyPermission, hasSensitivityTier])

  const loadStudentDetail = useCallback(async () => {
    if (!studentId || !session?.access_token || !session?.tenant_id) return

    setIsLoadingDetail(true)
    setDetailError('')

    try {
      const response = await fetchWithTenantAuth(`${apiBaseUrl}/api/v1/students/${studentId}`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) throw new Error('Your session is no longer valid. Please sign in again.')
        if (response.status === 403) throw new Error('Your account is not authorized for this tenant.')
        if (response.status === 404) throw new Error('Student not found.')
        throw new Error(payload?.detail || payload?.message || 'Unable to load student.')
      }

      setStudentDetail(payload)
    } catch (error) {
      setDetailError(error.message || 'Unable to load student.')
      setStudentDetail(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [fetchWithTenantAuth, session, studentId])

  useEffect(() => {
    loadStudentDetail()
  }, [loadStudentDetail])

  useEffect(() => {
    if (!studentId) return
    loadStudentChecklist(studentId).catch(() => {})
  }, [loadStudentChecklist, studentId])

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key || 'overview')
    }
  }, [activeTab, visibleTabs])

  useEffect(() => {
    async function loadReadiness() {
      if (!studentId || !session?.access_token || !session?.tenant_id) return

      try {
        const response = await fetchWithTenantAuth(getReadinessUrl(studentId))
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(getReadinessErrorMessage(response, payload, 'Unable to load readiness.'))
        }

        setLiveReadiness({
          state: payload.readinessState || payload.state || 'in_progress',
          label: payload.reasonLabel || payload.label || 'Readiness',
          tone: payload.readinessState === 'ready_for_decision'
            ? 'low'
            : payload.readinessState === 'blocked_by_trust'
              ? 'high'
              : payload.readinessState === 'blocked_by_review'
                ? 'medium'
                : 'neutral',
          reason: payload.reasonLabel || payload.reason || '',
        })
      } catch (error) {
        if (!String(error.message || '').includes('not available')) {
          setLiveReadiness(null)
        }
      }
    }

    loadReadiness()
  }, [fetchWithTenantAuth, session, studentId])

  const student = studentDetail || summaryStudent

  if ((isLoadingStudents || isLoadingDetail) && !studentDetail) {
    return (
      <div className="page-wrap">
        <Link to="/students" className="back-link"><ArrowLeft size={16} /> Back to students</Link>
        <section className="panel">
          <p className="muted-copy">Loading student...</p>
        </section>
      </div>
    )
  }

  if ((studentsError || detailError) && !studentDetail) {
    return (
      <div className="page-wrap">
        <Link to="/students" className="back-link"><ArrowLeft size={16} /> Back to students</Link>
        <section className="panel">
          <p className="auth-error">{detailError || studentsError}</p>
          <button type="button" className="secondary-button" onClick={loadStudentDetail}>Retry</button>
        </section>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="page-wrap">
        <Link to="/students" className="back-link"><ArrowLeft size={16} /> Back to students</Link>
        <section className="panel">
          <p className="muted-copy">Student not found.</p>
        </section>
      </div>
    )
  }

  const programName = getProgramName(student)
  const headerSubtitle = programName === 'Transcript intake'
    ? 'Transcript intake'
    : `${programName} - Goal: ${student.institutionGoal || 'Not set'}`
  const checklistStats = getChecklistStats(student)
  const readiness = liveReadiness || getReadiness(student)

  async function handleChecklistAction(item) {
    setChecklistActionError('')
    setActiveChecklistItemId(item.id)

    try {
      const nextChecklist = await updateChecklistItemStatus({
        studentId,
        itemId: item.id,
        status: 'complete',
      })

      setStudentDetail((current) => current ? { ...current, checklist: nextChecklist } : current)
    } catch (error) {
      setChecklistActionError(error.message || 'Unable to update checklist item.')
    } finally {
      setActiveChecklistItemId('')
    }
  }

  return (
    <div className="page-wrap">
      <Link to="/students" className="back-link"><ArrowLeft size={16} /> Back to students</Link>
      <SectionHeader
        eyebrow="Student 360"
        title={student.name}
        subtitle={headerSubtitle}
        actions={(
          <Can access={{ permissions: ['release_decision'] }}>
            <button className="primary-button">Release outcome</button>
          </Can>
        )}
      />

      <section className="panel">
        <div className="pill-row">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`tag ${activeTab === tab.key ? 'active-tag' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'overview' ? (
      <section className="dashboard-grid profile-grid">
        <article className="panel profile-hero">
          <div className="profile-top">
            <div>
              <h2>{student.preferredName || student.name}</h2>
              <p className="muted-copy">{student.summary}</p>
            </div>
            <div className="pill-row compact">
              <div className={`badge risk-${String(student.risk || 'low').toLowerCase()}`}>{student.stage}</div>
              <ReadinessChip readiness={readiness} />
            </div>
          </div>

          <div className="detail-grid">
            <span><Mail size={16} /> {student.email || 'No email on file'}</span>
            <span><Phone size={16} /> {student.phone || 'No phone on file'}</span>
            <span><MapPin size={16} /> {student.city || 'Location pending'}</span>
            <span>ID {student.id}</span>
          </div>

          <div className="metric-cluster profile-metrics">
            <div><span>Fit score</span><strong>{hasSensitivityTier('academic_record') ? `${student.fitScore ?? '-'}${student.fitScore !== undefined && student.fitScore !== null ? '%' : ''}` : '-'}</strong></div>
            <div><span>Deposit likelihood</span><strong>{student.depositLikelihood ?? '-'}{student.depositLikelihood !== undefined && student.depositLikelihood !== null ? '%' : ''}</strong></div>
            <div><span>Accepted credits</span><strong>{hasSensitivityTier('academic_record') ? (student.creditsAccepted ?? '-') : '-'}</strong></div>
            <div><span>Advisor</span><strong>{student.advisor || 'Unassigned'}</strong></div>
          </div>
        </article>
      </section>
      ) : null}

      {activeTab === 'checklist' ? (
      <section className="dashboard-grid profile-grid">
        <article className="panel checklist-panel">
          <div className="panel-header">
            <div>
              <h3>Next best actions</h3>
              <p>Clear human-readable guidance tied to the outcome engine.</p>
            </div>
          </div>
          <ChecklistProgress
            summary={{
              completionPercent: checklistStats.completionPercent,
              completedCount: checklistStats.completedCount,
              totalRequired: checklistStats.totalRequired,
              missingCount: checklistStats.missingCount,
              needsReviewCount: checklistStats.needsReviewCount,
              oneItemAway: checklistStats.oneItemAway,
            }}
          />
          <div className="checklist">
            {checklistStats.items.map((item) => (
              <div key={item.label} className="check-row">
                {item.done ? <CheckCircle2 size={18} /> : <CircleDot size={18} />}
                <span>{item.label}</span>
                {!item.done && hasAnyPermission(['edit_checklist']) ? (
                  <button
                    type="button"
                    className="secondary-button checklist-action-button"
                    onClick={() => handleChecklistAction(item)}
                    disabled={activeChecklistItemId === item.id}
                  >
                    {activeChecklistItemId === item.id ? 'Saving...' : item.status === 'needs_review' ? 'Mark reviewed' : 'Mark complete'}
                  </button>
                ) : null}
                <span className={`badge ${item.status === 'complete' ? 'risk-low' : item.status === 'needs_review' ? 'risk-medium' : 'neutral-badge'}`}>
                  {item.status === 'needs_review' ? 'Needs review' : item.status === 'complete' ? 'Complete' : 'Missing'}
                </span>
              </div>
            ))}
          </div>
          {checklistActionError ? <p className="auth-error">{checklistActionError}</p> : null}
          <div className="callout-card">
            <h4>Outcome recommendation</h4>
            <p><strong>{student.recommendation?.summary || 'Recommendation pending.'}</strong></p>
            <p>{student.recommendation?.fitNarrative || student.summary}</p>
            <p><strong>Next:</strong> {getNextBestAction(student)}</p>
          </div>
        </article>
      </section>
      ) : null}

      {activeTab === 'documents' ? (
      <section className="dashboard-grid profile-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Transcript lineage</h3>
              <p>One record, all document history, with evidence ready for review.</p>
            </div>
          </div>
          <TranscriptTimeline transcripts={student.transcripts || []} onTranscriptSelect={setSelectedTranscript} />
        </article>
      </section>
      ) : null}

      {activeTab === 'evaluation' ? (
      <section className="dashboard-grid profile-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Academic signal</h3>
              <p>Show trajectory, not just one extracted GPA.</p>
            </div>
          </div>
          <SensitivityGuard tier="academic_record" fallback={<p className="muted-copy">Academic evaluation details are hidden for your access level.</p>}>
          <div className="chart-box lg">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={student.termGpa || []}>
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
          </SensitivityGuard>
        </article>
      </section>
      ) : null}

      {activeTab === 'decisions' ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Decisions</h3>
              <p>Recommendation, review state, and release posture for this student.</p>
            </div>
            <ReadinessChip readiness={readiness} />
          </div>
          <div className="callout-card">
            <h4>{student.recommendation?.summary || 'Recommendation pending.'}</h4>
            <p>{student.recommendation?.fitNarrative || student.summary}</p>
            <p><strong>Release posture:</strong> {readiness.reason}</p>
          </div>
          <Can access={{ permissions: ['release_decision'] }} fallback={<p className="muted-copy">Final release actions require `release_decision`.</p>}>
            <div className="password-actions">
              <button type="button" className="secondary-button">Hold</button>
              <button type="button" className="primary-button">Release decision</button>
            </div>
          </Can>
        </section>
      ) : null}

      {activeTab === 'trust' ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Trust</h3>
              <p>Trust flags and release-blocking evidence for this student.</p>
            </div>
            <ReadinessChip readiness={readiness} />
          </div>
          <div className="stack-list">
            <SensitivityGuard tier="trust_fraud_flags" fallback={<p className="muted-copy">Trust details are hidden for your access level.</p>}>
            {(student.transcripts || []).map((transcript) => (
              <div key={transcript.id} className="stack-row">
                <strong>{transcript.institution || transcript.source}</strong>
                <span>{transcript.status} · Confidence {transcript.confidence ?? '-'}%</span>
              </div>
            ))}
            </SensitivityGuard>
          </div>
          <Can access={{ permissions: ['manage_trust_cases'] }} fallback={<p className="muted-copy">Trust actions require `manage_trust_cases`.</p>}>
            <div className="password-actions">
              <button type="button" className="secondary-button">Quarantine document</button>
              <button type="button" className="primary-button">Resolve case</button>
            </div>
          </Can>
        </section>
      ) : null}

      {activeTab === 'yield' ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Yield / Deposit</h3>
              <p>Admit-stage conversion signals and next interventions.</p>
            </div>
          </div>
          <div className="metric-cluster profile-metrics">
            <div><span>Deposit likelihood</span><strong>{student.depositLikelihood ?? '-'}%</strong></div>
            <div><span>Fit score</span><strong>{student.fitScore ?? '-'}%</strong></div>
            <div><span>Owner</span><strong>{student.advisor || 'Unassigned'}</strong></div>
            <div><span>Next action</span><strong>{student.recommendation?.nextBestAction || student.nextBestAction || 'Review'}</strong></div>
          </div>
        </section>
      ) : null}

      {activeTab === 'handoff' ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Handoff</h3>
              <p>Downstream readiness, sync posture, and cross-office blockers.</p>
            </div>
          </div>
          <div className="stack-list">
            <div className="stack-row"><strong>Admissions ready</strong><span>{checklistStats.completionPercent === 100 ? 'Yes' : 'Not yet'}</span></div>
            <div className="stack-row"><strong>Decision readiness</strong><span>{readiness.label}</span></div>
            <div className="stack-row"><strong>Integration status</strong><span>Awaiting backend handoff model</span></div>
          </div>
        </section>
      ) : null}

      {selectedTranscript ? (
        <div className="modal-scrim" onClick={() => setSelectedTranscript(null)} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="panel-header">
              <div>
                <h3>{selectedTranscript.institution || selectedTranscript.source}</h3>
                <p>{selectedTranscript.type} · {selectedTranscript.courses?.length || 0} courses</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedTranscript(null)} aria-label="Close transcript details">
                <X size={18} />
              </button>
            </div>

            <div className="course-modal-body">
              {hasAnyPermission(['view_sensitive_docs']) && hasSensitivityTier('transcript_images') && selectedTranscript.courses?.length ? (
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
                <p className="muted-copy">Transcript detail is not available for your access level.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
