import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { CHECKLIST_STATUSES, LEGACY_STAGE_LABELS, PIPELINE_STATUSES, normalizePipelineStatus } from '../lib/admissionsWorkflow'
import { uploadStoredDocument } from '../lib/documentStorage'
import { classifyStudentDocument, isTranscriptDocumentType } from '../lib/studentDocumentTypes'
import { getChecklistErrorMessage, getChecklistItemStatusUrl, getChecklistUrl } from '../lib/workApi'

const StudentRecordsContext = createContext(null)
const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const transcriptUploadUrl = `${apiBaseUrl}/api/v1/transcripts/uploads`
const studentsUrl = `${apiBaseUrl}/api/v1/students`
const pollIntervalMs = 1500
const cachedStudentDocumentsKey = 'crtfyStudent.cachedStudentDocuments.v1'

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')
}

function formatNumber(value, digits = 2) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : 0
}

function formatPercent(value, digits = 1) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  const percent = numeric <= 1 ? numeric * 100 : numeric
  return Number(percent.toFixed(digits))
}

function firstPositiveNumber(...values) {
  return values.find((value) => {
    const numeric = Number(value)
    return Number.isFinite(numeric) && numeric > 0
  })
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function readCachedStudentDocuments() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(cachedStudentDocumentsKey) || '{}')
  } catch {
    return {}
  }
}

function getStudentDocumentCacheKey(tenantId, studentId) {
  return `${tenantId || 'default'}:${studentId}`
}

function getCachedStudentDocuments(tenantId, studentId) {
  const cache = readCachedStudentDocuments()
  const rows = cache[getStudentDocumentCacheKey(tenantId, studentId)]
  return Array.isArray(rows) ? rows : []
}

function cacheStudentDocument(tenantId, studentId, document) {
  if (typeof window === 'undefined' || !studentId || !document) return
  const cache = readCachedStudentDocuments()
  const key = getStudentDocumentCacheKey(tenantId, studentId)
  const current = Array.isArray(cache[key]) ? cache[key] : []
  cache[key] = [
    document,
    ...current.filter((item) => String(item.id || item.documentId || item.documentUploadId) !== String(document.id || document.documentId || document.documentUploadId)),
  ].slice(0, 80)
  window.localStorage.setItem(cachedStudentDocumentsKey, JSON.stringify(cache))
}

async function parseApiPayload(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

function getApiErrorMessage(response, payload, fallback) {
  if (response.status === 401) return 'Your session is not authorized for transcript uploads.'
  return payload?.message || payload?.detail || payload?.error || fallback
}

function getStudentsErrorMessage(response, payload) {
  if (response.status === 401) return 'Your session is no longer valid. Please sign in again.'
  if (response.status === 403) return 'Your account is not authorized for this tenant.'
  return payload?.detail || payload?.message || 'Unable to load students.'
}

function normalizeChecklistPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.checklist)) return payload.checklist
  if (Array.isArray(payload?.checklist?.items)) return payload.checklist.items
  return []
}

function normalizeStudentValue(value, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    if (typeof value.name === 'string') return value.name
    if (typeof value.label === 'string') return value.label
    if (typeof value.title === 'string') return value.title
  }
  return fallback
}

function normalizeStudentBoolean(value, fallback = false) {
  if (value === true || value === false) return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', 'yes', 'y', '1', 'opted_in', 'opted-in'].includes(normalized)) return true
    if (['false', 'no', 'n', '0', 'opted_out', 'opted-out'].includes(normalized)) return false
  }
  return fallback
}

function normalizeStudentsPayload(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.students)
        ? payload.students
        : []

  return items.map((student) => ({
    ...student,
    id: student?.id || student?.studentId,
    name: normalizeStudentValue(student?.name || student?.fullName || student?.displayName, ''),
    preferredName: normalizeStudentValue(student?.preferredName || student?.preferred_name || student?.nickname, ''),
    email: normalizeStudentValue(student?.email, ''),
    phone: normalizeStudentValue(student?.phone, ''),
    smsOptIn: normalizeStudentBoolean(student?.smsOptIn ?? student?.sms_opt_in ?? student?.textingOk ?? student?.texting_ok ?? student?.textConsent ?? student?.text_consent, false),
    addressLine1: normalizeStudentValue(student?.addressLine1 || student?.address_line1 || student?.address?.line1 || student?.address?.street, ''),
    addressLine2: normalizeStudentValue(student?.addressLine2 || student?.address_line2 || student?.address?.line2, ''),
    city: normalizeStudentValue(student?.city || student?.address?.city, ''),
    state: normalizeStudentValue(student?.state || student?.address?.state || student?.address?.region, ''),
    postalCode: normalizeStudentValue(student?.postalCode || student?.postal_code || student?.zip || student?.address?.postalCode || student?.address?.postal_code, ''),
    parentName: normalizeStudentValue(student?.parentName || student?.parent_name || student?.guardianName || student?.guardian_name || student?.parentGuardian?.name, ''),
    parentRelationship: normalizeStudentValue(student?.parentRelationship || student?.parent_relationship || student?.guardianRelationship || student?.guardian_relationship || student?.parentGuardian?.relationship, ''),
    parentEmail: normalizeStudentValue(student?.parentEmail || student?.parent_email || student?.guardianEmail || student?.guardian_email || student?.parentGuardian?.email, ''),
    parentPhone: normalizeStudentValue(student?.parentPhone || student?.parent_phone || student?.guardianPhone || student?.guardian_phone || student?.parentGuardian?.phone, ''),
    notes: normalizeStudentValue(student?.notes || student?.internalNotes || student?.internal_notes, ''),
    program: normalizeStudentValue(student?.program, 'Program pending'),
    programInterest: normalizeStudentValue(student?.programInterest || student?.program_interest, ''),
    termInterest: normalizeStudentValue(student?.termInterest || student?.term_interest, ''),
    institutionGoal: normalizeStudentValue(student?.institutionGoal, ''),
    advisor: normalizeStudentValue(student?.owner || student?.advisor || student?.assignedOwner, 'Unassigned'),
    ownerId: student?.owner?.id || student?.advisorId || student?.ownerId || student?.assignedOwner?.id || '',
    population: normalizeStudentValue(student?.population || student?.studentType, ''),
    source: normalizeStudentValue(student?.source || student?.leadSource || student?.sourceReference, ''),
    sourceCategory: normalizeStudentValue(student?.sourceCategory || student?.source_category, ''),
    campaign: normalizeStudentValue(student?.campaign || student?.campaignName, ''),
    risk: normalizeStudentValue(student?.risk, 'Low'),
    stage: normalizePipelineStatus(student?.stage || student?.lifecycleStage || student?.lifecycle_stage),
    nextBestAction: normalizeStudentValue(student?.nextBestAction || student?.next_best_action || student?.suggestedAction?.label, ''),
    documents: Array.isArray(student?.documents) ? student.documents : Array.isArray(student?.studentDocuments) ? student.studentDocuments : [],
  }))
}

function normalizeStudentDetailPayload(payload) {
  if (!payload || typeof payload !== 'object') return null
  const student = payload.student && typeof payload.student === 'object' ? payload.student : payload
  return normalizeStudentsPayload([student])[0] || null
}

