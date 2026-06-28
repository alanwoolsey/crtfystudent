import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileUp, History, Save, Settings2, UploadCloud, Wand2 } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import StatCard from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { useStudentRecords } from '../context/StudentRecordsContext'
import { isTenantAdminUser } from '../lib/access'
import { uploadStoredDocument } from '../lib/documentStorage'
import {
  createUtilityImportJob,
  listUtilityImportJobs,
  listUtilityImportTemplates,
  saveUtilityImportTemplate,
  updateUtilityImportJob,
} from '../lib/utilityImportsApi'

const importTypeOptions = ['Students / Prospects', 'Applications', 'Test Scores', 'Coursework / Transcript Lines', 'Events / Visits', 'Communications', 'Custom list']
const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const importActionOptions = ['Add new and update existing', 'Add new students only', 'Update existing students only', 'Add to existing population or campaign', 'Import as staging list only']
const updateBehaviorOptions = ['Do not overwrite existing values', 'Overwrite only blank values', 'Always overwrite', 'Append to existing values', 'Add as historical/source value']
const matchingStrategyOptions = ['crtfy Student ID', 'External/source ID', 'Email plus date of birth', 'First name plus last name plus date of birth', 'Email only', 'Phone only as weak match', 'Name plus high school plus grad year']
const rowFilters = ['All rows', 'Only errors', 'Possible matches', 'Unmapped required fields', 'Invalid values', 'Will update existing students']
const templateExamples = ['College Board Search Import', 'ACT Score Import', 'Common App Export', 'Slate Export', 'Element451 Export', 'Manual Inquiry Upload', 'High School Visit Sheet', 'Transfer Course Upload']
const supportedExamples = ['Student prospects', 'Inquiries', 'Applications', 'Test scores', 'High school data', 'Transfer coursework', 'Counselor assignments', 'Tags / populations / campaigns']

