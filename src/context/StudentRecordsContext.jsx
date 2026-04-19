import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

const StudentRecordsContext = createContext(null)
const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const transcriptUploadUrl = `${apiBaseUrl}/api/v1/transcripts/uploads`
const studentsUrl = `${apiBaseUrl}/api/v1/students`
const pollIntervalMs = 1500

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')
}

function formatNumber(value, digits = 2) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : 0
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
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

function mapParsedTranscript(parsed, file) {
  const demographic = parsed.demographic || {}
  const courses = parsed.courses || []
  const metadata = parsed.metadata || {}
  const institutionName = demographic.institutionName || courses[0]?.institution || 'Unknown institution'
  const firstName = demographic.firstName || 'Unknown'
  const lastName = demographic.lastName || 'Student'
  const studentId = resolveStudentId(parsed)
  const cumulativeGpa = formatNumber(parsed.grandGPA?.cumulativeGPA || demographic.cumulativeGpa)
  const creditsEarned = formatNumber(parsed.grandGPA?.unitsEarned || demographic.totalCreditsEarned, 0)
  const typeLabel = metadata.document_type?.replaceAll('_', ' ') || 'transcript'
  const isFraudulent = Boolean(parsed.isFraudulent)
  const transcript = {
    id: parsed.documentId,
    source: file.name,
    institution: institutionName,
    type: typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1),
    uploadedAt: new Date().toISOString(),
    status: isFraudulent ? 'Quarantined' : 'Certified draft',
    confidence: formatNumber((metadata.parser_confidence || courses[0]?.confidenceScore || 0) * 100, 1),
    credits: creditsEarned,
    pages: Math.max(...courses.map((course) => course.pageNumber || 1), 1),
    owner: metadata.bedrock_used ? 'Decision Agent' : 'Transcript parser',
    notes: isFraudulent
      ? 'Trust signals require human validation before any recommendation can be released.'
      : `Transcript parsed from ${institutionName}. Outcome packet drafted with ${courses.length} extracted courses.`,
    steps: buildTranscriptSteps(parsed.audit),
    courses,
    rawDocument: parsed,
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
      stage: isFraudulent ? 'Trust hold' : 'Decision-ready',
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

export function StudentRecordsProvider({ children }) {
  const [students, setStudents] = useState([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [studentsError, setStudentsError] = useState('')
  const { session, buildTenantAuthHeaders, fetchWithTenantAuth } = useAuth()

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

      const nextStudents = Array.isArray(payload) ? payload : []
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

    if (!session?.access_token || !session?.tenant_id) {
      throw new Error('You must be signed in to upload transcripts.')
    }

    onStateChange({
      state: 'uploading',
      transcriptId: null,
      message: `Uploading ${file.name}`,
      error: '',
    })

    const formData = new FormData()
    formData.append('file', file, file.name)
    formData.append('document_type', 'auto')
    formData.append('use_bedrock', 'true')

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
          })

          if (!isZipUpload) continue

          const mapped = mapParsedTranscript(parsed, { name: item.filename })
          setStudents((current) => mergeStudentRecord(current, mapped))
        }

        onStateChange({
          state: 'processing',
          transcriptId: null,
          batchId,
          mode: 'batch',
          message: `Processed ${Number(statusPayload?.completedFiles) || 0} of ${Number(statusPayload?.totalFiles) || batchItems.length || 0} files`,
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
      onStateChange({ state: 'failed', transcriptId: null, batchId: null, message: errorMessage, error: errorMessage })
      throw new Error(errorMessage)
    }

    onStateChange({
      state: 'processing',
      transcriptId,
      batchId: null,
      mode: 'single',
      message: `Processing transcript ${transcriptId}`,
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
        error: '',
      })
    }

    onStateChange({
      state: 'completed',
      transcriptId,
      batchId: null,
      mode: 'single',
      message: `Fetching results for ${transcriptId}`,
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
        destination: 'students-list',
        isZipUpload: true,
      }
    }

    const mapped = mapParsedTranscript(parsed, file)

    setStudents((current) => mergeStudentRecord(current, mapped))

    return {
      parsed,
      studentId: mapped.studentId,
      transcriptId,
      batchId: null,
      destination: 'student-profile',
      isZipUpload: false,
    }
  }, [buildTenantAuthHeaders, fetchWithTenantAuth, loadStudents, session])

  const value = useMemo(() => ({
    students,
    isLoadingStudents,
    studentsError,
    loadStudents,
    uploadTranscript,
  }), [isLoadingStudents, loadStudents, students, studentsError, uploadTranscript])
  return <StudentRecordsContext.Provider value={value}>{children}</StudentRecordsContext.Provider>
}

export function useStudentRecords() {
  const context = useContext(StudentRecordsContext)
  if (!context) throw new Error('useStudentRecords must be used within StudentRecordsProvider')
  return context
}