function buildCreatedStudent(input) {
  const firstName = normalizeStudentValue(input.firstName || input.first_name, '').trim()
  const lastName = normalizeStudentValue(input.lastName || input.last_name, '').trim()
  const name = normalizeStudentValue(input.name, '').trim() || [firstName, lastName].filter(Boolean).join(' ').trim()
  const email = normalizeStudentValue(input.email, '').trim()
  const createdAt = new Date().toISOString()

  return normalizeStudentDetailPayload({
    id: normalizeStudentValue(input.id || input.studentId || input.student_id, '').trim() || `STU-${Date.now()}`,
    studentId: normalizeStudentValue(input.studentId || input.student_id || input.id, '').trim(),
    firstName,
    lastName,
    name: name || email || 'New Student',
    preferredName: firstName,
    email,
    phone: normalizeStudentValue(input.phone, '').trim(),
    program: normalizeStudentValue(input.program || input.programInterest || input.program_interest, 'Program pending').trim(),
    programInterest: normalizeStudentValue(input.programInterest || input.program_interest || input.program, '').trim(),
    termInterest: normalizeStudentValue(input.termInterest || input.term_interest, '').trim(),
    institutionGoal: normalizeStudentValue(input.institutionGoal || input.institution_goal, '').trim(),
    stage: input.stage || PIPELINE_STATUSES.inquiry,
    risk: input.risk || 'Low',
    advisor: normalizeStudentValue(input.advisor || input.owner, 'Unassigned').trim(),
    population: normalizeStudentValue(input.population || input.studentType || input.student_type, '').trim(),
    source: normalizeStudentValue(input.source || input.leadSource || input.lead_source, '').trim(),
    city: normalizeStudentValue(input.city, '').trim(),
    transcriptsCount: 0,
    fitScore: null,
    depositLikelihood: null,
    lastActivity: 'Just now',
    createdAt,
    updatedAt: createdAt,
    tags: ['Manually created'],
    summary: 'Student record created manually in Student 360.',
    checklist: [],
    transcripts: [],
  })
}

function buildTranscriptSteps(audit = []) {
  if (!audit.length) {
    return [
      { label: 'Upload received', time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) },
      { label: 'Certified outcome draft created', time: 'Now' },
    ]
  }

  return audit.slice(0, 5).map((entry) => ({
    label: entry.action || entry.category || 'Processed',
    time: new Date(entry.occurredOnUtc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }))
}

function getBatchItemLabel(item) {
  return item?.filename || item?.fileName || item?.name || item?.source || item?.originalFilename || item?.transcriptId || item?.id || 'Extracted file'
}

function inferBatchItemStatus(item) {
  if (item?.error) return 'failed'
  if (item?.completed === true) return 'completed'
  if (item?.status) return item.status
  return 'processing'
}

function normalizeBatchItems(items = []) {
  return items.map((item, index) => ({
    id: item?.id || item?.transcriptId || `${getBatchItemLabel(item)}-${index}`,
    filename: getBatchItemLabel(item),
    transcriptId: item?.transcriptId || null,
    documentUploadId: item?.documentUploadId || null,
    parseRunId: item?.parseRunId || null,
    status: inferBatchItemStatus(item),
    completed: Boolean(item?.completed),
    error: item?.error || '',
    startedAt: item?.startedAt || null,
    completedAt: item?.completedAt || null,
  }))
}

function buildBatchProgress(payload) {
  return {
    status: payload?.status || 'processing',
    totalFiles: Number(payload?.totalFiles) || 0,
    completedFiles: Number(payload?.completedFiles) || 0,
    failedFiles: Number(payload?.failedFiles) || 0,
    activeFiles: Number(payload?.activeFiles) || 0,
  }
}

function resolveStudentId(parsed) {
  return parsed?.demographic?.studentId || parsed?.studentId || parsed?.student?.id || null
}

function validateParsedTranscript(parsed) {
  const studentId = resolveStudentId(parsed)
  if (!studentId) return 'No student could be resolved from this transcript.'
  if (!Array.isArray(parsed?.courses) || parsed.courses.length === 0) return 'No extracted courses were found for this transcript.'
  return ''
}

function buildTestScoresFromDemographic(demographic = {}) {
  return [
    { test: 'ACT', section: 'English', score: demographic.actEnglishScore, date: demographic.actEnglishDate },
    { test: 'ACT', section: 'Math', score: demographic.actMathScore, date: demographic.actMathDate },
    { test: 'ACT', section: 'Reading', score: demographic.actReadingScore, date: demographic.actReadingDate },
    { test: 'ACT', section: 'Science', score: demographic.actSciencesScore, date: demographic.actSciencesDate },
    { test: 'ACT', section: 'STEM', score: demographic.actStemScore, date: demographic.actStemDate },
    { test: 'ACT', section: 'Composite', score: demographic.actCompositeScore, date: demographic.actCompositeDate },
    { test: 'SAT', section: 'Math', score: demographic.satMathScore, date: demographic.satMathDate },
    { test: 'SAT', section: 'Reading', score: demographic.satReadingScore, date: demographic.satReadingDate },
    { test: 'SAT', section: 'Total', score: demographic.satTotalScore, date: demographic.satTotalDate },
  ].filter((score) => score.score !== null && score.score !== undefined && score.score !== '')
}