const delimiterOptions = [
  { label: 'Auto detect', value: '' },
  { label: 'Comma', value: ',' },
  { label: 'Tab', value: '\t' },
  { label: 'Pipe', value: '|' },
  { label: 'Semicolon', value: ';' },
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

const studentFields = [
  { key: 'ignore', label: 'Do not import', aliases: [], required: false },
  { key: 'custom', label: 'Create custom field', aliases: [], required: false },
  { key: 'fullName', label: 'Full name', aliases: ['name', 'student name', 'full name'], required: false },
  { key: 'firstName', label: 'First name', aliases: ['first', 'first name', 'given name'], required: true },
  { key: 'lastName', label: 'Last name', aliases: ['last', 'last name', 'surname', 'family name'], required: true },
  { key: 'email', label: 'Email', aliases: ['email', 'e-mail', 'email address'], required: false },
  { key: 'phone', label: 'Mobile phone', aliases: ['phone', 'mobile', 'cell'], required: false },
  { key: 'dateOfBirth', label: 'Date of birth', aliases: ['dob', 'birth date', 'date of birth'], required: false },
  { key: 'studentId', label: 'crtfy Student ID', aliases: ['crtfy id', 'student id'], required: false },
  { key: 'externalId', label: 'External/source ID', aliases: ['external id', 'source id', 'prospect id', 'applicant id'], required: false },
  { key: 'program', label: 'Intended program', aliases: ['program', 'major', 'degree', 'academic program'], required: false },
  { key: 'term', label: 'Entry term', aliases: ['term', 'entry term', 'start term'], required: false },
  { key: 'studentType', label: 'Student type', aliases: ['student type', 'population', 'type'], required: false },
  { key: 'highSchoolName', label: 'High school name', aliases: ['high school', 'school name', 'institution'], required: false },
  { key: 'highSchoolCeeb', label: 'High school CEEB', aliases: ['ceeb', 'school code'], required: false },
  { key: 'source', label: 'Source', aliases: ['source', 'lead source'], required: false },
  { key: 'campaign', label: 'Campaign', aliases: ['campaign', 'population campaign'], required: false },
  { key: 'counselor', label: 'Counselor / recruiter', aliases: ['counselor', 'recruiter', 'advisor', 'owner'], required: false },
  { key: 'gradYear', label: 'Graduation year', aliases: ['grad year', 'graduation year', 'class year'], required: false },
]

const transformOptions = [
  'No transform',
  'Split full name into first and last',
  'Convert Y/N to true/false',
  'Normalize term',
  'Normalize student type',
  'Normalize program',
  'Normalize source',
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

function normalizeText(value) {
  return String(value || '').trim()
}

function compact(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeDataRows(rows, settings) {
  return rows.map((row) => row.map((cell) => {
    let nextCell = settings.trimWhitespace === 'Preserve whitespace' ? String(cell) : String(cell).trim()
    if (settings.capitalization === 'Title case names') nextCell = nextCell.replace(/\b\w/g, (letter) => letter.toUpperCase())
    if (settings.capitalization === 'Uppercase values') nextCell = nextCell.toUpperCase()
    if (settings.capitalization === 'Lowercase values') nextCell = nextCell.toLowerCase()
    return nextCell
  }))
}

function inferImportType(headers) {
  const normalized = headers.map((header) => header.toLowerCase())
  const hasAny = (words) => words.some((word) => normalized.some((header) => header.includes(word)))
  if (hasAny(['act', 'sat', 'score'])) return { label: 'Test Scores', confidence: 86 }
  if (hasAny(['course', 'credits', 'grade'])) return { label: 'Coursework / Transcript Lines', confidence: 82 }
  if (hasAny(['event', 'visit', 'attended'])) return { label: 'Events / Visits', confidence: 78 }
  if (hasAny(['application', 'submitted', 'app status'])) return { label: 'Applications', confidence: 84 }
  if (hasAny(['first', 'last', 'email', 'phone', 'program', 'major', 'student'])) return { label: 'Students / Prospects', confidence: 92 }
  return { label: 'Students / Prospects', confidence: 62 }
}

function analyzeFileText(text, settings = initialFileSettings) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || ''
  const delimiter = delimiterFromValue(settings.delimiter, firstLine)
  const parsedRows = parseDelimitedText(text, delimiter.value)
  const headerIndex = Math.max(0, Number(settings.headerRow || 1) - 1)
  const rowsFromHeader = parsedRows.slice(headerIndex)
  const headers = (rowsFromHeader[0] || []).map((header) => String(header).trim())
  const rows = normalizeDataRows(rowsFromHeader.slice(1 + Math.max(0, Number(settings.skipRows || 0))), settings)
  const inferredType = inferImportType(headers)
  return {
    delimiter,
    headers,
    rows,
    previewRows: rows.slice(0, 50),
    rowCount: rows.length,
    columnCount: headers.length,
    blankRows: Math.max(0, text.split(/\r?\n/).length - parsedRows.length),
    headerRow: headerIndex + 1,
    skipRows: Math.max(0, Number(settings.skipRows || 0)),
    quotedValues: /"[^"]*[,;\t|][^"]*"/.test(text),
    likelyImportType: inferredType.label,
    confidence: inferredType.confidence,
  }
}

function suggestMapping(header) {
  const normalized = compact(header)
  let best = { target: 'ignore', confidence: 0, warning: 'No confident match.' }
  studentFields.filter((field) => !['ignore', 'custom'].includes(field.key)).forEach((field) => {
    const candidates = [field.label, ...field.aliases].map(compact)
    const exact = candidates.some((candidate) => normalized === candidate)
    const partial = candidates.some((candidate) => normalized.includes(candidate) || candidate.includes(normalized))
    const confidence = exact ? 98 : partial ? 78 : 0
    if (confidence > best.confidence) best = { target: field.key, confidence, warning: confidence >= 90 ? 'Confident match.' : 'Review suggested match.' }
  })
  return best
}

function buildMappings(headers) {
  return headers.map((header, index) => {
    const suggestion = suggestMapping(header)
    return {
      id: `${index}-${header}`,
      source: header,
      target: suggestion.target,
      confidence: suggestion.confidence,
      status: suggestion.confidence >= 85 ? 'Matched' : suggestion.confidence >= 60 ? 'Needs review' : 'Ignored',
      mode: suggestion.target === 'ignore' ? 'Do not import' : 'Map to existing field',
      transform: suggestion.target === 'fullName' ? 'Split full name into first and last' : 'No transform',
      updateBehavior: defaultFieldUpdateBehavior(suggestion.target),
      warning: suggestion.warning,
    }
  })
}

function defaultFieldUpdateBehavior(fieldKey) {
  if (fieldKey === 'phone') return 'Overwrite only blank values'
  if (fieldKey === 'source') return 'Append to existing values'
  if (fieldKey === 'program') return 'Overwrite only blank values'
  if (fieldKey === 'custom') return 'Add as historical/source value'
  return 'Do not overwrite existing values'
}

function normalizeTerm(value) {
  const text = normalizeText(value)
  const upper = text.toUpperCase().replace(/\s+/g, '')
  const season = upper.includes('FA') || upper.includes('FALL') ? 'Fall' : upper.includes('SP') || upper.includes('SPRING') ? 'Spring' : upper.includes('SU') || upper.includes('SUMMER') ? 'Summer' : ''
  const yearMatch = upper.match(/(20)?\d{2}/)
  if (!season || !yearMatch) return text
  const rawYear = yearMatch[0]
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
  return `${season} ${year}`
}

function normalizeStudentType(value) {
  const lookup = { FR: 'First Time Freshman', FRESHMAN: 'First Time Freshman', TR: 'Transfer', TRANSFER: 'Transfer', GR: 'Graduate', GRAD: 'Graduate', INTL: 'International', INTERNATIONAL: 'International' }
  return lookup[normalizeText(value).toUpperCase()] || normalizeText(value)
}

function normalizeProgram(value) {
  const lookup = { BSN: 'Bachelor of Science in Nursing', MBA: 'Master of Business Administration' }
  return lookup[normalizeText(value).toUpperCase()] || normalizeText(value)
}

function normalizeSource(value) {
  const lookup = { CB: 'College Board', 'HS VISIT': 'High School Visit', FAIR: 'College Fair' }
  return lookup[normalizeText(value).toUpperCase()] || normalizeText(value)
}

function applyTransform(value, transform) {
  if (transform === 'Convert Y/N to true/false') return ['Y', 'YES', 'TRUE', '1'].includes(normalizeText(value).toUpperCase()) ? 'true' : ['N', 'NO', 'FALSE', '0'].includes(normalizeText(value).toUpperCase()) ? 'false' : normalizeText(value)
  if (transform === 'Normalize term') return normalizeTerm(value)
  if (transform === 'Normalize student type') return normalizeStudentType(value)
  if (transform === 'Normalize program') return normalizeProgram(value)
  if (transform === 'Normalize source') return normalizeSource(value)
  return normalizeText(value)
}

function buildRecordFromRow(row, headers, mappings) {
  const record = { customFields: {}, raw: {}, transforms: [] }
  headers.forEach((header, index) => {
    const mapping = mappings[index]
    const rawValue = row[index] || ''
    const value = applyTransform(rawValue, mapping?.transform)
    record.raw[header] = rawValue
    if (!mapping || mapping.target === 'ignore') return
    if (mapping.target === 'custom') record.customFields[header] = value
    else if (mapping.target === 'fullName') {
      const [first, ...rest] = value.split(/\s+/).filter(Boolean)
      if (!record.firstName) record.firstName = first || ''
      if (!record.lastName) record.lastName = rest.join(' ')
      record.transforms.push({ field: header, rule: 'Split full name into first and last', rawValue, value })
    } else {
      record[mapping.target] = value
      if (mapping.transform !== 'No transform') record.transforms.push({ field: mapping.target, rule: mapping.transform, rawValue, value })
    }
  })
  return record
}

function findMatch(record, students, strategies) {
  const studentList = Array.isArray(students) ? students : []
  const normalizedStrategies = new Set(strategies)
  for (const student of studentList) {
    if (normalizedStrategies.has('crtfy Student ID') && record.studentId && String(student.id) === String(record.studentId)) return { student, confidence: 100, label: 'Existing student found', reason: 'crtfy Student ID exact match.' }
    if (normalizedStrategies.has('External/source ID') && record.externalId && String(student.studentId || student.externalId || student.id) === String(record.externalId)) return { student, confidence: 96, label: 'Existing student found', reason: 'External/source ID exact match.' }
    if (normalizedStrategies.has('Email plus date of birth') && record.email && record.dateOfBirth && compact(student.email) === compact(record.email) && normalizeText(student.dateOfBirth) === normalizeText(record.dateOfBirth)) return { student, confidence: 94, label: 'Existing student found', reason: 'Email plus date of birth.' }
    if (normalizedStrategies.has('Email only') && record.email && compact(student.email) === compact(record.email)) return { student, confidence: 82, label: 'Possible match', reason: 'Email match.' }
    if (normalizedStrategies.has('Phone only as weak match') && record.phone && compact(student.phone) === compact(record.phone)) return { student, confidence: 58, label: 'Needs review', reason: 'Phone-only weak match.' }
    const fullName = compact(`${record.firstName} ${record.lastName}`)
    const studentName = compact(student.name || `${student.firstName || ''} ${student.lastName || ''}`)
    if (normalizedStrategies.has('First name plus last name plus date of birth') && fullName && fullName === studentName && record.dateOfBirth && normalizeText(student.dateOfBirth) === normalizeText(record.dateOfBirth)) return { student, confidence: 90, label: 'Existing student found', reason: 'Name plus date of birth.' }
    if (normalizedStrategies.has('Name plus high school plus grad year') && fullName && fullName === studentName && record.highSchoolName && compact(student.institutionGoal || student.highSchoolName) === compact(record.highSchoolName)) return { student, confidence: 76, label: 'Possible match', reason: 'Name plus high school.' }
  }
  return null
}

function validateRows({ analysis, mappings, students, actionMode, matchingStrategies }) {
  if (!analysis) return []
  return analysis.rows.map((row, rowIndex) => {
    const record = buildRecordFromRow(row, analysis.headers, mappings)
    const issues = []
    const warnings = []
    if (!record.firstName) issues.push('Missing first name.')
    if (!record.lastName) issues.push('Missing last name.')
    if (!record.email && !record.phone && !record.externalId && !record.studentId) issues.push('At least one contact or identifying field is required.')
    if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) warnings.push('Invalid email format.')
    if (record.phone && compact(record.phone).length < 7) warnings.push('Invalid phone format.')
    if (record.program && ['unknown', 'n/a', 'none'].includes(record.program.toLowerCase())) warnings.push('Program does not match an active program alias.')
    if (record.term && !/(fall|spring|summer|winter)\s+20\d{2}/i.test(normalizeTerm(record.term))) warnings.push('Entry term may need review.')
    const match = findMatch(record, students, matchingStrategies)
    if (match?.confidence >= 90) warnings.push(match.reason)
    if (match && match.confidence < 90) warnings.push(`${match.label}: ${match.reason}`)

    const canCreate = ['Add new and update existing', 'Add new students only', 'Add to existing population or campaign'].includes(actionMode)
    const canUpdate = ['Add new and update existing', 'Update existing students only'].includes(actionMode)
    let status = 'Ready to import'
    if (issues.length) status = 'Cannot import'
    else if (match && match.confidence < 90) status = 'Needs review'
    else if (match && canUpdate) status = 'Will update existing student'
    else if (match && !canUpdate) status = 'Skipped'
    else if (!match && canCreate) status = 'Ready to import'
    else status = 'Skipped'

    return {
      rowNumber: rowIndex + 1,
      row,
      record,
      issues,
      warnings,
      status,
      match,
      resolution: status === 'Cannot import' ? 'Import as incomplete prospect' : match ? 'Update existing' : 'Create new student',
      edited: false,
    }
  })
}

function revalidateEditedRow(row, edits, students, actionMode, matchingStrategies) {
  if (!edits || !Object.keys(edits).length) return row
  const record = { ...row.record, ...edits }
  const issues = []
  const warnings = row.warnings.filter((warning) => /match/i.test(warning))
  if (!record.firstName) issues.push('Missing first name.')
  if (!record.lastName) issues.push('Missing last name.')
  if (!record.email && !record.phone && !record.externalId && !record.studentId) issues.push('At least one contact or identifying field is required.')
  if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) warnings.push('Invalid email format.')
  if (record.phone && compact(record.phone).length < 7) warnings.push('Invalid phone format.')
  const match = findMatch(record, students, matchingStrategies)
  const canCreate = ['Add new and update existing', 'Add new students only', 'Add to existing population or campaign'].includes(actionMode)
  const canUpdate = ['Add new and update existing', 'Update existing students only'].includes(actionMode)
  let status = 'Ready to import'
  if (issues.length) status = 'Cannot import'
  else if (match && match.confidence < 90) status = 'Needs review'
  else if (match && canUpdate) status = 'Will update existing student'
  else if (match && !canUpdate) status = 'Skipped'
  else if (!match && canCreate) status = 'Ready to import'
  else status = 'Skipped'
  return {
    ...row,
    record,
    issues,
    warnings,
    status,
    match,
    resolution: edits.resolution || row.resolution,
    edited: true,
  }
}

