export const DEFAULT_DOCUMENT_DEPARTMENTS = [
  {
    name: 'General / Shared Services',
    type: 'administrative',
    defaultRoles: ['tenant_admin', 'admin_processor'],
    defaultDocumentTypes: ['Application form'],
    defaultWorkflows: ['Missing materials', 'Review', 'Communication'],
    studentVisibility: { canUpload: true, canView: true },
    retentionPolicy: 'Institution default retention policy',
  },
  {
    name: 'Admissions',
    type: 'student lifecycle',
    defaultRoles: ['admissions_counselor', 'decision_releaser_director', 'admissions_processor'],
    defaultDocumentTypes: ['Application form', 'High school transcript', 'College transcript', 'Essay / personal statement', 'Letter of recommendation', 'Counselor/school report', 'ACT/SAT scores', 'English proficiency scores', 'Admissions'],
    defaultWorkflows: ['Missing materials', 'Review', 'Decision', 'Communication'],
    studentVisibility: { canUpload: true, canView: true },
    retentionPolicy: 'Keep 7 years after last attendance or final admission action',
  },
  {
    name: 'Registrar',
    type: 'student lifecycle',
    defaultRoles: ['registrar_transfer_specialist'],
    defaultDocumentTypes: ['High school transcript', 'College transcript', 'GED/equivalency record', 'Immunization/final enrollment documents'],
    defaultWorkflows: ['Transcript evaluation', 'Final enrollment', 'Transfer credit review'],
    studentVisibility: { canUpload: true, canView: true },
    retentionPolicy: 'Keep according to academic record retention policy',
  },
  {
    name: 'Financial Aid',
    type: 'finance',
    defaultRoles: ['financial_aid'],
    defaultDocumentTypes: ['FAFSA/CSS/Profile status or document placeholder', 'Fee waiver documentation', 'Financial Aid'],
    defaultWorkflows: ['Aid verification', 'Missing materials', 'Award review'],
    studentVisibility: { canUpload: true, canView: true },
    retentionPolicy: 'Keep according to financial aid record retention policy',
  },
  {
    name: 'Student Accounts / Bursar',
    type: 'finance',
    defaultRoles: ['student_accounts', 'bursar'],
    defaultDocumentTypes: ['Finance'],
    defaultWorkflows: ['Balance review', 'Payment plan', 'Billing communication'],
    studentVisibility: { canUpload: true, canView: true },
    retentionPolicy: 'Keep according to student account retention policy',
  },
  {
    name: 'Advising',
    type: 'student lifecycle',
    defaultRoles: ['advisor'],
    defaultDocumentTypes: ['Resume', 'Immunization/final enrollment documents'],
    defaultWorkflows: ['Advising handoff', 'Registration readiness'],
    studentVisibility: { canUpload: true, canView: true },
    retentionPolicy: 'Keep while actively enrolled plus institution retention period',
  },
  {
    name: 'Student Services',
    type: 'student lifecycle',
    defaultRoles: ['student_services'],
    defaultDocumentTypes: ['Government ID / residency proof', 'Residency Appeal', 'FERPA', 'Immunization/final enrollment documents'],
    defaultWorkflows: ['Student support', 'Residency review', 'FERPA release'],
    studentVisibility: { canUpload: true, canView: true },
    retentionPolicy: 'Keep according to student services retention policy',
  },
  {
    name: 'Academic Affairs',
    type: 'academic',
    defaultRoles: ['academic_affairs'],
    defaultDocumentTypes: ['College transcript', 'GED/equivalency record'],
    defaultWorkflows: ['Academic review', 'Exception review'],
    studentVisibility: { canUpload: false, canView: false },
    retentionPolicy: 'Keep according to academic affairs policy',
  },
  {
    name: 'International Student Services',
    type: 'student lifecycle',
    defaultRoles: ['international_student_services'],
    defaultDocumentTypes: ['English proficiency scores', 'Government ID / residency proof'],
    defaultWorkflows: ['International documentation', 'Visa support', 'English proficiency review'],
    studentVisibility: { canUpload: true, canView: true },
    retentionPolicy: 'Keep according to international student record policy',
  },
  {
    name: 'Institutional Research / Reporting',
    type: 'administrative',
    defaultRoles: ['institutional_research'],
    defaultDocumentTypes: [],
    defaultWorkflows: ['Reporting', 'Compliance exports'],
    studentVisibility: { canUpload: false, canView: false },
    retentionPolicy: 'Keep according to reporting data retention policy',
  },
  {
    name: 'HR',
    type: 'administrative',
    defaultRoles: ['hr'],
    defaultDocumentTypes: ['HR'],
    defaultWorkflows: ['Employee document review'],
    studentVisibility: { canUpload: false, canView: false },
    retentionPolicy: 'Keep according to HR retention policy',
  },
  {
    name: 'Finance',
    type: 'finance',
    defaultRoles: ['finance'],
    defaultDocumentTypes: ['Finance'],
    defaultWorkflows: ['Finance review', 'Payment review'],
    studentVisibility: { canUpload: false, canView: false },
    retentionPolicy: 'Keep according to finance retention policy',
  },
  {
    name: 'IT / Security',
    type: 'administrative',
    defaultRoles: ['it_security'],
    defaultDocumentTypes: [],
    defaultWorkflows: ['Security review', 'Access review'],
    studentVisibility: { canUpload: false, canView: false },
    retentionPolicy: 'Keep according to IT/security retention policy',
  },
  {
    name: 'Legal / Compliance',
    type: 'compliance',
    defaultRoles: ['legal_compliance'],
    defaultDocumentTypes: ['FERPA', 'Government ID / residency proof', 'Residency Appeal'],
    defaultWorkflows: ['Compliance review', 'Legal hold', 'FERPA release'],
    studentVisibility: { canUpload: true, canView: false },
    retentionPolicy: 'Keep according to legal/compliance retention policy',
  },
]

