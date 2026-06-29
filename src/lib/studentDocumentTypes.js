export const STUDENT_DOCUMENT_TYPES = [
  'Application form',
  'High school transcript',
  'College transcript',
  'GED/equivalency record',
  'Essay / personal statement',
  'Resume',
  'Letter of recommendation',
  'Counselor/school report',
  'ACT/SAT scores',
  'English proficiency scores',
  'Government ID / residency proof',
  'Fee waiver documentation',
  'FAFSA/CSS/Profile status or document placeholder',
  'Immunization/final enrollment documents',
  'Generated decision letters',
  'Financial Aid',
  'Residency Appeal',
  'FERPA',
  'HR',
  'Finance',
  'Admissions',
]

export function isTranscriptDocumentType(documentType) {
  return ['High school transcript', 'College transcript', 'GED/equivalency record'].includes(documentType)
}

export function classifyStudentDocument(file) {
  const name = String(file?.name || '').toLowerCase()
  const type = String(file?.type || '').toLowerCase()
  const haystack = `${name} ${type}`

  if (/ged|equivalency|hiset|tasc/.test(haystack)) return 'GED/equivalency record'
  if (/transcript|grades|academic.record/.test(haystack)) {
    if (/college|university|transfer|dual.credit/.test(haystack)) return 'College transcript'
    return 'High school transcript'
  }
  if (/essay|personal.statement|statement.of.purpose|writing.sample/.test(haystack)) return 'Essay / personal statement'
  if (/resume|cv|curriculum.vitae/.test(haystack)) return 'Resume'
  if (/recommendation|reference|rec.letter|lor/.test(haystack)) return 'Letter of recommendation'
  if (/counselor|school.report|secondary.school.report/.test(haystack)) return 'Counselor/school report'
  if (/act|sat|score.report|test.score/.test(haystack)) return 'ACT/SAT scores'
  if (/toefl|ielts|duolingo|english.proficiency|pte/.test(haystack)) return 'English proficiency scores'
  if (/(^|[^a-z])dl([^a-z]|$)|driver|drivers|driver.s|license|licence|\bcdl\b|commercial.driver|state.id|photo.id|passport|government.id|residency|resident|id.card/.test(haystack)) return 'Government ID / residency proof'
  if (/fee.waiver|waiver/.test(haystack)) return 'Fee waiver documentation'
  if (/fafsa|css|profile|financial.aid/.test(haystack)) return 'FAFSA/CSS/Profile status or document placeholder'
  if (/aid.award|award.letter|financial.aid|verification.worksheet|student.aid/.test(haystack)) return 'Financial Aid'
  if (/residency.appeal|residency|in.state|out.of.state|domicile/.test(haystack)) return 'Residency Appeal'
  if (/ferpa|privacy.release|information.release|consent.release/.test(haystack)) return 'FERPA'
  if (/\bhr\b|human.resources|employment|employee|i-9|w-4/.test(haystack)) return 'HR'
  if (/finance|billing|invoice|payment|ledger|account.statement/.test(haystack)) return 'Finance'
  if (/admissions|admission|applicant|application.packet/.test(haystack)) return 'Admissions'
  if (/immunization|vaccine|vaccination|enrollment|final/.test(haystack)) return 'Immunization/final enrollment documents'
  if (/decision.letter|admit.letter|acceptance|denial|waitlist/.test(haystack)) return 'Generated decision letters'
  return 'Application form'
}
