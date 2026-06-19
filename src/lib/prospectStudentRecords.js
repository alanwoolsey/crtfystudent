import { PIPELINE_STATUSES } from './admissionsWorkflow'

function getCourseCredits(course) {
  const credits = Number(course?.credits || course?.credit || 0)
  return Number.isFinite(credits) ? credits : 0
}

function getCourseGpa(course) {
  const grade = String(course?.grade || '').trim().toUpperCase()
  const points = {
    A: 4,
    'A-': 3.7,
    'B+': 3.3,
    B: 3,
    'B-': 2.7,
    'C+': 2.3,
    C: 2,
    'C-': 1.7,
    D: 1,
    F: 0,
  }[grade]
  return points ?? null
}

export function mapProspectSubmissionToStudent(submission) {
  const creditsAccepted = submission.courses.reduce((sum, course) => sum + getCourseCredits(course), 0)
  const gradedCourses = submission.courses
    .map((course) => ({ points: getCourseGpa(course), credits: getCourseCredits(course) }))
    .filter((course) => course.points !== null && course.credits > 0)
  const qualityPoints = gradedCourses.reduce((sum, course) => sum + course.points * course.credits, 0)
  const gpaCredits = gradedCourses.reduce((sum, course) => sum + course.credits, 0)
  const gpa = gpaCredits ? Number((qualityPoints / gpaCredits).toFixed(3)) : null

  return {
    id: `PROSPECT-${submission.id}`,
    prospectSubmissionId: submission.id,
    name: submission.name,
    preferredName: submission.name.split(' ')[0],
    email: submission.email,
    phone: submission.phone,
    program: submission.program,
    termInterest: submission.term,
    institutionGoal: 'Prospect portal',
    stage: PIPELINE_STATUSES.prospect,
    risk: 'Low',
    advisor: submission.assignedTo === 'Not available' ? 'Unassigned' : submission.assignedTo,
    population: submission.type,
    source: 'Prospect portal',
    sourceCategory: 'prospect',
    gpa,
    creditsAccepted,
    transcriptsCount: submission.transcriptCount,
    fitScore: 82,
    depositLikelihood: 44,
    lastActivity: submission.updated,
    tags: ['Prospect', 'Portal submission', submission.type].filter(Boolean),
    summary: `${submission.type} prospect submitted ${submission.transcriptCount} transcript${submission.transcriptCount === 1 ? '' : 's'} for ${submission.program} ${submission.term}.`,
    checklist: [
      { label: 'Inquiry captured', done: true },
      { label: 'Transcript received', done: submission.transcripts.length > 0 },
      { label: 'Course mapping reviewed', done: false },
      { label: 'Application started', done: false },
    ],
    transcripts: submission.transcripts.map((transcript) => ({
      id: transcript.id,
      documentId: transcript.documentId,
      source: 'Prospect portal upload',
      institution: 'Prospect supplied transcript',
      type: 'College',
      uploadedAt: transcript.submitted,
      updatedAt: transcript.updated,
      status: transcript.status,
      confidence: 92,
      credits: creditsAccepted,
      pages: 1,
      owner: submission.assignedTo === 'Not available' ? 'Portal intake' : submission.assignedTo,
      notes: `Submitted through the prospect portal for ${submission.program}.`,
      steps: [
        { label: 'Portal submission received', time: transcript.submitted },
        { label: 'Transcript attached to Student 360', time: transcript.updated },
      ],
      courses: submission.courses.map((course) => ({
        courseId: course.course,
        courseTitle: course.source,
        credit: course.credits,
        grade: course.grade,
        mappedTo: course.mappedTo,
        countsAs: course.countsAs,
      })),
    })),
    recommendation: {
      summary: 'Prospect record ready for counselor review.',
      fitNarrative: 'Portal transcript data is attached to Student 360 so admissions can evaluate fit before application conversion.',
      nextBestAction: 'Review portal submission and invite application start',
    },
  }
}

export function mergeProspectsIntoStudents(students, prospectSubmissions) {
  const prospectStudents = prospectSubmissions.map(mapProspectSubmissionToStudent)
  const existingIds = new Set(students.map((student) => String(student.id)))
  return [
    ...students,
    ...prospectStudents.filter((student) => !existingIds.has(String(student.id))),
  ]
}
