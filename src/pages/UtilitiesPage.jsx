import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileUp, Settings2, UploadCloud, Wand2 } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import StatCard from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { uploadStoredDocument } from '../lib/documentStorage'

const importTypeOptions = [
  'Let crtfy detect it',
  'Students / Prospects',
  'Applications',
  'Test Scores',
  'Coursework / Transcript Lines',
  'Events / Visits',
  'Communications',
  'Custom list',
]

const supportedExamples = [
  'Student prospects',
  'Inquiries',
  'Applications',
  'Test scores',
  'High school data',
  'Transfer coursework',
  'Counselor assignments',
  'Tags / populations / campaigns',
]

const initialFileSettings = {
  delimiter: '',
  headerRow: 1,
  skipRows: 0,
  encoding: 'UTF-8',
  blankValues: 'Do not update existing values',
  trimWhitespace: 'Trim whitespace',
  capitalization: 'Preserve source values',
}

const delimiterOptions = [
  { label: 'Auto detect', value: '' },
  { label: 'Comma', value: ',' },
  { label: 'Tab', value: '\t' },
  { label: 'Pipe', value: '|' },
  { label: 'Semicolon', value: ';' },
]

function detectDelimiter(line) {
  const candidates = [
    { label: 'Comma', value: ',', count: line.split(',').length },
    { label: 'Tab', value: '\t', count: line.split('\t').length },
    { label: 'Pipe', value: '|', count: line.split('|').length },
    { label: 'Semicolon', value: ';', count: line.split(';').length },
  ]
  return candidates.sort((first, second) => second.count - first.count)[0] || candidates[0]
}

function delimiterFromValue(value, firstLine) {
  if (!value) return detectDelimiter(firstLine)
  return delimiterOptions.find((option) => option.value === value && option.value) || detectDelimiter(firstLine)
}

function parseDelimitedText(text, delimiter) {
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
      if (row.some((cell) => String(cell).trim())) rows.push(row.map((cell) => String(cell)))
      row = []
      value = ''
    } else {
      value += char
    }
  }

  row.push(value)
  if (row.some((cell) => String(cell).trim())) rows.push(row.map((cell) => String(cell)))
  return rows
}

function inferImportType(headers) {
  const normalized = headers.map((header) => header.toLowerCase())
  const hasAny = (words) => words.some((word) => normalized.some((header) => header.includes(word)))
  if (hasAny(['act', 'sat', 'score'])) return { label: 'Test Scores', confidence: 86 }
  if (hasAny(['course', 'credits', 'grade'])) return { label: 'Coursework / Transcript Lines', confidence: 82 }
  if (hasAny(['event', 'visit', 'attended'])) return { label: 'Events / Visits', confidence: 78 }
  if (hasAny(['application', 'submitted', 'app status'])) return { label: 'Applications', confidence: 84 }
  if (hasAny(['first', 'last', 'email', 'phone', 'program', 'major'])) return { label: 'Students / Prospects', confidence: 92 }
  return { label: 'Students / Prospects', confidence: 62 }
}

function countPossibleDuplicates(rows, headers) {
  const emailIndex = headers.findIndex((header) => /mail/i.test(header))
  const idIndex = headers.findIndex((header) => /external|source.*id|student.*id|prospect.*id/i.test(header))
  const seen = new Set()
  let duplicates = 0
  rows.forEach((row) => {
    const key = [emailIndex >= 0 ? row[emailIndex] : '', idIndex >= 0 ? row[idIndex] : ''].filter(Boolean).join('|').toLowerCase()
    if (!key) return
    if (seen.has(key)) duplicates += 1
    else seen.add(key)
  })
  return duplicates
}

function normalizeDataRows(rows, settings) {
  return rows.map((row) => row.map((cell) => {
    let nextCell = settings.trimWhitespace === 'Preserve whitespace' ? String(cell) : String(cell).trim()
    if (settings.capitalization === 'Title case names') {
      nextCell = nextCell.replace(/\b\w/g, (letter) => letter.toUpperCase())
    } else if (settings.capitalization === 'Uppercase values') {
      nextCell = nextCell.toUpperCase()
    } else if (settings.capitalization === 'Lowercase values') {
      nextCell = nextCell.toLowerCase()
    }
    return nextCell
  }))
}

