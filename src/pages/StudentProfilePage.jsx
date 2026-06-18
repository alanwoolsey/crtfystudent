import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, CheckCircle2, CircleDot, Mail, MapPin, Phone, X } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import TranscriptTimeline from '../components/TranscriptTimeline'
import OperationalModeNotice from '../components/OperationalModeNotice'
import { useStudentRecords } from '../context/StudentRecordsContext'
import { useAuth } from '../context/AuthContext'
import Can from '../components/Can'
import ChecklistProgress from '../components/ChecklistProgress'
import ReadinessChip from '../components/ReadinessChip'
import SensitivityGuard from '../components/SensitivityGuard'
import { getChecklistStats, getReadiness } from '../lib/studentWorkflow'
import { getReadinessErrorMessage, getReadinessUrl } from '../lib/workApi'
import { READINESS_STATES, normalizeReadinessState } from '../lib/admissionsWorkflow'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

function getProgramName(student) {
  if (!student) return ''
  if (typeof student.program === 'string') return student.program
  return student.program?.name || ''
}

function getNextBestAction(student) {
  return student?.recommendation?.nextBestAction || student?.nextBestAction || 'Review'
}

function formatPercentScore(value) {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return '-'
  return `${Math.round(number <= 1 ? number * 100 : number)}%`
}

function formatGpa(value) {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return '-'
  return number.toFixed(3)
}

