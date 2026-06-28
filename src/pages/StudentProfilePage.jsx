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
import { activeDocumentStorageProvider, fetchStoredDocumentContent, fetchStoredDocumentContentUrl, normalizeDocumentStorageUrl } from '../lib/documentStorage'
import { getReadinessErrorMessage, getReadinessUrl } from '../lib/workApi'
import { READINESS_STATES, normalizeReadinessState } from '../lib/admissionsWorkflow'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const chatApiBaseUrl = (import.meta.env.VITE_CHAT_URL || '').replace(/\/+$/, '')
const defaultProgramOptions = [
  'BS Nursing Transfer',
  'BS Computer Science',
  'Business Administration',
  'Psychology',
  'General Studies',
]
const interactionTypes = [
  { value: 'call', label: 'Call' },
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'family_conversation', label: 'Family conversation' },
  { value: 'campus_visit', label: 'Campus visit' },
  { value: 'webinar', label: 'Webinar / open house' },
  { value: 'note', label: 'Note' },
]
const interactionOutcomes = [
  { value: 'reached_student', label: 'Reached student' },
  { value: 'left_message', label: 'Left message' },
  { value: 'no_response', label: 'No response' },
  { value: 'needs_follow_up', label: 'Needs follow-up' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'ready_to_apply', label: 'Ready to apply' },
  { value: 'ready_to_deposit', label: 'Ready to deposit' },
]
const communicationChannels = [
  { value: 'email', label: 'Email' },
  { value: 'text', label: 'Text' },
  { value: 'call', label: 'Call' },
  { value: 'other', label: 'Other' },
]
const communicationTemplates = [
  {
    key: 'new_inquiry',
    label: 'New inquiry',
    subject: 'Your next step with {program}',
    body: 'Hi {firstName},\n\nThanks for your interest in {program}. I reviewed your record and the next best step is {nextAction}.\n\nReply here and I can help you keep things moving.',
  },
  {
    key: 'application_help',
    label: 'Application help',
    subject: 'Help finishing your application',
    body: 'Hi {firstName},\n\nI saw your application is underway for {program}. If you want, I can help you finish the next item: {nextAction}.\n\nThe sooner we get that in, the sooner your file can move to review.',
  },
  {
    key: 'missing_transcript',
    label: 'Missing transcript',
    subject: 'Transcript needed for your application',
    body: 'Hi {firstName},\n\nWe still need your transcript before your {program} application can be completed. Please send the transcript when you can, or reply if you need help with the request.',
  },
  {
    key: 'missing_requirement',
    label: 'Missing requirement',
    subject: 'One item needed for your application',
    body: 'Hi {firstName},\n\nYour application is close, but one item still needs attention: {nextAction}. Once that is resolved, your file can continue through review for {program}.',
  },
  {
    key: 'admission_offer',
    label: 'Admission offer',
    subject: 'Congratulations on your admission',
    body: 'Hi {firstName},\n\nCongratulations on your admission to {program}. Your next step is {nextAction}. I can answer questions about transfer credit, advising, or getting started.',
  },
  {
    key: 'deposit_reminder',
    label: 'Deposit reminder',
    subject: 'Confirming your spot',
    body: 'Hi {firstName},\n\nYour next step is to confirm your spot for {program}. If you are still deciding, reply with what you are weighing and I can help.',
  },
  {
    key: 'registration_orientation',
    label: 'Registration / orientation',
    subject: 'Registration and orientation next steps',
    body: 'Hi {firstName},\n\nLet us make sure you are ready for registration and orientation. Your next step is {nextAction}. Reply here if you need help getting connected.',
  },
]
const handoffTargets = [
  'Admissions Operations',
  'Application Reviewer',
  'Financial Aid',
  'Academic Department',
  'Registrar / Transfer Specialist',
  'Advising / Student Success',
  'Housing / Orientation',
  'Bursar / Student Accounts',
]
const handoffPriorities = ['Normal', 'High', 'Urgent']
const handoffStatuses = ['Open', 'In progress', 'Blocked', 'Complete']
const postAdmitMilestones = [
  { id: 'financial_aid_package', label: 'Financial aid package', owner: 'Financial Aid' },
  { id: 'scholarship_status', label: 'Scholarship status', owner: 'Financial Aid' },
  { id: 'deposit_commitment', label: 'Deposit / commitment', owner: 'Admissions' },
  { id: 'housing_application', label: 'Housing application', owner: 'Housing' },
  { id: 'orientation', label: 'Orientation', owner: 'Orientation' },
  { id: 'advising_appointment', label: 'Advising appointment', owner: 'Advising' },
  { id: 'registration_status', label: 'Registration status', owner: 'Registrar' },
  { id: 'bursar_account', label: 'Bursar / student account', owner: 'Student Accounts' },
  { id: 'international_docs', label: 'International documentation', owner: 'International Student Services' },
  { id: 'veteran_benefits', label: 'Veteran / military benefits', owner: 'Veteran Services' },
  { id: 'accessibility_handoff', label: 'Accessibility / accommodation handoff', owner: 'Accessibility Services' },
]
const milestoneStatuses = ['Not started', 'In progress', 'Blocked', 'Complete', 'Waived']
const territoryOptions = ['North', 'South', 'East', 'West', 'Transfer Partners', 'Online', 'International']
const recruitmentEventTypes = ['College fair', 'High school visit', 'Transfer partner visit', 'Open house', 'Webinar', 'Campus visit', 'Counselor travel']
const scholarshipCatalog = [
  {
    id: 'transfer-achievement',
    name: 'Transfer Achievement Scholarship',
    amount: 'Up to $4,000',
    owner: 'Admissions',
    description: 'For transfer applicants with strong college credit completion and solid academic momentum.',
    action: 'Route to transfer scholarship review',
  },
  {
    id: 'academic-merit',
    name: 'Academic Merit Scholarship',
    amount: 'Up to $6,500',
    owner: 'Admissions',
    description: 'For applicants whose transcript shows a high cumulative GPA and consistent course performance.',
    action: 'Generate merit estimate',
  },
  {
    id: 'stem-pathway',
    name: 'STEM Pathway Scholarship',
    amount: 'Up to $5,000',
    owner: 'Academic Department',
    description: 'For students with mapped STEM coursework aligned to a STEM program or degree pathway.',
    action: 'Send STEM scholarship interest form',
  },
  {
    id: 'health-sciences',
    name: 'Health Sciences Scholarship',
    amount: 'Up to $5,500',
    owner: 'Academic Department',
    description: 'For nursing and health-science applicants with science prerequisites visible in transcript evidence.',
    action: 'Route to health sciences scholarship review',
  },
  {
    id: 'financial-need',
    name: 'Need-Based Institutional Grant',
    amount: 'Varies',
    owner: 'Financial Aid',
    description: 'For students using financial aid or FAFSA evidence who may qualify for institutional need-based support.',
    action: 'Ask Financial Aid to review need eligibility',
  },
]

async function parseApiPayload(response) {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { response: text }
  }
}

function getProgramName(student) {
  if (!student) return ''
  if (typeof student.program === 'string') return student.program
  return student.program?.name || ''
}

function getProgramDisplay(student) {
  if (!student) return 'Program pending'
  return getFirstValue(
    getProgramName(student),
    student.degreeProgram,
    student.degree_program,
    student.degree,
    student.programInterest,
    student.program_interest,
    'Program pending',
  )
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

function getCreditNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function getStudentOverallGpa(student) {
  const candidates = [
    student?.gpa,
    student?.cumulativeGpa,
    student?.cumulativeGPA,
    student?.totalGradePoints,
    student?.demographic?.cumulativeGpa,
    student?.demographic?.totalGradePoints,
    ...(student?.transcripts || []).map((transcript) => transcript.rawDocument?.grandGPA?.cumulativeGPA),
    ...(student?.transcripts || []).map((transcript) => transcript.rawDocument?.demographic?.cumulativeGpa),
    ...(student?.transcripts || []).map((transcript) => transcript.rawDocument?.demographic?.totalGradePoints),
  ]

  return candidates.find((value) => {
    const number = Number(value)
    return Number.isFinite(number) && number > 0
  })
}

function formatConfidence(value) {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return '-'
  const percent = number <= 1 ? number * 100 : number
  return `${percent.toFixed(1)}%`
}

function getCourseValue(course, keys, fallback = '') {
  for (const key of keys) {
    const value = course?.[key]
    if (value !== null && value !== undefined && value !== '') return value
  }
  return fallback
}

function getCourseSubject(course) {
  return getCourseValue(course, ['Subject', 'subject'], '')
}

function getCourseId(course) {
  return getCourseValue(course, ['CourseId', 'courseId', 'course'], '')
}

function getCourseTitle(course) {
  return getCourseValue(course, ['CourseTitle', 'courseTitle', 'title'], '')
}

function getCourseNumber(course) {
  return getCourseValue(course, ['Course Number', 'courseNumber', 'number'], '')
}

function getCourseCredits(course) {
  return getCourseValue(course, ['credit', 'credits', 'creditAttempted'], '')
}

function getCourseConfidence(course) {
  return getCourseValue(course, ['confidenceScore', 'confidence'], '')
}

function isCollegeTranscript(transcript) {
  const typeText = [
    transcript?.type,
    transcript?.documentType,
    transcript?.document_type,
    transcript?.source,
    transcript?.institution,
  ].filter(Boolean).join(' ').toLowerCase()

  if (!typeText) return false
  if (/\b(high school|secondary|ged|hs)\b/.test(typeText)) return false
  return /\b(college|university|transfer|undergraduate|postsecondary|post-secondary|technical|community college)\b/.test(typeText)
}

function buildTranscriptCourseRows(student) {
  return (student?.transcripts || []).filter(isCollegeTranscript).flatMap((transcript) => (
    (transcript.courses || []).map((course, index) => ({
      id: `${transcript.id || 'transcript'}-${getCourseId(course) || getCourseTitle(course) || index}`,
      transcriptId: transcript.id || '',
      institution: transcript.institution || transcript.source || 'Transcript',
      sourceCourse: getCourseId(course) || getCourseValue(course, ['course'], ''),
      sourceTitle: getCourseTitle(course) || getCourseValue(course, ['source'], ''),
      credits: getCourseCredits(course),
      grade: course.grade || '',
      term: getCourseValue(course, ['term'], ''),
      year: getCourseValue(course, ['year'], ''),
      mappedTo: course.mappedTo || course.mapped_to || '',
      countsAs: course.countsAs || course.counts_as || '',
    }))
  ))
}

function parseEquivalencyJson(value) {
  if (!value) return null
  if (typeof value === 'object') return value

  const text = String(value).trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() || text

  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

function responseMentionsCourse(course, responseText) {
  const response = String(responseText || '').toLowerCase()
  const code = String(course.sourceCourse || '').toLowerCase()
  const title = String(course.sourceTitle || '').toLowerCase()

  return Boolean(
    (code && response.includes(code))
    || (title && title.length > 5 && response.includes(title)),
  )
}

function inferNarrativeCatalogMapping(course, responseText) {
  const courseText = `${course.sourceCourse || ''} ${course.sourceTitle || ''}`.toLowerCase()
  const response = String(responseText || '').toLowerCase()
  const isDirectlyMentioned = responseMentionsCourse(course, responseText)

  if (/\b(chem|chemistry|organic chemistry|ochem)\b/.test(courseText)) {
    const isOrganic = /\b(organic|ochem|chem\s*221)\b/.test(courseText)
    return {
      catalogCourse: isOrganic ? 'Organic Chemistry I' : 'Chemistry requirement',
      requirement: response.includes('biology') || response.includes('biochemistry') ? 'Biology chemistry requirement' : 'Science requirement',
      confidence: isDirectlyMentioned ? 'Direct catalog mention' : 'Suggested catalog fit',
      rationale: isOrganic
        ? 'Organic chemistry is commonly required or strongly relevant for biology, biochemistry, molecular biology, and pre-professional science tracks.'
        : 'Chemistry coursework is discipline-aligned with science degree requirements and should be reviewed against the catalog sequence.',
    }
  }

  if (/\b(biol|biology|genetics|cell biology|molecular|anatomy|physiology)\b/.test(courseText)) {
    const isGenetics = /\b(genetics|biol\s*220)\b/.test(courseText)
    return {
      catalogCourse: isGenetics ? 'Genetics' : 'Biology major course',
      requirement: isGenetics ? 'Biology core requirement' : 'Biology major / science requirement',
      confidence: isDirectlyMentioned ? 'Direct catalog mention' : 'Suggested catalog fit',
      rationale: isGenetics
        ? 'The catalog response identifies genetics as directly applicable to biology degree requirements, with lab status needing confirmation where required.'
        : 'Biology coursework is directly discipline-aligned and should map to the biology core, science prerequisites, or major electives.',
    }
  }

  if (/\b(stat|statistics|research methods|quantitative)\b/.test(courseText)) {
    return {
      catalogCourse: response.includes('probability and statistics for cs') ? 'Probability and Statistics for CS' : 'CS statistics requirement',
      requirement: 'Math / quantitative reasoning',
      confidence: 'Suggested catalog fit',
      rationale: 'The catalog response links statistics and research methods to data science, modeling, and CS quantitative foundations.',
    }
  }

  if (/\b(psyc|psychology|cognitive|abnormal|social|development)\b/.test(courseText)) {
    return {
      catalogCourse: response.includes('artificial intelligence') || response.includes('machine learning') ? 'AI / Machine Learning elective' : 'CS elective',
      requirement: 'Major elective / applied computing',
      confidence: 'Suggested catalog fit',
      rationale: 'The catalog response identifies psychology coursework as relevant to analytical reasoning, AI, machine learning, and human behavior models.',
    }
  }

  if (/\b(eng|english|composition|writing|communication)\b/.test(courseText)) {
    return {
      catalogCourse: response.includes('technical writing') ? 'Technical Writing for CS' : 'Communication requirement',
      requirement: 'Writing / communication',
      confidence: 'Suggested catalog fit',
      rationale: 'The catalog response maps writing and communication coursework to technical documentation and HCI-adjacent CS work.',
    }
  }

  if (/\b(hist|history)\b/.test(courseText)) {
    return {
      catalogCourse: 'General Education / breadth',
      requirement: 'General education',
      confidence: 'Suggested catalog fit',
      rationale: 'The catalog response states history coursework is likely to satisfy general education breadth requirements.',
    }
  }

  if (/\b(math|algebra|calculus)\b/.test(courseText)) {
    return {
      catalogCourse: 'CS math prerequisite',
      requirement: 'Math foundation',
      confidence: 'Suggested catalog fit',
      rationale: 'Math coursework supports CS prerequisites and quantitative degree requirements.',
    }
  }

  return {
    catalogCourse: 'No direct equivalent',
    requirement: 'Advisor review',
    confidence: 'Needs review',
    rationale: responseText ? 'The catalog response did not identify a direct course-level match for this transcript course.' : '',
  }
}

function normalizeNarrativeEquivalencyRows(responseText, transcriptCourses) {
  if (!String(responseText || '').trim()) return []

  return transcriptCourses.map((course) => {
    const inferred = inferNarrativeCatalogMapping(course, responseText)
    return {
      id: course.id,
      institution: course.institution,
      sourceCourse: course.sourceCourse || '-',
      sourceTitle: course.sourceTitle || '-',
      credits: course.credits || '-',
      catalogCourse: inferred.catalogCourse,
      catalogTitle: '',
      requirement: inferred.requirement,
      confidence: inferred.confidence,
      rationale: inferred.rationale,
    }
  })
}

function normalizeEquivalencyRows(payload, transcriptCourses) {
  const responseText = typeof payload?.response === 'string' ? payload.response : typeof payload === 'string' ? payload : ''
  const parsed = parseEquivalencyJson(payload?.response || payload)
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.equivalencies)
      ? parsed.equivalencies
      : Array.isArray(parsed?.courseMappings)
        ? parsed.courseMappings
        : Array.isArray(parsed?.mappings)
          ? parsed.mappings
          : []

  if (rows.length) {
    return rows.map((row, index) => {
      const sourceCourse = row.sourceCourse || row.source_course || row.transcriptCourse || row.transcript_course || row.course || ''
      const sourceTitle = row.sourceTitle || row.source_title || row.transcriptTitle || row.transcript_title || row.title || ''
      const matchingCourse = transcriptCourses.find((course) => (
        sourceCourse && String(course.sourceCourse).toLowerCase() === String(sourceCourse).toLowerCase()
      )) || transcriptCourses[index] || {}

      return {
        id: row.id || matchingCourse.id || `equivalency-${index}`,
        institution: row.institution || matchingCourse.institution || '',
        sourceCourse: sourceCourse || matchingCourse.sourceCourse || '-',
        sourceTitle: sourceTitle || matchingCourse.sourceTitle || '-',
        credits: row.credits ?? matchingCourse.credits ?? '-',
        catalogCourse: row.catalogCourse || row.catalog_course || row.equivalentCourse || row.equivalent_course || row.mapsTo || row.maps_to || row.mappedTo || '-',
        catalogTitle: row.catalogTitle || row.catalog_title || row.equivalentTitle || row.equivalent_title || '',
        requirement: row.requirement || row.countsAs || row.counts_as || row.degreeRequirement || row.degree_requirement || '-',
        confidence: row.confidence || row.matchConfidence || row.match_confidence || row.status || 'Catalog match',
        rationale: row.rationale || row.notes || row.reason || '',
      }
    })
  }

  const narrativeRows = normalizeNarrativeEquivalencyRows(responseText, transcriptCourses)
  if (narrativeRows.length) return narrativeRows

  return transcriptCourses.map((course) => ({
    id: course.id,
    institution: course.institution,
    sourceCourse: course.sourceCourse || '-',
    sourceTitle: course.sourceTitle || '-',
    credits: course.credits || '-',
    catalogCourse: course.mappedTo || '-',
    catalogTitle: '',
    requirement: course.countsAs || 'Catalog lookup needed',
    confidence: course.mappedTo ? 'Transcript mapping' : 'Pending',
    rationale: course.mappedTo ? 'Existing transcript mapping.' : '',
  }))
}

function getEquivalencyCreditSummary(rows) {
  return rows.reduce((summary, row) => {
    const credits = getCreditNumber(row.credits)
    const mappingText = [
      row.catalogCourse,
      row.requirement,
      row.confidence,
      row.rationale,
    ].filter(Boolean).join(' ').toLowerCase()
    const likelyNotTransferable = (
      mappingText.includes('no direct equivalent')
      || mappingText.includes('needs review')
      || mappingText.includes('pending')
      || mappingText.includes('advisor review')
      || mappingText.includes('catalog lookup')
    )

    if (likelyNotTransferable) {
      return { ...summary, likelyNotTransferable: summary.likelyNotTransferable + credits }
    }

    return { ...summary, likelyTransferable: summary.likelyTransferable + credits }
  }, { likelyTransferable: 0, likelyNotTransferable: 0 })
}

function getTranscriptDocumentUrl(transcript) {
  return getFirstValue(
    transcript?.documentUrl,
    transcript?.pdfUrl,
    transcript?.fileUrl,
    transcript?.sourceUrl,
    transcript?.downloadUrl,
    transcript?.rawDocument?.documentUrl,
    transcript?.rawDocument?.pdfUrl,
    transcript?.rawDocument?.fileUrl,
    transcript?.rawDocument?.sourceUrl,
    transcript?.rawDocument?.downloadUrl,
    transcript?.rawDocument?.metadata?.documentUrl,
    transcript?.rawDocument?.metadata?.pdfUrl,
    transcript?.rawDocument?.metadata?.fileUrl,
    transcript?.rawDocument?.metadata?.sourceUrl,
  )
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || '').trim())
}