function getLocalPdfUrl(file) {
  if (!file || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return ''
  const filename = String(file.name || '').toLowerCase()
  if (file.type !== 'application/pdf' && !filename.endsWith('.pdf')) return ''
  return URL.createObjectURL(file)
}

function mapParsedTranscript(parsed, file, storedDocument = null) {
  const demographic = parsed.demographic || {}
  const courses = parsed.courses || []
  const metadata = parsed.metadata || {}
  const institutionName = demographic.institutionName || courses[0]?.institution || 'Unknown institution'
  const firstName = demographic.firstName || 'Unknown'
  const lastName = demographic.lastName || 'Student'
  const studentId = resolveStudentId(parsed)
  const cumulativeGpa = formatNumber(firstPositiveNumber(parsed.grandGPA?.cumulativeGPA, demographic.cumulativeGpa, demographic.totalGradePoints))
  const creditsEarned = formatNumber(parsed.grandGPA?.unitsEarned || demographic.totalCreditsEarned, 0)
  const typeLabel = metadata.document_type?.replaceAll('_', ' ') || 'transcript'
  const isFraudulent = Boolean(parsed.isFraudulent)
  const documentUploadId = storedDocument?.documentId || parsed.crtfyDocumentId || parsed.documentUploadId || parsed.document_id || parsed.documentId || metadata.externalExtraction?.documentUploadId || parsed.externalExtraction?.documentUploadId || ''
  const transcript = {
    id: parsed.documentId,
    source: file.name,
    documentUrl: storedDocument?.documentId ? '' : parsed.documentUrl || parsed.pdfUrl || parsed.fileUrl || parsed.sourceUrl || getLocalPdfUrl(file),
    transcriptId: parsed.transcriptId || metadata.externalExtraction?.transcriptId || parsed.externalExtraction?.transcriptId || '',
    documentUploadId,
    documentId: documentUploadId,
    documentStorageProvider: storedDocument?.provider || parsed.documentStorageProvider || '',
    documentStorageDepartment: storedDocument?.department || parsed.documentStorageDepartment || '',
    documentStorageType: storedDocument?.documentType || parsed.documentStorageType || '',
    documentContentUrl: storedDocument?.contentUrl || parsed.documentContentUrl || parsed.content_url || '',
    institution: institutionName,
    type: typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1),
    uploadedAt: new Date().toISOString(),
    status: isFraudulent ? 'Quarantined' : 'Certified draft',
    confidence: formatPercent(metadata.parser_confidence || parsed.course_confidence_summary?.average || courses[0]?.confidenceScore || 0, 1),
    credits: creditsEarned,
    pages: Math.max(...courses.map((course) => course.pageNumber || 1), 1),
    owner: metadata.bedrock_used ? 'Decision Agent' : 'Transcript parser',
    notes: isFraudulent
      ? 'Trust signals require human validation before any recommendation can be released.'
      : `Transcript parsed from ${institutionName}. Outcome packet drafted with ${courses.length} extracted courses.`,
    steps: buildTranscriptSteps(parsed.audit),
    courses,
    rawDocument: storedDocument ? {
      ...parsed,
      crtfyDocumentId: storedDocument.documentId,
      documentStorageProvider: storedDocument.provider,
      documentStorageDepartment: storedDocument.department,
      documentStorageType: storedDocument.documentType,
      documentContentUrl: storedDocument.contentUrl,
      content_url: storedDocument.contentUrl,
      documentStorage: storedDocument,
    } : parsed,
  }

  return {
    studentId,
    transcript,
    studentPatch: {
      id: studentId,
      name: `${firstName} ${lastName}`.trim(),
      preferredName: firstName,
      email: `${slugify(`${firstName}.${lastName}`)}@example.edu`,
      phone: '(000) 000-0000',
      program: 'Transcript intake',
      institutionGoal: institutionName,
      stage: isFraudulent ? LEGACY_STAGE_LABELS.trustHold : LEGACY_STAGE_LABELS.decisionReady,
      risk: isFraudulent ? 'High' : 'Low',
      advisor: 'Unassigned',
      city: demographic.studentState || demographic.institutionState || 'Location pending',
      gpa: cumulativeGpa,
      creditsAccepted: creditsEarned,
      transcriptsCount: 1,
      fitScore: isFraudulent ? 42 : 86,
      depositLikelihood: isFraudulent ? 10 : 61,
      lastActivity: 'Just now',
      tags: ['Transcript parsed', parsed.isOfficial ? 'Official' : 'Unofficial', typeLabel].filter(Boolean),
      summary: isFraudulent
        ? `New document from ${institutionName} is blocked pending trust review.`
        : `Latest transcript parsed from ${institutionName}. Certified outcome draft prepared for review.`,
      checklist: [
        { label: 'Identity matched', done: Boolean(studentId) },
        { label: 'Document parsed', done: true },
        { label: 'Trust scan cleared', done: !isFraudulent },
        { label: 'Decision packet built', done: !isFraudulent },
      ],
      transcripts: [transcript],
      testScores: buildTestScoresFromDemographic(demographic),
      termGpa: (parsed.termGPAs || []).map((term, index) => ({
        term: `${term.term} ${term.year || index + 1}`,
        gpa: formatNumber(term.simpleGPA),
        credits: formatNumber(term.simpleUnitsEarned, 0),
      })),
      recommendation: {
        summary: isFraudulent ? 'Hold until trust review completes.' : 'Outcome draft ready for counselor signoff.',
        fitNarrative: isFraudulent
          ? 'The document cannot support a certified outcome until provenance issues are resolved.'
          : 'Parsed content suggests viable academic fit with adequate data for counselor review.',
        nextBestAction: isFraudulent ? 'Request official source document' : 'Review and release certified outcome',
      },
    },
  }
}

function mergeStudentRecord(currentStudents, mapped) {
  const existing = currentStudents.find((student) => student.id === mapped.studentId)
  if (!existing) return [mapped.studentPatch, ...currentStudents]

  const mergedTranscripts = [mapped.transcript, ...(existing.transcripts || [])]
  return currentStudents.map((student) => student.id !== mapped.studentId ? student : {
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
    lastActivity: 'Just now',
  })
}

function updateStudentChecklistInCollection(currentStudents, studentId, nextChecklist) {
  return currentStudents.map((student) => {
    if (student.id !== studentId) return student

    const completedCount = nextChecklist.filter((item) => item.done || item.status === CHECKLIST_STATUSES.complete || item.status === CHECKLIST_STATUSES.waived).length
    const totalCount = nextChecklist.length
    const incompleteCount = totalCount - completedCount
    const nextStage = incompleteCount === 0
      ? LEGACY_STAGE_LABELS.decisionReady
      : incompleteCount === 1
        ? LEGACY_STAGE_LABELS.nearlyComplete
        : student.stage

    return {
      ...student,
      checklist: nextChecklist,
      stage: nextStage,
      lastActivity: 'Just now',
    }
  })
}

function updateStudentProgramInCollection(currentStudents, studentId, program) {
  return currentStudents.map((student) => (
    student.id === studentId
      ? {
          ...student,
          program,
          degreeProgram: program,
          lastActivity: 'Just now',
        }
      : student
  ))
}

function updateStudentDemographicsInCollection(currentStudents, studentId, patch) {
  return currentStudents.map((student) => (
    String(student.id) === String(studentId)
      ? {
          ...student,
          ...patch,
          address: {
            ...(student.address || {}),
            line1: patch.addressLine1 ?? student.address?.line1,
            line2: patch.addressLine2 ?? student.address?.line2,
            city: patch.city ?? student.address?.city,
            state: patch.state ?? student.address?.state,
            postalCode: patch.postalCode ?? student.address?.postalCode,
          },
          parentGuardian: {
            ...(student.parentGuardian || {}),
            name: patch.parentName ?? student.parentGuardian?.name,
            relationship: patch.parentRelationship ?? student.parentGuardian?.relationship,
            email: patch.parentEmail ?? student.parentGuardian?.email,
            phone: patch.parentPhone ?? student.parentGuardian?.phone,
          },
          lastActivity: 'Just now',
          updatedAt: new Date().toISOString(),
        }
      : student
  ))
}

function addStudentDocumentInCollection(currentStudents, studentId, document) {
  return currentStudents.map((student) => {
    if (String(student.id) !== String(studentId)) return student
    const documents = Array.isArray(student.documents) ? student.documents : []
    return {
      ...student,
      documents: [document, ...documents.filter((item) => String(item.id || item.documentId || item.documentUploadId) !== String(document.id || document.documentId || document.documentUploadId))],
      lastActivity: 'Just now',
      updatedAt: new Date().toISOString(),
    }
  })
}

function mergeCachedDocumentsIntoStudent(student, tenantId) {
  if (!student?.id) return student
  const cachedDocuments = getCachedStudentDocuments(tenantId, student.id)
  if (!cachedDocuments.length) return student
  const documents = Array.isArray(student.documents) ? student.documents : []
  const mergedDocuments = [...documents]
  cachedDocuments.forEach((document) => {
    const id = document.id || document.documentId || document.documentUploadId
    if (!id || mergedDocuments.some((item) => String(item.id || item.documentId || item.documentUploadId) === String(id))) return
    mergedDocuments.push(document)
  })
  return {
    ...student,
    documents: mergedDocuments,
  }
}

function updateStudentWorkStateInCollection(currentStudents, studentId, patch) {
  return currentStudents.map((student) => (
    student.id === studentId
      ? {
          ...student,
          ...patch,
          lastActivity: patch.lastActivity || 'Just now',
        }
      : student
  ))
}

function addStudentInteractionInCollection(currentStudents, studentId, interaction) {
  return currentStudents.map((student) => (
    student.id === studentId
      ? {
          ...student,
          interactions: [interaction, ...(Array.isArray(student.interactions) ? student.interactions : [])],
          lastContactedAt: interaction.occurredAt || student.lastContactedAt,
          contactOutcome: interaction.outcome || student.contactOutcome,
          nextFollowUpAt: interaction.nextFollowUpAt || student.nextFollowUpAt,
          nextAction: interaction.nextAction || student.nextAction,
          lastActivity: 'Just now',
        }
      : student
  ))
}

