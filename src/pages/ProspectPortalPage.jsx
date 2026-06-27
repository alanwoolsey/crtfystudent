import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FileUp, KeyRound, RefreshCw, Save, Upload } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import StatCard from '../components/StatCard'
import { useAuth } from '../context/AuthContext'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const importBaseUrl = `${apiBaseUrl}/api/v1/prospects`

const targetFields = [
  ['ignore', 'Ignore'],
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['email', 'Email'],
  ['mobilePhone', 'Mobile phone'],
  ['externalSourceId', 'External source ID'],
  ['academicInterest', 'Academic interest'],
  ['entryTerm', 'Entry term'],
  ['studentType', 'Student type'],
  ['lifecycleStage', 'Lifecycle stage'],
  ['highSchool', 'High school'],
  ['highSchoolGradYear', 'High school grad year'],
  ['addressLine1', 'Address'],
  ['city', 'City'],
  ['state', 'State'],
  ['postalCode', 'Postal code'],
  ['sourceDetail', 'Source detail'],
]

const sourceTypes = [
  ['college_board_search', 'College Board Search'],
  ['search_list', 'Search list'],
  ['college_fair', 'College fair'],
  ['rfi', 'RFI / inquiry form'],
  ['event', 'Event'],
  ['application_start', 'Application start'],
  ['application_submit', 'Application submit'],
  ['athletic_recruit', 'Athletic recruit'],
  ['partner_referral', 'Partner referral'],
  ['manual_import', 'Manual import'],
]

const fieldGuesses = [
  [/first.*name|given/i, 'firstName'],
  [/last.*name|family|surname/i, 'lastName'],
  [/e-?mail/i, 'email'],
  [/mobile|cell|phone/i, 'mobilePhone'],
  [/external|source.*id|student.*id|prospect.*id/i, 'externalSourceId'],
  [/program|major|academic.*interest|interest/i, 'academicInterest'],
  [/term|entry/i, 'entryTerm'],
  [/student.*type|population/i, 'studentType'],
  [/stage|status/i, 'lifecycleStage'],
  [/high.*school|school/i, 'highSchool'],
  [/grad.*year|graduation/i, 'highSchoolGradYear'],
  [/address/i, 'addressLine1'],
  [/city/i, 'city'],
  [/state/i, 'state'],
  [/zip|postal/i, 'postalCode'],
  [/campaign|source.*detail/i, 'sourceDetail'],
]

function detectDelimiter(line) {
  const candidates = [',', '\t', ';', '|']
  return candidates
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ','
}

function parseCsv(text) {
  const delimiter = detectDelimiter(text.split(/\r?\n/).find((line) => line.trim()) || '')
  const rows = []
  let row = []
  let value = ''
  let inQuotes = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && inQuotes && next === '"') {
      value += '"'
      index += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      row.push(value)
      value = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }
  row.push(value)
  if (row.some((cell) => cell.trim())) rows.push(row)
  const headers = rows.shift()?.map((cell) => cell.trim()) || []
  const records = rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] || '').trim()])))
  return { headers, records, delimiter }
}