function analyzeFileText(text, settings = initialFileSettings) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || ''
  const delimiter = delimiterFromValue(settings.delimiter, firstLine)
  const parsedRows = parseDelimitedText(text, delimiter.value)
  const headerIndex = Math.max(0, Number(settings.headerRow || 1) - 1)
  const rowsFromHeader = parsedRows.slice(headerIndex)
  const headers = (rowsFromHeader[0] || []).map((header) => String(header).trim())
  const dataRows = normalizeDataRows(rowsFromHeader.slice(1 + Math.max(0, Number(settings.skipRows || 0))), settings)
  const inferredType = inferImportType(headers)
  const blankRows = Math.max(0, text.split(/\r?\n/).length - parsedRows.length)
  const issueRows = dataRows.filter((row) => row.length !== headers.length || row.every((cell) => !cell)).length
  const possibleDuplicates = countPossibleDuplicates(dataRows, headers)

  return {
    delimiter,
    headers,
    rows: dataRows,
    previewRows: dataRows.slice(0, 50),
    rowCount: dataRows.length,
    columnCount: headers.length,
    blankRows,
    headerRow: headerIndex + 1,
    skipRows: Math.max(0, Number(settings.skipRows || 0)),
    quotedValues: /"[^"]*[,;\t|][^"]*"/.test(text),
    likelyImportType: inferredType.label,
    confidence: inferredType.confidence,
    possibleDuplicates,
    issueRows,
  }
}