function addStudentHandoffInCollection(currentStudents, studentId, handoff) {
  return currentStudents.map((student) => (
    student.id === studentId
      ? {
          ...student,
          handoffs: [handoff, ...(Array.isArray(student.handoffs) ? student.handoffs : [])],
          nextAction: handoff.blocker || handoff.summary || student.nextAction,
          lastActivity: 'Just now',
        }
      : student
  ))
}

function updateStudentMilestoneInCollection(currentStudents, studentId, milestone) {
  return currentStudents.map((student) => {
    if (student.id !== studentId) return student
    const milestones = Array.isArray(student.postAdmitMilestones) ? student.postAdmitMilestones : []
    const nextMilestones = milestones.some((item) => item.id === milestone.id)
      ? milestones.map((item) => item.id === milestone.id ? { ...item, ...milestone } : item)
      : [milestone, ...milestones]

    return {
      ...student,
      postAdmitMilestones: nextMilestones,
      lastActivity: 'Just now',
    }
  })
}

function patchChecklistItem(checklist, itemId, status) {
  const nextChecklist = (Array.isArray(checklist) ? checklist : []).map((item, index) => {
    const fallbackId = item.id || `${item.code || 'item'}-${index}`
    if (String(fallbackId) !== String(itemId)) return item

    return {
      ...item,
      id: fallbackId,
      status,
      done: status === CHECKLIST_STATUSES.complete,
    }
  })

  return nextChecklist
}