function summarizeRows(rows, mappings, templateName) {
  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === 'Ready to import').length,
    updating: rows.filter((row) => row.status === 'Will update existing student').length,
    review: rows.filter((row) => row.status === 'Needs review').length,
    blocked: rows.filter((row) => row.status === 'Cannot import').length,
    skipped: rows.filter((row) => row.status === 'Skipped').length,
    mappedFields: mappings.filter((mapping) => !['ignore', 'custom'].includes(mapping.target)).length,
    ignoredColumns: mappings.filter((mapping) => mapping.target === 'ignore').length,
    templateName: templateName || 'Not saved',
  }
}

function toStudentPayload(row, actionMode) {
  const record = row.record
  return {
    id: record.studentId || record.externalId || undefined,
    studentId: record.externalId || record.studentId || undefined,
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.email,
    phone: record.phone,
    program: record.program,
    programInterest: record.program,
    termInterest: record.term,
    population: record.studentType || 'Prospect',
    source: record.source || 'CSV import',
    campaign: record.campaign,
    advisor: record.counselor,
    stage: actionMode === 'Import as staging list only' ? 'prospect' : 'prospect',
    institutionGoal: record.highSchoolName,
  }
}

function rowsToCsv(rows) {
  const headers = ['row', 'status', 'resolution', 'issues', 'warnings', 'firstName', 'lastName', 'email', 'phone', 'program', 'term']
  const lines = [headers.join(',')]
  rows.forEach((row) => {
    const values = [
      row.rowNumber,
      row.status,
      row.resolution,
      row.issues.join('; '),
      row.warnings.join('; '),
      row.record.firstName,
      row.record.lastName,
      row.record.email,
      row.record.phone,
      row.record.program,
      row.record.term,
    ].map((value) => `"${String(value || '').replace(/"/g, '""')}"`)
    lines.push(values.join(','))
  })
  return lines.join('\n')
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function UtilitiesPage() {
  const { currentUser, session, fetchWithTenantAuth } = useAuth()
  const { students, createStudent, loadStudents } = useStudentRecords()
  const [activeUtility, setActiveUtility] = useState('import')
  const [step, setStep] = useState(1)
  const [selectedImportType, setSelectedImportType] = useState('Students / Prospects')
  const [actionMode, setActionMode] = useState('Add new and update existing')
  const [updateBehavior, setUpdateBehavior] = useState('Do not overwrite existing values')
  const [matchingStrategies, setMatchingStrategies] = useState(['External/source ID', 'Email plus date of birth', 'First name plus last name plus date of birth', 'Email only', 'Phone only as weak match'])
  const [fileState, setFileState] = useState({ file: null, storedDocument: null, analysis: null })
  const [fileText, setFileText] = useState('')
  const [fileSettings, setFileSettings] = useState(initialFileSettings)
  const [mappings, setMappings] = useState([])
  const [rowEdits, setRowEdits] = useState({})
  const [rowFilter, setRowFilter] = useState('All rows')
  const [templateName, setTemplateName] = useState('')
  const [activeTemplateId, setActiveTemplateId] = useState('')
  const [importJobs, setImportJobs] = useState([])
  const [templates, setTemplates] = useState([])
  const [currentJob, setCurrentJob] = useState(null)
  const [completion, setCompletion] = useState(null)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const isTenantAdmin = isTenantAdminUser(currentUser)
  const tenantName = currentUser?.tenantName || session?.tenant_name || session?.tenant_code || 'Current tenant'
  const analysis = fileState.analysis
  const validationRows = useMemo(() => validateRows({ analysis, mappings, students, actionMode, matchingStrategies }).map((row) => revalidateEditedRow(row, rowEdits[row.rowNumber], students, actionMode, matchingStrategies)), [analysis, mappings, students, actionMode, matchingStrategies, rowEdits])
  const summary = useMemo(() => summarizeRows(validationRows, mappings, templateName), [validationRows, mappings, templateName])
  const filteredRows = useMemo(() => validationRows.filter((row) => {
    if (rowFilter === 'Only errors') return row.status === 'Cannot import'
    if (rowFilter === 'Possible matches') return row.status === 'Needs review'
    if (rowFilter === 'Unmapped required fields') return row.issues.some((issue) => /first name|last name|required/i.test(issue))
    if (rowFilter === 'Invalid values') return row.warnings.some((warning) => /invalid|review|program|term/i.test(warning))
    if (rowFilter === 'Will update existing students') return row.status === 'Will update existing student'
    return true
  }), [rowFilter, validationRows])
  const statCards = [
    { label: 'Ready', value: summary.ready, tone: 'teal' },
    { label: 'Updates', value: summary.updating, tone: 'violet' },
    { label: 'Needs review', value: summary.review, tone: 'indigo' },
    { label: 'Blocked', value: summary.blocked, tone: 'rose' },
  ]

  useEffect(() => {
    if (!isTenantAdmin || !fetchWithTenantAuth) return
    listUtilityImportJobs(fetchWithTenantAuth).then((payload) => setImportJobs(payload.items || [])).catch(() => {})
    listUtilityImportTemplates(fetchWithTenantAuth).then((payload) => setTemplates(payload.items || [])).catch(() => {})
  }, [fetchWithTenantAuth, isTenantAdmin])

  async function refreshHistory() {
    const [jobsPayload, templatesPayload] = await Promise.all([
      listUtilityImportJobs(fetchWithTenantAuth),
      listUtilityImportTemplates(fetchWithTenantAuth),
    ])
    setImportJobs(jobsPayload.items || [])
    setTemplates(templatesPayload.items || [])
  }

  async function handleSelectedFile(file) {
    if (!file) return
    setError('')
    setMessage('')
    if (!session?.tenant_id || !session?.access_token) {
      setError('Unable to upload this import because your tenant or access token is missing. Refresh access and try again.')
      return
    }
    setIsBusy(true)
    try {
      const text = await file.text()
      const nextSettings = initialFileSettings
      const nextAnalysis = analyzeFileText(text, nextSettings)
      const nextMappings = buildMappings(nextAnalysis.headers)
      const storedDocument = await uploadStoredDocument(file, {
        title: file.name,
        documentType: 'Prospect Import CSV',
        department: 'Admissions',
        tags: ['utilities', 'prospect-import', 'csv-wizard'],
        notes: 'Uploaded from crtfy Student Utilities import CSV wizard.',
        tenantId: session.tenant_id,
        accessToken: session.access_token,
        userEmail: session.email || session.username,
        actor: session.username || session.email || 'crtfy-student',
      })
      const job = await createUtilityImportJob(fetchWithTenantAuth, {
        status: 'draft',
        fileName: file.name,
        documentId: storedDocument.documentId,
        importType: nextAnalysis.likelyImportType,
        actionMode,
        settings: nextSettings,
        mappings: nextMappings,
        summary: { rows: nextAnalysis.rowCount, columns: nextAnalysis.columnCount },
      })
      setFileText(text)
      setFileSettings(nextSettings)
      setFileState({ file, storedDocument, analysis: nextAnalysis })
      setSelectedImportType(nextAnalysis.likelyImportType)
      setMappings(nextMappings)
      setCurrentJob(job)
      setCompletion(null)
      setStep(2)
      await refreshHistory()
      setMessage(`Stored ${file.name} in crtfy Documents and created import draft ${job.id}.`)
    } catch (nextError) {
      setError(nextError.message || 'Unable to upload and analyze file.')
    } finally {
      setIsBusy(false)
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    handleSelectedFile(event.dataTransfer.files?.[0])
  }

  function updateFileSetting(key, value) {
    const nextSettings = { ...fileSettings, [key]: value }
    const nextAnalysis = analyzeFileText(fileText, nextSettings)
    setFileSettings(nextSettings)
    setFileState((current) => ({ ...current, analysis: nextAnalysis }))
    setMappings(buildMappings(nextAnalysis.headers))
  }

  function updateMapping(index, patch) {
    setMappings((current) => current.map((mapping, mappingIndex) => {
      if (mappingIndex !== index) return mapping
      const next = { ...mapping, ...patch }
      if (patch.target) {
        next.status = patch.target === 'ignore' ? 'Ignored' : patch.target === 'custom' ? 'Optional' : 'Matched'
        next.updateBehavior = defaultFieldUpdateBehavior(patch.target)
      }
      return next
    }))
  }

  function toggleMatchingStrategy(strategy) {
    setMatchingStrategies((current) => current.includes(strategy) ? current.filter((item) => item !== strategy) : [...current, strategy])
  }

  function acceptConfidentMatches() {
    setMappings((current) => current.map((mapping) => mapping.confidence >= 75 && mapping.target !== 'ignore' ? { ...mapping, status: 'Matched' } : mapping))
    setMessage('Accepted confident mapping suggestions.')
  }

  function reviewUncertainMatches() {
    const firstIndex = mappings.findIndex((mapping) => mapping.status === 'Needs review' || mapping.confidence < 75)
    if (firstIndex >= 0) document.getElementById(`mapping-row-${firstIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function applyTemplate(template) {
    if (!template?.mappings?.length) return
    const bySource = new Map(template.mappings.map((mapping) => [mapping.source, mapping]))
    setMappings((current) => current.map((mapping) => ({ ...mapping, ...(bySource.get(mapping.source) || {}) })))
    setActiveTemplateId(template.id)
    setTemplateName(template.name)
    setMessage(`Applied template ${template.name}.`)
  }

  async function handleSaveTemplate() {
    setError('')
    try {
      const saved = await saveUtilityImportTemplate(fetchWithTenantAuth, {
        name: templateName || 'Manual Inquiry Upload',
        source: fileState.file?.name || 'Manual Inquiry Upload',
        importType: selectedImportType,
        mappings,
        transformRules: mappings.filter((mapping) => mapping.transform !== 'No transform'),
        validationRules: ['First name', 'Last name', 'At least one contact or identifying field'],
        matchingStrategy: matchingStrategies,
        updateBehavior,
      })
      setTemplateName(saved.name)
      await refreshHistory()
      setMessage(`Saved mapping template ${saved.name}.`)
    } catch (nextError) {
      setError(nextError.message || 'Unable to save template.')
    }
  }

  function updateRow(rowNumber, field, value) {
    setRowEdits((current) => ({
      ...current,
      [rowNumber]: {
        ...(current[rowNumber] || {}),
        [field]: value,
      },
    }))
  }

  function setRowResolution(rowNumber, resolution) {
    setRowEdits((current) => ({ ...current, [rowNumber]: { ...(current[rowNumber] || {}), resolution } }))
  }

  function fixSafeIssues() {
    const nextEdits = {}
    validationRows.forEach((row) => {
      const patch = {}
      if (row.record.term) patch.term = normalizeTerm(row.record.term)
      if (row.record.studentType) patch.studentType = normalizeStudentType(row.record.studentType)
      if (row.record.program) patch.program = normalizeProgram(row.record.program)
      if (row.record.source) patch.source = normalizeSource(row.record.source)
      if (Object.keys(patch).length) nextEdits[row.rowNumber] = patch
    })
    setRowEdits((current) => ({ ...current, ...nextEdits }))
    setMessage('Applied safe term, student type, program, and source normalizations.')
  }

  async function saveDraft() {
    if (!currentJob) return
    const updated = await updateUtilityImportJob(fetchWithTenantAuth, currentJob.id, {
      status: 'draft',
      importType: selectedImportType,
      actionMode,
      settings: fileSettings,
      mappings,
      summary,
      rows: validationRows.slice(0, 500),
      templateName,
    })
    setCurrentJob(updated)
    await refreshHistory()
    setMessage('Import draft saved.')
  }

  async function importNow() {
    if (!analysis) return
    setError('')
    setIsBusy(true)
    const result = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] }
    try {
      for (const row of validationRows) {
        if (row.status === 'Cannot import' || row.status === 'Skipped' || row.resolution === 'Skip row') {
          result.skipped += 1
          continue
        }
        if (row.status === 'Will update existing student') {
          if (row.match?.student?.id && row.record.program) {
            const response = await fetchWithTenantAuth(`${apiBaseUrl}/api/v1/students/${encodeURIComponent(row.match.student.id)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ program: row.record.program, degreeProgram: row.record.program }),
            })
            if (!response.ok && response.status !== 404 && response.status !== 405) {
              throw new Error(`Row ${row.rowNumber}: unable to update existing student.`)
            }
          }
          result.updated += 1
          continue
        }
        try {
          await createStudent(toStudentPayload(row, actionMode))
          result.created += 1
        } catch (rowError) {
          result.failed += 1
          result.errors.push(`Row ${row.rowNumber}: ${rowError.message}`)
        }
      }
      const completedAt = new Date().toISOString()
      if (currentJob) {
        const updated = await updateUtilityImportJob(fetchWithTenantAuth, currentJob.id, {
          status: 'completed',
          completedAt,
          importType: selectedImportType,
          actionMode,
          settings: fileSettings,
          mappings,
          summary: { ...summary, ...result },
          rows: validationRows.slice(0, 500),
          templateName,
        })
        setCurrentJob(updated)
      }
      await Promise.all([loadStudents().catch(() => {}), refreshHistory()])
      setCompletion({ ...result, completedAt })
      setStep(5)
      setMessage('Import completed and audit history updated.')
    } catch (nextError) {
      setError(nextError.message || 'Unable to complete import.')
    } finally {
      setIsBusy(false)
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
        subtitle="Operational tools for tenant admins. Import CSV files, map columns, validate rows, deduplicate records, and keep an audit trail."
        actions={<span className="tag">Tenant: {tenantName}</span>}
      />

      {error ? <div className="alert-banner error"><AlertCircle size={16} /> {error}</div> : null}
      {message ? <div className="alert-banner success"><CheckCircle2 size={16} /> {message}</div> : null}

      <section className="value-grid utilities-grid">
        <button type="button" className={`utility-card ${activeUtility === 'import' ? 'active' : ''}`} onClick={() => setActiveUtility('import')}>
          <FileSpreadsheet size={22} />
          <strong>Import CSV Wizard</strong>
          <span>Upload, detect, map, validate, deduplicate, import, audit, and template student prospect files.</span>
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
          {['Upload file', 'Confirm action', 'Map columns', 'Validate rows', 'Import'].map((label, index) => (
            <button key={label} type="button" className={`wizard-step ${step === index + 1 ? 'active' : ''} ${step > index + 1 ? 'complete' : ''}`} onClick={() => analysis && setStep(index + 1)} disabled={!analysis && index > 0}>
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </button>
          ))}
        </div>

        <div className="panel-header">
          <div>
            <h2>Import data</h2>
            <p>Upload messy files. crtfy maps, validates, deduplicates, and imports clean student records.</p>
          </div>
          <div className="utility-header-actions">
            {fileState.storedDocument?.documentId ? <span className="tag">Stored document: {fileState.storedDocument.documentId}</span> : null}
            {currentJob?.id ? <span className="tag">Job: {currentJob.id}</span> : null}
          </div>
        </div>

        <div className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <UploadCloud size={34} />
          <strong>{isBusy ? 'Working...' : 'Drop your CSV or TSV file here'}</strong>
          <span>crtfy will automatically detect delimiter, headers, record type, likely field mappings, duplicate candidates, and risky rows.</span>
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

            {step === 2 ? (
              <section className="dashboard-grid two-up">
                <article className="panel inner-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Confirm import type and action</h3>
                      <p>Detected {analysis.likelyImportType} with {analysis.confidence}% confidence.</p>
                    </div>
                  </div>
                  <div className="form-grid">
                    <label><span>Import type</span><select value={selectedImportType} onChange={(event) => setSelectedImportType(event.target.value)}>{importTypeOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                    <label><span>Import action</span><select value={actionMode} onChange={(event) => setActionMode(event.target.value)}>{importActionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                    <label><span>Update behavior</span><select value={updateBehavior} onChange={(event) => setUpdateBehavior(event.target.value)}>{updateBehaviorOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                    <label><span>Template name</span><input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Manual Inquiry Upload" /></label>
                  </div>
                  <div className="assistant-suggestion"><Wand2 size={18} /><span>Default for this first implementation is Students / Prospects with add-new-and-update-existing behavior.</span></div>
                </article>

                <article className="panel inner-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Matching strategy</h3>
                      <p>Strong matches update; possible matches require review.</p>
                    </div>
                  </div>
                  <div className="checklist">
                    {matchingStrategyOptions.map((strategy) => (
                      <label key={strategy} className="admin-inline-check">
                        <input type="checkbox" checked={matchingStrategies.includes(strategy)} onChange={() => toggleMatchingStrategy(strategy)} />
                        <span>{strategy}</span>
                      </label>
                    ))}
                  </div>
                  <div className="tag-row">
                    <span className="badge neutral-badge">Strong match</span>
                    <span className="badge neutral-badge">Possible match</span>
                    <span className="badge neutral-badge">No match</span>
                  </div>
                </article>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="panel inner-panel">
                <div className="panel-header">
                  <div>
                    <h3>Smart column mapping</h3>
                    <p>Review assistant suggestions, choose how each source column imports, and save repeatable templates.</p>
                  </div>
                  <div className="utility-header-actions">
                    <button type="button" className="secondary-button" onClick={acceptConfidentMatches}>Accept confident matches</button>
                    <button type="button" className="secondary-button" onClick={reviewUncertainMatches}>Review uncertain matches</button>
                    <button type="button" className="primary-button" onClick={handleSaveTemplate}><Save size={16} /> Save template</button>
                  </div>
                </div>
                <div className="mapping-toolbar">
                  <label className="auth-field"><span>Apply saved template</span><select value={activeTemplateId} onChange={(event) => applyTemplate(templates.find((template) => template.id === event.target.value))}><option value="">Choose template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
                  <div className="tag-row">{templateExamples.map((example) => <span key={example} className="tag">{example}</span>)}</div>
                </div>
                <div className="table-wrap utilities-preview-table">
                  <table>
                    <thead><tr><th>Imported column</th><th>Sample values</th><th>crtfy field</th><th>Mode</th><th>Transform</th><th>Update behavior</th><th>Suggestion</th></tr></thead>
                    <tbody>
                      {mappings.map((mapping, index) => (
                        <tr key={mapping.id} id={`mapping-row-${index}`}>
                          <td><strong>{mapping.source}</strong><span className="table-sub">{mapping.status}</span></td>
                          <td>{analysis.rows.slice(0, 3).map((row) => row[index]).filter(Boolean).join(' | ') || '-'}</td>
                          <td><select value={mapping.target} onChange={(event) => updateMapping(index, { target: event.target.value })}>{studentFields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</select></td>
                          <td><select value={mapping.mode} onChange={(event) => updateMapping(index, { mode: event.target.value })}>{['Map to existing field', 'Do not import', 'Create custom field', 'Transform value', 'Split column', 'Combine columns'].map((option) => <option key={option}>{option}</option>)}</select></td>
                          <td><select value={mapping.transform} onChange={(event) => updateMapping(index, { transform: event.target.value })}>{transformOptions.map((option) => <option key={option}>{option}</option>)}</select></td>
                          <td><select value={mapping.updateBehavior} onChange={(event) => updateMapping(index, { updateBehavior: event.target.value })}>{updateBehaviorOptions.map((option) => <option key={option}>{option}</option>)}</select></td>
                          <td><span className={`badge ${mapping.confidence >= 85 ? 'risk-low' : mapping.confidence >= 60 ? 'neutral-badge' : 'risk-medium'}`}>{mapping.confidence}%</span><p className="table-sub">{mapping.warning}</p></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {step === 4 ? (
              <section className="panel inner-panel">
                <div className="panel-header">
                  <div>
                    <h3>Validation and cleaning</h3>
                    <p>Fix common issues, resolve possible matches, or download an error report.</p>
                  </div>
                  <div className="utility-header-actions">
                    <button type="button" className="secondary-button" onClick={fixSafeIssues}>Fix all safe issues</button>
                    <button type="button" className="secondary-button" onClick={() => downloadText('crtfy-import-errors.csv', rowsToCsv(validationRows.filter((row) => row.status !== 'Ready to import')))}><Download size={16} /> Download errors</button>
                  </div>
                </div>
                <div className="tag-row">{rowFilters.map((filter) => <button key={filter} type="button" className={`tag filter-tag ${rowFilter === filter ? 'active-tag' : ''}`} onClick={() => setRowFilter(filter)}>{filter}</button>)}</div>
                <div className="table-wrap utilities-preview-table">
                  <table>
                    <thead><tr><th>Row</th><th>Status</th><th>Resolution</th><th>Student</th><th>Contact</th><th>Program / term</th><th>Issues</th></tr></thead>
                    <tbody>
                      {filteredRows.slice(0, 100).map((row) => (
                        <tr key={row.rowNumber}>
                          <td>{row.rowNumber}</td>
                          <td><span className={`badge ${row.status === 'Cannot import' ? 'risk-high' : row.status === 'Needs review' ? 'risk-medium' : 'risk-low'}`}>{row.status}</span><p className="table-sub">{row.match?.label || 'No match'}</p></td>
                          <td><select value={row.resolution} onChange={(event) => setRowResolution(row.rowNumber, event.target.value)}>{['Create new student', 'Update existing', 'Import as incomplete prospect', 'Skip row', 'Review manually', 'Map invalid program to active program', 'Create program alias for future imports', 'Apply fix to all similar values'].map((option) => <option key={option}>{option}</option>)}</select></td>
                          <td><input value={row.record.firstName || ''} onChange={(event) => updateRow(row.rowNumber, 'firstName', event.target.value)} placeholder="First" /><input value={row.record.lastName || ''} onChange={(event) => updateRow(row.rowNumber, 'lastName', event.target.value)} placeholder="Last" /></td>
                          <td><input value={row.record.email || ''} onChange={(event) => updateRow(row.rowNumber, 'email', event.target.value)} placeholder="Email" /><input value={row.record.phone || ''} onChange={(event) => updateRow(row.rowNumber, 'phone', event.target.value)} placeholder="Phone" /></td>
                          <td><input value={row.record.program || ''} onChange={(event) => updateRow(row.rowNumber, 'program', event.target.value)} placeholder="Program" /><input value={row.record.term || ''} onChange={(event) => updateRow(row.rowNumber, 'term', event.target.value)} placeholder="Term" /></td>
                          <td>{[...row.issues, ...row.warnings].map((issue) => <p key={issue} className="table-sub">{issue}</p>)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {step === 5 ? (
              <section className="dashboard-grid two-up">
                <article className="panel inner-panel">
                  <div className="panel-header"><div><h3>Final review</h3><p>Confirm consequences before committing this import.</p></div></div>
                  <div className="detail-grid">
                    <div><span>New students to create</span><strong>{summary.ready}</strong></div>
                    <div><span>Existing students to update</span><strong>{summary.updating}</strong></div>
                    <div><span>Rows skipped for review</span><strong>{summary.review}</strong></div>
                    <div><span>Rows blocked</span><strong>{summary.blocked}</strong></div>
                    <div><span>Mapped fields</span><strong>{summary.mappedFields}</strong></div>
                    <div><span>Ignored columns</span><strong>{summary.ignoredColumns}</strong></div>
                    <div><span>Template</span><strong>{summary.templateName}</strong></div>
                  </div>
                  <div className="checklist">
                    {['Create new student prospect records.', 'Add imported students to population or campaign when mapped.', 'Assign counselors when a counselor column is mapped.', 'Apply source and preserve raw imported values in audit rows.', 'Preserve existing values unless update behavior allows update.', 'Create import audit record.'].map((item) => <span key={item} className="stack-row"><strong>{item}</strong></span>)}
                  </div>
                  <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => setStep(3)}>Back to mapping</button>
                    <button type="button" className="secondary-button" onClick={saveDraft}>Save as draft</button>
                    <button type="button" className="secondary-button" onClick={() => downloadText('crtfy-import-validation-report.csv', rowsToCsv(validationRows))}><Download size={16} /> Download validation report</button>
                    <button type="button" className="primary-button" onClick={importNow} disabled={isBusy || !validationRows.length}>Import now</button>
                  </div>
                </article>

                <article className="panel inner-panel">
                  <div className="panel-header"><div><h3>Completion summary</h3><p>Results and post-import actions.</p></div></div>
                  {completion ? (
                    <>
                      <div className="detail-grid">
                        <div><span>Created</span><strong>{completion.created}</strong></div>
                        <div><span>Updated</span><strong>{completion.updated}</strong></div>
                        <div><span>Skipped</span><strong>{completion.skipped}</strong></div>
                        <div><span>Failed</span><strong>{completion.failed}</strong></div>
                      </div>
                      <div className="form-actions">
                        <a className="secondary-button" href="/students">View imported students</a>
                        <button type="button" className="secondary-button" onClick={() => setRowFilter('Only errors')}>View skipped rows</button>
                        <button type="button" className="secondary-button" onClick={() => downloadText('crtfy-import-report.csv', rowsToCsv(validationRows))}>Download import report</button>
                        <button type="button" className="secondary-button" disabled>Undo import</button>
                        <button type="button" className="secondary-button" onClick={handleSaveTemplate}>Save mapping as template</button>
                      </div>
                    </>
                  ) : <p className="muted-copy">Run the import to see created, updated, skipped, and failed counts.</p>}
                </article>
              </section>
            ) : null}

            <div className="form-actions wizard-actions">
              <button type="button" className="secondary-button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step <= 1}>Back</button>
              <button type="button" className="secondary-button" onClick={saveDraft} disabled={!currentJob}>Save draft</button>
              <button type="button" className="primary-button" onClick={() => setStep((current) => Math.min(5, current + 1))} disabled={step >= 5}>Next</button>
            </div>

            <section className="dashboard-grid two-up utility-preview-layout">
              <article className="panel inner-panel utility-preview-panel">
                <div className="panel-header">
                  <div><h3>File detection and preview</h3><p>Detected {analysis.delimiter.label}, row {analysis.headerRow} header, {analysis.rowCount} rows, {analysis.columnCount} columns.</p></div>
                  <button type="button" className="secondary-button" onClick={() => setIsAdvancedOpen((current) => !current)}>Advanced file settings</button>
                </div>
                {isAdvancedOpen ? (
                  <div className="form-grid">
                    <label><span>Delimiter</span><select value={fileSettings.delimiter} onChange={(event) => updateFileSetting('delimiter', event.target.value)}>{delimiterOptions.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}</select></label>
                    <label><span>Header row</span><input type="number" min="1" value={fileSettings.headerRow} onChange={(event) => updateFileSetting('headerRow', event.target.value)} /></label>
                    <label><span>Skip rows before import</span><input type="number" min="0" value={fileSettings.skipRows} onChange={(event) => updateFileSetting('skipRows', event.target.value)} /></label>
                    <label><span>Encoding</span><select value={fileSettings.encoding} onChange={(event) => updateFileSetting('encoding', event.target.value)}><option>UTF-8</option><option>Windows-1252</option><option>ISO-8859-1</option></select></label>
                    <label><span>Blank values</span><select value={fileSettings.blankValues} onChange={(event) => updateFileSetting('blankValues', event.target.value)}><option>Do not update existing values</option><option>Clear existing values</option><option>Import blank values as empty text</option></select></label>
                    <label><span>Whitespace</span><select value={fileSettings.trimWhitespace} onChange={(event) => updateFileSetting('trimWhitespace', event.target.value)}><option>Trim whitespace</option><option>Preserve whitespace</option></select></label>
                    <label><span>Capitalization</span><select value={fileSettings.capitalization} onChange={(event) => updateFileSetting('capitalization', event.target.value)}><option>Preserve source values</option><option>Title case names</option><option>Uppercase values</option><option>Lowercase values</option></select></label>
                  </div>
                ) : null}
                <div className="table-wrap utilities-preview-table">
                  <table><thead><tr>{analysis.headers.map((header, columnIndex) => <th key={`${header}-${columnIndex}`}>{header}</th>)}</tr></thead><tbody>{analysis.previewRows.map((row, rowIndex) => <tr key={`${rowIndex}-${row.join('|')}`}>{analysis.headers.map((header, columnIndex) => <td key={`${header}-${rowIndex}-${columnIndex}`}>{row[columnIndex] || '-'}</td>)}</tr>)}</tbody></table>
                </div>
              </article>

              <article className="panel inner-panel">
                <div className="panel-header"><div><h3>Import assistant</h3><p>Practical guidance for mapping and validation.</p></div><Wand2 size={20} /></div>
                <div className="checklist">
                  <div className="stack-row"><strong>Top issues</strong><span>{summary.blocked} blocked, {summary.review} possible matches, {mappings.filter((mapping) => mapping.status === 'Needs review').length} uncertain mappings.</span></div>
                  <div className="stack-row"><strong>What will happen?</strong><span>{summary.ready} rows can create records and {summary.updating} rows map to existing students.</span></div>
                  <div className="stack-row"><strong>Overwrite risk</strong><span>{updateBehavior}. Per-field behaviors are shown in mapping.</span></div>
                  <div className="stack-row"><strong>Questions supported</strong><span>Why is this row blocked? Which fields overwrite? Show possible existing students.</span></div>
                </div>
              </article>
            </section>
          </>
        ) : null}
      </section>

      <section className="dashboard-grid two-up">
        <article className="panel">
          <div className="panel-header"><div><h3><History size={18} /> Import job history</h3><p>Every import keeps file metadata, user, tenant, settings, mappings, row statuses, and summary counts.</p></div></div>
          <div className="stack-list">{importJobs.slice(0, 8).map((job) => <div key={job.id} className="stack-row"><strong>{job.fileName || job.id}</strong><span>{job.status} - {job.importType} - {job.updatedAt}</span></div>)}{!importJobs.length ? <p className="muted-copy">No import jobs yet.</p> : null}</div>
        </article>
        <article className="panel">
          <div className="panel-header"><div><h3>Saved templates</h3><p>Repeat vendor imports can remember mappings, transforms, validation rules, matching strategy, and update behavior.</p></div></div>
          <div className="stack-list">{templates.slice(0, 8).map((template) => <button key={template.id} type="button" className="stack-row import-template-row" onClick={() => applyTemplate(template)}><strong>{template.name}</strong><span>{template.source} - {template.importType}</span></button>)}{!templates.length ? <p className="muted-copy">No saved templates yet.</p> : null}</div>
        </article>
      </section>
    </div>
  )
}