function guessMapping(headers) {
  return Object.fromEntries(headers.map((header) => {
    const match = fieldGuesses.find(([pattern]) => pattern.test(header))
    return [header, match ? match[1] : 'ignore']
  }))
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function emptyCounts() {
  return { total: 0, new: 0, matched: 0, duplicates: 0, errors: 0, missingContact: 0, invalidEmail: 0, invalidPhone: 0, missingAcademicInterest: 0, created: 0, updated: 0, skipped: 0 }
}

export default function ProspectPortalPage() {
  const { fetchWithTenantAuth } = useAuth()
  const [sources, setSources] = useState([])
  const [imports, setImports] = useState([])
  const [templates, setTemplates] = useState([])
  const [rules, setRules] = useState([])
  const [schedules, setSchedules] = useState([])
  const [credentials, setCredentials] = useState([])
  const [exceptions, setExceptions] = useState([])
  const [reporting, setReporting] = useState({ sources: [], importPerformance: [], duplicateAndErrorTrend: [], totals: {} })
  const [sourceForm, setSourceForm] = useState({ name: '', sourceType: 'college_board_search', defaultEntryTerm: '', defaultStudentType: 'first_year' })
  const [templateName, setTemplateName] = useState('')
  const [ruleForm, setRuleForm] = useState({ name: '', field: 'state', operator: 'equals', value: '', ownerUserId: '', ownerTeamId: '', territory: '', priority: 100 })
  const [scheduleForm, setScheduleForm] = useState({ deliveryMethod: 'sftp', inboundFolder: '', schedule: 'daily 06:00', failureNotificationEmail: '' })
  const [credentialName, setCredentialName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [csvFileName, setCsvFileName] = useState('')
  const [delimiter, setDelimiter] = useState(',')
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [sourceDetail, setSourceDetail] = useState('')
  const [preview, setPreview] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const counts = preview?.counts || emptyCounts()
  const selectedSource = useMemo(() => sources.find((source) => source.id === selectedSourceId), [selectedSourceId, sources])

  async function loadImportWorkspace() {
    setError('')
    const [
      sourcesResponse,
      importsResponse,
      templatesResponse,
      rulesResponse,
      schedulesResponse,
      credentialsResponse,
      exceptionsResponse,
      reportingResponse,
    ] = await Promise.all([
      fetchWithTenantAuth(`${importBaseUrl}/import-sources`),
      fetchWithTenantAuth(`${importBaseUrl}/imports`),
      fetchWithTenantAuth(`${importBaseUrl}/import-templates`),
      fetchWithTenantAuth(`${importBaseUrl}/assignment-rules`),
      fetchWithTenantAuth(`${importBaseUrl}/scheduled-imports`),
      fetchWithTenantAuth(`${importBaseUrl}/api-credentials`),
      fetchWithTenantAuth(`${importBaseUrl}/import-exceptions`),
      fetchWithTenantAuth(`${importBaseUrl}/source-reporting`),
    ])
    if (!sourcesResponse.ok) throw new Error(`Sources failed with ${sourcesResponse.status}`)
    if (!importsResponse.ok) throw new Error(`Import history failed with ${importsResponse.status}`)
    const sourcesPayload = await sourcesResponse.json()
    const importsPayload = await importsResponse.json()
    setSources(sourcesPayload.sources || [])
    setImports(importsPayload.imports || [])
    setTemplates(templatesResponse.ok ? (await templatesResponse.json()).templates || [] : [])
    setRules(rulesResponse.ok ? (await rulesResponse.json()).rules || [] : [])
    setSchedules(schedulesResponse.ok ? (await schedulesResponse.json()).schedules || [] : [])
    setCredentials(credentialsResponse.ok ? (await credentialsResponse.json()).credentials || [] : [])
    setExceptions(exceptionsResponse.ok ? (await exceptionsResponse.json()).exceptions || [] : [])
    setReporting(reportingResponse.ok ? await reportingResponse.json() : { sources: [], importPerformance: [], duplicateAndErrorTrend: [], totals: {} })
    if (!selectedSourceId && sourcesPayload.sources?.[0]) setSelectedSourceId(sourcesPayload.sources[0].id)
  }

  useEffect(() => {
    loadImportWorkspace().catch((loadError) => setError(loadError.message || 'Unable to load prospect sources.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createSource(event) {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetchWithTenantAuth(`${importBaseUrl}/import-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceForm),
      })
      if (!response.ok) throw new Error((await response.json()).detail || `Create source failed with ${response.status}`)
      const source = await response.json()
      setSources((current) => [...current, source].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedSourceId(source.id)
      setSourceForm({ name: '', sourceType: 'college_board_search', defaultEntryTerm: '', defaultStudentType: 'first_year' })
      setMessage('Prospect source created.')
    } catch (sourceError) {
      setError(sourceError.message || 'Unable to create prospect source.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCsvUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const parsed = parseCsv(text)
    setCsvFileName(file.name)
    setHeaders(parsed.headers)
    setRows(parsed.records)
    setDelimiter(parsed.delimiter)
    setMapping(guessMapping(parsed.headers))
    setPreview(null)
    setMessage(`${parsed.records.length} rows loaded from ${file.name}.`)
  }

  function applyTemplate(templateId) {
    setSelectedTemplateId(templateId)
    const template = templates.find((item) => item.id === templateId)
    if (!template) return
    setMapping(template.fieldMappings || {})
    setSourceDetail(template.sourceDetail || sourceDetail)
    setMessage(`Applied template ${template.name}.`)
  }

  function buildImportPayload() {
    return {
      sourceId: selectedSourceId || null,
      filename: csvFileName || 'prospects.csv',
      sourceName: selectedSource?.name || null,
      sourceType: selectedSource?.sourceType || null,
      sourceCategory: selectedSource?.sourceCategory || 'recruitment',
      sourceDetail,
      mapping,
      rows,
      templateId: selectedTemplateId || null,
      importMode: 'create_or_update',
    }
  }

  async function createTemplate() {
    if (!templateName.trim()) return
    setIsLoading(true)
    setError('')
    try {
      const response = await fetchWithTenantAuth(`${importBaseUrl}/import-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          sourceType: selectedSource?.sourceType || 'manual_import',
          sourceDetail,
          defaultLifecycleStage: selectedSource?.defaultLifecycleStage || 'prospect',
          fieldMappings: mapping,
        }),
      })
      if (!response.ok) throw new Error((await response.json()).detail || `Save template failed with ${response.status}`)
      const template = await response.json()
      setTemplates((current) => [template, ...current])
      setSelectedTemplateId(template.id)
      setTemplateName('')
      setMessage('Import template saved.')
    } catch (templateError) {
      setError(templateError.message || 'Unable to save import template.')
    } finally {
      setIsLoading(false)
    }
  }

  async function createRule(event) {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const response = await fetchWithTenantAuth(`${importBaseUrl}/assignment-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ruleForm, sourceId: selectedSourceId || null, priority: Number(ruleForm.priority) || 100 }),
      })
      if (!response.ok) throw new Error((await response.json()).detail || `Create rule failed with ${response.status}`)
      const rule = await response.json()
      setRules((current) => [rule, ...current])
      setRuleForm({ name: '', field: 'state', operator: 'equals', value: '', ownerUserId: '', ownerTeamId: '', territory: '', priority: 100 })
      setMessage('Assignment rule saved.')
    } catch (ruleError) {
      setError(ruleError.message || 'Unable to save assignment rule.')
    } finally {
      setIsLoading(false)
    }
  }

  async function createSchedule(event) {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const response = await fetchWithTenantAuth(`${importBaseUrl}/scheduled-imports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scheduleForm, sourceId: selectedSourceId || null, mappingTemplateId: selectedTemplateId || null }),
      })
      if (!response.ok) throw new Error((await response.json()).detail || `Create schedule failed with ${response.status}`)
      const schedule = await response.json()
      setSchedules((current) => [schedule, ...current])
      setMessage('Scheduled import saved.')
    } catch (scheduleError) {
      setError(scheduleError.message || 'Unable to save scheduled import.')
    } finally {
      setIsLoading(false)
    }
  }

  async function createCredential(event) {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    setApiKey('')
    try {
      const response = await fetchWithTenantAuth(`${importBaseUrl}/api-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: credentialName, sourceId: selectedSourceId || null }),
      })
      if (!response.ok) throw new Error((await response.json()).detail || `Create API key failed with ${response.status}`)
      const credential = await response.json()
      setCredentials((current) => [credential, ...current])
      setApiKey(credential.apiKey || '')
      setCredentialName('')
      setMessage('API credential created.')
    } catch (credentialError) {
      setError(credentialError.message || 'Unable to create API credential.')
    } finally {
      setIsLoading(false)
    }
  }

  async function resolveException(exceptionId) {
    const response = await fetchWithTenantAuth(`${importBaseUrl}/import-exceptions/${exceptionId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution: 'Resolved from Prospect Sources workspace.' }),
    })
    if (response.ok) {
      const resolved = await response.json()
      setExceptions((current) => current.map((item) => (item.id === exceptionId ? resolved : item)))
    }
  }

  async function downloadErrors(batchId) {
    const response = await fetchWithTenantAuth(`${importBaseUrl}/imports/${batchId}/errors`)
    if (!response.ok) return
    const payload = await response.json()
    const blob = new Blob([payload.content || ''], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = payload.filename || `prospect-import-errors-${batchId}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function previewImport() {
    setIsLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetchWithTenantAuth(`${importBaseUrl}/imports/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildImportPayload()),
      })
      if (!response.ok) throw new Error((await response.json()).detail || `Preview failed with ${response.status}`)
      setPreview(await response.json())
    } catch (previewError) {
      setError(previewError.message || 'Unable to preview import.')
    } finally {
      setIsLoading(false)
    }
  }

  async function confirmImport() {
    setIsLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetchWithTenantAuth(`${importBaseUrl}/imports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildImportPayload()),
      })
      if (!response.ok) throw new Error((await response.json()).detail || `Import failed with ${response.status}`)
      const result = await response.json()
      setPreview((current) => ({ ...(current || {}), counts: result.counts, issues: result.issues }))
      setMessage(`Import completed. Created ${result.counts.created}, updated ${result.counts.updated}, skipped ${result.counts.skipped}.`)
      await loadImportWorkspace()
    } catch (importError) {
      setError(importError.message || 'Unable to confirm import.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Prospect sources"
        title="CSV prospect import"
        subtitle="Create import sources, map CSV fields, preview validation, and import prospects into Student 360."
        actions={(
          <button type="button" className="secondary-button" onClick={() => loadImportWorkspace()} disabled={isLoading}>
            <RefreshCw size={16} /> Refresh
          </button>
        )}
      />

      {error ? <div className="alert-banner error"><AlertCircle size={16} /> {error}</div> : null}
      {message ? <div className="alert-banner success"><CheckCircle2 size={16} /> {message}</div> : null}

      <section className="stats-grid">
        <StatCard stat={{ label: 'Rows loaded', value: rows.length, tone: 'indigo' }} />
        <StatCard stat={{ label: 'New prospects', value: counts.new, tone: 'teal' }} />
        <StatCard stat={{ label: 'Matched records', value: counts.matched, tone: 'violet' }} />
        <StatCard stat={{ label: 'Errors', value: counts.errors, tone: 'rose' }} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Source setup</h2>
            <p>Create a reusable source for College Board lists, fair scans, RFI forms, and partner files.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={createSource}>
          <label>
            Source name
            <input value={sourceForm.name} onChange={(event) => setSourceForm((current) => ({ ...current, name: event.target.value }))} placeholder="Fall 2026 College Board Search" />
          </label>
          <label>
            Source type
            <select value={sourceForm.sourceType} onChange={(event) => setSourceForm((current) => ({ ...current, sourceType: event.target.value }))}>
              {sourceTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Default entry term
            <input value={sourceForm.defaultEntryTerm} onChange={(event) => setSourceForm((current) => ({ ...current, defaultEntryTerm: event.target.value }))} placeholder="Fall 2026" />
          </label>
          <label>
            Default student type
            <select value={sourceForm.defaultStudentType} onChange={(event) => setSourceForm((current) => ({ ...current, defaultStudentType: event.target.value }))}>
              <option value="first_year">First year</option>
              <option value="transfer">Transfer</option>
              <option value="graduate">Graduate</option>
              <option value="adult_learner">Adult learner</option>
              <option value="dual_enrollment">Dual enrollment</option>
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={isLoading || !sourceForm.name.trim()}>
              <Save size={16} /> Save source
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Upload and map CSV</h2>
            <p>Required mapping: first name, last name, and at least one contact or identifying field.</p>
          </div>
          <label className="secondary-button">
            <FileUp size={16} /> Choose CSV
            <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} hidden />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Import source
            <select value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)}>
              <option value="">Manual import</option>
              {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
            </select>
          </label>
          <label>
            Source detail / campaign
            <input value={sourceDetail} onChange={(event) => setSourceDetail(event.target.value)} placeholder="Fall fair - Dallas" />
          </label>
          <label>
            File
            <input value={csvFileName || 'No CSV selected'} readOnly />
          </label>
          <label>
            Parsed rows
            <input value={rows.length} readOnly />
          </label>
          <label>
            Detected delimiter
            <input value={delimiter === '\t' ? 'Tab' : delimiter} readOnly />
          </label>
          <label>
            Saved template
            <select value={selectedTemplateId} onChange={(event) => applyTemplate(event.target.value)}>
              <option value="">No template</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
        </div>

        {headers.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CSV header</th>
                  <th>Maps to</th>
                  <th>Sample value</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((header) => (
                  <tr key={header}>
                    <td><strong>{header}</strong></td>
                    <td>
                      <select value={mapping[header] || 'ignore'} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))}>
                        {targetFields.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                    <td>{rows[0]?.[header] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="form-actions">
          <input
            className="inline-action-input"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            placeholder="Template name"
          />
          <button type="button" className="secondary-button" onClick={createTemplate} disabled={isLoading || !headers.length || !templateName.trim()}>
            <Save size={16} /> Save mapping
          </button>
          <button type="button" className="secondary-button" onClick={previewImport} disabled={isLoading || !rows.length}>
            <Upload size={16} /> Preview import
          </button>
          <button type="button" className="primary-button" onClick={confirmImport} disabled={isLoading || !preview || counts.errors > 0}>
            <CheckCircle2 size={16} /> Confirm import
          </button>
        </div>
      </section>

      {preview ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Preview results</h2>
              <p>{counts.total} total, {counts.new} new, {counts.matched} matched, {counts.duplicates} duplicates, {counts.errors} errors.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Action</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Interest</th>
                  <th>Term</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {(preview.rows || []).slice(0, 50).map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td><span className="tag">{row.action}</span></td>
                    <td>{[row.firstName, row.lastName].filter(Boolean).join(' ') || '-'}</td>
                    <td>{row.email || '-'}</td>
                    <td>{row.phone || '-'}</td>
                    <td>{row.academicInterest || '-'}</td>
                    <td>{row.entryTerm || '-'}</td>
                    <td>{row.issues?.map((issue) => issue.message).join(' ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Import history</h2>
            <p>Recent source files imported into this tenant.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Source</th>
                <th>Date</th>
                <th>Rows</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Errors</th>
                <th>Batch ID</th>
              </tr>
            </thead>
            <tbody>
              {imports.length ? imports.map((item) => (
                <tr key={item.batchId}>
                  <td>{item.filename}</td>
                  <td>{item.sourceName || 'Manual import'}</td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>{item.counts?.total ?? 0}</td>
                  <td>{item.counts?.created ?? 0}</td>
                  <td>{item.counts?.updated ?? 0}</td>
                  <td>{item.counts?.errors ?? 0}</td>
                  <td className="wrap-id">
                    {item.batchId}
                    {item.counts?.errors ? (
                      <button type="button" className="secondary-button compact-button" onClick={() => downloadErrors(item.batchId)}>
                        <Download size={14} /> Errors
                      </button>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8">No imports yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Assignment rules</h2>
            <p>Route imported prospects by state, academic interest, student type, or other mapped values.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={createRule}>
          <label>
            Rule name
            <input value={ruleForm.name} onChange={(event) => setRuleForm((current) => ({ ...current, name: event.target.value }))} placeholder="Texas nursing leads" />
          </label>
          <label>
            Field
            <select value={ruleForm.field} onChange={(event) => setRuleForm((current) => ({ ...current, field: event.target.value }))}>
              {targetFields.filter(([value]) => value !== 'ignore').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Operator
            <select value={ruleForm.operator} onChange={(event) => setRuleForm((current) => ({ ...current, operator: event.target.value }))}>
              <option value="equals">Equals</option>
              <option value="contains">Contains</option>
              <option value="starts_with">Starts with</option>
              <option value="in">In list</option>
            </select>
          </label>
          <label>
            Value
            <input value={ruleForm.value} onChange={(event) => setRuleForm((current) => ({ ...current, value: event.target.value }))} placeholder="TX" />
          </label>
          <label>
            Owner user ID
            <input value={ruleForm.ownerUserId} onChange={(event) => setRuleForm((current) => ({ ...current, ownerUserId: event.target.value }))} placeholder="Optional user UUID" />
          </label>
          <label>
            Team
            <input value={ruleForm.ownerTeamId} onChange={(event) => setRuleForm((current) => ({ ...current, ownerTeamId: event.target.value }))} placeholder="Admissions" />
          </label>
          <label>
            Territory
            <input value={ruleForm.territory} onChange={(event) => setRuleForm((current) => ({ ...current, territory: event.target.value }))} placeholder="North Texas" />
          </label>
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={isLoading || !ruleForm.name.trim() || !ruleForm.value.trim()}>
              <Save size={16} /> Save rule
            </button>
          </div>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Condition</th><th>Owner</th><th>Team</th><th>Territory</th></tr>
            </thead>
            <tbody>
              {rules.length ? rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.name}</td>
                  <td>{rule.field} {rule.operator} {rule.value}</td>
                  <td>{rule.ownerUserId || '-'}</td>
                  <td>{rule.ownerTeamId || '-'}</td>
                  <td>{rule.territory || '-'}</td>
                </tr>
              )) : <tr><td colSpan="5">No assignment rules yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Automation and API</h2>
            <p>Configure scheduled file drops and API credentials for external prospect systems.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={createSchedule}>
          <label>
            Delivery
            <select value={scheduleForm.deliveryMethod} onChange={(event) => setScheduleForm((current) => ({ ...current, deliveryMethod: event.target.value }))}>
              <option value="sftp">SFTP</option>
              <option value="s3">S3</option>
            </select>
          </label>
          <label>
            Inbound folder
            <input value={scheduleForm.inboundFolder} onChange={(event) => setScheduleForm((current) => ({ ...current, inboundFolder: event.target.value }))} placeholder="/incoming/prospects" />
          </label>
          <label>
            Schedule
            <input value={scheduleForm.schedule} onChange={(event) => setScheduleForm((current) => ({ ...current, schedule: event.target.value }))} placeholder="daily 06:00" />
          </label>
          <label>
            Failure email
            <input value={scheduleForm.failureNotificationEmail} onChange={(event) => setScheduleForm((current) => ({ ...current, failureNotificationEmail: event.target.value }))} placeholder="ops@example.edu" />
          </label>
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={isLoading}>
              <Save size={16} /> Save schedule
            </button>
          </div>
        </form>
        <form className="form-grid" onSubmit={createCredential}>
          <label>
            API key name
            <input value={credentialName} onChange={(event) => setCredentialName(event.target.value)} placeholder="Slate inbound" />
          </label>
          <div className="form-actions">
            <button type="submit" className="secondary-button" disabled={isLoading || !credentialName.trim()}>
              <KeyRound size={16} /> Create API key
            </button>
          </div>
          {apiKey ? <label className="wide-form-field">New key<input value={apiKey} readOnly /></label> : null}
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Schedule</th><th>Delivery</th><th>Folder</th><th>Status</th><th>API credential</th><th>Key prefix</th></tr>
            </thead>
            <tbody>
              {(schedules.length || credentials.length) ? (
                <>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}><td>{schedule.schedule || '-'}</td><td>{schedule.deliveryMethod}</td><td>{schedule.inboundFolder || '-'}</td><td>{schedule.status}</td><td>-</td><td>-</td></tr>
                  ))}
                  {credentials.map((credential) => (
                    <tr key={credential.id}><td>-</td><td>API</td><td>-</td><td>{credential.active ? 'active' : 'inactive'}</td><td>{credential.name}</td><td>{credential.keyPrefix}</td></tr>
                  ))}
                </>
              ) : <tr><td colSpan="6">No automation configured.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Exceptions and reporting</h2>
            <p>Review import exceptions and source performance.</p>
          </div>
        </div>
        <div className="stats-grid">
          <StatCard stat={{ label: 'Sources', value: reporting.totals?.sources || 0, tone: 'indigo' }} />
          <StatCard stat={{ label: 'Imports', value: reporting.totals?.imports || 0, tone: 'teal' }} />
          <StatCard stat={{ label: 'Duplicates', value: reporting.totals?.duplicates || 0, tone: 'violet' }} />
          <StatCard stat={{ label: 'Open exceptions', value: exceptions.filter((item) => item.status !== 'resolved').length, tone: 'rose' }} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Exception</th><th>Status</th><th>Message</th><th>Batch</th><th>Action</th></tr>
            </thead>
            <tbody>
              {exceptions.length ? exceptions.slice(0, 20).map((item) => (
                <tr key={item.id}>
                  <td>{item.exceptionType}</td>
                  <td><span className="tag">{item.status}</span></td>
                  <td>{item.message}</td>
                  <td className="wrap-id">{item.batchId || '-'}</td>
                  <td>{item.status !== 'resolved' ? <button type="button" className="secondary-button compact-button" onClick={() => resolveException(item.id)}>Resolve</button> : '-'}</td>
                </tr>
              )) : <tr><td colSpan="5">No import exceptions.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Source</th><th>Prospects</th><th>Inquiries</th><th>Applications</th><th>Conversion</th></tr>
            </thead>
            <tbody>
              {reporting.sources?.length ? reporting.sources.map((source) => (
                <tr key={source.source}>
                  <td>{source.source}</td>
                  <td>{source.prospects}</td>
                  <td>{source.inquiries}</td>
                  <td>{source.applications}</td>
                  <td>{source.conversionRate}%</td>
                </tr>
              )) : <tr><td colSpan="5">No source reporting yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