export const OPTIONAL_DOCUMENT_DEPARTMENTS = [
  'Athletics',
  'Housing / Residence Life',
  'Career Services',
  'Alumni / Advancement',
  'Continuing Education',
  'Graduate / Professional Studies',
]

export function getDepartmentConfig(name, departments = DEFAULT_DOCUMENT_DEPARTMENTS) {
  return departments.find((department) => department.name === name) || departments[0]
}

export function classifyDocumentDepartment(documentType, file, departments = DEFAULT_DOCUMENT_DEPARTMENTS) {
  const normalizedType = String(documentType || '').toLowerCase()
  const name = String(file?.name || '').toLowerCase()
  const haystack = `${normalizedType} ${name}`

  if (/hr|human.resources|employment|employee|i-9|w-4/.test(haystack)) return getDepartmentConfig('HR', departments).name
  if (/finance|billing|invoice|payment|ledger|account.statement/.test(haystack)) return getDepartmentConfig('Finance', departments).name
  if (/student.account|bursar|tuition|balance|payment.plan/.test(haystack)) return getDepartmentConfig('Student Accounts / Bursar', departments).name
  if (/fafsa|css|financial.aid|aid.award|award.letter|verification.worksheet|fee.waiver/.test(haystack)) return getDepartmentConfig('Financial Aid', departments).name
  if (/ferpa|legal|compliance|privacy.release|information.release|consent.release/.test(haystack)) return getDepartmentConfig('Legal / Compliance', departments).name
  if (/residency|domicile|in.state|out.of.state|government.id|passport|driver|license/.test(haystack)) return getDepartmentConfig('Student Services', departments).name
  if (/toefl|ielts|duolingo|english.proficiency|pte|international|visa|passport/.test(haystack)) return getDepartmentConfig('International Student Services', departments).name
  if (/college.transcript|ged|equivalency|registrar|final.enrollment|immunization|vaccine|vaccination/.test(haystack)) return getDepartmentConfig('Registrar', departments).name
  if (/advising|advisor|registration|orientation/.test(haystack)) return getDepartmentConfig('Advising', departments).name
  if (/academic.affairs|academic.exception|faculty.review/.test(haystack)) return getDepartmentConfig('Academic Affairs', departments).name
  if (/reporting|institutional.research|ir.report/.test(haystack)) return getDepartmentConfig('Institutional Research / Reporting', departments).name
  if (/it|security|access.request|sso|mfa/.test(haystack)) return getDepartmentConfig('IT / Security', departments).name
  if (/application|admission|admissions|high.school.transcript|essay|recommendation|counselor|school.report|act|sat|resume/.test(haystack)) return getDepartmentConfig('Admissions', departments).name

  const configuredMatch = departments.find((department) => (
    department.defaultDocumentTypes || []
  ).some((type) => type.toLowerCase() === normalizedType))
  return (configuredMatch || getDepartmentConfig('General / Shared Services', departments)).name
}
