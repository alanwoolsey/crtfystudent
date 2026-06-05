import { useMemo, useRef, useState } from 'react'
import { FileUp, Send, Sparkles, UserPlus } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import OperationalModeNotice from '../components/OperationalModeNotice'
import { useAuth } from '../context/AuthContext'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const inquiryUrl = `${apiBaseUrl}/api/v1/prospects/inquiries`
const transcriptFirstUploadUrl = `${apiBaseUrl}/api/v1/prospects/transcripts/uploads`

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  population: 'transfer',
  programInterest: 'BS Nursing Transfer',
  termInterest: 'Fall 2026',
  priorInstitution: '',
  source: 'manual_entry',
  sourceCategory: 'direct',
  campaign: '',
  consent: true,
  question: '',
}

function buildFallbackProspect(form, file) {
  const isTransfer = form.population === 'transfer'
  const program = form.programInterest || (isTransfer ? 'Transfer pathway pending' : 'Program fit pending')
  const transferCredits = file && isTransfer ? 42 : 0
  const fitScore = file ? 88 : 72
  const missingItems = file
    ? ['Official transcript review', isTransfer ? 'Transfer course confirmation' : 'Application form']
    : ['Transcript upload', 'Application form']

  return {
    prospectId: `prospect-${Date.now()}`,
    studentId: null,
    status: 'created_locally',
    mode: 'derived',
    studentName: [form.firstName, form.lastName].filter(Boolean).join(' ') || 'New prospect',
    programFit: {
      program,
      fitScore,
      confidence: file ? 0.82 : 0.58,
      transferCredits,
      estimatedCompletion: isTransfer && file ? '2.1 years' : 'Pending transcript',
      scholarshipPotential: fitScore >= 85 ? '$8.5k-$11k' : 'Review after application',
    },
    nextStep: {
      code: file ? 'start_application' : 'upload_transcript',
      label: file ? 'Start application' : 'Upload transcript',
      url: '',
    },
    counselor: {
      name: isTransfer ? 'Transfer admissions queue' : 'Admissions counselor queue',
      email: 'admissions@example.edu',
    },
    transcriptStatus: file ? 'Received for fit preview' : 'Not uploaded',
    missingItems,
    signals: [
      { label: 'Population', value: form.population },
      { label: 'Source', value: form.source },
      { label: 'Intent', value: form.question ? 'Question captured' : 'Program interest captured' },
    ],
  }
}

function normalizeProspectPayload(payload, fallback) {
  const prospect = payload?.prospect || payload || {}
  const fit = prospect.programFit || prospect.fit || prospect.fitSummary || {}
  const nextStep = prospect.nextStep || prospect.suggestedNextStep || {}

  return {
    ...fallback,
    ...prospect,
    mode: 'live',
    prospectId: prospect.prospectId || prospect.id || fallback.prospectId,
    studentName: prospect.studentName || prospect.name || fallback.studentName,
    programFit: {
      ...fallback.programFit,
      ...fit,
      program: fit.program || fit.programName || prospect.programInterest || fallback.programFit.program,
      fitScore: Number(fit.fitScore ?? fit.score ?? fallback.programFit.fitScore),
      transferCredits: Number(fit.transferCredits ?? fit.likelyAcceptedCredits ?? fallback.programFit.transferCredits),
    },
    nextStep: {
      ...fallback.nextStep,
      ...nextStep,
      label: nextStep.label || nextStep.title || fallback.nextStep.label,
    },
    counselor: prospect.counselor || prospect.owner || fallback.counselor,
    transcriptStatus: prospect.transcriptStatus || prospect.transcript?.status || fallback.transcriptStatus,
    missingItems: Array.isArray(prospect.missingItems)
      ? prospect.missingItems
      : Array.isArray(prospect.missingNextSteps)
        ? prospect.missingNextSteps
        : fallback.missingItems,
    signals: Array.isArray(prospect.signals) ? prospect.signals : fallback.signals,
  }
}