export default function UtilitiesPage() {
  const { currentUser, session } = useAuth()
  const [activeUtility, setActiveUtility] = useState('import')
  const [step, setStep] = useState(1)
  const [selectedImportType, setSelectedImportType] = useState('Let crtfy detect it')
  const [fileState, setFileState] = useState({ file: null, storedDocument: null, analysis: null })
  const [fileText, setFileText] = useState('')
  const [fileSettings, setFileSettings] = useState(initialFileSettings)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  const roles = Array.isArray(currentUser?.roles) ? currentUser.roles : []
  const isTenantAdmin = currentUser?.baseRole === 'tenant_admin' || currentUser?.baseRole === 'master_tenant_admin' || roles.includes('tenant_admin') || roles.includes('master_tenant_admin')
  const tenantName = currentUser?.tenantName || session?.tenant_name || session?.tenant_code || 'Current tenant'
  const analysis = fileState.analysis
  const statCards = useMemo(() => ([
    { label: 'Rows found', value: analysis?.rowCount ?? 0, tone: 'indigo' },
    { label: 'Columns found', value: analysis?.columnCount ?? 0, tone: 'teal' },
    { label: 'Confidence', value: analysis ? `${analysis.confidence}%` : '0%', tone: 'violet' },
    { label: 'Issue rows', value: analysis?.issueRows ?? 0, tone: 'rose' },
  ]), [analysis])

  async function handleSelectedFile(file) {
    if (!file) return
    setError('')
    setMessage('')
    if (!session?.tenant_id || !session?.access_token) {
      setError('Unable to upload this import because your tenant or access token is missing. Refresh access and try again.')
      return
    }
    setIsUploading(true)
    try {
      const text = await file.text()
      const nextSettings = initialFileSettings
      const nextAnalysis = analyzeFileText(text, nextSettings)
      const storedDocument = await uploadStoredDocument(file, {
        title: file.name,
        documentType: 'Prospect Import CSV',
        department: 'Admissions',
        tags: ['utilities', 'prospect-import', 'csv-wizard'],
        notes: 'Uploaded from crtfy Student Utilities import CSV wizard.',
        tenantId: session?.tenant_id,
        accessToken: session?.access_token,
        userEmail: session?.email || session?.username,
        actor: session?.username || session?.email || 'crtfy-student',
      })
      setFileText(text)
      setFileSettings(nextSettings)
      setFileState({ file, storedDocument, analysis: nextAnalysis })
      setSelectedImportType(nextAnalysis.likelyImportType)
      setStep(2)
      setMessage(`Stored ${file.name} in crtfy Documents and analyzed the file.`)
    } catch (nextError) {
      setError(nextError.message || 'Unable to upload and analyze file.')
    } finally {
      setIsUploading(false)
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    handleSelectedFile(event.dataTransfer.files?.[0])
  }

  function updateFileSetting(key, value) {
    const nextSettings = { ...fileSettings, [key]: value }
    setFileSettings(nextSettings)
    if (fileText) {
      setFileState((current) => ({
        ...current,
        analysis: analyzeFileText(fileText, nextSettings),
      }))
    }
  }

  if (!isTenantAdmin) {
    return (
      <div className="page-wrap">
        <section className="panel">
          <p className="muted-copy">Utilities are available to tenant admins and master tenant admins.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-wrap utilities-page">
      <SectionHeader
        eyebrow="Admin utilities"
        title="Utilities"
        subtitle="Operational tools for tenant admins. Start with guided CSV imports, then add more cleanup and bulk-action utilities over time."
        actions={<span className="tag">Tenant: {tenantName}</span>}
      />

      {error ? <div className="alert-banner error"><AlertCircle size={16} /> {error}</div> : null}
      {message ? <div className="alert-banner success"><CheckCircle2 size={16} /> {message}</div> : null}

      <section className="value-grid utilities-grid">
        <button type="button" className={`utility-card ${activeUtility === 'import' ? 'active' : ''}`} onClick={() => setActiveUtility('import')}>
          <FileSpreadsheet size={22} />
          <strong>Import CSV Wizard</strong>
          <span>Upload, detect, preview, map, validate, and import student prospect files.</span>
        </button>
        {['Bulk update students', 'Import history', 'Data cleanup', 'Assignment rule tester', 'Export reports'].map((label) => (
          <button key={label} type="button" className="utility-card disabled" disabled>
            <Settings2 size={22} />
            <strong>{label}</strong>
            <span>Coming later.</span>
          </button>
        ))}
      </section>

      <section className="panel import-wizard-panel">
        <div className="wizard-steps">
          {['Upload file', 'Confirm type', 'Map columns', 'Review issues', 'Import'].map((label, index) => (
            <div key={label} className={`wizard-step ${step === index + 1 ? 'active' : ''} ${step > index + 1 ? 'complete' : ''}`}>
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </div>

        <div className="panel-header">
          <div>
            <h2>Import data</h2>
            <p>Upload messy files. crtfy maps, validates, deduplicates, and imports clean student records.</p>
          </div>
          {fileState.storedDocument?.documentId ? <span className="tag">Stored document: {fileState.storedDocument.documentId}</span> : null}
        </div>

        <div className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <UploadCloud size={34} />
          <strong>{isUploading ? 'Uploading to crtfy Documents...' : 'Drop your CSV or TSV file here'}</strong>
          <span>crtfy will automatically detect delimiter, headers, record type, and likely field mappings.</span>
          <label className="secondary-button">
            <FileUp size={16} /> Browse files
            <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" hidden onChange={(event) => handleSelectedFile(event.target.files?.[0])} />
          </label>
        </div>

        <div className="tag-row">
          {supportedExamples.map((example) => <span key={example} className="tag">{example}</span>)}
        </div>

        {analysis ? (
          <>
            <section className="stats-grid">
              {statCards.map((stat) => <StatCard key={stat.label} stat={stat} />)}
            </section>

            <div className="dashboard-grid two-up">
              <article className="panel inner-panel">
                <div className="panel-header">
                  <div>
                    <h3>File detection</h3>
                    <p>We found the basic file shape and likely import type.</p>
                  </div>
                </div>
                <div className="detail-grid">
                  <div><span>File</span><strong>{fileState.file?.name}</strong></div>
                  <div><span>Delimiter</span><strong>{analysis.delimiter.label}</strong></div>
                  <div><span>Header row</span><strong>Row {analysis.headerRow}</strong></div>
                  <div><span>Quoted values</span><strong>{analysis.quotedValues ? 'Detected' : 'Not detected'}</strong></div>
                  <div><span>Blank rows</span><strong>{analysis.blankRows}</strong></div>
                  <div><span>Possible duplicates</span><strong>{analysis.possibleDuplicates}</strong></div>
                </div>
              </article>

              <article className="panel inner-panel">
                <div className="panel-header">
                  <div>
                    <h3>What are you importing?</h3>
                    <p>Confirm the detected type before moving to mapping.</p>
                  </div>
                </div>
                <label className="auth-field">
                  <span>Import type</span>
                  <select value={selectedImportType} onChange={(event) => setSelectedImportType(event.target.value)}>
                    {importTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <div className="assistant-suggestion">
                  <Wand2 size={18} />
                  <span>Likely import type: <strong>{analysis.likelyImportType}</strong> with {analysis.confidence}% confidence.</span>
                </div>
                <button type="button" className="secondary-button" onClick={() => setIsAdvancedOpen((current) => !current)}>
                  Advanced file settings
                </button>
              </article>
            </div>

            {isAdvancedOpen ? (
              <section className="panel inner-panel">
                <div className="panel-header">
                  <div>
                    <h3>Advanced file settings</h3>
                    <p>These controls are placeholders for Phase 3 settings and show the detected defaults.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label>
                    <span>Delimiter</span>
                    <select value={fileSettings.delimiter} onChange={(event) => updateFileSetting('delimiter', event.target.value)}>
                      {delimiterOptions.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Header row</span>
                    <input type="number" min="1" value={fileSettings.headerRow} onChange={(event) => updateFileSetting('headerRow', event.target.value)} />
                  </label>
                  <label>
                    <span>Skip rows before import</span>
                    <input type="number" min="0" value={fileSettings.skipRows} onChange={(event) => updateFileSetting('skipRows', event.target.value)} />
                  </label>
                  <label>
                    <span>Encoding</span>
                    <select value={fileSettings.encoding} onChange={(event) => updateFileSetting('encoding', event.target.value)}>
                      <option>UTF-8</option>
                      <option>Windows-1252</option>
                      <option>ISO-8859-1</option>
                    </select>
                  </label>
                  <label>
                    <span>Blank values</span>
                    <select value={fileSettings.blankValues} onChange={(event) => updateFileSetting('blankValues', event.target.value)}>
                      <option>Do not update existing values</option>
                      <option>Clear existing values</option>
                      <option>Import blank values as empty text</option>
                    </select>
                  </label>
                  <label>
                    <span>Whitespace</span>
                    <select value={fileSettings.trimWhitespace} onChange={(event) => updateFileSetting('trimWhitespace', event.target.value)}>
                      <option>Trim whitespace</option>
                      <option>Preserve whitespace</option>
                    </select>
                  </label>
                  <label>
                    <span>Capitalization</span>
                    <select value={fileSettings.capitalization} onChange={(event) => updateFileSetting('capitalization', event.target.value)}>
                      <option>Preserve source values</option>
                      <option>Title case names</option>
                      <option>Uppercase values</option>
                      <option>Lowercase values</option>
                    </select>
                  </label>
                </div>
              </section>
            ) : null}

            <section className="panel inner-panel">
              <div className="panel-header">
                <div>
                  <h3>Preview grid</h3>
                  <p>Showing the first {Math.min(analysis.previewRows.length, 50)} rows.</p>
                </div>
              </div>
              <div className="table-wrap utilities-preview-table">
                <table>
                  <thead>
                    <tr>
                      {analysis.headers.map((header, columnIndex) => <th key={`${header}-${columnIndex}`}>{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.previewRows.map((row, rowIndex) => (
                      <tr key={`${rowIndex}-${row.join('|')}`}>
                        {analysis.headers.map((header, columnIndex) => <td key={`${header}-${rowIndex}-${columnIndex}`}>{row[columnIndex] || '-'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </section>
    </div>
  )
}