function isNumericDocumentId(value) {
  return /^\d+$/.test(String(value || '').trim())
}

function getTranscriptDocumentContentUrl(transcript) {
  return normalizeDocumentStorageUrl(getFirstValue(
    transcript?.documentContentUrl,
    transcript?.document_content_url,
    transcript?.contentUrl,
    transcript?.content_url,
    transcript?.documentStorage?.contentUrl,
    transcript?.documentStorage?.content_url,
    transcript?.rawDocument?.documentContentUrl,
    transcript?.rawDocument?.document_content_url,
    transcript?.rawDocument?.contentUrl,
    transcript?.rawDocument?.content_url,
    transcript?.rawDocument?.documentStorage?.contentUrl,
    transcript?.rawDocument?.documentStorage?.content_url,
    transcript?.rawDocument?.metadata?.documentContentUrl,
    transcript?.rawDocument?.metadata?.document_content_url,
    transcript?.rawDocument?.metadata?.contentUrl,
    transcript?.rawDocument?.metadata?.content_url,
  ))
}

function getTranscriptCrtfyDocumentsId(transcript) {
  const candidates = [
    transcript?.crtfyDocumentId,
    transcript?.crtfy_document_id,
    transcript?.documentId,
    transcript?.document_id,
    transcript?.documentUploadId,
    transcript?.document_upload_id,
    transcript?.documentStorage?.documentId,
    transcript?.documentStorage?.document_id,
    transcript?.rawDocument?.crtfyDocumentId,
    transcript?.rawDocument?.crtfy_document_id,
    transcript?.rawDocument?.documentId,
    transcript?.rawDocument?.document_id,
    transcript?.rawDocument?.documentUploadId,
    transcript?.rawDocument?.document_upload_id,
    transcript?.rawDocument?.documentStorage?.documentId,
    transcript?.rawDocument?.documentStorage?.document_id,
    transcript?.rawDocument?.metadata?.crtfyDocumentId,
    transcript?.rawDocument?.metadata?.crtfy_document_id,
    transcript?.rawDocument?.metadata?.documentId,
    transcript?.rawDocument?.metadata?.document_id,
    transcript?.rawDocument?.metadata?.documentUploadId,
    transcript?.rawDocument?.metadata?.document_upload_id,
  ]

  return candidates.find(isNumericDocumentId) || ''
}

function getTranscriptDocumentUploadId(transcript) {
  const crtfyDocumentsId = getTranscriptCrtfyDocumentsId(transcript)
  if (crtfyDocumentsId) return crtfyDocumentsId

  const rawDocumentId = getFirstValue(
    transcript?.rawDocument?.documentId,
    transcript?.rawDocument?.document_id,
    transcript?.rawDocument?.metadata?.documentId,
    transcript?.rawDocument?.metadata?.document_id,
    transcript?.rawDocument?.externalExtraction?.documentId,
    transcript?.rawDocument?.externalExtraction?.document_id,
    transcript?.rawDocument?.metadata?.externalExtraction?.documentId,
    transcript?.rawDocument?.metadata?.externalExtraction?.document_id,
  )
  if (rawDocumentId) return rawDocumentId

  const uploadAlias = getFirstValue(
    transcript?.documentUploadId,
    transcript?.document_upload_id,
    transcript?.documentUpload?.id,
    transcript?.document_upload?.id,
    transcript?.uploadId,
    transcript?.upload_id,
    transcript?.rawDocument?.documentUploadId,
    transcript?.rawDocument?.document_upload_id,
    transcript?.rawDocument?.documentUpload?.id,
    transcript?.rawDocument?.document_upload?.id,
    transcript?.rawDocument?.uploadId,
    transcript?.rawDocument?.upload_id,
    transcript?.rawDocument?.metadata?.documentUploadId,
    transcript?.rawDocument?.metadata?.document_upload_id,
    transcript?.rawDocument?.externalExtraction?.documentUploadId,
    transcript?.rawDocument?.externalExtraction?.document_upload_id,
    transcript?.rawDocument?.metadata?.externalExtraction?.documentUploadId,
    transcript?.rawDocument?.metadata?.externalExtraction?.document_upload_id,
  )
  const topLevelDocumentId = getFirstValue(transcript?.documentId, transcript?.document_id)

  if (topLevelDocumentId && uploadAlias && topLevelDocumentId !== uploadAlias) return topLevelDocumentId
  return uploadAlias
}

function getTranscriptLegacyDocumentId(transcript) {
  const candidates = [
    transcript?.documentUploadId,
    transcript?.document_upload_id,
    transcript?.documentId,
    transcript?.document_id,
    transcript?.rawDocument?.documentUploadId,
    transcript?.rawDocument?.document_upload_id,
    transcript?.rawDocument?.documentId,
    transcript?.rawDocument?.document_id,
    transcript?.rawDocument?.metadata?.documentUploadId,
    transcript?.rawDocument?.metadata?.document_upload_id,
    transcript?.rawDocument?.metadata?.documentId,
    transcript?.rawDocument?.metadata?.document_id,
  ]

  return candidates.find((value) => value && !isNumericDocumentId(value)) || ''
}

function getTranscriptDocumentStorageProvider(transcript) {
  return getFirstValue(
    transcript?.documentStorageProvider,
    transcript?.document_storage_provider,
    transcript?.storageProvider,
    transcript?.storage_provider,
    transcript?.documentStorage?.provider,
    transcript?.document_storage?.provider,
    transcript?.metadata?.documentStorageProvider,
    transcript?.metadata?.document_storage_provider,
    transcript?.metadata?.storageProvider,
    transcript?.metadata?.storage_provider,
    transcript?.rawDocument?.documentStorageProvider,
    transcript?.rawDocument?.document_storage_provider,
    transcript?.rawDocument?.storageProvider,
    transcript?.rawDocument?.storage_provider,
    transcript?.rawDocument?.documentStorage?.provider,
    transcript?.rawDocument?.document_storage?.provider,
    transcript?.rawDocument?.metadata?.documentStorageProvider,
    transcript?.rawDocument?.metadata?.document_storage_provider,
    transcript?.rawDocument?.metadata?.storageProvider,
    transcript?.rawDocument?.metadata?.storage_provider,
  )
}