export default function ProspectPortalPage() {
  const { session, fetchWithTenantAuth } = useAuth()
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(initialForm)
  const [selectedFile, setSelectedFile] = useState(null)
  const [result, setResult] = useState(() => buildFallbackProspect(initialForm, null))
  const [mode, setMode] = useState('derived')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.consent
  const fitPercent = useMemo(() => {
    const score = Number(result?.programFit?.fitScore)
    if (!Number.isFinite(score)) return '-'
    return `${Math.round(score <= 1 ? score * 100 : score)}%`
  }, [result])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setForm(initialForm)
    setSelectedFile(null)
    setResult(buildFallbackProspect(initialForm, null))
    setMode('derived')
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function submitInquiry(event) {
    event.preventDefault()
    if (!canSubmit || !session?.access_token || !session?.tenant_id) return

    setIsSubmitting(true)
    setError('')
    const fallback = buildFallbackProspect(form, selectedFile)

    try {
      let uploadPayload = null

      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile, selectedFile.name)
        formData.append('email', form.email)
        formData.append('population', form.population)
        formData.append('programInterest', form.programInterest)
        formData.append('termInterest', form.termInterest)

        const uploadResponse = await fetchWithTenantAuth(transcriptFirstUploadUrl, {
          method: 'POST',
          body: formData,
        })
        uploadPayload = await uploadResponse.json().catch(() => ({}))

        if (!uploadResponse.ok) {
          throw new Error(uploadPayload?.detail || uploadPayload?.message || 'Unable to upload prospect transcript.')
        }
      }

      const response = await fetchWithTenantAuth(inquiryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          transcriptUploadId: uploadPayload?.uploadId || uploadPayload?.transcriptId || null,
          transcriptFilename: selectedFile?.name || null,
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.detail || payload?.message || 'Unable to create prospect.')
      }

      setResult(normalizeProspectPayload(payload, fallback))
      setMode('live')
    } catch (nextError) {
      setResult(fallback)
      setMode('derived')
      setError(nextError.message || 'Prospect APIs are not available yet. Showing a derived preview.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Inquiry capture"
        title="Prospect Portal"
        subtitle="Capture intent, transcript evidence, source attribution, and a next step before an application exists."
        actions={(
          <button type="button" className="secondary-button" onClick={resetForm}>
            Reset form
          </button>
        )}
      />

      <section className="dashboard-grid two-up">
        <form className="panel prospect-form-panel" onSubmit={submitInquiry}>
          <div className="panel-header">
            <div>
              <h3>Inquiry intake</h3>
              <p>Create a structured prospect record with source, program, term, consent, and optional transcript-first evidence.</p>
            </div>
            <UserPlus size={22} />
          </div>

          <div className="admin-form-grid">
            <label className="auth-field">
              <span>First name</span>
              <input value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} required />
            </label>
            <label className="auth-field">
              <span>Last name</span>
              <input value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} required />
            </label>
            <label className="auth-field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required />
            </label>
            <label className="auth-field">
              <span>Phone</span>
              <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </label>
            <label className="auth-field">
              <span>Student type</span>
              <select value={form.population} onChange={(event) => updateField('population', event.target.value)}>
                <option value="transfer">Transfer</option>
                <option value="first-year">First-year</option>
                <option value="graduate">Graduate</option>
                <option value="international">International</option>
                <option value="adult_learner">Adult learner</option>
                <option value="readmit">Readmit</option>
                <option value="dual_credit">Dual credit</option>
                <option value="military_veteran">Military / veteran</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Program interest</span>
              <input value={form.programInterest} onChange={(event) => updateField('programInterest', event.target.value)} />
            </label>
            <label className="auth-field">
              <span>Term interest</span>
              <input value={form.termInterest} onChange={(event) => updateField('termInterest', event.target.value)} />
            </label>
            <label className="auth-field">
              <span>Prior institution</span>
              <input value={form.priorInstitution} onChange={(event) => updateField('priorInstitution', event.target.value)} />
            </label>
            <label className="auth-field">
              <span>Source</span>
              <select value={form.source} onChange={(event) => updateField('source', event.target.value)}>
                <option value="manual_entry">Manual entry</option>
                <option value="external_form">External form</option>
                <option value="chatbot">Chatbot</option>
                <option value="event">Event</option>
                <option value="partner">Partner</option>
                <option value="referral">Referral</option>
                <option value="imported_list">Imported list</option>
                <option value="transcript_first">Transcript-first lead</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Campaign</span>
              <input value={form.campaign} onChange={(event) => updateField('campaign', event.target.value)} />
            </label>
          </div>

          <label className="auth-field">
            <span>Question or intent signal</span>
            <textarea value={form.question} onChange={(event) => updateField('question', event.target.value)} placeholder="What did the student ask, mention, or need?" />
          </label>

          <div className="prospect-upload-box">
            <input
              ref={fileInputRef}
              type="file"
              className="file-input-hidden"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
            <div>
              <strong>{selectedFile ? selectedFile.name : 'Optional transcript upload'}</strong>
              <p className="muted-copy">Attach an unofficial or official transcript to create a transcript-first lead and fit preview.</p>
            </div>
            <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
              <FileUp size={16} />
              Choose file
            </button>
          </div>

          <label className="admin-inline-check">
            <input type="checkbox" checked={form.consent} onChange={(event) => updateField('consent', event.target.checked)} />
            <span>Student consent captured for admissions follow-up.</span>
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <div className="password-actions">
            <button type="submit" className="primary-button" disabled={!canSubmit || isSubmitting}>
              <Send size={16} />
              {isSubmitting ? 'Creating prospect...' : 'Create prospect'}
            </button>
          </div>
        </form>

        <section className="panel prospect-result-panel">
          <OperationalModeNotice
            mode={mode}
            liveLabel="Live prospect"
            derivedLabel="Derived preview"
            error={mode === 'derived' ? error : ''}
          />

          <div className="panel-header">
            <div>
              <h3>{result.studentName}</h3>
              <p>{result.transcriptStatus}</p>
            </div>
            <Sparkles size={22} />
          </div>

          <div className="preview-card emphasis">
            <span className="table-sub">Best-fit program</span>
            <strong>{result.programFit.program}</strong>
            <p>{fitPercent} fit confidence - {result.programFit.transferCredits} likely accepted credits - {result.programFit.estimatedCompletion}</p>
          </div>

          <div className="preview-grid">
            <div className="preview-card">
              <span className="table-sub">Scholarship potential</span>
              <strong>{result.programFit.scholarshipPotential}</strong>
            </div>
            <div className="preview-card">
              <span className="table-sub">Next step</span>
              <strong>{result.nextStep.label}</strong>
            </div>
            <div className="preview-card">
              <span className="table-sub">Counselor</span>
              <strong>{result.counselor?.name || 'Unassigned'}</strong>
            </div>
            <div className="preview-card">
              <span className="table-sub">Prospect ID</span>
              <strong>{result.prospectId}</strong>
            </div>
          </div>

          <div className="callout-card">
            <h4>Missing next steps</h4>
            <div className="pill-row compact">
              {result.missingItems.map((item) => <span key={item} className="tag">{item}</span>)}
            </div>
          </div>

          <div className="stack-list">
            {result.signals.map((signal) => (
              <div key={`${signal.label}-${signal.value}`} className="stack-row">
                <strong>{signal.label}</strong>
                <span>{signal.value}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  )
}