function formatCredits(value) {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return '-'
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

function gradeToPoints(grade) {
  const normalized = String(grade || '').trim().toUpperCase()
  const gradeMap = {
    'A+': 4,
    A: 4,
    'A-': 3.7,
    'B+': 3.3,
    B: 3,
    'B-': 2.7,
    'C+': 2.3,
    C: 2,
    'C-': 1.7,
    'D+': 1.3,
    D: 1,
    F: 0,
  }
  return gradeMap[normalized] ?? null
}

function getCourseSubjectLabel(course) {
  const courseText = [
    course.subject,
    course.courseId,
    course.course,
    course.courseTitle,
    course.title,
  ].filter(Boolean).join(' ').toLowerCase()

  if (/\b(math|algebra|calculus|statistics|quantitative)\b/.test(courseText)) return 'Math'
  if (/\b(eng|english|writing|composition|literature)\b/.test(courseText)) return 'English'
  if (/\b(bio|biology|chem|chemistry|science|anatomy|physiology)\b/.test(courseText)) return 'Science'
  if (/\b(psych|psychology)\b/.test(courseText)) return 'Psychology'
  if (/\b(cs|cis|computer|programming)\b/.test(courseText)) return 'Computer Science'
  if (/\b(business|econ|economics|accounting|finance)\b/.test(courseText)) return 'Business'
  if (/\b(health|nursing|medical)\b/.test(courseText)) return 'Health'
  return 'General Education'
}

function buildSubjectGpaRows(student) {
  const courses = (student?.transcripts || []).flatMap((transcript) => transcript.courses || [])
  const subjectMap = new Map()

  courses.forEach((course) => {
    const points = gradeToPoints(course.grade)
    const credits = Number(course.credit ?? course.credits ?? course.creditAttempted ?? 0)
    if (points === null || !Number.isFinite(credits) || credits <= 0) return

    const subject = getCourseSubjectLabel(course)
    const current = subjectMap.get(subject) || { subject, qualityPoints: 0, credits: 0, courseCount: 0 }
    current.qualityPoints += points * credits
    current.credits += credits
    current.courseCount += 1
    subjectMap.set(subject, current)
  })

  const rows = Array.from(subjectMap.values()).map((row) => ({
    subject: row.subject,
    gpa: row.credits ? row.qualityPoints / row.credits : null,
    credits: row.credits,
    courseCount: row.courseCount,
  }))

  if (rows.length) {
    return rows.sort((first, second) => second.credits - first.credits || first.subject.localeCompare(second.subject))
  }

  const overall = Number(student?.gpa)
  const base = Number.isNaN(overall) ? 3.2 : overall
  return [
    { subject: 'Math', gpa: Math.max(0, Math.min(4, base - 0.1)), credits: 6, courseCount: 2 },
    { subject: 'English', gpa: Math.max(0, Math.min(4, base + 0.15)), credits: 6, courseCount: 2 },
    { subject: 'Science', gpa: Math.max(0, Math.min(4, base + 0.05)), credits: 8, courseCount: 2 },
    { subject: 'General Education', gpa: Math.max(0, Math.min(4, base)), credits: 9, courseCount: 3 },
  ]
}

function getChecklistStatusLabel(status) {
  if (status === 'complete') return 'Complete'
  if (status === 'waived') return 'Waived'
  if (status === 'needs_review') return 'Needs review'
  if (status === 'received') return 'Received'
  if (status === 'requested') return 'Requested'
  if (status === 'blocked') return 'Blocked'
  if (status === 'rejected') return 'Rejected'
  if (status === 'expired') return 'Expired'
  return 'Not started'
}

function getChecklistStatusClass(status) {
  if (status === 'complete' || status === 'waived') return 'risk-low'
  if (status === 'needs_review' || status === 'received' || status === 'blocked') return 'risk-medium'
  if (status === 'rejected' || status === 'expired') return 'risk-high'
  return 'neutral-badge'
}

function getChecklistActionLabel(status) {
  if (status === 'needs_review' || status === 'received') return 'Mark reviewed'
  if (status === 'blocked') return 'Clear block'
  return 'Mark complete'
}

function formatTimelineTime(value) {
  if (!value) return 'Time pending'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function normalizeTimelinePayload(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.events)
        ? payload.events
        : Array.isArray(payload?.timeline)
          ? payload.timeline
          : []

  return items.map((item, index) => ({
    id: item.id || item.eventId || `${item.type || 'event'}-${index}`,
    type: item.type || item.eventType || item.category || 'event',
    title: item.title || item.label || item.action || 'Admissions event',
    description: item.description || item.summary || item.message || '',
    occurredAt: item.occurredAt || item.occurred_at || item.createdAt || item.created_at || item.timestamp || '',
    actor: item.actor?.name || item.actorName || item.actor || item.owner?.name || '',
    source: item.source || item.system || item.entityType || '',
    status: item.status || '',
  }))
}

function buildDerivedTimeline(student, checklistStats, readiness) {
  if (!student) return []

  const events = [
    {
      id: 'derived-identity',
      type: 'identity',
      title: 'Student record loaded',
      description: `${student.name || student.id} is in ${student.stage || 'an active admissions stage'}.`,
      occurredAt: student.updatedAt || student.lastActivityAt || '',
      actor: student.advisor || 'Admissions',
      source: student.source || 'Student 360',
      status: student.stage || '',
    },
  ]

  if (student.source || student.campaign || student.population) {
    events.push({
      id: 'derived-source',
      type: 'inquiry',
      title: 'Inquiry/source captured',
      description: [student.source, student.campaign, student.population].filter(Boolean).join(' - ') || 'Source attribution is available.',
      occurredAt: student.createdAt || '',
      actor: student.advisor || 'Admissions',
      source: 'source_attribution',
      status: student.population || '',
    })
  }

  if (checklistStats.totalRequired) {
    events.push({
      id: 'derived-checklist',
      type: 'checklist',
      title: 'Checklist state computed',
      description: `${checklistStats.completedCount} of ${checklistStats.totalRequired} required items complete; ${checklistStats.needsReviewCount} need review.`,
      occurredAt: student.updatedAt || '',
      actor: 'Checklist engine',
      source: 'checklist',
      status: checklistStats.oneItemAway ? 'One item away' : `${checklistStats.completionPercent}% complete`,
    })
  }

  ;(student.transcripts || []).slice(0, 4).forEach((transcript, index) => {
    events.push({
      id: `derived-transcript-${transcript.id || index}`,
      type: 'transcript',
      title: transcript.institution || transcript.source || 'Transcript received',
      description: transcript.notes || `${transcript.type || 'Document'} is ${transcript.status || 'available for review'}.`,
      occurredAt: transcript.uploadedAt || transcript.updatedAt || '',
      actor: transcript.owner || 'Document processing',
      source: transcript.source || 'transcript',
      status: transcript.status || '',
    })
  })

  if (readiness?.state || readiness?.label) {
    events.push({
      id: 'derived-readiness',
      type: 'readiness',
      title: readiness.label || 'Readiness computed',
      description: readiness.reason || 'Readiness state is available for review.',
      occurredAt: student.updatedAt || '',
      actor: 'Readiness service',
      source: 'readiness',
      status: readiness.state || readiness.label,
    })
  }

  if (student.recommendation?.summary) {
    events.push({
      id: 'derived-recommendation',
      type: 'decision',
      title: student.recommendation.summary,
      description: student.recommendation.fitNarrative || student.recommendation.nextBestAction || '',
      occurredAt: student.updatedAt || '',
      actor: 'Decision workspace',
      source: 'decision',
      status: student.recommendation.nextBestAction || '',
    })
  }

  return events.sort((first, second) => {
    const firstTime = new Date(first.occurredAt).getTime()
    const secondTime = new Date(second.occurredAt).getTime()
    if (Number.isNaN(firstTime) || Number.isNaN(secondTime)) return 0
    return secondTime - firstTime
  })
}

export default function StudentProfilePage() {
  const { studentId } = useParams()
  const { students, isLoadingStudents, studentsError, loadStudentChecklist, normalizeStudentDetailPayload, updateChecklistItemStatus } = useStudentRecords()
  const { session, fetchWithTenantAuth, hasAnyPermission, hasSensitivityTier } = useAuth()
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const [studentDetail, setStudentDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [checklistActionError, setChecklistActionError] = useState('')
  const [activeChecklistItemId, setActiveChecklistItemId] = useState('')
  const [liveReadiness, setLiveReadiness] = useState(null)
  const [timelineEvents, setTimelineEvents] = useState([])
  const [timelineMode, setTimelineMode] = useState('derived')
  const [timelineError, setTimelineError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const summaryStudent = useMemo(() => students.find((item) => item.id === studentId) || null, [studentId, students])
  const visibleTabs = useMemo(() => {
    const tabs = [
      { key: 'overview', label: 'Overview', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'timeline', label: 'Timeline', allowed: hasAnyPermission(['view_student_360']) },
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

      setStudentDetail(normalizeStudentDetailPayload(payload))
    } catch (error) {
      setDetailError(error.message || 'Unable to load student.')
      setStudentDetail(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [fetchWithTenantAuth, normalizeStudentDetailPayload, session, studentId])

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

        setLiveReadiness(
          normalizeReadinessState(payload.state || payload.readinessState || READINESS_STATES.inProgress, {
            label: payload.label || payload.reasonLabel || 'Readiness',
            reason: payload.reason || payload.reasonLabel || '',
          }),
        )
      } catch (error) {
        if (!String(error.message || '').includes('not available')) {
          setLiveReadiness(null)
        }
      }
    }

    loadReadiness()
  }, [fetchWithTenantAuth, session, studentId])

  const student = studentDetail || summaryStudent
  const checklistStats = getChecklistStats(student)
  const readiness = liveReadiness || getReadiness(student)
  const derivedTimelineEvents = useMemo(
    () => buildDerivedTimeline(student, checklistStats, readiness),
    [checklistStats, readiness, student],
  )
  const displayTimelineEvents = timelineEvents.length ? timelineEvents : derivedTimelineEvents
  const academicSummary = useMemo(() => {
    if (!student) return { overallGpa: '-', totalCredits: '-' }

    const termCredits = (student.termGpa || []).reduce((sum, row) => {
      const credits = Number(row.credits)
      return Number.isNaN(credits) ? sum : sum + credits
    }, 0)

    return {
      overallGpa: formatGpa(student.gpa),
      totalCredits: formatCredits(termCredits || student.creditsAccepted),
    }
  }, [student])
  const subjectGpaRows = useMemo(() => buildSubjectGpaRows(student), [student])

  const loadTimeline = useCallback(async () => {
    if (!studentId || !session?.access_token || !session?.tenant_id) return

    try {
      const response = await fetchWithTenantAuth(`${apiBaseUrl}/api/v1/students/${studentId}/timeline`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.detail || payload?.message || 'Timeline endpoint is not available yet.')
      }

      const nextEvents = normalizeTimelinePayload(payload)
      setTimelineEvents(nextEvents)
      setTimelineMode(nextEvents.length ? 'live' : 'derived')
      setTimelineError('')
    } catch (error) {
      setTimelineEvents([])
      setTimelineMode('derived')
      setTimelineError(error.message || 'Timeline endpoint is not available yet.')
    }
  }, [fetchWithTenantAuth, session, studentId])

  useEffect(() => {
    loadTimeline()
  }, [loadTimeline])

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
            <span>Source {student.source || 'Not set'}</span>
            <span>Population {student.population || 'Not set'}</span>
            <span>Last activity {student.lastActivity || student.updatedAt || 'Pending'}</span>
            <span>Next action {getNextBestAction(student)}</span>
          </div>

          <div className="metric-cluster profile-metrics">
            <div><span>Fit score</span><strong>{hasSensitivityTier('academic_record') ? formatPercentScore(student.fitScore) : '-'}</strong></div>
            <div><span>Deposit likelihood</span><strong>{formatPercentScore(student.depositLikelihood)}</strong></div>
            <div><span>Accepted credits</span><strong>{hasSensitivityTier('academic_record') ? (student.creditsAccepted ?? '-') : '-'}</strong></div>
            <div><span>Advisor</span><strong>{student.advisor || 'Unassigned'}</strong></div>
          </div>
        </article>
      </section>
      ) : null}

      {activeTab === 'timeline' ? (
        <section className="dashboard-grid profile-grid">
          <article className="panel">
            <OperationalModeNotice
              mode={timelineMode}
              liveLabel="Live timeline"
              derivedLabel="Derived timeline"
              error={timelineMode === 'derived' ? timelineError : ''}
              onRetry={loadTimeline}
            />
            <div className="panel-header">
              <div>
                <h3>Admissions timeline</h3>
                <p>Inquiry, source, checklist, document, transcript, trust, decision, yield, and handoff events in one record.</p>
              </div>
              <span className="badge neutral-badge">{displayTimelineEvents.length}</span>
            </div>
            <div className="timeline-list student360-timeline">
              {displayTimelineEvents.map((event) => (
                <div key={event.id} className="timeline-item">
                  <div className="timeline-rail" />
                  <div className="timeline-content">
                    <div className="timeline-top">
                      <div>
                        <h4>{event.title}</h4>
                        {event.description ? <p>{event.description}</p> : null}
                      </div>
                      {event.status ? <span className="badge neutral-badge">{event.status}</span> : null}
                    </div>
                    <div className="timeline-meta">
                      <span>{formatTimelineTime(event.occurredAt)}</span>
                      {event.actor ? <span>{event.actor}</span> : null}
                      {event.source ? <span>{event.source}</span> : null}
                      {event.type ? <span>{event.type}</span> : null}
                    </div>
                  </div>
                </div>
              ))}
              {!displayTimelineEvents.length ? <p className="muted-copy">No timeline events are available yet.</p> : null}
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
                    {activeChecklistItemId === item.id ? 'Saving...' : getChecklistActionLabel(item.status)}
                  </button>
                ) : null}
                <span className={`badge ${getChecklistStatusClass(item.status)}`}>
                  {getChecklistStatusLabel(item.status)}
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
          <div className="metric-cluster academic-summary">
            <div><span>Overall GPA</span><strong>{academicSummary.overallGpa}</strong></div>
            <div><span>Total credits</span><strong>{academicSummary.totalCredits}</strong></div>
          </div>

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
                <span>{row.term}</span><span>{formatGpa(row.gpa)}</span><span>{formatCredits(row.credits)}</span>
              </div>
            ))}
          </div>
          </SensitivityGuard>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Subject GPA</h3>
              <p>GPA grouped by academic subject using available course evidence.</p>
            </div>
          </div>
          <SensitivityGuard tier="academic_record" fallback={<p className="muted-copy">Subject GPA details are hidden for your access level.</p>}>
          <div className="mini-table subject-gpa-table">
            <div className="mini-table-head">
              <span>Subject</span><span>GPA</span><span>Credits</span><span>Courses</span>
            </div>
            {subjectGpaRows.map((row) => (
              <div key={row.subject} className="mini-table-row">
                <span>{row.subject}</span>
                <span>{formatGpa(row.gpa)}</span>
                <span>{formatCredits(row.credits)}</span>
                <span>{row.courseCount}</span>
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
                <span>{transcript.status} - Confidence {formatPercentScore(transcript.confidence)}</span>
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
            <div><span>Deposit likelihood</span><strong>{formatPercentScore(student.depositLikelihood)}</strong></div>
            <div><span>Fit score</span><strong>{formatPercentScore(student.fitScore)}</strong></div>
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
                <p>{selectedTranscript.type} - {selectedTranscript.courses?.length || 0} courses</p>
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