function getTranscriptDocumentStorageDepartment(transcript) {
  return getFirstValue(
    transcript?.documentStorageDepartment,
    transcript?.document_storage_department,
    transcript?.documentStorage?.department,
    transcript?.document_storage?.department,
    transcript?.rawDocument?.documentStorageDepartment,
    transcript?.rawDocument?.document_storage_department,
    transcript?.rawDocument?.documentStorage?.department,
    transcript?.rawDocument?.document_storage?.department,
  ) || 'General'
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
    getCourseSubject(course),
    getCourseId(course),
    getCourseTitle(course),
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
    const credits = Number(getCourseCredits(course) || 0)
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

function buildAcademicTermRows(student) {
  if (!student) return []
  if (Array.isArray(student.termGpa) && student.termGpa.length) return student.termGpa

  const termMap = new Map()
  ;(student.transcripts || []).flatMap((transcript) => transcript.courses || []).forEach((course) => {
    const term = getCourseValue(course, ['term'], '')
    const year = getCourseValue(course, ['year'], '')
    const label = [term, year].filter(Boolean).join(' ')
    const points = gradeToPoints(course.grade)
    const credits = Number(getCourseCredits(course) || 0)
    if (!label || points === null || !Number.isFinite(credits) || credits <= 0) return

    const current = termMap.get(label) || { term: label, qualityPoints: 0, credits: 0 }
    current.qualityPoints += points * credits
    current.credits += credits
    termMap.set(label, current)
  })

  return Array.from(termMap.values()).map((row) => ({
    term: row.term,
    gpa: row.credits ? row.qualityPoints / row.credits : null,
    credits: row.credits,
  }))
}

function getFirstValue(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== '')
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(String(value).replace(/[$,]/g, ''))
  if (!Number.isFinite(number)) return String(value)
  return number.toLocaleString([], { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function parseCurrencyAmount(value) {
  if (value === null || value === undefined || value === '') return 0
  const number = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(number) ? number : 0
}

function formatDisplayDate(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatBooleanValue(value, yesLabel = 'Yes', noLabel = 'No', fallback = 'Not set') {
  if (value === true) return yesLabel
  if (value === false) return noLabel
  if (value === null || value === undefined || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['true', 'yes', 'y', '1', 'using', 'used', 'received', 'complete', 'submitted'].includes(normalized)) return yesLabel
  if (['false', 'no', 'n', '0', 'none', 'not using', 'not_used', 'not submitted'].includes(normalized)) return noLabel
  return String(value)
}

function getNestedObject(...values) {
  return values.find((value) => value && typeof value === 'object' && !Array.isArray(value)) || {}
}

function buildApplicationSummary(student, checklistStats, readiness) {
  const application = getNestedObject(
    student?.application,
    student?.applicationInfo,
    student?.application_info,
    student?.admissionsApplication,
    student?.admissions_application,
  )
  const applicant = getNestedObject(student?.applicant, application?.applicant)
  const startedAt = getFirstValue(application.startedAt, application.started_at, application.createdAt, application.created_at, student?.createdAt)
  const submittedAt = getFirstValue(application.submittedAt, application.submitted_at, application.completedAt, application.completed_at)
  const missingItems = (checklistStats?.items || []).filter((item) => !item.done)

  return {
    status: getFirstValue(application.status, application.applicationStatus, student?.applicationStatus, student?.application_status, student?.stage, readiness?.label, 'In progress'),
    applicationId: getFirstValue(application.id, application.applicationId, application.application_id, student?.applicationId, student?.application_id, student?.id),
    type: getFirstValue(application.type, application.applicationType, application.application_type, student?.applicationType, student?.population, 'Admissions application'),
    term: getFirstValue(application.entryTerm, application.entry_term, application.term, student?.entryTerm, student?.entry_term, student?.startTerm, student?.start_term, 'Term pending'),
    program: getProgramDisplay(student),
    campus: getFirstValue(application.campus, student?.campus, student?.location, 'Campus pending'),
    delivery: getFirstValue(application.delivery, application.modality, student?.delivery, student?.modality, 'Modality pending'),
    startedAt: formatDisplayDate(startedAt),
    submittedAt: submittedAt ? formatDisplayDate(submittedAt) : 'Not submitted',
    completion: `${checklistStats?.completionPercent ?? 0}%`,
    completedCount: checklistStats?.completedCount ?? 0,
    totalRequired: checklistStats?.totalRequired ?? 0,
    missingItems,
    applicantType: getFirstValue(applicant.type, applicant.applicantType, applicant.applicant_type, student?.population, 'Not set'),
    residency: getFirstValue(application.residency, applicant.residency, student?.residency, 'Not set'),
    studentType: getFirstValue(application.studentType, application.student_type, student?.studentType, student?.student_type, 'Not set'),
    nextStep: getFirstValue(application.nextStep, application.next_step, student?.nextBestAction, student?.recommendation?.nextBestAction, readiness?.reason, 'Review next application item'),
  }
}

function buildFinancialAidSummary(student, postAdmitMilestoneRows) {
  const aid = getNestedObject(
    student?.financialAid,
    student?.financial_aid,
    student?.aid,
    student?.fafsa,
  )
  const fafsa = getNestedObject(aid.fafsa, student?.fafsa, student?.fafsaDetails, student?.fafsa_details)
  const financialAidMilestone = postAdmitMilestoneRows.find((row) => row.id === 'financial_aid_package') || {}
  const scholarshipMilestone = postAdmitMilestoneRows.find((row) => row.id === 'scholarship_status') || {}
  const hasAidSignal = Boolean(
    aid.usingFinancialAid
    || aid.using_financial_aid
    || aid.status
    || fafsa.status
    || fafsa.receivedAt
    || financialAidMilestone.status !== 'Not started'
    || scholarshipMilestone.status !== 'Not started',
  )

  return {
    usingAid: formatBooleanValue(getFirstValue(aid.usingFinancialAid, aid.using_financial_aid, student?.usingFinancialAid, student?.using_financial_aid, hasAidSignal ? true : ''), 'Using aid', 'Not using aid', 'Unknown'),
    aidStatus: getFirstValue(aid.status, aid.financialAidStatus, aid.financial_aid_status, financialAidMilestone.status, 'Not started'),
    fafsaStatus: getFirstValue(fafsa.status, aid.fafsaStatus, aid.fafsa_status, student?.fafsaStatus, student?.fafsa_status, 'Not received'),
    fafsaReceivedAt: formatDisplayDate(getFirstValue(fafsa.receivedAt, fafsa.received_at, aid.fafsaReceivedAt, aid.fafsa_received_at)),
    aidYear: getFirstValue(aid.aidYear, aid.aid_year, fafsa.aidYear, fafsa.aid_year, 'Aid year pending'),
    dependencyStatus: getFirstValue(fafsa.dependencyStatus, fafsa.dependency_status, aid.dependencyStatus, aid.dependency_status, 'Not set'),
    sai: getFirstValue(fafsa.sai, fafsa.studentAidIndex, fafsa.student_aid_index, aid.sai, aid.efc, 'Not set'),
    verificationStatus: getFirstValue(aid.verificationStatus, aid.verification_status, fafsa.verificationStatus, fafsa.verification_status, 'Not selected'),
    packageStatus: getFirstValue(aid.packageStatus, aid.package_status, financialAidMilestone.status, 'Not started'),
    estimatedAid: formatCurrency(getFirstValue(aid.estimatedAid, aid.estimated_aid, aid.awardAmount, aid.award_amount, aid.packageAmount, aid.package_amount)),
    scholarshipStatus: getFirstValue(aid.scholarshipStatus, aid.scholarship_status, scholarshipMilestone.status, 'Not started'),
    scholarshipAmount: formatCurrency(getFirstValue(aid.scholarshipAmount, aid.scholarship_amount, aid.meritAward, aid.merit_award)),
    nextStep: getFirstValue(aid.nextStep, aid.next_step, financialAidMilestone.blocker, scholarshipMilestone.blocker, 'Confirm FAFSA and aid package status'),
  }
}

function getScholarshipOfferSources(student) {
  const aid = getNestedObject(student?.financialAid, student?.financial_aid, student?.aid)
  const sources = [
    student?.scholarshipOffers,
    student?.scholarship_offers,
    student?.offeredScholarships,
    student?.offered_scholarships,
    student?.awardedScholarships,
    student?.awarded_scholarships,
    aid.scholarshipOffers,
    aid.scholarship_offers,
    aid.offeredScholarships,
    aid.offered_scholarships,
    aid.awardedScholarships,
    aid.awarded_scholarships,
  ].filter(Array.isArray)

  return sources.flat()
}

function normalizeScholarshipOffers(student, financialAidSummary) {
  const rows = getScholarshipOfferSources(student).map((row, index) => {
    const sourceType = String(getFirstValue(row.sourceType, row.source_type, row.type, row.providerType, row.provider_type, '')).toLowerCase()
    const provider = getFirstValue(row.provider, row.organization, row.source, row.institution, row.school, '')
    const isExternal = sourceType.includes('external') || sourceType.includes('outside') || row.external === true || row.isExternal === true || row.is_external === true
    const amount = getFirstValue(row.amount, row.awardAmount, row.award_amount, row.offeredAmount, row.offered_amount, row.annualAmount, row.annual_amount)

    return {
      id: row.id || row.offerId || row.offer_id || row.scholarshipId || row.scholarship_id || `scholarship-offer-${index}`,
      name: row.name || row.title || row.label || 'Scholarship offer',
      sourceType: isExternal ? 'External' : 'Institutional',
      provider: provider || (isExternal ? 'External provider' : student?.institutionGoal || 'This institution'),
      amount: formatCurrency(amount),
      amountValue: parseCurrencyAmount(amount),
      status: getFirstValue(row.status, row.offerStatus, row.offer_status, row.awardStatus, row.award_status, 'Offered'),
      offeredAt: formatDisplayDate(getFirstValue(row.offeredAt, row.offered_at, row.awardedAt, row.awarded_at, row.createdAt, row.created_at)),
      renewable: formatBooleanValue(getFirstValue(row.renewable, row.isRenewable, row.is_renewable), 'Renewable', 'Not renewable', 'Not set'),
      requirements: getFirstValue(row.requirements, row.criteria, row.conditions, row.nextRequirement, row.next_requirement, 'No requirements listed'),
      notes: getFirstValue(row.notes, row.description, row.summary, ''),
    }
  })

  if (!rows.length && financialAidSummary.scholarshipAmount !== '-') {
    rows.push({
      id: 'institutional-scholarship-summary',
      name: 'Institutional scholarship',
      sourceType: 'Institutional',
      provider: student?.institutionGoal || 'This institution',
      amount: financialAidSummary.scholarshipAmount,
      amountValue: parseCurrencyAmount(financialAidSummary.scholarshipAmount),
      status: financialAidSummary.scholarshipStatus,
      offeredAt: 'Not set',
      renewable: 'Not set',
      requirements: 'Confirm award conditions with Financial Aid.',
      notes: '',
    })
  }

  return rows.sort((first, second) => {
    if (first.sourceType !== second.sourceType) return first.sourceType.localeCompare(second.sourceType)
    return second.amountValue - first.amountValue || first.name.localeCompare(second.name)
  })
}

function getScholarshipOfferSummary(rows) {
  return rows.reduce((summary, row) => {
    const key = row.sourceType === 'External' ? 'external' : 'institutional'
    const status = String(row.status || '').toLowerCase()

    return {
      ...summary,
      totalAmount: summary.totalAmount + row.amountValue,
      [key]: summary[key] + 1,
      accepted: summary.accepted + (status.includes('accept') || status.includes('award') ? 1 : 0),
      pending: summary.pending + (status.includes('pending') || status.includes('offer') || status.includes('review') ? 1 : 0),
    }
  }, { totalAmount: 0, institutional: 0, external: 0, accepted: 0, pending: 0 })
}

function getScholarshipCatalogRows(student) {
  const explicitRows = getFirstValue(
    student?.scholarships,
    student?.scholarshipOptions,
    student?.scholarship_options,
    student?.financialAid?.scholarships,
    student?.financial_aid?.scholarships,
  )

  if (!Array.isArray(explicitRows) || !explicitRows.length) return scholarshipCatalog

  return explicitRows.map((row, index) => ({
    id: row.id || row.scholarshipId || row.scholarship_id || `scholarship-${index}`,
    name: row.name || row.title || row.label || 'Scholarship option',
    amount: row.amount || row.estimatedAmount || row.estimated_amount || row.awardAmount || row.award_amount || 'Varies',
    owner: row.owner || row.department || 'Financial Aid',
    description: row.description || row.summary || row.criteria || 'Catalog scholarship option.',
    action: row.action || row.nextStep || row.next_step || 'Review scholarship eligibility',
    status: row.status || '',
    matchScore: row.matchScore || row.match_score,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    missing: Array.isArray(row.missing) ? row.missing : [],
  }))
}

function includesAny(text, terms) {
  const normalized = String(text || '').toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

function getScholarshipStatus(score, missingCount = 0) {
  if (score >= 85 && missingCount === 0) return 'Strong match'
  if (score >= 65) return 'Review match'
  return 'Possible'
}

function buildScholarshipMatches({ student, equivalencyRows, transcriptCourseRows, subjectGpaRows, financialAidSummary }) {
  if (!student) return []

  const programText = getProgramDisplay(student).toLowerCase()
  const tagsText = Array.isArray(student.tags) ? student.tags.join(' ').toLowerCase() : ''
  const courseText = [
    ...transcriptCourseRows.map((row) => `${row.sourceCourse} ${row.sourceTitle} ${row.mappedTo} ${row.countsAs}`),
    ...equivalencyRows.map((row) => `${row.catalogCourse} ${row.catalogTitle} ${row.requirement} ${row.rationale}`),
    ...subjectGpaRows.map((row) => row.subject),
    programText,
    tagsText,
  ].join(' ').toLowerCase()
  const gpa = Number(getStudentOverallGpa(student))
  const credits = transcriptCourseRows.reduce((sum, row) => {
    const creditsValue = Number(row.credits)
    return Number.isFinite(creditsValue) ? sum + creditsValue : sum
  }, 0) || Number(student.creditsAccepted || 0)
  const isTransfer = includesAny(`${programText} ${tagsText} ${student.population || ''}`, ['transfer']) || credits >= 12
  const usesAid = includesAny(`${financialAidSummary.usingAid} ${financialAidSummary.fafsaStatus} ${financialAidSummary.aidStatus}`, ['using', 'received', 'submitted', 'complete'])
  const hasStem = includesAny(courseText, ['computer', 'science', 'stem', 'math', 'calculus', 'statistics', 'biology', 'chemistry', 'engineering'])
  const hasHealthScience = includesAny(courseText, ['nursing', 'health', 'anatomy', 'physiology', 'biology', 'chemistry', 'medical'])

  return getScholarshipCatalogRows(student)
    .map((scholarship) => {
      if (scholarship.matchScore !== undefined) {
        const score = Number(scholarship.matchScore)
        const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 50
        return {
          ...scholarship,
          amount: formatCurrency(scholarship.amount) === '-' ? scholarship.amount : formatCurrency(scholarship.amount),
          matchScore: safeScore,
          status: scholarship.status || getScholarshipStatus(safeScore, scholarship.missing?.length || 0),
          evidence: scholarship.evidence.length ? scholarship.evidence : ['Provided by scholarship catalog response.'],
          missing: scholarship.missing || [],
        }
      }

      const evidence = []
      const missing = []
      let score = 35

      if (scholarship.id === 'transfer-achievement') {
        if (isTransfer) { score += 25; evidence.push('Student is in a transfer pathway or has college transfer credit.') } else missing.push('Transfer pathway or transfer credit confirmation')
        if (credits >= 24) { score += 20; evidence.push(`${formatCredits(credits)} transcript credits are visible.`) } else missing.push('At least 24 transferable or attempted credits')
        if (Number.isFinite(gpa) && gpa >= 3) { score += 15; evidence.push(`Transcript GPA is ${formatGpa(gpa)}.`) } else missing.push('GPA at or above 3.000')
      } else if (scholarship.id === 'academic-merit') {
        if (Number.isFinite(gpa) && gpa >= 3.5) { score += 40; evidence.push(`High transcript GPA: ${formatGpa(gpa)}.`) } else if (Number.isFinite(gpa) && gpa >= 3) { score += 22; evidence.push(`Transcript GPA is merit-reviewable at ${formatGpa(gpa)}.`) } else missing.push('Higher confirmed cumulative GPA')
        if (subjectGpaRows.some((row) => Number(row.gpa) >= 3.5)) { score += 15; evidence.push('One or more subject areas show a 3.500+ GPA signal.') }
      } else if (scholarship.id === 'stem-pathway') {
        if (hasStem) { score += 35; evidence.push('Transcript and catalog mapping include STEM-aligned coursework.') } else missing.push('STEM course or program evidence')
        if (includesAny(programText, ['computer', 'science', 'engineering', 'biology', 'chemistry', 'math'])) { score += 15; evidence.push(`Program interest is ${getProgramDisplay(student)}.`) }
      } else if (scholarship.id === 'health-sciences') {
        if (hasHealthScience) { score += 35; evidence.push('Transcript and catalog mapping include health-science prerequisite evidence.') } else missing.push('Health-science prerequisite evidence')
        if (includesAny(programText, ['nursing', 'health', 'biology', 'medical'])) { score += 15; evidence.push(`Program interest is ${getProgramDisplay(student)}.`) }
      } else if (scholarship.id === 'financial-need') {
        if (usesAid) { score += 35; evidence.push(`Aid signal: ${financialAidSummary.usingAid}; FAFSA is ${financialAidSummary.fafsaStatus}.`) } else missing.push('FAFSA or financial aid usage confirmation')
        if (financialAidSummary.sai && financialAidSummary.sai !== 'Not set') { score += 15; evidence.push(`SAI / EFC is ${financialAidSummary.sai}.`) }
      }

      return {
        ...scholarship,
        matchScore: Math.max(0, Math.min(100, score)),
        status: getScholarshipStatus(score, missing.length),
        evidence: evidence.length ? evidence : ['Student record has a partial catalog match.'],
        missing,
      }
    })
    .sort((first, second) => second.matchScore - first.matchScore || first.name.localeCompare(second.name))
}

function getStudentFirstName(student) {
  const name = student?.preferredName || student?.firstName || student?.name || 'there'
  return String(name).trim().split(/\s+/)[0] || 'there'
}

function fillCommunicationTemplate(template, student) {
  const values = {
    firstName: getStudentFirstName(student),
    program: getProgramDisplay(student),
    nextAction: getNextBestAction(student),
    school: student?.institutionGoal || student?.school || 'your school',
  }
  const replaceValue = (text) => String(text || '').replace(/\{(firstName|program|nextAction|school)\}/g, (_, key) => values[key] || '')

  return {
    subject: replaceValue(template?.subject),
    body: replaceValue(template?.body),
  }
}

function getHandoffs(student) {
  return Array.isArray(student?.handoffs) ? student.handoffs : []
}

function buildPostAdmitMilestoneRows(student) {
  const savedMilestones = Array.isArray(student?.postAdmitMilestones) ? student.postAdmitMilestones : []
  const savedById = new Map(savedMilestones.map((item) => [item.id, item]))

  return postAdmitMilestones.map((definition) => {
    const saved = savedById.get(definition.id) || {}
    const inferredComplete = definition.id === 'deposit_commitment'
      ? String(student?.stage || '').toLowerCase().includes('deposited') || String(student?.stage || '').toLowerCase().includes('registered')
      : definition.id === 'registration_status'
        ? String(student?.stage || '').toLowerCase().includes('registered')
        : false

    return {
      ...definition,
      status: saved.status || (inferredComplete ? 'Complete' : 'Not started'),
      owner: saved.owner || definition.owner,
      dueAt: saved.dueAt || saved.due_at || '',
      blocker: saved.blocker || '',
      updatedAt: saved.updatedAt || saved.updated_at || '',
    }
  })
}

function getMilestoneSummary(rows) {
  const total = rows.length
  const complete = rows.filter((row) => row.status === 'Complete' || row.status === 'Waived').length
  const blocked = rows.filter((row) => row.status === 'Blocked').length

  return {
    total,
    complete,
    blocked,
    percent: total ? Math.round((complete / total) * 100) : 0,
  }
}

function getRecruitmentEvents(student) {
  return (Array.isArray(student?.interactions) ? student.interactions : []).filter((item) => item.type === 'recruitment_event')
}

function getTranscriptDemographic(transcript) {
  return transcript?.demographic || transcript?.rawDocument?.demographic || transcript?.rawDocument?.Demographic || {}
}

function getTestScoreSources(student) {
  if (!student) return []

  return [
    student,
    student.demographic,
    ...(student.transcripts || []).map(getTranscriptDemographic),
    ...(student.transcripts || []).map((transcript) => transcript.rawDocument),
  ].filter((source) => source && typeof source === 'object')
}

function buildTestScoreRows(student) {
  if (!student) return []
  const rows = []

  const addScore = ({ test, section = 'Composite', score, date }) => {
    const resolvedScore = getFirstValue(score)
    if (resolvedScore === undefined) return
    const duplicate = rows.some((row) => (
      row.test === test
      && row.section === section
      && String(row.score) === String(resolvedScore)
      && row.date === (date || 'Date pending')
    ))
    if (duplicate) return

    rows.push({
      id: `${test}-${section}-${rows.length}`,
      test,
      section,
      score: resolvedScore,
      date: date || 'Date pending',
    })
  }

  const testScores = Array.isArray(student.testScores)
    ? student.testScores
    : Array.isArray(student.test_scores)
      ? student.test_scores
      : []

  testScores.forEach((item) => {
    const test = String(item.test || item.type || item.name || '').toUpperCase()
    if (test === 'ACT' || test.includes('ACT')) {
      addScore({
        test: 'ACT',
        section: item.section || item.subject || 'Composite',
        score: getFirstValue(item.score, item.composite, item.value),
        date: item.date || item.takenAt || item.testDate,
      })
    }
    if (test === 'SAT' || test.includes('SAT')) {
      addScore({
        test: 'SAT',
        section: item.section || item.subject || 'Total',
        score: getFirstValue(item.score, item.total, item.value),
        date: item.date || item.takenAt || item.testDate,
      })
    }
  })

  getTestScoreSources(student).forEach((source) => {
    const act = source.act || source.ACT || source.actScores || source.act_scores || {}
    addScore({ test: 'ACT', section: 'English', score: getFirstValue(source.actEnglishScore, act.english), date: getFirstValue(source.actEnglishDate, act.englishDate, act.date, act.testDate) })
    addScore({ test: 'ACT', section: 'Math', score: getFirstValue(source.actMathScore, act.math), date: getFirstValue(source.actMathDate, act.mathDate, act.date, act.testDate) })
    addScore({ test: 'ACT', section: 'Reading', score: getFirstValue(source.actReadingScore, act.reading), date: getFirstValue(source.actReadingDate, act.readingDate, act.date, act.testDate) })
    addScore({ test: 'ACT', section: 'Science', score: getFirstValue(source.actSciencesScore, source.actScienceScore, act.science, act.sciences), date: getFirstValue(source.actSciencesDate, source.actScienceDate, act.scienceDate, act.sciencesDate, act.date, act.testDate) })
    addScore({ test: 'ACT', section: 'STEM', score: getFirstValue(source.actStemScore, source.actSTEMScore, act.stem), date: getFirstValue(source.actStemDate, source.actSTEMDate, act.stemDate, act.date, act.testDate) })
    addScore({
      test: 'ACT',
      section: 'Composite',
      score: getFirstValue(source.actCompositeScore, source.actComposite, source.actScore, source.act_score, act.composite, act.score),
      date: getFirstValue(source.actCompositeDate, source.actDate, source.act_date, act.compositeDate, act.date, act.takenAt, act.testDate),
    })

    const sat = source.sat || source.SAT || source.satScores || source.sat_scores || {}
    addScore({ test: 'SAT', section: 'Math', score: getFirstValue(source.satMathScore, sat.math), date: getFirstValue(source.satMathDate, sat.mathDate, sat.date, sat.testDate) })
    addScore({ test: 'SAT', section: 'Reading', score: getFirstValue(source.satReadingScore, sat.reading), date: getFirstValue(source.satReadingDate, sat.readingDate, sat.date, sat.testDate) })
    addScore({
      test: 'SAT',
      section: 'Total',
      score: getFirstValue(source.satTotalScore, source.satTotal, source.satScore, source.sat_score, sat.total, sat.score),
      date: getFirstValue(source.satTotalDate, source.satDate, source.sat_date, sat.totalDate, sat.date, sat.takenAt, sat.testDate),
    })
  })

  return rows
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
  const { students, isLoadingStudents, studentsError, loadStudentChecklist, normalizeStudentDetailPayload, updateChecklistItemStatus, updateStudentProgram, addStudentInteraction, logStudentCommunication, createStudentHandoff, updateStudentMilestone, logRecruitmentEvent } = useStudentRecords()
  const { currentUser, session, fetchWithTenantAuth, hasAnyPermission, hasSensitivityTier } = useAuth()
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const [studentDetail, setStudentDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [programError, setProgramError] = useState('')
  const [programSuccess, setProgramSuccess] = useState('')
  const [isProgramSaving, setIsProgramSaving] = useState(false)
  const [equivalencyRows, setEquivalencyRows] = useState([])
  const [isEquivalencyLoading, setIsEquivalencyLoading] = useState(false)
  const [equivalencyError, setEquivalencyError] = useState('')
  const [equivalencyStatus, setEquivalencyStatus] = useState('')
  const [checklistActionError, setChecklistActionError] = useState('')
  const [activeChecklistItemId, setActiveChecklistItemId] = useState('')
  const [liveReadiness, setLiveReadiness] = useState(null)
  const [timelineEvents, setTimelineEvents] = useState([])
  const [timelineMode, setTimelineMode] = useState('derived')
  const [timelineError, setTimelineError] = useState('')
  const [timelineFilter, setTimelineFilter] = useState('all')
  const [interactionType, setInteractionType] = useState('call')
  const [interactionOutcome, setInteractionOutcome] = useState('reached_student')
  const [interactionNote, setInteractionNote] = useState('')
  const [interactionNextAction, setInteractionNextAction] = useState('')
  const [interactionNextFollowUpAt, setInteractionNextFollowUpAt] = useState('')
  const [interactionError, setInteractionError] = useState('')
  const [interactionSuccess, setInteractionSuccess] = useState('')
  const [isSavingInteraction, setIsSavingInteraction] = useState(false)
  const [communicationTemplateKey, setCommunicationTemplateKey] = useState('new_inquiry')
  const [communicationChannel, setCommunicationChannel] = useState('email')
  const [communicationSubject, setCommunicationSubject] = useState('')
  const [communicationDraft, setCommunicationDraft] = useState('')
  const [communicationNextFollowUpAt, setCommunicationNextFollowUpAt] = useState('')
  const [communicationError, setCommunicationError] = useState('')
  const [communicationSuccess, setCommunicationSuccess] = useState('')
  const [isLoggingCommunication, setIsLoggingCommunication] = useState(false)
  const [communicationHistory, setCommunicationHistory] = useState([])
  const [handoffTarget, setHandoffTarget] = useState('Admissions Operations')
  const [handoffOwner, setHandoffOwner] = useState('')
  const [handoffPriority, setHandoffPriority] = useState('Normal')
  const [handoffStatus, setHandoffStatus] = useState('Open')
  const [handoffDueAt, setHandoffDueAt] = useState('')
  const [handoffBlocker, setHandoffBlocker] = useState('')
  const [handoffError, setHandoffError] = useState('')
  const [handoffSuccess, setHandoffSuccess] = useState('')
  const [isSavingHandoff, setIsSavingHandoff] = useState(false)
  const [milestoneDrafts, setMilestoneDrafts] = useState({})
  const [activeMilestoneId, setActiveMilestoneId] = useState('')
  const [milestoneError, setMilestoneError] = useState('')
  const [milestoneSuccess, setMilestoneSuccess] = useState('')
  const [recruitmentTerritory, setRecruitmentTerritory] = useState('Transfer Partners')
  const [recruitmentSchool, setRecruitmentSchool] = useState('')
  const [recruitmentEventType, setRecruitmentEventType] = useState('College fair')
  const [recruitmentEventName, setRecruitmentEventName] = useState('')
  const [recruitmentEventAt, setRecruitmentEventAt] = useState('')
  const [recruitmentNotes, setRecruitmentNotes] = useState('')
  const [recruitmentError, setRecruitmentError] = useState('')
  const [recruitmentSuccess, setRecruitmentSuccess] = useState('')
  const [isSavingRecruitmentEvent, setIsSavingRecruitmentEvent] = useState(false)
  const [documentViewerUrl, setDocumentViewerUrl] = useState('')
  const [documentViewerError, setDocumentViewerError] = useState('')
  const [isLoadingDocumentViewer, setIsLoadingDocumentViewer] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const summaryStudent = useMemo(() => students.find((item) => item.id === studentId) || null, [students, studentId])
  const visibleTabs = useMemo(() => {
    const tabs = [
      { key: 'overview', label: 'Overview', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'application', label: 'Application', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'financial_aid', label: 'Financial Aid', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'scholarships', label: 'Scholarships', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'timeline', label: 'Timeline', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'outreach', label: 'Outreach', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'checklist', label: 'Checklist', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'documents', label: 'Documents', allowed: hasAnyPermission(['view_student_360']) },
      { key: 'decisions', label: 'Decisions', allowed: hasAnyPermission(['view_decision_packet', 'release_decision']) },
      { key: 'trust', label: 'Trust', allowed: hasAnyPermission(['view_trust_flags', 'manage_trust_cases']) && hasSensitivityTier('trust_fraud_flags') },
      { key: 'yield', label: 'Yield / Deposit', allowed: hasAnyPermission(['view_student_360', 'view_dashboards']) },
      { key: 'handoff', label: 'Handoff', allowed: hasAnyPermission(['view_student_360', 'manage_integrations', 'view_dashboards']) },
      { key: 'recruitment', label: 'Recruitment', allowed: hasAnyPermission(['view_student_360', 'view_dashboards']) },
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
  const selectedCommunicationTemplate = useMemo(
    () => communicationTemplates.find((template) => template.key === communicationTemplateKey) || communicationTemplates[0],
    [communicationTemplateKey],
  )
  const communicationHistoryRows = useMemo(() => {
    const savedRows = Array.isArray(student?.interactions)
      ? student.interactions.filter((item) => item.type === 'communication')
      : []

    return [...communicationHistory, ...savedRows]
      .filter((item, index, rows) => rows.findIndex((row) => row.id === item.id) === index)
      .sort((first, second) => {
        const firstTime = new Date(first.occurredAt).getTime()
        const secondTime = new Date(second.occurredAt).getTime()
        if (Number.isNaN(firstTime) || Number.isNaN(secondTime)) return 0
        return secondTime - firstTime
      })
  }, [communicationHistory, student])
  const handoffRows = useMemo(() => getHandoffs(student), [student])
  const postAdmitMilestoneRows = useMemo(() => buildPostAdmitMilestoneRows(student), [student])
  const milestoneSummary = useMemo(() => getMilestoneSummary(postAdmitMilestoneRows), [postAdmitMilestoneRows])
  const applicationSummary = useMemo(() => buildApplicationSummary(student, checklistStats, readiness), [checklistStats, readiness, student])
  const financialAidSummary = useMemo(() => buildFinancialAidSummary(student, postAdmitMilestoneRows), [postAdmitMilestoneRows, student])
  const recruitmentEvents = useMemo(() => getRecruitmentEvents(student), [student])
  const derivedTimelineEvents = useMemo(
    () => buildDerivedTimeline(student, checklistStats, readiness),
    [checklistStats, readiness, student],
  )
  const displayTimelineEvents = timelineEvents.length ? timelineEvents : derivedTimelineEvents
  const filteredTimelineEvents = useMemo(() => (
    timelineFilter === 'all'
      ? displayTimelineEvents
      : displayTimelineEvents.filter((event) => event.type === timelineFilter)
  ), [displayTimelineEvents, timelineFilter])
  const academicTermRows = useMemo(() => buildAcademicTermRows(student), [student])
  const academicSummary = useMemo(() => {
    if (!student) return { overallGpa: '-', totalCredits: '-' }

    const termCredits = academicTermRows.reduce((sum, row) => {
      const credits = Number(row.credits)
      return Number.isNaN(credits) ? sum : sum + credits
    }, 0)

    return {
      overallGpa: formatGpa(getStudentOverallGpa(student)),
      totalCredits: formatCredits(termCredits || student.creditsAccepted),
    }
  }, [academicTermRows, student])
  const subjectGpaRows = useMemo(() => buildSubjectGpaRows(student), [student])
  const testScoreRows = useMemo(() => buildTestScoreRows(student), [student])
  const transcriptCourseRows = useMemo(() => buildTranscriptCourseRows(student), [student])
  const equivalencyCreditSummary = useMemo(() => getEquivalencyCreditSummary(equivalencyRows), [equivalencyRows])
  const scholarshipOffers = useMemo(() => normalizeScholarshipOffers(student, financialAidSummary), [financialAidSummary, student])
  const scholarshipOfferSummary = useMemo(() => getScholarshipOfferSummary(scholarshipOffers), [scholarshipOffers])
  const scholarshipMatches = useMemo(() => buildScholarshipMatches({
    student,
    equivalencyRows,
    transcriptCourseRows,
    subjectGpaRows,
    financialAidSummary,
  }), [equivalencyRows, financialAidSummary, student, subjectGpaRows, transcriptCourseRows])
  const programOptions = useMemo(() => {
    const scopedPrograms = Array.isArray(currentUser?.scopes?.programs)
      ? currentUser.scopes.programs.filter((program) => program && program !== '*')
      : []
    const recordPrograms = students
      .map((item) => getProgramDisplay(item))
      .filter((program) => program && program !== 'Program pending')
    const currentProgram = getProgramDisplay(student)

    return Array.from(new Set([
      currentProgram,
      ...scopedPrograms,
      ...recordPrograms,
      ...defaultProgramOptions,
    ].filter(Boolean)))
  }, [currentUser, student, students])

  useEffect(() => {
    if (!student || !selectedCommunicationTemplate) return
    const filledTemplate = fillCommunicationTemplate(selectedCommunicationTemplate, student)
    setCommunicationSubject(filledTemplate.subject)
    setCommunicationDraft(filledTemplate.body)
  }, [selectedCommunicationTemplate, student])

  useEffect(() => {
    const nextDrafts = {}
    postAdmitMilestoneRows.forEach((row) => {
      nextDrafts[row.id] = {
        status: row.status,
        owner: row.owner,
        dueAt: row.dueAt,
        blocker: row.blocker,
      }
    })
    setMilestoneDrafts(nextDrafts)
  }, [postAdmitMilestoneRows])

  const loadEquivalencies = useCallback(async () => {
    const program = getProgramDisplay(student)

    setEquivalencyError('')
    setEquivalencyStatus('')

    if (!transcriptCourseRows.length) {
      setEquivalencyRows([])
      setEquivalencyStatus('No transcript courses are available yet.')
      return
    }

    if (!chatApiBaseUrl) {
      setEquivalencyRows(normalizeEquivalencyRows(null, transcriptCourseRows))
      setEquivalencyError('VITE_CHAT_URL is not configured for catalog lookup. Showing available transcript mappings.')
      return
    }

    if (!session?.access_token) {
      setEquivalencyRows(normalizeEquivalencyRows(null, transcriptCourseRows))
      setEquivalencyError('Sign in is required before using catalog lookup. Showing available transcript mappings.')
      return
    }

    setIsEquivalencyLoading(true)

    try {
      const coursesForLookup = transcriptCourseRows.slice(0, 80).map((course) => ({
        sourceCourse: course.sourceCourse,
        sourceTitle: course.sourceTitle,
        credits: course.credits,
        grade: course.grade,
        institution: course.institution,
        term: course.term,
        year: course.year,
      }))

      const response = await fetch(`${chatApiBaseUrl}/api/agent/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dataClassification: 'internal',
          workspaceId: `student-${studentId}-equivalency`,
          message: [
            'Use the course catalog connection to map transcript courses to the selected degree/program.',
            `Selected degree/program: ${program}.`,
            `Student: ${student?.name || studentId}.`,
            'Return only valid JSON with this shape:',
            '{"equivalencies":[{"sourceCourse":"","sourceTitle":"","credits":"","catalogCourse":"","catalogTitle":"","requirement":"","confidence":"","rationale":""}]}',
            'Return exactly one equivalency row for each transcript course provided, in the same order.',
            'Use catalog courses and requirements for the selected degree/program. If no catalog match exists, set catalogCourse to "No direct equivalent" and explain the gap in rationale.',
            'If a course is discipline-aligned but not an exact catalog number match, map it to the closest subject requirement or elective category instead of "No direct equivalent". For example, Organic Chemistry should map to a Chemistry or science requirement for Biology programs.',
            'Do not return a narrative summary, markdown, or action plan.',
            `Transcript courses: ${JSON.stringify(coursesForLookup)}`,
          ].join('\n'),
        }),
      })
      const payload = await parseApiPayload(response)

      if (!response.ok) {
        throw new Error(payload?.message || payload?.detail || payload?.error || `Catalog lookup failed: ${response.status}`)
      }

      const nextRows = normalizeEquivalencyRows(payload, transcriptCourseRows)
      setEquivalencyRows(nextRows)
      setEquivalencyStatus(payload?.auditId ? `Catalog lookup complete. Audit ID: ${payload.auditId}` : 'Catalog lookup complete.')
    } catch (error) {
      setEquivalencyRows(normalizeEquivalencyRows(null, transcriptCourseRows))
      setEquivalencyError(error.message || 'Catalog lookup failed. Showing available transcript mappings.')
    } finally {
      setIsEquivalencyLoading(false)
    }
  }, [session?.access_token, student, studentId, transcriptCourseRows])

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

  useEffect(() => {
    if (!['overview', 'scholarships'].includes(activeTab) || !student) return
    loadEquivalencies()
  }, [activeTab, loadEquivalencies, student])

  useEffect(() => {
    let isActive = true
    let objectUrl = ''

    async function loadDocumentViewer() {
      const crtfyDocumentsId = getTranscriptCrtfyDocumentsId(selectedTranscript)
      const crtfyDocumentsContentUrl = getTranscriptDocumentContentUrl(selectedTranscript)
      const legacyDocumentId = getTranscriptLegacyDocumentId(selectedTranscript)
      const documentUploadId = crtfyDocumentsId || legacyDocumentId
      const fallbackUrl = getTranscriptDocumentUrl(selectedTranscript)

      setDocumentViewerError('')
      setDocumentViewerUrl('')
      setIsLoadingDocumentViewer(false)

      if (!selectedTranscript) return

      if (!documentUploadId && !crtfyDocumentsContentUrl) {
        if (fallbackUrl) setDocumentViewerUrl(fallbackUrl)
        else setDocumentViewerError('No document upload ID was returned for this transcript.')
        return
      }

      if (!session?.access_token || !session?.tenant_id) {
        setDocumentViewerError('Sign in is required to load the uploaded document.')
        return
      }

      setIsLoadingDocumentViewer(true)
      try {
        const storageProvider = getTranscriptDocumentStorageProvider(selectedTranscript)
        let response = null

        if (crtfyDocumentsContentUrl) {
          response = await fetchStoredDocumentContentUrl(crtfyDocumentsContentUrl, {
            tenantId: session.tenant_id,
            accessToken: session.access_token,
            userEmail: session.email || session.username,
            actor: session.username || session.email || 'crtfy-student',
            department: getTranscriptDocumentStorageDepartment(selectedTranscript),
          })
        } else if (crtfyDocumentsId) {
          response = await fetchStoredDocumentContent(crtfyDocumentsId, {
            tenantId: session.tenant_id,
            accessToken: session.access_token,
            userEmail: session.email || session.username,
            actor: session.username || session.email || 'crtfy-student',
            department: getTranscriptDocumentStorageDepartment(selectedTranscript),
          })
        } else if (storageProvider === activeDocumentStorageProvider.id) {
          throw new Error('This transcript is marked as crtfy Documents-backed, but no numeric crtfy Documents document_id or content_url was saved.')
        } else if (legacyDocumentId && isUuidLike(legacyDocumentId)) {
          response = await fetchWithTenantAuth(`${apiBaseUrl}/api/v1/documents/${legacyDocumentId}/content`)
        } else if (legacyDocumentId) {
          response = await fetchWithTenantAuth(`${apiBaseUrl}/api/v1/documents/${legacyDocumentId}/content`)
        }

        if (!response?.ok) {
          throw new Error(`Document load failed: ${response?.status || 'no response'}`)
        }

        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (isActive) setDocumentViewerUrl(objectUrl)
      } catch (error) {
        if (!isActive) return
        if (fallbackUrl) {
          setDocumentViewerUrl(fallbackUrl)
        } else {
          setDocumentViewerError(error.message || 'Document load failed.')
        }
      } finally {
        if (isActive) setIsLoadingDocumentViewer(false)
      }
    }

    loadDocumentViewer()

    return () => {
      isActive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fetchWithTenantAuth, selectedTranscript, session])

  if ((isLoadingStudents || isLoadingDetail) && !studentDetail && !summaryStudent) {
    return (
      <div className="page-wrap">
        <Link to="/students" className="back-link"><ArrowLeft size={16} /> Back to students</Link>
        <section className="panel">
          <p className="muted-copy">Loading student...</p>
        </section>
      </div>
    )
  }

  if ((studentsError || detailError) && !studentDetail && !summaryStudent) {
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

  const programName = getProgramDisplay(student)
  const headerSubtitle = programName === 'Transcript intake'
    ? 'Transcript intake'
    : `${programName} - Goal: ${student.institutionGoal || 'Not set'}`

  async function handleProgramChange(event) {
    const nextProgram = event.target.value
    const previousStudentDetail = studentDetail
    const currentProgram = getProgramDisplay(student)

    if (!nextProgram || nextProgram === currentProgram) return

    setProgramError('')
    setProgramSuccess('')
    setIsProgramSaving(true)

    if (studentDetail) {
      setStudentDetail((current) => current ? {
        ...current,
        program: nextProgram,
        degreeProgram: nextProgram,
        programInterest: nextProgram,
      } : current)
    }

    try {
      const updatedStudent = await updateStudentProgram({ studentId, program: nextProgram })
      setStudentDetail((current) => current ? {
        ...current,
        ...updatedStudent,
        program: nextProgram,
        degreeProgram: nextProgram,
        programInterest: nextProgram,
      } : current)
      setProgramSuccess('Program updated.')
    } catch (error) {
      if (previousStudentDetail) setStudentDetail(previousStudentDetail)
      setProgramError(error.message || 'Unable to update program.')
    } finally {
      setIsProgramSaving(false)
    }
  }

  async function handleInteractionSubmit(event) {
    event.preventDefault()
    setInteractionError('')
    setInteractionSuccess('')

    const note = interactionNote.trim()
    if (!note) {
      setInteractionError('Enter a note for this activity.')
      return
    }

    setIsSavingInteraction(true)

    try {
      const typeLabel = interactionTypes.find((item) => item.value === interactionType)?.label || 'Interaction'
      const outcomeLabel = interactionOutcomes.find((item) => item.value === interactionOutcome)?.label || ''
      const interaction = {
        type: interactionType,
        outcome: interactionOutcome,
        title: typeLabel,
        note,
        description: note,
        nextAction: interactionNextAction.trim(),
        nextFollowUpAt: interactionNextFollowUpAt ? new Date(interactionNextFollowUpAt).toISOString() : '',
        occurredAt: new Date().toISOString(),
        actor: currentUser?.displayName || currentUser?.email || session?.username || 'Admissions',
        source: 'student_360',
      }
      const savedInteraction = await addStudentInteraction({ studentId, interaction })
      const timelineEvent = {
        id: savedInteraction.id || `interaction-${Date.now()}`,
        type: 'interaction',
        title: savedInteraction.title || typeLabel,
        description: savedInteraction.description || savedInteraction.note || note,
        occurredAt: savedInteraction.occurredAt || interaction.occurredAt,
        actor: savedInteraction.actor || interaction.actor,
        source: savedInteraction.source || 'student_360',
        status: outcomeLabel,
      }

      setTimelineEvents((current) => [timelineEvent, ...current])
      setTimelineMode((current) => current === 'live' ? 'live' : 'derived')
      setInteractionNote('')
      setInteractionNextAction('')
      setInteractionNextFollowUpAt('')
      setInteractionSuccess('Activity added to the timeline.')
    } catch (error) {
      setInteractionError(error.message || 'Unable to add activity.')
    } finally {
      setIsSavingInteraction(false)
    }
  }

  async function handleCommunicationSubmit(event) {
    event.preventDefault()
    setCommunicationError('')
    setCommunicationSuccess('')

    const message = communicationDraft.trim()
    if (!message) {
      setCommunicationError('Enter a message before logging outreach.')
      return
    }

    setIsLoggingCommunication(true)

    try {
      const channelLabel = communicationChannels.find((channel) => channel.value === communicationChannel)?.label || 'Outreach'
      const templateLabel = communicationTemplates.find((template) => template.key === communicationTemplateKey)?.label || 'Custom'
      const actor = currentUser?.displayName || currentUser?.email || session?.username || 'Admissions'
      const communication = {
        channel: communicationChannel,
        templateKey: communicationTemplateKey,
        templateLabel,
        subject: communicationSubject.trim(),
        message,
        note: message,
        status: 'logged',
        title: `${channelLabel} outreach`,
        nextAction: `Follow up on ${templateLabel.toLowerCase()} outreach`,
        nextFollowUpAt: communicationNextFollowUpAt ? new Date(communicationNextFollowUpAt).toISOString() : '',
        occurredAt: new Date().toISOString(),
        actor,
        source: 'student_360_outreach',
      }
      const savedCommunication = await logStudentCommunication({ studentId, communication })
      const timelineEvent = {
        id: savedCommunication.id || `communication-${Date.now()}`,
        type: 'communication',
        title: savedCommunication.title || `${channelLabel} outreach`,
        description: savedCommunication.message || savedCommunication.description || message,
        occurredAt: savedCommunication.occurredAt || communication.occurredAt,
        actor: savedCommunication.actor || actor,
        source: savedCommunication.source || 'student_360_outreach',
        status: templateLabel,
      }

      setTimelineEvents((current) => [timelineEvent, ...current])
      setCommunicationHistory((current) => [savedCommunication, ...current])
      setTimelineMode((current) => current === 'live' ? 'live' : 'derived')
      setCommunicationNextFollowUpAt('')
      setCommunicationSuccess('Outreach logged to the timeline.')
    } catch (error) {
      setCommunicationError(error.message || 'Unable to log outreach.')
    } finally {
      setIsLoggingCommunication(false)
    }
  }

  async function handleHandoffSubmit(event) {
    event.preventDefault()
    setHandoffError('')
    setHandoffSuccess('')

    if (!handoffBlocker.trim()) {
      setHandoffError('Enter the blocker or work requested for this handoff.')
      return
    }

    setIsSavingHandoff(true)

    try {
      const actor = currentUser?.displayName || currentUser?.email || session?.username || 'Admissions'
      const handoff = {
        targetTeam: handoffTarget,
        owner: handoffOwner.trim() || handoffTarget,
        priority: handoffPriority,
        status: handoffStatus,
        dueAt: handoffDueAt ? new Date(handoffDueAt).toISOString() : '',
        blocker: handoffBlocker.trim(),
        summary: `${handoffTarget}: ${handoffBlocker.trim()}`,
        actor,
      }
      const savedHandoff = await createStudentHandoff({ studentId, handoff })
      const timelineEvent = {
        id: savedHandoff.id || `handoff-${Date.now()}`,
        type: 'handoff',
        title: `Handoff to ${savedHandoff.targetTeam || handoffTarget}`,
        description: savedHandoff.blocker || handoff.blocker,
        occurredAt: savedHandoff.createdAt || new Date().toISOString(),
        actor,
        source: 'student_360_handoff',
        status: savedHandoff.status || handoffStatus,
      }

      setTimelineEvents((current) => [timelineEvent, ...current])
      setStudentDetail((current) => current ? {
        ...current,
        handoffs: [savedHandoff, ...(Array.isArray(current.handoffs) ? current.handoffs : [])],
      } : current)
      setHandoffBlocker('')
      setHandoffDueAt('')
      setHandoffSuccess('Handoff created.')
    } catch (error) {
      setHandoffError(error.message || 'Unable to create handoff.')
    } finally {
      setIsSavingHandoff(false)
    }
  }

  async function handleMilestoneSave(milestoneId) {
    const draft = milestoneDrafts[milestoneId]
    if (!draft) return

    setMilestoneError('')
    setMilestoneSuccess('')
    setActiveMilestoneId(milestoneId)

    try {
      const definition = postAdmitMilestones.find((item) => item.id === milestoneId)
      const milestone = {
        label: definition?.label || milestoneId,
        status: draft.status,
        owner: draft.owner,
        dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : '',
        blocker: draft.blocker,
      }
      const savedMilestone = await updateStudentMilestone({ studentId, milestoneId, milestone })
      const timelineEvent = {
        id: `milestone-${milestoneId}-${Date.now()}`,
        type: 'post_admit',
        title: `${milestone.label}: ${savedMilestone.status || milestone.status}`,
        description: savedMilestone.blocker || milestone.blocker || '',
        occurredAt: savedMilestone.updatedAt || new Date().toISOString(),
        actor: currentUser?.displayName || currentUser?.email || session?.username || 'Admissions',
        source: 'student_360_post_admit',
        status: savedMilestone.status || milestone.status,
      }

      setTimelineEvents((current) => [timelineEvent, ...current])
      setStudentDetail((current) => {
        if (!current) return current
        const milestones = Array.isArray(current.postAdmitMilestones) ? current.postAdmitMilestones : []
        return {
          ...current,
          postAdmitMilestones: milestones.some((item) => item.id === milestoneId)
            ? milestones.map((item) => item.id === milestoneId ? { ...item, ...savedMilestone } : item)
            : [{ id: milestoneId, ...savedMilestone }, ...milestones],
        }
      })
      setMilestoneSuccess('Milestone updated.')
    } catch (error) {
      setMilestoneError(error.message || 'Unable to update milestone.')
    } finally {
      setActiveMilestoneId('')
    }
  }

  async function handleRecruitmentSubmit(event) {
    event.preventDefault()
    setRecruitmentError('')
    setRecruitmentSuccess('')

    if (!recruitmentSchool.trim() && !recruitmentEventName.trim()) {
      setRecruitmentError('Enter a school, partner, or event name.')
      return
    }

    setIsSavingRecruitmentEvent(true)

    try {
      const actor = currentUser?.displayName || currentUser?.email || session?.username || 'Admissions'
      const eventRecord = {
        territory: recruitmentTerritory,
        school: recruitmentSchool.trim(),
        eventType: recruitmentEventType,
        eventName: recruitmentEventName.trim() || recruitmentEventType,
        notes: recruitmentNotes.trim(),
        occurredAt: recruitmentEventAt ? new Date(recruitmentEventAt).toISOString() : new Date().toISOString(),
        actor,
        outcome: 'attributed',
      }
      const savedEvent = await logRecruitmentEvent({ studentId, event: eventRecord })
      const timelineEvent = {
        id: savedEvent.id || `recruitment-${Date.now()}`,
        type: 'recruitment_event',
        title: savedEvent.eventName || eventRecord.eventName,
        description: savedEvent.notes || savedEvent.description || '',
        occurredAt: savedEvent.occurredAt || eventRecord.occurredAt,
        actor,
        source: savedEvent.territory || recruitmentTerritory,
        status: savedEvent.eventType || recruitmentEventType,
      }

      setTimelineEvents((current) => [timelineEvent, ...current])
      setRecruitmentEventName('')
      setRecruitmentSchool('')
      setRecruitmentNotes('')
      setRecruitmentEventAt('')
      setRecruitmentSuccess('Recruitment activity logged.')
    } catch (error) {
      setRecruitmentError(error.message || 'Unable to log recruitment activity.')
    } finally {
      setIsSavingRecruitmentEvent(false)
    }
  }

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
            <label className="profile-program-field">
              <span>Program</span>
              <select value={getProgramDisplay(student)} onChange={handleProgramChange} disabled={isProgramSaving}>
                {programOptions.map((program) => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>
            </label>
            <span>ID {student.id}</span>
            <span>Source {student.source || 'Not set'}</span>
            <span>Population {student.population || 'Not set'}</span>
            <span>Last activity {student.lastActivity || student.updatedAt || 'Pending'}</span>
            <span>Last contact {formatTimelineTime(student.lastContactedAt || student.last_contacted_at)}</span>
            <span>Next follow-up {formatTimelineTime(student.nextFollowUpAt || student.next_follow_up_at)}</span>
            <span>Next action {getNextBestAction(student)}</span>
          </div>
          {programError ? <p className="auth-error">{programError}</p> : null}
          {programSuccess ? <p className="auth-success">{programSuccess}</p> : null}

          <div className="metric-cluster profile-metrics">
            <div><span>Fit score</span><strong>{hasSensitivityTier('academic_record') ? formatPercentScore(student.fitScore) : '-'}</strong></div>
            <div><span>Deposit likelihood</span><strong>{formatPercentScore(student.depositLikelihood)}</strong></div>
            <div><span>Accepted credits</span><strong>{hasSensitivityTier('academic_record') ? (student.creditsAccepted ?? '-') : '-'}</strong></div>
            <div><span>Advisor</span><strong>{student.advisor || 'Unassigned'}</strong></div>
          </div>
        </article>

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
              <AreaChart data={academicTermRows}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="term" />
                <YAxis domain={[0, 4]} />
                <Tooltip />
                <Area type="monotone" dataKey="gpa" stroke="#18B7A6" fill="#18B7A622" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mini-table academic-term-table">
            <div className="mini-table-head">
              <span>Term</span><span>GPA</span><span>Credits</span>
            </div>
            {academicTermRows.map((row) => (
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

        {testScoreRows.length ? (
          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Test scores</h3>
                <p>ACT and SAT scores supplied with the student record.</p>
              </div>
            </div>
            <SensitivityGuard tier="academic_record" fallback={<p className="muted-copy">Test score details are hidden for your access level.</p>}>
            <div className="mini-table test-score-table">
              <div className="mini-table-head">
                <span>Test</span><span>Section</span><span>Score</span><span>Date</span>
              </div>
              {testScoreRows.map((row) => (
                <div key={row.id} className="mini-table-row">
                  <span>{row.test}</span>
                  <span>{row.section}</span>
                  <span>{row.score}</span>
                  <span>{row.date}</span>
                </div>
              ))}
            </div>
            </SensitivityGuard>
          </article>
        ) : null}

        {transcriptCourseRows.length ? (
        <article className="panel equivalency-card">
          <div className="panel-header">
            <div>
              <h3>Course equivalency</h3>
              <p>Catalog mapping for {getProgramDisplay(student)} using transcript courses.</p>
            </div>
            <div className="equivalency-header-actions">
              <div className="equivalency-credit-summary" aria-label="Equivalency credit summary">
                <div><span>Might transfer</span><strong>{formatCredits(equivalencyCreditSummary.likelyTransferable)}</strong></div>
                <div><span>Likely won't</span><strong>{formatCredits(equivalencyCreditSummary.likelyNotTransferable)}</strong></div>
              </div>
              <button type="button" className="secondary-button" onClick={loadEquivalencies} disabled={isEquivalencyLoading}>
                {isEquivalencyLoading ? 'Looking up...' : 'Refresh catalog map'}
              </button>
            </div>
          </div>
          <SensitivityGuard tier="academic_record" fallback={<p className="muted-copy">Course equivalency details are hidden for your access level.</p>}>
            {equivalencyError ? <p className="auth-error">{equivalencyError}</p> : null}
            {equivalencyStatus ? <p className="muted-copy">{equivalencyStatus}</p> : null}
            {isEquivalencyLoading && !equivalencyRows.length ? <p className="muted-copy">Checking the course catalog...</p> : null}
            {equivalencyRows.length ? (
              <div className="table-wrap equivalency-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Transcript course</th>
                      <th>Credits</th>
                      <th>Catalog course</th>
                      <th>Degree requirement</th>
                      <th>Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equivalencyRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.sourceCourse}</strong>
                          <div className="table-sub">{row.sourceTitle}</div>
                        </td>
                        <td>{formatCredits(row.credits)}</td>
                        <td>
                          <strong>{row.catalogCourse}</strong>
                          {row.catalogTitle ? <div className="table-sub">{row.catalogTitle}</div> : null}
                        </td>
                        <td>{row.requirement}</td>
                        <td>
                          <span className="badge neutral-badge">{row.confidence}</span>
                          {row.rationale ? <div className="table-sub">{row.rationale}</div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !isEquivalencyLoading ? (
              <p className="muted-copy">No course equivalency rows are available yet.</p>
            ) : null}
          </SensitivityGuard>
        </article>
        ) : null}
      </section>
      ) : null}

      {activeTab === 'application' ? (
        <section className="dashboard-grid profile-grid student360-summary-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Application status</h3>
                <p>Current application state, completion, and next step for admissions review.</p>
              </div>
              <span className="badge neutral-badge">{applicationSummary.status}</span>
            </div>
            <div className="metric-cluster profile-metrics">
              <div><span>Status</span><strong>{applicationSummary.status}</strong></div>
              <div><span>Completion</span><strong>{applicationSummary.completion}</strong></div>
              <div><span>Submitted</span><strong>{applicationSummary.submittedAt}</strong></div>
              <div><span>Term</span><strong>{applicationSummary.term}</strong></div>
            </div>
            <div className="callout-card">
              <h4>Next application step</h4>
              <p>{applicationSummary.nextStep}</p>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Application information</h3>
                <p>Applicant, program, term, and application metadata in one place.</p>
              </div>
              <span className="badge neutral-badge">{applicationSummary.type}</span>
            </div>
            <div className="stack-list">
              <div className="stack-row"><strong>Application ID</strong><span>{applicationSummary.applicationId}</span></div>
              <div className="stack-row"><strong>Applicant type</strong><span>{applicationSummary.applicantType}</span></div>
              <div className="stack-row"><strong>Student type</strong><span>{applicationSummary.studentType}</span></div>
              <div className="stack-row"><strong>Program</strong><span>{applicationSummary.program}</span></div>
              <div className="stack-row"><strong>Campus</strong><span>{applicationSummary.campus}</span></div>
              <div className="stack-row"><strong>Delivery</strong><span>{applicationSummary.delivery}</span></div>
              <div className="stack-row"><strong>Residency</strong><span>{applicationSummary.residency}</span></div>
              <div className="stack-row"><strong>Started</strong><span>{applicationSummary.startedAt}</span></div>
            </div>
          </article>

          <article className="panel checklist-panel">
            <div className="panel-header">
              <div>
                <h3>Application requirements</h3>
                <p>Items still controlling whether the file can move forward.</p>
              </div>
              <span className="badge neutral-badge">{applicationSummary.completedCount}/{applicationSummary.totalRequired}</span>
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
              {(applicationSummary.missingItems.length ? applicationSummary.missingItems : checklistStats.items.slice(0, 4)).map((item) => (
                <div key={item.id || item.label} className="check-row">
                  {item.done ? <CheckCircle2 size={18} /> : <CircleDot size={18} />}
                  <span>{item.label}</span>
                  <span className={`badge ${getChecklistStatusClass(item.status)}`}>
                    {getChecklistStatusLabel(item.status)}
                  </span>
                </div>
              ))}
              {!checklistStats.items.length ? <p className="muted-copy">No application requirements are available yet.</p> : null}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === 'financial_aid' ? (
        <section className="dashboard-grid profile-grid student360-summary-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Financial aid status</h3>
                <p>Whether the student is using aid and where the aid package stands.</p>
              </div>
              <span className="badge neutral-badge">{financialAidSummary.usingAid}</span>
            </div>
            <div className="metric-cluster profile-metrics">
              <div><span>Using aid</span><strong>{financialAidSummary.usingAid}</strong></div>
              <div><span>Aid status</span><strong>{financialAidSummary.aidStatus}</strong></div>
              <div><span>Package</span><strong>{financialAidSummary.packageStatus}</strong></div>
              <div><span>Estimated aid</span><strong>{financialAidSummary.estimatedAid}</strong></div>
            </div>
            <div className="callout-card">
              <h4>Financial aid next step</h4>
              <p>{financialAidSummary.nextStep}</p>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>FAFSA details</h3>
                <p>FAFSA receipt, aid year, dependency, and verification context.</p>
              </div>
              <span className="badge neutral-badge">{financialAidSummary.fafsaStatus}</span>
            </div>
            <div className="stack-list">
              <div className="stack-row"><strong>FAFSA status</strong><span>{financialAidSummary.fafsaStatus}</span></div>
              <div className="stack-row"><strong>Received</strong><span>{financialAidSummary.fafsaReceivedAt}</span></div>
              <div className="stack-row"><strong>Aid year</strong><span>{financialAidSummary.aidYear}</span></div>
              <div className="stack-row"><strong>SAI / EFC</strong><span>{financialAidSummary.sai}</span></div>
              <div className="stack-row"><strong>Dependency</strong><span>{financialAidSummary.dependencyStatus}</span></div>
              <div className="stack-row"><strong>Verification</strong><span>{financialAidSummary.verificationStatus}</span></div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Aid and scholarship</h3>
                <p>Financial aid package and scholarship readiness for enrollment follow-through.</p>
              </div>
              <span className="badge neutral-badge">{financialAidSummary.scholarshipStatus}</span>
            </div>
            <div className="stack-list">
              <div className="stack-row"><strong>Package status</strong><span>{financialAidSummary.packageStatus}</span></div>
              <div className="stack-row"><strong>Estimated aid</strong><span>{financialAidSummary.estimatedAid}</span></div>
              <div className="stack-row"><strong>Scholarship status</strong><span>{financialAidSummary.scholarshipStatus}</span></div>
              <div className="stack-row"><strong>Scholarship amount</strong><span>{financialAidSummary.scholarshipAmount}</span></div>
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === 'scholarships' ? (
        <section className="dashboard-grid profile-grid student360-summary-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Scholarship options</h3>
                <p>Catalog scholarship matches using application, aid, transcript, and course equivalency evidence.</p>
              </div>
              <span className="badge neutral-badge">{scholarshipMatches.length} options</span>
            </div>
            <div className="metric-cluster profile-metrics">
              <div><span>Top match</span><strong>{scholarshipMatches[0]?.name || 'No matches'}</strong></div>
              <div><span>Offered total</span><strong>{scholarshipOfferSummary.totalAmount ? formatCurrency(scholarshipOfferSummary.totalAmount) : '-'}</strong></div>
              <div><span>Institutional offers</span><strong>{scholarshipOfferSummary.institutional}</strong></div>
              <div><span>External offers</span><strong>{scholarshipOfferSummary.external}</strong></div>
            </div>
            <div className="callout-card">
              <h4>Governed AI scholarship context</h4>
              <p>{isEquivalencyLoading ? 'Refreshing catalog course evidence before ranking scholarship options.' : 'Matches use the same transcript-to-catalog evidence shown in Overview, plus FAFSA and application signals when available.'}</p>
              {equivalencyError ? <p>{equivalencyError}</p> : null}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Match signals</h3>
                <p>What the scholarship matcher knows about this student right now.</p>
              </div>
              <span className="badge neutral-badge">{getProgramDisplay(student)}</span>
            </div>
            <div className="stack-list">
              <div className="stack-row"><strong>Program</strong><span>{getProgramDisplay(student)}</span></div>
              <div className="stack-row"><strong>Overall GPA</strong><span>{academicSummary.overallGpa}</span></div>
              <div className="stack-row"><strong>Financial aid</strong><span>{financialAidSummary.usingAid}</span></div>
              <div className="stack-row"><strong>FAFSA</strong><span>{financialAidSummary.fafsaStatus}</span></div>
              <div className="stack-row"><strong>Course catalog evidence</strong><span>{equivalencyRows.length ? `${equivalencyRows.length} mapped course row${equivalencyRows.length === 1 ? '' : 's'}` : 'Pending catalog map'}</span></div>
            </div>
          </article>

          <article className="panel checklist-panel">
            <div className="panel-header">
              <div>
                <h3>Scholarships offered</h3>
                <p>Institutional and external awards already offered or known for this student.</p>
              </div>
              <span className="badge neutral-badge">{scholarshipOffers.length} tracked</span>
            </div>
            <div className="metric-cluster profile-metrics">
              <div><span>Accepted / awarded</span><strong>{scholarshipOfferSummary.accepted}</strong></div>
              <div><span>Pending / offered</span><strong>{scholarshipOfferSummary.pending}</strong></div>
              <div><span>Institutional</span><strong>{scholarshipOfferSummary.institutional}</strong></div>
              <div><span>External</span><strong>{scholarshipOfferSummary.external}</strong></div>
            </div>
            <div className="stack-list">
              {scholarshipOffers.map((offer) => (
                <div key={offer.id} className="stack-row handoff-stack-row">
                  <strong>{offer.name}</strong>
                  <span>{offer.amount} - {offer.status} - {offer.sourceType}</span>
                  <small>{offer.provider} - Offered {offer.offeredAt} - {offer.renewable}</small>
                  <small><strong>Requirements:</strong> {offer.requirements}</small>
                  {offer.notes ? <small>{offer.notes}</small> : null}
                </div>
              ))}
              {!scholarshipOffers.length ? <p className="muted-copy">No offered scholarships are tracked for this student yet.</p> : null}
            </div>
          </article>

          <article className="panel checklist-panel">
            <div className="panel-header">
              <div>
                <h3>Ranked scholarship matches</h3>
                <p>Each option explains what matched and what still needs confirmation.</p>
              </div>
            </div>
            <div className="stack-list">
              {scholarshipMatches.map((scholarship) => (
                <div key={scholarship.id} className="stack-row handoff-stack-row">
                  <strong>{scholarship.name}</strong>
                  <span>{scholarship.amount} - {scholarship.status} - {scholarship.matchScore}% match</span>
                  <small>{scholarship.description}</small>
                  <small><strong>Evidence:</strong> {scholarship.evidence.join(' ')}</small>
                  {scholarship.missing.length ? <small><strong>Needs:</strong> {scholarship.missing.join(', ')}</small> : null}
                  <small><strong>Next:</strong> {scholarship.action}</small>
                </div>
              ))}
              {!scholarshipMatches.length ? <p className="muted-copy">No scholarship options are available for this student yet.</p> : null}
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
            <form className="student-activity-composer" onSubmit={handleInteractionSubmit}>
              <div className="student-activity-grid">
                <label className="auth-field compact-field">
                  <span>Activity</span>
                  <select value={interactionType} onChange={(event) => setInteractionType(event.target.value)}>
                    {interactionTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </label>
                <label className="auth-field compact-field">
                  <span>Outcome</span>
                  <select value={interactionOutcome} onChange={(event) => setInteractionOutcome(event.target.value)}>
                    {interactionOutcomes.map((outcome) => (
                      <option key={outcome.value} value={outcome.value}>{outcome.label}</option>
                    ))}
                  </select>
                </label>
                <label className="auth-field compact-field">
                  <span>Next follow-up</span>
                  <input type="datetime-local" value={interactionNextFollowUpAt} onChange={(event) => setInteractionNextFollowUpAt(event.target.value)} />
                </label>
              </div>
              <label className="auth-field">
                <span>Note</span>
                <textarea value={interactionNote} onChange={(event) => setInteractionNote(event.target.value)} placeholder="Summarize the call, text, email, meeting, family conversation, or next step." />
              </label>
              <label className="auth-field">
                <span>Next action</span>
                <input value={interactionNextAction} onChange={(event) => setInteractionNextAction(event.target.value)} placeholder="Request transcript, answer aid question, schedule advising handoff..." />
              </label>
              {interactionError ? <p className="auth-error">{interactionError}</p> : null}
              {interactionSuccess ? <p className="auth-success">{interactionSuccess}</p> : null}
              <div className="password-actions">
                <button type="submit" className="primary-button" disabled={isSavingInteraction}>
                  {isSavingInteraction ? 'Saving...' : 'Add activity'}
                </button>
              </div>
            </form>
            <div className="pill-row compact">
              {['all', 'communication', 'interaction', 'handoff', 'post_admit', 'recruitment_event', 'transcript', 'checklist', 'readiness', 'decision', 'inquiry'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`tag ${timelineFilter === filter ? 'active-tag' : ''}`}
                  onClick={() => setTimelineFilter(filter)}
                >
                  {filter === 'all' ? 'All activity' : filter}
                </button>
              ))}
            </div>
            <div className="timeline-list student360-timeline">
              {filteredTimelineEvents.map((event) => (
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
              {!filteredTimelineEvents.length ? <p className="muted-copy">No timeline events are available for this filter.</p> : null}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === 'outreach' ? (
        <section className="dashboard-grid profile-grid outreach-grid">
          <article className="panel outreach-composer-panel">
            <div className="panel-header">
              <div>
                <h3>Outreach</h3>
                <p>Template, personalize, and log counselor follow-up.</p>
              </div>
              <span className="badge neutral-badge">{programName}</span>
            </div>
            <form className="student-activity-composer outreach-composer" onSubmit={handleCommunicationSubmit}>
              <div className="student-activity-grid">
                <label className="auth-field compact-field">
                  <span>Template</span>
                  <select value={communicationTemplateKey} onChange={(event) => setCommunicationTemplateKey(event.target.value)}>
                    {communicationTemplates.map((template) => (
                      <option key={template.key} value={template.key}>{template.label}</option>
                    ))}
                  </select>
                </label>
                <label className="auth-field compact-field">
                  <span>Channel</span>
                  <select value={communicationChannel} onChange={(event) => setCommunicationChannel(event.target.value)}>
                    {communicationChannels.map((channel) => (
                      <option key={channel.value} value={channel.value}>{channel.label}</option>
                    ))}
                  </select>
                </label>
                <label className="auth-field compact-field">
                  <span>Next follow-up</span>
                  <input type="datetime-local" value={communicationNextFollowUpAt} onChange={(event) => setCommunicationNextFollowUpAt(event.target.value)} />
                </label>
              </div>
              <label className="auth-field">
                <span>Subject</span>
                <input value={communicationSubject} onChange={(event) => setCommunicationSubject(event.target.value)} />
              </label>
              <label className="auth-field">
                <span>Draft</span>
                <textarea value={communicationDraft} onChange={(event) => setCommunicationDraft(event.target.value)} />
              </label>
              {communicationError ? <p className="auth-error">{communicationError}</p> : null}
              {communicationSuccess ? <p className="auth-success">{communicationSuccess}</p> : null}
              <div className="password-actions">
                <button type="submit" className="primary-button" disabled={isLoggingCommunication}>
                  {isLoggingCommunication ? 'Logging...' : 'Log outreach'}
                </button>
              </div>
            </form>
          </article>

          <article className="panel outreach-history-panel">
            <div className="panel-header">
              <div>
                <h3>Communication history</h3>
                <p>Logged outreach for this student.</p>
              </div>
              <span className="badge neutral-badge">{communicationHistoryRows.length}</span>
            </div>
            <div className="communication-history-list">
              {communicationHistoryRows.map((item) => (
                <div key={item.id} className="communication-history-row">
                  <div className="timeline-top">
                    <div>
                      <h4>{item.subject || item.title || 'Outreach'}</h4>
                      <p>{item.message || item.description || item.note}</p>
                    </div>
                    <span className="badge neutral-badge">{item.channel || item.templateLabel || item.status || 'logged'}</span>
                  </div>
                  <div className="timeline-meta">
                    <span>{formatTimelineTime(item.occurredAt)}</span>
                    {item.actor ? <span>{item.actor}</span> : null}
                    {item.templateLabel ? <span>{item.templateLabel}</span> : null}
                    {item.nextFollowUpAt ? <span>Follow-up {formatTimelineTime(item.nextFollowUpAt)}</span> : null}
                  </div>
                </div>
              ))}
              {!communicationHistoryRows.length ? <p className="muted-copy">No outreach has been logged yet.</p> : null}
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
        <section className="dashboard-grid profile-grid">
          <article className="panel">
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
              <div><span>Readiness</span><strong>{milestoneSummary.percent}%</strong></div>
            </div>
            <div className="callout-card">
              <h4>Post-admit blockers</h4>
              <p>{milestoneSummary.blocked ? `${milestoneSummary.blocked} milestone${milestoneSummary.blocked === 1 ? '' : 's'} blocked.` : 'No blocked post-admit milestones are currently marked.'}</p>
              <p><strong>Next:</strong> {student.recommendation?.nextBestAction || student.nextBestAction || 'Review next enrollment step'}</p>
            </div>
          </article>

          <article className="panel post-admit-panel">
            <div className="panel-header">
              <div>
                <h3>Post-admit readiness</h3>
                <p>Financial aid, housing, orientation, advising, registration, and account milestones.</p>
              </div>
              <span className="badge neutral-badge">{milestoneSummary.complete}/{milestoneSummary.total}</span>
            </div>
            {milestoneError ? <p className="auth-error">{milestoneError}</p> : null}
            {milestoneSuccess ? <p className="auth-success">{milestoneSuccess}</p> : null}
            <div className="milestone-list">
              {postAdmitMilestoneRows.map((row) => {
                const draft = milestoneDrafts[row.id] || row
                return (
                  <div key={row.id} className="milestone-row">
                    <div>
                      <h4>{row.label}</h4>
                      <p>{row.owner}</p>
                    </div>
                    <label className="auth-field compact-field">
                      <span>Status</span>
                      <select
                        value={draft.status}
                        onChange={(event) => setMilestoneDrafts((current) => ({
                          ...current,
                          [row.id]: { ...(current[row.id] || row), status: event.target.value },
                        }))}
                      >
                        {milestoneStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                    <label className="auth-field compact-field">
                      <span>Owner</span>
                      <input
                        value={draft.owner}
                        onChange={(event) => setMilestoneDrafts((current) => ({
                          ...current,
                          [row.id]: { ...(current[row.id] || row), owner: event.target.value },
                        }))}
                      />
                    </label>
                    <label className="auth-field compact-field">
                      <span>Due</span>
                      <input
                        type="date"
                        value={draft.dueAt ? String(draft.dueAt).slice(0, 10) : ''}
                        onChange={(event) => setMilestoneDrafts((current) => ({
                          ...current,
                          [row.id]: { ...(current[row.id] || row), dueAt: event.target.value },
                        }))}
                      />
                    </label>
                    <label className="auth-field compact-field">
                      <span>Blocker</span>
                      <input
                        value={draft.blocker || ''}
                        onChange={(event) => setMilestoneDrafts((current) => ({
                          ...current,
                          [row.id]: { ...(current[row.id] || row), blocker: event.target.value },
                        }))}
                      />
                    </label>
                    <button type="button" className="secondary-button" onClick={() => handleMilestoneSave(row.id)} disabled={activeMilestoneId === row.id}>
                      {activeMilestoneId === row.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )
              })}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === 'handoff' ? (
        <section className="dashboard-grid profile-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Create handoff</h3>
                <p>Route student work to admissions operations, reviewers, financial aid, registrar, advising, housing, or bursar teams.</p>
              </div>
            </div>
            <form className="student-activity-composer" onSubmit={handleHandoffSubmit}>
              <div className="student-activity-grid">
                <label className="auth-field compact-field">
                  <span>Target</span>
                  <select value={handoffTarget} onChange={(event) => setHandoffTarget(event.target.value)}>
                    {handoffTargets.map((target) => <option key={target} value={target}>{target}</option>)}
                  </select>
                </label>
                <label className="auth-field compact-field">
                  <span>Priority</span>
                  <select value={handoffPriority} onChange={(event) => setHandoffPriority(event.target.value)}>
                    {handoffPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </select>
                </label>
                <label className="auth-field compact-field">
                  <span>Status</span>
                  <select value={handoffStatus} onChange={(event) => setHandoffStatus(event.target.value)}>
                    {handoffStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              </div>
              <div className="student-activity-grid">
                <label className="auth-field compact-field">
                  <span>Owner</span>
                  <input value={handoffOwner} onChange={(event) => setHandoffOwner(event.target.value)} placeholder="Team member or queue" />
                </label>
                <label className="auth-field compact-field">
                  <span>Due</span>
                  <input type="datetime-local" value={handoffDueAt} onChange={(event) => setHandoffDueAt(event.target.value)} />
                </label>
              </div>
              <label className="auth-field">
                <span>Blocker / request</span>
                <textarea value={handoffBlocker} onChange={(event) => setHandoffBlocker(event.target.value)} placeholder="Summarize the blocker, owner request, and expected outcome." />
              </label>
              {handoffError ? <p className="auth-error">{handoffError}</p> : null}
              {handoffSuccess ? <p className="auth-success">{handoffSuccess}</p> : null}
              <div className="password-actions">
                <button type="submit" className="primary-button" disabled={isSavingHandoff}>
                  {isSavingHandoff ? 'Creating...' : 'Create handoff'}
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Handoff queue</h3>
                <p>Open ownership, due dates, and blockers for this student.</p>
              </div>
              <span className="badge neutral-badge">{handoffRows.length}</span>
            </div>
            <div className="stack-list">
              <div className="stack-row"><strong>Admissions ready</strong><span>{checklistStats.completionPercent === 100 ? 'Yes' : 'Not yet'}</span></div>
              <div className="stack-row"><strong>Decision readiness</strong><span>{readiness.label}</span></div>
              {handoffRows.map((handoff) => (
                <div key={handoff.id} className="stack-row handoff-stack-row">
                  <strong>{handoff.targetTeam || 'Handoff'}</strong>
                  <span>{handoff.owner || 'Unassigned'} - {handoff.status || 'Open'} - {handoff.dueAt ? formatTimelineTime(handoff.dueAt) : 'No due date'}</span>
                  {handoff.blocker ? <small>{handoff.blocker}</small> : null}
                </div>
              ))}
              {!handoffRows.length ? <div className="stack-row"><strong>No active handoffs</strong><span>Create one when downstream ownership is needed.</span></div> : null}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === 'recruitment' ? (
        <section className="dashboard-grid profile-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Recruitment source</h3>
                <p>Territory, school, partner, and event attribution for pre-application work.</p>
              </div>
            </div>
            <form className="student-activity-composer" onSubmit={handleRecruitmentSubmit}>
              <div className="student-activity-grid">
                <label className="auth-field compact-field">
                  <span>Territory</span>
                  <select value={recruitmentTerritory} onChange={(event) => setRecruitmentTerritory(event.target.value)}>
                    {territoryOptions.map((territory) => <option key={territory} value={territory}>{territory}</option>)}
                  </select>
                </label>
                <label className="auth-field compact-field">
                  <span>Event type</span>
                  <select value={recruitmentEventType} onChange={(event) => setRecruitmentEventType(event.target.value)}>
                    {recruitmentEventTypes.map((eventType) => <option key={eventType} value={eventType}>{eventType}</option>)}
                  </select>
                </label>
                <label className="auth-field compact-field">
                  <span>Date</span>
                  <input type="datetime-local" value={recruitmentEventAt} onChange={(event) => setRecruitmentEventAt(event.target.value)} />
                </label>
              </div>
              <label className="auth-field">
                <span>School / partner</span>
                <input value={recruitmentSchool} onChange={(event) => setRecruitmentSchool(event.target.value)} placeholder="High school, community college, employer, or partner" />
              </label>
              <label className="auth-field">
                <span>Event name</span>
                <input value={recruitmentEventName} onChange={(event) => setRecruitmentEventName(event.target.value)} placeholder="Spring transfer fair, open house, webinar..." />
              </label>
              <label className="auth-field">
                <span>Notes</span>
                <textarea value={recruitmentNotes} onChange={(event) => setRecruitmentNotes(event.target.value)} placeholder="Attribution details, counselor travel notes, or student follow-up context." />
              </label>
              {recruitmentError ? <p className="auth-error">{recruitmentError}</p> : null}
              {recruitmentSuccess ? <p className="auth-success">{recruitmentSuccess}</p> : null}
              <div className="password-actions">
                <button type="submit" className="primary-button" disabled={isSavingRecruitmentEvent}>
                  {isSavingRecruitmentEvent ? 'Logging...' : 'Log recruitment activity'}
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Recruitment history</h3>
                <p>Events and source attribution tied to this student.</p>
              </div>
              <span className="badge neutral-badge">{recruitmentEvents.length}</span>
            </div>
            <div className="stack-list">
              <div className="stack-row"><strong>Current territory</strong><span>{student.territory || recruitmentTerritory}</span></div>
              <div className="stack-row"><strong>Source school</strong><span>{student.sourceSchool || student.partnerSchool || recruitmentSchool || 'Not set'}</span></div>
              {recruitmentEvents.map((event) => (
                <div key={event.id} className="stack-row">
                  <strong>{event.eventName || event.title}</strong>
                  <span>{event.eventType || 'Recruitment event'} - {event.territory || 'No territory'} - {formatTimelineTime(event.occurredAt)}</span>
                </div>
              ))}
              {!recruitmentEvents.length ? <div className="stack-row"><strong>No recruitment events</strong><span>Log an event to connect this student to a source, territory, or partner.</span></div> : null}
            </div>
          </article>
        </section>
      ) : null}

      {selectedTranscript ? (
        <div className="modal-scrim" onClick={() => setSelectedTranscript(null)} role="presentation">
          <div className="modal-panel transcript-course-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
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
                        <th>Subject</th>
                        <th>Course ID</th>
                        <th>Course title</th>
                        <th>Course #</th>
                        <th>Credits</th>
                        <th>Grade</th>
                        <th>Term</th>
                        <th>Year</th>                        
                        <th>Rigor</th>
                        <th>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTranscript.courses.map((course, index) => (
                        <tr key={`${selectedTranscript.id}-${getCourseId(course)}-${getCourseValue(course, ['term'], '')}-${getCourseValue(course, ['year'], '')}-${index}`}>
                          <td>{getCourseSubject(course) || '-'}</td>
                          <td><strong>{getCourseId(course) || '-'}</strong></td>
                          <td>{getCourseTitle(course) || '-'}</td>
                          <td>{getCourseNumber(course) || '-'}</td>
                          <td>{formatCredits(getCourseCredits(course))}</td>
                          <td>{course.grade || '-'}</td>
                          <td>{getCourseValue(course, ['term'], '-')}</td>
                          <td>{getCourseValue(course, ['year'], '-')}</td>                          
                          <td>{getCourseValue(course, ['rigor'], '-') || '-'}</td>
                          <td>{formatConfidence(getCourseConfidence(course))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="transcript-pdf-section">
                    <div className="panel-header">
                      <div>
                        <h3>Transcript document</h3>
                        <p>Original PDF shown below the extracted course rows when a viewable document URL is available.</p>
                      </div>
                    </div>
                    {isLoadingDocumentViewer ? (
                      <div className="callout-card">
                        <h4>Loading document</h4>
                        <p>Fetching the uploaded PDF for this tenant.</p>
                      </div>
                    ) : documentViewerUrl ? (
                      <iframe
                        className="transcript-pdf-viewer"
                        src={documentViewerUrl}
                        title={`${selectedTranscript.institution || selectedTranscript.source || 'Transcript'} PDF`}
                      />
                    ) : (
                      <div className="callout-card">
                        <h4>PDF not available in this payload</h4>
                        <p>{documentViewerError || 'The parsed results include extracted course data, but no uploaded document content is available for this transcript.'}</p>
                        {getTranscriptDocumentUploadId(selectedTranscript) ? <p><strong>Document upload ID:</strong> {getTranscriptDocumentUploadId(selectedTranscript)}</p> : null}
                      </div>
                    )}
                  </div>
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