export function StudentRecordsProvider({ children }) {
  const [students, setStudents] = useState([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [studentsError, setStudentsError] = useState('')
  const { session, fetchWithTenantAuth } = useAuth()

  const loadStudents = useCallback(async (query = '') => {
    if (!session?.access_token || !session?.tenant_id) {
      setStudents([])
      setStudentsError('')
      setIsLoadingStudents(false)
      return []
    }

    setIsLoadingStudents(true)
    setStudentsError('')

    const requestUrl = query
      ? `${studentsUrl}?q=${encodeURIComponent(query)}`
      : studentsUrl

    try {
      const response = await fetchWithTenantAuth(requestUrl)
      const payload = await parseApiPayload(response)

      if (!response.ok) throw new Error(getStudentsErrorMessage(response, payload))

      const nextStudents = normalizeStudentsPayload(payload).map((student) => mergeCachedDocumentsIntoStudent(student, session.tenant_id))
      setStudents(nextStudents)
      return nextStudents
    } catch (error) {
      setStudentsError(error.message || 'Unable to load students.')
      setStudents([])
      throw error
    } finally {
      setIsLoadingStudents(false)
    }
  }, [fetchWithTenantAuth, session])

  const createStudent = useCallback(async (input = {}) => {
    const nextStudent = buildCreatedStudent(input)
    if (!nextStudent?.name || nextStudent.name === 'New Student') {
      throw new Error('Student first name and last name are required.')
    }
    if (!nextStudent.email) {
      throw new Error('Student email is required.')
    }

    if (!session?.access_token || !session?.tenant_id) {
      setStudents((current) => [nextStudent, ...current.filter((student) => student.id !== nextStudent.id)])
      return nextStudent
    }

    const payload = {
      ...input,
      id: input.id || input.studentId || nextStudent.id,
      studentId: input.studentId || input.id || nextStudent.id,
      name: nextStudent.name,
      firstName: input.firstName || input.first_name || '',
      lastName: input.lastName || input.last_name || '',
      email: nextStudent.email,
      phone: nextStudent.phone,
      program: nextStudent.program,
      programInterest: nextStudent.programInterest,
      termInterest: nextStudent.termInterest,
      institutionGoal: nextStudent.institutionGoal,
      stage: nextStudent.stage,
      advisor: nextStudent.advisor,
      owner: nextStudent.advisor,
      population: nextStudent.population,
      source: nextStudent.source,
    }

    const response = await fetchWithTenantAuth(studentsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const responsePayload = await parseApiPayload(response)

    if (response.status === 404 || response.status === 405) {
      setStudents((current) => [nextStudent, ...current.filter((student) => student.id !== nextStudent.id)])
      return nextStudent
    }

    if (!response.ok) {
      throw new Error(getStudentsErrorMessage(response, responsePayload))
    }

    const createdStudent = normalizeStudentDetailPayload(responsePayload) || nextStudent
    setStudents((current) => [createdStudent, ...current.filter((student) => student.id !== createdStudent.id)])
    return createdStudent
  }, [fetchWithTenantAuth, session])

  useEffect(() => {
    if (!session?.access_token || !session?.tenant_id) {
      setStudents([])
      setStudentsError('')
      setIsLoadingStudents(false)
      return
    }

    loadStudents().catch(() => {})
  }, [loadStudents, session])

  const uploadTranscript = useCallback(async (file, options = {}) => {
    const onStateChange = options.onStateChange || (() => {})
    const lowerName = file.name.toLowerCase()
    const isZipUpload = lowerName.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
    const documentType = options.documentType || options.documentCategory || classifyStudentDocument(file)

    if (!session?.access_token || !session?.tenant_id) {
      throw new Error('You must be signed in to upload transcripts.')
    }
    if (!isZipUpload && !isTranscriptDocumentType(documentType)) {
      throw new Error(`${file.name} was classified as ${documentType}. Use the student Documents tab to store non-transcript documents.`)
    }

    onStateChange({
      state: 'uploading',
      transcriptId: null,
      message: `Storing ${file.name} in crtfy Documents`,
      error: '',
    })

    const documentStorageTenantId = options.crtfyDocumentsTenantId || session.tenant_id
    const storedDocument = options.storedDocument || await uploadStoredDocument(file, {
        title: options.title || file.name,
        documentType,
        isFinancialAid: options.isFinancialAid,
        personId: options.personId || options.crtfyDocumentsPersonId,
        tags: options.tags,
        notes: options.notes,
        tenantId: documentStorageTenantId,
        accessToken: session.access_token,
        userEmail: session.email || session.username,
        actor: session.username || session.email || 'crtfy-student',
      })

    onStateChange({
      state: 'uploading',
      transcriptId: null,
      documentUploadId: storedDocument.documentId,
      message: `Stored in crtfy Documents. Starting extraction for ${file.name}`,
      error: '',
    })

    const formData = new FormData()
    formData.append('file', file, file.name)
    formData.append('document_type', documentType)
    formData.append('use_bedrock', 'true')
    formData.append('storage_provider', storedDocument.provider)
    formData.append('document_id', storedDocument.documentId)
    formData.append('crtfy_documents_document_id', storedDocument.documentId)
    formData.append('crtfy_documents_tenant_id', storedDocument.tenantId || session.tenant_id)
    if (storedDocument.contentUrl) formData.append('content_url', storedDocument.contentUrl)
    formData.append('skip_storage', 'true')
    formData.append('source', 'crtfy_student')

    const uploadResponse = await fetchWithTenantAuth(transcriptUploadUrl, {
      method: 'POST',
      body: formData,
    })
    const uploadPayload = await parseApiPayload(uploadResponse)

    if (!uploadResponse.ok) {
      const errorMessage = getApiErrorMessage(uploadResponse, uploadPayload, 'Transcript upload failed.')
      onStateChange({
        state: 'failed',
        transcriptId: uploadPayload?.transcriptId || null,
        documentUploadId: storedDocument.documentId,
        message: errorMessage,
        error: errorMessage,
      })
      throw new Error(errorMessage)
    }

    const transcriptId = uploadPayload?.transcriptId
    const batchId = uploadPayload?.batchId

    if (batchId) {
      onStateChange({
        state: 'processing',
        transcriptId: null,
        batchId,
        mode: 'batch',
        message: `Processing batch ${batchId}`,
        documentUploadId: storedDocument.documentId,
        batchItems: normalizeBatchItems(uploadPayload?.items || []),
        batchProgress: buildBatchProgress(uploadPayload),
        error: '',
      })

      const fetchedTranscriptIds = new Set()
      const locallyFailedTranscriptIds = new Set()
      const batchResults = []
      const batchItemOverrides = new Map()

      while (true) {
        await sleep(pollIntervalMs)

        const statusResponse = await fetchWithTenantAuth(`${transcriptUploadUrl}/batches/${batchId}/status`)
        const statusPayload = await parseApiPayload(statusResponse)

        if (!statusResponse.ok) {
          const errorMessage = getApiErrorMessage(statusResponse, statusPayload, 'Unable to check transcript batch status.')
          onStateChange({
            state: 'failed',
            transcriptId: null,
            batchId,
            mode: 'batch',
            message: errorMessage,
            documentUploadId: storedDocument.documentId,
            batchItems: normalizeBatchItems(statusPayload?.items || []),
            batchProgress: buildBatchProgress(statusPayload),
            error: errorMessage,
          })
          throw new Error(errorMessage)
        }

        const batchItems = normalizeBatchItems(statusPayload?.items || []).map((item) => {
          const override = batchItemOverrides.get(item.transcriptId || item.filename)
          return override ? { ...item, ...override } : item
        })

        for (const item of batchItems) {
          if (!item.transcriptId || (!item.completed && item.status !== 'completed') || fetchedTranscriptIds.has(item.transcriptId) || locallyFailedTranscriptIds.has(item.transcriptId)) continue

          const resultsResponse = await fetchWithTenantAuth(`${apiBaseUrl}/api/v1/transcripts/${item.transcriptId}/results`)
          const parsed = await parseApiPayload(resultsResponse)

          if (!resultsResponse.ok) {
            const errorMessage = getApiErrorMessage(resultsResponse, parsed, `Unable to fetch transcript results for ${item.filename}.`)
            locallyFailedTranscriptIds.add(item.transcriptId)
            batchItemOverrides.set(item.transcriptId, {
              status: 'failed',
              completed: false,
              error: errorMessage,
            })
            onStateChange({
              state: 'processing',
              transcriptId: null,
              batchId,
              mode: 'batch',
              message: `Processing batch ${batchId}`,
              documentUploadId: storedDocument.documentId,
              batchItems: batchItems.map((batchItem) => batchItem.transcriptId === item.transcriptId ? { ...batchItem, ...batchItemOverrides.get(item.transcriptId) } : batchItem),
              batchProgress: buildBatchProgress(statusPayload),
              error: '',
            })
            continue
          }

          const validationError = validateParsedTranscript(parsed)
          if (validationError) {
            locallyFailedTranscriptIds.add(item.transcriptId)
            batchItemOverrides.set(item.transcriptId, {
              status: 'failed',
              completed: false,
              error: validationError,
            })
            onStateChange({
              state: 'processing',
              transcriptId: null,
              batchId,
              mode: 'batch',
              message: `Processing batch ${batchId}`,
              documentUploadId: storedDocument.documentId,
              batchItems: batchItems.map((batchItem) => batchItem.transcriptId === item.transcriptId ? { ...batchItem, ...batchItemOverrides.get(item.transcriptId) } : batchItem),
              batchProgress: buildBatchProgress(statusPayload),
              error: '',
            })
            continue
          }

          fetchedTranscriptIds.add(item.transcriptId)
          batchResults.push({
            transcriptId: item.transcriptId,
            filename: item.filename,
            parsed,
            documentUploadId: storedDocument.documentId,
          })

          if (!isZipUpload) continue

          const mapped = mapParsedTranscript(parsed, { name: item.filename }, storedDocument)
          setStudents((current) => mergeStudentRecord(current, mapped))
        }

        onStateChange({
          state: 'processing',
          transcriptId: null,
          batchId,
          mode: 'batch',
          message: `Processed ${Number(statusPayload?.completedFiles) || 0} of ${Number(statusPayload?.totalFiles) || batchItems.length || 0} files`,
          documentUploadId: storedDocument.documentId,
          batchItems,
          batchProgress: buildBatchProgress(statusPayload),
          error: '',
        })

        const totalFiles = Number(statusPayload?.totalFiles) || batchItems.length
        const completedFiles = Number(statusPayload?.completedFiles) || 0
        const failedFiles = Number(statusPayload?.failedFiles) || 0
        const allDone = totalFiles > 0 && completedFiles + failedFiles >= totalFiles

        if (allDone) {
          await loadStudents().catch(() => {})
          return {
            batchId,
            transcriptId: null,
            documentUploadId: storedDocument.documentId,
            destination: 'students-list',
            isZipUpload,
            results: batchResults,
            batchProgress: {
              totalFiles,
              completedFiles,
              failedFiles,
            },
            batchItems,
          }
        }
      }
    }

    if (!transcriptId) {
      const errorMessage = 'Upload started but no transcript or batch id was returned.'
      onStateChange({ state: 'failed', transcriptId: null, batchId: null, documentUploadId: storedDocument.documentId, message: errorMessage, error: errorMessage })
      throw new Error(errorMessage)
    }

    onStateChange({
      state: 'processing',
      transcriptId,
      batchId: null,
      mode: 'single',
      message: `Processing transcript ${transcriptId}`,
      documentUploadId: storedDocument.documentId,
      error: '',
    })

    while (true) {
      await sleep(pollIntervalMs)

      const statusResponse = await fetchWithTenantAuth(`${transcriptUploadUrl}/${transcriptId}/status`)
      const statusPayload = await parseApiPayload(statusResponse)

      if (!statusResponse.ok) {
        const errorMessage = getApiErrorMessage(statusResponse, statusPayload, 'Unable to check transcript upload status.')
        onStateChange({
          state: 'failed',
          transcriptId,
          batchId: null,
          mode: 'single',
          message: errorMessage,
          documentUploadId: storedDocument.documentId,
          error: errorMessage,
        })
        throw new Error(errorMessage)
      }

      if (statusPayload?.status === 'failed') {
        const errorMessage = statusPayload?.error || 'Transcript processing failed.'
        onStateChange({
          state: 'failed',
          transcriptId,
          batchId: null,
          mode: 'single',
          message: errorMessage,
          documentUploadId: storedDocument.documentId,
          error: errorMessage,
        })
        throw new Error(errorMessage)
      }

      if (statusPayload?.completed === true || statusPayload?.status === 'completed') break

      onStateChange({
        state: 'processing',
        transcriptId,
        batchId: null,
        mode: 'single',
        message: `Processing transcript ${transcriptId}`,
        documentUploadId: storedDocument.documentId,
        error: '',
      })
    }

    onStateChange({
      state: 'completed',
      transcriptId,
      batchId: null,
      mode: 'single',
      message: `Fetching results for ${transcriptId}`,
      documentUploadId: storedDocument.documentId,
      error: '',
    })

    const resultsResponse = await fetchWithTenantAuth(`${apiBaseUrl}/api/v1/transcripts/${transcriptId}/results`)
    const parsed = await parseApiPayload(resultsResponse)

    if (!resultsResponse.ok) {
      const errorMessage = getApiErrorMessage(resultsResponse, parsed, 'Unable to fetch transcript results.')
      onStateChange({
        state: 'failed',
        transcriptId,
        batchId: null,
        mode: 'single',
        message: errorMessage,
        documentUploadId: storedDocument.documentId,
        error: errorMessage,
      })
      throw new Error(errorMessage)
    }

    const validationError = validateParsedTranscript(parsed)
    if (validationError) {
      onStateChange({
        state: 'failed',
        transcriptId,
        batchId: null,
        mode: 'single',
        message: validationError,
        documentUploadId: storedDocument.documentId,
        error: validationError,
      })
      throw new Error(validationError)
    }

    if (isZipUpload) {
      await loadStudents().catch(() => {})
      return {
        parsed,
        studentId: null,
        transcriptId,
        batchId: null,
        documentUploadId: storedDocument.documentId,
        destination: 'students-list',
        isZipUpload: true,
      }
    }

    const mapped = mapParsedTranscript(parsed, file, storedDocument)

    setStudents((current) => mergeStudentRecord(current, mapped))

    return {
      mapped,
      parsed,
      studentId: mapped.studentId,
      transcriptId,
      batchId: null,
      documentUploadId: storedDocument.documentId,
      destination: 'student-profile',
      isZipUpload: false,
    }
  }, [fetchWithTenantAuth, loadStudents, session])

  const uploadStudentDocument = useCallback(async ({ studentId, file, documentType, onStateChange } = {}) => {
    if (!studentId || !file) throw new Error('studentId and file are required.')
    if (!session?.access_token || !session?.tenant_id) {
      throw new Error('You must be signed in to upload student documents.')
    }

    const nextDocumentType = documentType || classifyStudentDocument(file)
    const now = new Date().toISOString()
    const notify = onStateChange || (() => {})
    notify({ state: 'uploading', message: `Storing ${file.name} in crtfy Documents`, documentType: nextDocumentType })

    const storedDocument = await uploadStoredDocument(file, {
      title: file.name,
      documentType: nextDocumentType,
      personId: studentId,
      tags: ['student-document', nextDocumentType],
      notes: `Student document uploaded from Student 360 for ${studentId}.`,
      tenantId: session.tenant_id,
      accessToken: session.access_token,
      userEmail: session.email || session.username,
      actor: session.username || session.email || 'crtfy-student',
    })

    const documentRecord = {
      id: storedDocument.documentId,
      documentId: storedDocument.documentId,
      documentUploadId: storedDocument.documentId,
      provider: storedDocument.provider,
      documentStorageProvider: storedDocument.provider,
      documentType: nextDocumentType,
      documentStorageType: nextDocumentType,
      department: storedDocument.department,
      documentStorageDepartment: storedDocument.department,
      title: file.name,
      fileName: file.name,
      status: 'Stored',
      confidence: 0.86,
      contentUrl: storedDocument.contentUrl,
      documentContentUrl: storedDocument.contentUrl,
      uploadedAt: now,
      updatedAt: now,
      owner: session.email || session.username || 'Current user',
      checklistImpact: isTranscriptDocumentType(nextDocumentType) ? 'Can satisfy transcript checklist requirements.' : 'Available for checklist and workflow review.',
      workflow: 'Stored in crtfy Documents, visible on Student 360, audit-ready.',
      portalVisible: true,
      rawDocument: {
        documentStorage: storedDocument,
        crtfyDocumentId: storedDocument.documentId,
      },
    }

    setStudents((current) => addStudentDocumentInCollection(current, studentId, documentRecord))
    cacheStudentDocument(session.tenant_id, studentId, documentRecord)

    if (!isTranscriptDocumentType(nextDocumentType)) {
      notify({ state: 'complete', message: `${nextDocumentType} stored in crtfy Documents`, documentId: storedDocument.documentId, documentType: nextDocumentType })
      return { storedDocument, document: documentRecord, extracted: false }
    }

    notify({ state: 'processing', message: `${nextDocumentType} stored in crtfy Documents`, documentId: storedDocument.documentId, documentType: nextDocumentType })
    const transcriptResult = await uploadTranscript(file, {
      documentType: nextDocumentType,
      personId: studentId,
      storedDocument,
      onStateChange: (state = {}) => notify({
        ...state,
        message: `${nextDocumentType} stored in crtfy Documents`,
      }),
    })
    return {
      storedDocument,
      document: documentRecord,
      transcriptResult,
      mapped: transcriptResult?.mapped || null,
      parsed: transcriptResult?.parsed || null,
      extracted: true,
    }
  }, [session, uploadTranscript])

  const loadStudentChecklist = useCallback(async (studentId) => {
    if (!studentId || !session?.access_token || !session?.tenant_id) return []

    const response = await fetchWithTenantAuth(getChecklistUrl(studentId))
    const payload = await parseApiPayload(response)

    if (!response.ok) {
      throw new Error(getChecklistErrorMessage(response, payload, 'Unable to load checklist.'))
    }

    const nextChecklist = normalizeChecklistPayload(payload)
    setStudents((current) => updateStudentChecklistInCollection(current, studentId, nextChecklist))
    return nextChecklist
  }, [fetchWithTenantAuth, session])

  const updateChecklistItemStatus = useCallback(async ({ studentId, itemId, status }) => {
    if (!studentId || !itemId || !status) {
      throw new Error('studentId, itemId, and status are required.')
    }

    const existingStudent = students.find((student) => student.id === studentId)
    const optimisticChecklist = patchChecklistItem(existingStudent?.checklist, itemId, status)

    if (existingStudent?.checklist?.length) {
      setStudents((current) => updateStudentChecklistInCollection(current, studentId, optimisticChecklist))
    }

    if (!session?.access_token || !session?.tenant_id) return optimisticChecklist

    try {
      const response = await fetchWithTenantAuth(getChecklistItemStatusUrl(studentId, itemId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
      const payload = await parseApiPayload(response)

      if (!response.ok) {
        throw new Error(getChecklistErrorMessage(response, payload, 'Unable to update checklist item.'))
      }

      const nextChecklist = normalizeChecklistPayload(payload)
      if (nextChecklist.length) {
        setStudents((current) => updateStudentChecklistInCollection(current, studentId, nextChecklist))
        return nextChecklist
      }

      return optimisticChecklist
    } catch (error) {
      if (existingStudent?.checklist?.length) {
        setStudents((current) => updateStudentChecklistInCollection(current, studentId, existingStudent.checklist))
      }

      if (String(error.message || '').includes('not available')) {
        return optimisticChecklist
      }

      throw error
    }
  }, [fetchWithTenantAuth, session, students])

  const updateStudentProgram = useCallback(async ({ studentId, program }) => {
    const nextProgram = String(program || '').trim()
    if (!studentId || !nextProgram) {
      throw new Error('studentId and program are required.')
    }

    const existingStudent = students.find((student) => student.id === studentId)
    if (existingStudent) {
      setStudents((current) => updateStudentProgramInCollection(current, studentId, nextProgram))
    }

    if (!session?.access_token || !session?.tenant_id) {
      return { ...(existingStudent || { id: studentId }), program: nextProgram, degreeProgram: nextProgram }
    }

    try {
      const response = await fetchWithTenantAuth(`${studentsUrl}/${encodeURIComponent(studentId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          program: nextProgram,
          degreeProgram: nextProgram,
        }),
      })
      const payload = await parseApiPayload(response)

      if (response.status === 404 || response.status === 405) {
        return { ...(existingStudent || { id: studentId }), program: nextProgram, degreeProgram: nextProgram }
      }

      if (!response.ok) {
        throw new Error(getStudentsErrorMessage(response, payload))
      }

      const updatedStudent = {
        ...(normalizeStudentDetailPayload(payload) || existingStudent || { id: studentId }),
        program: nextProgram,
        degreeProgram: nextProgram,
        programInterest: nextProgram,
      }

      setStudents((current) => current.some((student) => student.id === studentId)
        ? current.map((student) => student.id === studentId ? { ...student, ...updatedStudent } : student)
        : current)

      return updatedStudent
    } catch (error) {
      if (existingStudent) {
        setStudents((current) => current.map((student) => student.id === studentId ? existingStudent : student))
      }
      throw error
    }
  }, [fetchWithTenantAuth, session, students])

  const updateStudentDemographics = useCallback(async ({ studentId, patch }) => {
    if (!studentId || !patch || typeof patch !== 'object') {
      throw new Error('studentId and patch are required.')
    }

    const existingStudent = students.find((student) => String(student.id) === String(studentId))
    const currentProgram = patch.program || existingStudent?.program || existingStudent?.programInterest || existingStudent?.degreeProgram || 'Program pending'
    const nextPatch = {
      ...patch,
      program: currentProgram,
      degreeProgram: currentProgram,
      programInterest: currentProgram,
      smsOptIn: Boolean(patch.smsOptIn),
      textingOk: Boolean(patch.smsOptIn),
      textConsent: Boolean(patch.smsOptIn),
      address: {
        line1: patch.addressLine1 || '',
        line2: patch.addressLine2 || '',
        city: patch.city || '',
        state: patch.state || '',
        postalCode: patch.postalCode || '',
      },
      parentGuardian: {
        name: patch.parentName || '',
        relationship: patch.parentRelationship || '',
        email: patch.parentEmail || '',
        phone: patch.parentPhone || '',
      },
    }

    if (existingStudent) {
      setStudents((current) => updateStudentDemographicsInCollection(current, studentId, nextPatch))
    }

    if (!session?.access_token || !session?.tenant_id) {
      return { ...(existingStudent || { id: studentId }), ...nextPatch }
    }

    try {
      const response = await fetchWithTenantAuth(`${studentsUrl}/${encodeURIComponent(studentId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nextPatch),
      })
      const payload = await parseApiPayload(response)

      if (response.status === 404 || response.status === 405) {
        return { ...(existingStudent || { id: studentId }), ...nextPatch }
      }

      if (!response.ok) {
        throw new Error(getStudentsErrorMessage(response, payload))
      }

      const updatedStudent = {
        ...(normalizeStudentDetailPayload(payload) || existingStudent || { id: studentId }),
        ...nextPatch,
      }

      setStudents((current) => current.some((student) => String(student.id) === String(studentId))
        ? current.map((student) => String(student.id) === String(studentId) ? { ...student, ...updatedStudent } : student)
        : current)

      return updatedStudent
    } catch (error) {
      if (existingStudent) {
        setStudents((current) => current.map((student) => String(student.id) === String(studentId) ? existingStudent : student))
      }
      throw error
    }
  }, [fetchWithTenantAuth, session, students])

  const updateStudentWorkState = useCallback(async ({ studentId, patch }) => {
    if (!studentId || !patch || typeof patch !== 'object') {
      throw new Error('studentId and patch are required.')
    }

    const existingStudent = students.find((student) => student.id === studentId)
    const nextPatch = {
      ...patch,
      lastActivity: 'Just now',
    }

    if (existingStudent) {
      setStudents((current) => updateStudentWorkStateInCollection(current, studentId, nextPatch))
    }

    if (!session?.access_token || !session?.tenant_id) {
      return { ...(existingStudent || { id: studentId }), ...nextPatch }
    }

    try {
      const response = await fetchWithTenantAuth(`${studentsUrl}/${encodeURIComponent(studentId)}/next-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nextPatch),
      })
      const payload = await parseApiPayload(response)

      if (response.status === 404 || response.status === 405) {
        return { ...(existingStudent || { id: studentId }), ...nextPatch }
      }

      if (!response.ok) {
        throw new Error(getStudentsErrorMessage(response, payload))
      }

      const updatedStudent = {
        ...(normalizeStudentDetailPayload(payload) || existingStudent || { id: studentId }),
        ...nextPatch,
      }

      setStudents((current) => current.some((student) => student.id === studentId)
        ? current.map((student) => student.id === studentId ? { ...student, ...updatedStudent } : student)
        : current)

      return updatedStudent
    } catch (error) {
      if (existingStudent) {
        setStudents((current) => current.map((student) => student.id === studentId ? existingStudent : student))
      }
      throw error
    }
  }, [fetchWithTenantAuth, session, students])

  const addStudentInteraction = useCallback(async ({ studentId, interaction }) => {
    if (!studentId || !interaction || typeof interaction !== 'object') {
      throw new Error('studentId and interaction are required.')
    }

    const existingStudent = students.find((student) => student.id === studentId)
    const occurredAt = interaction.occurredAt || new Date().toISOString()
    const optimisticInteraction = {
      id: interaction.id || `interaction-${Date.now()}`,
      ...interaction,
      occurredAt,
    }

    if (existingStudent) {
      setStudents((current) => addStudentInteractionInCollection(current, studentId, optimisticInteraction))
    }

    if (!session?.access_token || !session?.tenant_id) return optimisticInteraction

    try {
      const response = await fetchWithTenantAuth(`${studentsUrl}/${encodeURIComponent(studentId)}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(optimisticInteraction),
      })
      const payload = await parseApiPayload(response)

      if (response.status === 404 || response.status === 405) return optimisticInteraction

      if (!response.ok) {
        throw new Error(getStudentsErrorMessage(response, payload))
      }

      const savedInteraction = payload?.interaction || payload
      const normalizedInteraction = {
        ...optimisticInteraction,
        ...(savedInteraction && typeof savedInteraction === 'object' ? savedInteraction : {}),
      }

      setStudents((current) => current.map((student) => {
        if (student.id !== studentId) return student
        const interactions = Array.isArray(student.interactions) ? student.interactions : []
        return {
          ...student,
          interactions: interactions.map((item) => item.id === optimisticInteraction.id ? normalizedInteraction : item),
          lastContactedAt: normalizedInteraction.occurredAt || student.lastContactedAt,
          contactOutcome: normalizedInteraction.outcome || student.contactOutcome,
          nextFollowUpAt: normalizedInteraction.nextFollowUpAt || student.nextFollowUpAt,
          nextAction: normalizedInteraction.nextAction || student.nextAction,
        }
      }))

      return normalizedInteraction
    } catch (error) {
      if (existingStudent) {
        setStudents((current) => current.map((student) => student.id === studentId ? existingStudent : student))
      }
      throw error
    }
  }, [fetchWithTenantAuth, session, students])

  const logStudentCommunication = useCallback(async ({ studentId, communication }) => {
    if (!studentId || !communication || typeof communication !== 'object') {
      throw new Error('studentId and communication are required.')
    }

    const existingStudent = students.find((student) => student.id === studentId)
    const occurredAt = communication.occurredAt || new Date().toISOString()
    const channelLabel = String(communication.channel || 'communication').replace(/_/g, ' ')
    const optimisticCommunication = {
      id: communication.id || `communication-${Date.now()}`,
      type: 'communication',
      title: communication.title || `${channelLabel} outreach`,
      outcome: communication.status || 'logged',
      description: communication.message || communication.note || '',
      note: communication.message || communication.note || '',
      ...communication,
      occurredAt,
      source: communication.source || 'student_360_outreach',
    }

    if (existingStudent) {
      setStudents((current) => addStudentInteractionInCollection(current, studentId, optimisticCommunication))
    }

    if (!session?.access_token || !session?.tenant_id) return optimisticCommunication

    try {
      const response = await fetchWithTenantAuth(`${studentsUrl}/${encodeURIComponent(studentId)}/communications/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(optimisticCommunication),
      })
      const payload = await parseApiPayload(response)

      if (response.status === 404 || response.status === 405) return optimisticCommunication

      if (!response.ok) {
        throw new Error(getStudentsErrorMessage(response, payload))
      }

      const savedCommunication = payload?.communication || payload
      const normalizedCommunication = {
        ...optimisticCommunication,
        ...(savedCommunication && typeof savedCommunication === 'object' ? savedCommunication : {}),
      }

      setStudents((current) => current.map((student) => {
        if (student.id !== studentId) return student
        const interactions = Array.isArray(student.interactions) ? student.interactions : []
        return {
          ...student,
          interactions: interactions.map((item) => item.id === optimisticCommunication.id ? normalizedCommunication : item),
          lastContactedAt: normalizedCommunication.occurredAt || student.lastContactedAt,
          contactOutcome: normalizedCommunication.outcome || student.contactOutcome,
          nextFollowUpAt: normalizedCommunication.nextFollowUpAt || student.nextFollowUpAt,
          nextAction: normalizedCommunication.nextAction || student.nextAction,
        }
      }))

      return normalizedCommunication
    } catch (error) {
      if (existingStudent) {
        setStudents((current) => current.map((student) => student.id === studentId ? existingStudent : student))
      }
      throw error
    }
  }, [fetchWithTenantAuth, session, students])

  const createStudentHandoff = useCallback(async ({ studentId, handoff }) => {
    if (!studentId || !handoff || typeof handoff !== 'object') {
      throw new Error('studentId and handoff are required.')
    }

    const existingStudent = students.find((student) => student.id === studentId)
    const optimisticHandoff = {
      id: handoff.id || `handoff-${Date.now()}`,
      status: handoff.status || 'open',
      createdAt: handoff.createdAt || new Date().toISOString(),
      ...handoff,
    }

    if (existingStudent) {
      setStudents((current) => addStudentHandoffInCollection(current, studentId, optimisticHandoff))
    }

    if (!session?.access_token || !session?.tenant_id) return optimisticHandoff

    try {
      const response = await fetchWithTenantAuth(`${studentsUrl}/${encodeURIComponent(studentId)}/handoffs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(optimisticHandoff),
      })
      const payload = await parseApiPayload(response)

      if (response.status === 404 || response.status === 405) return optimisticHandoff

      if (!response.ok) {
        throw new Error(getStudentsErrorMessage(response, payload))
      }

      const savedHandoff = payload?.handoff || payload
      const normalizedHandoff = {
        ...optimisticHandoff,
        ...(savedHandoff && typeof savedHandoff === 'object' ? savedHandoff : {}),
      }

      setStudents((current) => current.map((student) => {
        if (student.id !== studentId) return student
        const handoffs = Array.isArray(student.handoffs) ? student.handoffs : []
        return {
          ...student,
          handoffs: handoffs.map((item) => item.id === optimisticHandoff.id ? normalizedHandoff : item),
        }
      }))

      return normalizedHandoff
    } catch (error) {
      if (existingStudent) {
        setStudents((current) => current.map((student) => student.id === studentId ? existingStudent : student))
      }
      throw error
    }
  }, [fetchWithTenantAuth, session, students])

  const updateStudentMilestone = useCallback(async ({ studentId, milestoneId, milestone }) => {
    if (!studentId || !milestoneId || !milestone || typeof milestone !== 'object') {
      throw new Error('studentId, milestoneId, and milestone are required.')
    }

    const existingStudent = students.find((student) => student.id === studentId)
    const optimisticMilestone = {
      id: milestoneId,
      updatedAt: new Date().toISOString(),
      ...milestone,
    }

    if (existingStudent) {
      setStudents((current) => updateStudentMilestoneInCollection(current, studentId, optimisticMilestone))
    }

    if (!session?.access_token || !session?.tenant_id) return optimisticMilestone

    try {
      const response = await fetchWithTenantAuth(`${studentsUrl}/${encodeURIComponent(studentId)}/milestones/${encodeURIComponent(milestoneId)}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(optimisticMilestone),
      })
      const payload = await parseApiPayload(response)

      if (response.status === 404 || response.status === 405) return optimisticMilestone

      if (!response.ok) {
        throw new Error(getStudentsErrorMessage(response, payload))
      }

      const savedMilestone = payload?.milestone || payload
      const normalizedMilestone = {
        ...optimisticMilestone,
        ...(savedMilestone && typeof savedMilestone === 'object' ? savedMilestone : {}),
      }

      setStudents((current) => updateStudentMilestoneInCollection(current, studentId, normalizedMilestone))
      return normalizedMilestone
    } catch (error) {
      if (existingStudent) {
        setStudents((current) => current.map((student) => student.id === studentId ? existingStudent : student))
      }
      throw error
    }
  }, [fetchWithTenantAuth, session, students])

  const logRecruitmentEvent = useCallback(async ({ studentId, event }) => {
    if (!studentId || !event || typeof event !== 'object') {
      throw new Error('studentId and event are required.')
    }

    const interaction = {
      id: event.id || `recruitment-${Date.now()}`,
      type: 'recruitment_event',
      title: event.eventName || event.eventType || 'Recruitment event',
      description: event.notes || event.eventType || '',
      note: event.notes || '',
      outcome: event.outcome || 'attended',
      occurredAt: event.occurredAt || new Date().toISOString(),
      actor: event.actor || 'Admissions',
      source: event.source || 'recruitment',
      ...event,
    }

    return addStudentInteraction({ studentId, interaction })
  }, [addStudentInteraction])

  const getStoredStudentDocuments = useCallback((studentId) => (
    getCachedStudentDocuments(session?.tenant_id, studentId)
  ), [session?.tenant_id])

  const value = useMemo(() => ({
    students,
    isLoadingStudents,
    studentsError,
    loadStudents,
    createStudent,
    normalizeStudentDetailPayload,
    loadStudentChecklist,
    updateChecklistItemStatus,
    updateStudentProgram,
    updateStudentDemographics,
    updateStudentWorkState,
    addStudentInteraction,
    logStudentCommunication,
    createStudentHandoff,
    updateStudentMilestone,
    logRecruitmentEvent,
    getStoredStudentDocuments,
    uploadStudentDocument,
    uploadTranscript,
  }), [addStudentInteraction, createStudent, createStudentHandoff, getStoredStudentDocuments, isLoadingStudents, loadStudentChecklist, loadStudents, logRecruitmentEvent, logStudentCommunication, students, studentsError, updateChecklistItemStatus, updateStudentDemographics, updateStudentMilestone, updateStudentProgram, updateStudentWorkState, uploadStudentDocument, uploadTranscript])
  return <StudentRecordsContext.Provider value={value}>{children}</StudentRecordsContext.Provider>
}

export function useStudentRecords() {
  const context = useContext(StudentRecordsContext)
  if (!context) throw new Error('useStudentRecords must be used within StudentRecordsProvider')
  return context
}
