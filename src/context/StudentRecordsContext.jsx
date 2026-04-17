import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { students as seedStudents } from '../data/mockData'

const StudentRecordsContext = createContext(null)
const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const transcriptParseUrl = `${apiBaseUrl}/api/v1/transcripts/parse`

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

function formatNumber(value, digits = 2) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : 0
}

function formatRelativeNow() {
  return 'Just now'
}

function buildTranscriptSteps(audit = []) {
  if (!audit.length) {
    return [
      { label: 'Upload received', time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) },
      { label: 'Transcript parsed', time: 'Now' },
    ]
  }

  return audit.slice(0, 5).map((entry) => ({
    label: entry.action || entry.category || 'Processed',
    time: new Date(entry.occurredOnUtc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }))
}

function mapParsedTranscript(parsed, file) {
  const demographic = parsed.demographic || {}
  const courses = parsed.courses || []
  const metadata = parsed.metadata || {}
  const institutionName = demographic.institutionName || courses[0]?.institution || 'Unknown institution'
  const firstName = demographic.firstName || 'Unknown'
  const lastName = demographic.lastName || 'Student'
  const studentId = demographic.studentId || parsed.documentId
  const cumulativeGpa = formatNumber(parsed.grandGPA?.cumulativeGPA || demographic.cumulativeGpa)
  const creditsEarned = formatNumber(parsed.grandGPA?.unitsEarned || demographic.totalCreditsEarned, 0)
  const typeLabel = metadata.document_type?.replaceAll('_', ' ') || 'transcript'
  const transcript = {
    id: parsed.documentId,
    source: file.name,
    institution: institutionName,
    type: typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1),
    uploadedAt: new Date().toISOString(),
    status: parsed.isFraudulent ? 'Quarantined' : parsed.isFinalized ? 'Finalized' : 'Parsed',
    confidence: formatNumber((metadata.parser_confidence || courses[0]?.confidenceScore || 0) * 100, 1),
    credits: creditsEarned,
    pages: Math.max(...courses.map((course) => course.pageNumber || 1), 1),
    owner: metadata.bedrock_used ? 'Bedrock parser' : 'Transcript parser',
    notes: parsed.isFraudulent
      ? 'Flagged for authenticity review during parsing.'
      : `Parsed from ${institutionName} with ${courses.length} extracted courses.`,
    steps: buildTranscriptSteps(parsed.audit),
    courses,
    rawDocument: parsed,
  }

  const cityParts = [
    demographic.studentCity,
    demographic.studentState,
    demographic.studentCountry,
  ].filter(Boolean)

  return {
    studentId,
    transcript,
    studentPatch: {
      id: studentId,
      name: `${firstName} ${lastName}`.trim(),
      preferredName: firstName,
      dob: demographic.dateOfBirth || '',
      email: `${slugify(`${firstName}.${lastName}`)}@example.edu`,
      phone: '(000) 000-0000',
      program: 'Transcript intake',
      institutionGoal: institutionName,
      stage: parsed.isFraudulent ? 'Needs authenticity review' : 'Ready for evaluation',
      risk: parsed.isFraudulent ? 'High' : 'Low',
      advisor: 'Unassigned',
      city: cityParts.join(', ') || demographic.institutionState || 'Location pending',
      gpa: cumulativeGpa,
      creditsAccepted: creditsEarned,
      transcriptsCount: 1,
      lastActivity: formatRelativeNow(),
      tags: ['Transcript parsed', parsed.isOfficial ? 'Official' : 'Unofficial', typeLabel]
        .filter(Boolean),
      summary: `Latest transcript parsed from ${institutionName}. ${courses.length} courses extracted for review.`,
      checklist: [
        { label: 'Identity matched', done: Boolean(studentId) },
        { label: 'Document parsed', done: true },
        { label: 'Course articulation mapping', done: false },
        { label: 'Advisor follow-up sent', done: false },
      ],
      transcripts: [transcript],
      termGpa: (parsed.termGPAs || []).map((term, index) => ({
        term: `${term.term} ${term.year || index + 1}`,
        gpa: formatNumber(term.simpleGPA),
        credits: formatNumber(term.simpleUnitsEarned, 0),
      })),
      workflow: [
        { day: 'Mon', uploaded: 0, reviewed: 0 },
        { day: 'Tue', uploaded: 0, reviewed: 0 },
        { day: 'Wed', uploaded: 0, reviewed: 0 },
        { day: 'Thu', uploaded: 0, reviewed: 0 },
        { day: 'Fri', uploaded: 1, reviewed: 0 },
      ],
    },
  }
}

export function StudentRecordsProvider({ children }) {
  const [students, setStudents] = useState(seedStudents)

  const uploadTranscript = useCallback(async (file) => {
    const formData = new FormData()
    formData.append('file', file, file.name)
    formData.append('document_type', 'auto')
    formData.append('use_bedrock', 'true')

    const response = await fetch(transcriptParseUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`)
    }

    const parsed = await response.json()
    const mapped = mapParsedTranscript(parsed, file)

    setStudents((current) => {
      const existing = current.find((student) => student.id === mapped.studentId)
      if (!existing) {
        return [mapped.studentPatch, ...current]
      }

      const mergedTranscripts = [mapped.transcript, ...(existing.transcripts || [])]
      return current.map((student) => {
        if (student.id !== mapped.studentId) {
          return student
        }

        return {
          ...student,
          ...mapped.studentPatch,
          email: student.email || mapped.studentPatch.email,
          phone: student.phone || mapped.studentPatch.phone,
          advisor: student.advisor || mapped.studentPatch.advisor,
          program: student.program || mapped.studentPatch.program,
          city: student.city || mapped.studentPatch.city,
          tags: Array.from(new Set([...(mapped.studentPatch.tags || []), ...(student.tags || [])])),
          transcripts: mergedTranscripts,
          transcriptsCount: mergedTranscripts.length,
          summary: `Latest transcript parsed from ${mapped.transcript.institution}. ${mapped.transcript.courses.length} courses extracted for review.`,
          lastActivity: formatRelativeNow(),
          termGpa: mapped.studentPatch.termGpa.length ? mapped.studentPatch.termGpa : student.termGpa,
        }
      })
    })

    return {
      parsed,
      studentId: mapped.studentId,
    }
  }, [])

  const value = useMemo(() => ({ students, uploadTranscript }), [students, uploadTranscript])

  return (
    <StudentRecordsContext.Provider value={value}>
      {children}
    </StudentRecordsContext.Provider>
  )
}

export function useStudentRecords() {
  const context = useContext(StudentRecordsContext)

  if (!context) {
    throw new Error('useStudentRecords must be used within StudentRecordsProvider')
  }

  return context
}
