# crtfy Student Updated Product Spec

Last updated: 2026-06-20

## 1. Product Summary

`crtfy student` is an admissions operating system for transcript-led enrollment workflows. It helps admissions teams move students from first inquiry through application completion, review, decision, yield, deposit, registration, and downstream enrollment readiness.

The product is centered on a single student record, with supporting workflows for:

- counselor daily work
- student relationship history
- transcript and document intake
- checklist readiness
- course equivalency
- decision readiness
- trust and exception review
- communication and outreach
- cross-office handoffs
- post-admit readiness
- recruitment source attribution
- reporting and accountability

The target operating model is:

`Inquiry -> Prospect -> Applicant -> Incomplete -> Complete -> Admitted -> Deposited/Committed -> Registered`

The product should help staff answer four daily questions:

1. Who needs action now?
2. What exactly is blocking the student?
3. Who owns the next step?
4. Is the student moving through the funnel?

---

## 2. Product Goals

### Primary Goals

- Give counselors a daily operating screen instead of forcing them to hunt through records.
- Keep every student action tied to Student 360.
- Make admissions work visible across documents, checklist items, communication, handoffs, and post-admit milestones.
- Reduce time from incomplete application to complete application.
- Improve admitted-to-deposited and deposited-to-registered conversion.
- Make transcript and course evidence useful in real counselor conversations.
- Give leadership enough reporting to see funnel health, workload, blockers, and source performance.

### Non-Goals

- Replace every institution CRM feature.
- Become the system of record for financial aid, SIS registration, housing, billing, email, or SMS.
- Build deep event management before the core admissions operating workflow is stable.
- Expose sensitive academic, trust, or document evidence without permission and sensitivity checks.

---

## 3. Users And Personas

### Admissions Counselor

Primary user for daily work.

Needs to:

- identify top follow-ups
- contact students
- log calls, emails, texts, meetings, and notes
- set next actions and follow-up dates
- move incomplete students toward completion
- support admitted students toward deposit
- support deposited students toward registration
- route blockers to other teams
- understand transfer credit and program fit

### Admissions Processor

Works document and checklist operations.

Needs to:

- review document queue
- resolve indexing or matching issues
- reprocess or replace documents
- clear checklist blockers
- route trust-sensitive or academic questions

### Reviewer / Evaluator

Reviews complete applications and transfer/academic evidence.

Needs to:

- see ready-for-review students
- review academic signal and document evidence
- understand course equivalency
- contribute to decision readiness

### Decision Releaser / Director

Owns decision release and leadership oversight.

Needs to:

- review decision posture
- release outcomes
- monitor funnel metrics
- monitor team workload
- identify stuck stages and overdue handoffs

### Trust Analyst

Reviews document trust and fraud-sensitive issues.

Needs to:

- inspect trust flags
- review suspicious or low-confidence documents
- resolve trust cases
- protect release decisions from unsupported evidence

### Registrar / Transfer Specialist

Supports transfer credit and registration readiness.

Needs to:

- review course equivalency questions
- confirm transfer mapping
- help clear registration blockers

### Financial Aid

Supports admitted and deposited student readiness.

Needs to:

- see aid-related handoffs
- resolve financial aid package or affordability blockers
- update post-admit milestones

### Read-Only Leadership

Monitors outcomes.

Needs to:

- view funnel reporting
- view workload
- view source and territory performance
- identify SLA and handoff issues

---

## 4. Core Navigation

The authenticated app shell includes:

- `Today's Work`
- `Student 360`
- `Incomplete Applications`
- `Documents Queue`
- `Ready for Review`
- `Decision Studio`
- `Trust Center`
- `Admitted / Yield`
- `Deposit / Melt`
- `Integrations`
- `Portals`
- `Reporting`
- `Admin`
- `Tenants`
- `User Profile`

Navigation is permission-aware. Users only see pages they are allowed to access.

---

## 5. Authentication And Tenant Behavior

### Requirements

- Users sign in with username and password.
- Users can complete a required password challenge.
- Users can change password from the user menu.
- Users can sign out.
- The frontend stores session state locally.
- Protected API calls include:
  - `Authorization: Bearer <access_token>`
  - `X-Tenant-Id: <tenant_id>`
- If a protected call returns `401`, local auth state is cleared and the user is routed back to login.
- Every backend endpoint must enforce tenant scoping.
- Cross-tenant student access must be rejected.

### Expected Backend Behavior

- Return `401` for expired or invalid tokens.
- Return `403` when authenticated user lacks permission.
- Return `404` when a tenant-scoped entity does not exist for that tenant.
- Never return another tenant's student, transcript, document, handoff, or interaction.

---

## 6. Permissions And Sensitivity

The app supports role, permission, and sensitivity-tier checks.

### Common Roles

- `admissions_counselor`
- `admissions_processor`
- `reviewer_evaluator`
- `decision_releaser_director`
- `trust_analyst`
- `registrar_transfer_specialist`
- `financial_aid`
- `read_only_leadership`
- `integration_service`

### Sensitive Data Areas

- academic records
- transcript images
- trust and fraud flags
- decision packets
- student account or financial-aid blockers

### Product Rule

If a user does not have the required permission or sensitivity tier, the UI should either hide the control or show a safe fallback message without exposing sensitive detail.

---

## 7. Student Lifecycle Model

Canonical pipeline statuses:

| Status | Meaning |
|---|---|
| Inquiry | Student showed interest |
| Prospect | Student may be a fit |
| Applicant | Application started or submitted |
| Incomplete | Missing transcript, essay, fee, recommendation, or other item |
| Complete | Ready for review |
| Admitted | Accepted |
| Deposited/Committed | Student intends to enroll |
| Registered | Student is actually enrolled |

Each student should have:

- stable ID
- name
- preferred name when available
- email
- phone
- city/location
- source
- population
- program or degree
- stage
- owner/counselor
- last activity
- last contacted date
- next follow-up date
- next action
- contact outcome
- checklist
- transcripts
- interactions
- handoffs
- post-admit milestones
- recruitment attribution

---

## 8. Today's Work

### Purpose

`Today's Work` is the counselor's daily operating screen. It should tell staff who needs attention and why.

### Key Sections

- summary cards
  - needs attention
  - close to completion
  - ready for decision
  - exceptions
- counselor workbench
- pipeline buckets
- due follow-up bucket
- handoff queue
- post-admit blockers
- recruitment follow-up
- traditional work queues

### Counselor Buckets

The counselor workbench should include:

- due follow-up
- inquiry
- prospect
- applicant
- incomplete
- complete
- admitted
- deposited/committed
- registered

### Work Item Fields

Each work item should show:

- student name
- program
- pipeline status
- owner
- blocker or reason to act
- last contact
- next follow-up
- next action
- due date
- urgency or priority

### Quick Actions

From work items, counselors can:

- open Student 360
- log contact
- add note
- mark contacted
- set next follow-up
- request missing document
- route or handoff to another team

### API

Primary endpoint:

```http
GET /api/v1/work/counselor/today
```

Fallback endpoint currently supported:

```http
GET /api/v1/work/today
```

Next action endpoint:

```http
POST /api/v1/students/{studentId}/next-action
```

---

## 9. Student 360

### Purpose

Student 360 is the operational record for one student. It combines profile, documents, checklist, academic signal, timeline, outreach, handoff, decision, yield, post-admit, and recruitment context.

### Tabs

- Overview
- Timeline
- Outreach
- Checklist
- Documents
- Decisions
- Trust
- Yield / Deposit
- Handoff
- Recruitment

### Overview

Shows:

- name and preferred name
- contact info
- city/location
- selected program
- source
- population
- student ID
- last activity
- last contact
- next follow-up
- next action
- fit score
- deposit likelihood
- accepted credits
- advisor/owner
- academic signal
- subject GPA
- test scores when present
- course equivalency when college transcript courses are present

### Program Selection

Counselor can update the selected program from a dropdown.

Expected behavior:

- selecting a new program immediately updates Student 360
- saved program should persist through backend
- course equivalency refresh should use the selected program

API:

```http
PATCH /api/v1/students/{studentId}
```

Expected fields:

```json
{
  "program": "BS Computer Science",
  "degreeProgram": "BS Computer Science"
}
```

---

## 10. Timeline And Interactions

### Purpose

Timeline makes Student 360 the relationship record, not just a transcript or checklist record.

### Interaction Types

- call
- text
- email
- meeting
- family conversation
- campus visit
- webinar / open house
- note
- communication
- handoff
- post-admit milestone
- recruitment event

### Interaction Outcomes

- reached student
- left message
- no response
- needs follow-up
- not interested
- ready to apply
- ready to deposit

### User Flow

In Student 360:

1. Open `Timeline`.
2. Select `Activity`.
3. Select `Outcome`.
4. Set `Next follow-up`.
5. Enter `Note`.
6. Enter `Next action`.
7. Click `Add activity`.

The activity appears immediately in the timeline.

### API

```http
GET /api/v1/students/{studentId}/interactions
POST /api/v1/students/{studentId}/interactions
```

---

## 11. Outreach And Communication

### Purpose

Outreach helps counselors execute follow-up, not just track it.

### Templates

Supported template categories:

- new inquiry
- application help
- missing transcript
- missing requirement
- admission offer
- deposit reminder
- registration / orientation reminder

### Channels

- email
- text
- call
- other

### User Flow

In Student 360:

1. Click `Outreach`.
2. Select `Template`.
3. Select `Channel`.
4. Set `Next follow-up`.
5. Edit `Subject`.
6. Edit `Draft`.
7. Click `Log outreach`.

The communication appears in:

- Student 360 communication history
- Student 360 timeline
- future work queues through next follow-up

### API

```http
GET /api/v1/communication/templates
POST /api/v1/students/{studentId}/communications/log
```

### Future Integration

The current product supports manual logging. Later provider integrations should support:

- sending email
- sending SMS
- delivery status
- failed delivery handling
- reply tracking

---

## 12. Checklist Readiness

### Purpose

Checklist readiness shows whether the student file can move forward.

### Checklist Item States

- not started
- requested
- received
- needs review
- blocked
- rejected
- expired
- complete
- waived

### User Flow

In Student 360:

1. Click `Checklist`.
2. Review `Next best actions`.
3. Find incomplete or review-needed item.
4. Click item action such as `Mark reviewed` or `Mark complete`.
5. Confirm readiness updates.

### API

```http
GET /api/v1/students/{studentId}/checklist
POST /api/v1/students/{studentId}/checklist/items/{itemId}/status
GET /api/v1/students/{studentId}/readiness
```

---

## 13. Documents And Transcript Intake

### Purpose

Document workflows support transcript upload, extraction, review, matching, exception handling, and evidence inspection.

### Capabilities

- upload single transcript
- upload batch transcript archive
- show upload progress
- show batch progress
- route user to Student 360 or Student 360 list after upload
- view document queue
- view document exceptions
- open transcript lineage from Student 360
- inspect extracted course rows
- view original transcript document when available
- reprocess or replace documents when supported

### Document Queue Signals

- document type
- student match
- confidence
- upload source
- status
- transcript status
- latest run status
- reason
- suggested action
- trust flag
- received date

### APIs

```http
POST /api/v1/transcripts/uploads
GET /api/v1/transcripts/uploads/{transcriptId}/status
GET /api/v1/documents/queue
GET /api/v1/documents/exceptions
GET /api/v1/documents/{documentId}/content
POST /api/v1/documents/{documentId}/reprocess-upload
```

---

## 14. Course Equivalency

### Purpose

Course equivalency helps counselors explain how transcript courses may map into the selected degree or program.

### Availability

Course equivalency should only show when the student has college transcript courses.

### Inputs

- selected student program
- transcript course code
- transcript course title
- credits
- grade
- institution
- term/year

### Output Table

- transcript course
- credits
- catalog course
- catalog title
- degree requirement
- match confidence
- rationale

### Header Totals

- credits that might transfer
- credits that likely will not transfer

### Chat/Catalog Integration

The frontend calls the chat service when configured:

```http
POST {VITE_CHAT_URL}/api/agent/run
```

The chat service should use the course catalog connection to map transcript courses to the selected degree/program.

If catalog lookup fails, the frontend shows fallback subject-based mappings rather than an empty card.

---

## 15. Ready For Review And Decisions

### Purpose

Ready-for-review and decision workflows help staff move complete files into evaluation and outcome release.

### Ready For Review

Shows students whose materials appear complete enough for evaluation.

Typical user actions:

- open student
- inspect readiness
- inspect academic evidence
- route to reviewer
- claim or escalate review when supported

### Decisions Tab

Student 360 `Decisions` tab shows:

- recommendation summary
- fit narrative
- next best action
- readiness/release posture
- release actions when user has permission

### Decision Studio

Decision Studio supports decision packet review and release workflows for users with decision permissions.

---

## 16. Trust Center

### Purpose

Trust workflows protect decision release from unsupported, suspicious, or low-confidence evidence.

### Capabilities

- view trust flags
- view document confidence
- view trust-sensitive transcript details
- quarantine document
- resolve trust case
- block release until trust issues are resolved

### Access

Trust content requires trust/fraud sensitivity access.

### APIs

```http
GET /api/v1/trust/cases
GET /api/v1/trust/transcripts/{transcriptId}/details
POST /api/v1/trust/transcripts/{transcriptId}/{action}
```

---

## 17. Cross-Office Handoffs

### Purpose

Handoffs make downstream work visible and accountable.

### Target Teams

- Admissions Operations
- Application Reviewer
- Financial Aid
- Academic Department
- Registrar / Transfer Specialist
- Advising / Student Success
- Housing / Orientation
- Bursar / Student Accounts

### Fields

- target team
- owner
- priority
- status
- due date
- blocker / request
- summary
- actor
- created date

### User Flow

In Student 360:

1. Click `Handoff`.
2. Set `Target`.
3. Set `Priority`.
4. Set `Status`.
5. Enter `Owner` if known.
6. Set `Due`.
7. Enter `Blocker / request`.
8. Click `Create handoff`.

The handoff appears in:

- Student 360 handoff queue
- Student 360 timeline
- Today's Work handoff queue
- reporting handoff SLA metrics

### APIs

```http
GET /api/v1/handoffs
POST /api/v1/students/{studentId}/handoffs
POST /api/v1/handoffs/{handoffId}/status
```

---

## 18. Admitted / Yield

### Purpose

Admitted / Yield focuses on admitted students who need next-step conversion work.

### Views

- newly admitted
- high likelihood
- high-value transfer
- no recent activity
- scholarship-sensitive
- missing next step

### Card Fields

- student name
- program
- yield score
- admit date
- deposit status
- milestone completion
- assigned counselor
- last activity
- next step

### User Actions

- open student
- log outreach
- create financial aid handoff
- update post-admit readiness

### API

```http
GET /api/v1/yield
```

If the endpoint is unavailable or returns no data, the frontend derives admitted/yield cards from loaded student records.

---

## 19. Deposit / Melt

### Purpose

Deposit / Melt focuses on students between commitment and registration.

### Views

- deposited all-clear
- at risk
- missing FAFSA
- missing orientation
- missing final transcript
- registration incomplete

### Card Fields

- student name
- program
- melt risk
- deposit date
- owner
- open blockers
- missing milestones
- last outreach

### User Actions

- open student
- log follow-up
- update milestones
- create handoff to downstream office

### API

```http
GET /api/v1/melt
```

If unavailable, the frontend derives melt cards from loaded student records.

---

## 20. Post-Admit Readiness

### Purpose

Post-admit readiness tracks why an admitted or deposited student has not enrolled or registered.

### Milestones

- financial aid package
- scholarship status
- deposit / commitment
- housing application
- orientation
- advising appointment
- registration status
- bursar / student account
- international documentation
- veteran / military benefits
- accessibility / accommodation handoff

### Milestone Statuses

- Not started
- In progress
- Blocked
- Complete
- Waived

### User Flow

In Student 360:

1. Click `Yield / Deposit`.
2. Find `Post-admit readiness`.
3. For each milestone:
   - set `Status`
   - confirm or edit `Owner`
   - set `Due`
   - enter `Blocker`
   - click `Save`

Saved milestones should appear in:

- Student 360
- Student 360 timeline
- Deposit / Melt fallback cards
- Today's Work post-admit blockers
- Reporting

### APIs

```http
GET /api/v1/students/{studentId}/post-admit-readiness
POST /api/v1/students/{studentId}/milestones/{milestoneId}/status
```

---

## 21. Recruitment, Territory, And Events

### Purpose

Recruitment features connect students to territories, source schools, partner schools, and events.

### Supported Event Types

- college fair
- high school visit
- transfer partner visit
- open house
- webinar
- campus visit
- counselor travel

### Student 360 Recruitment Fields

- territory
- school / partner
- event type
- event name
- event date
- notes

### User Flow

In Student 360:

1. Click `Recruitment`.
2. Select `Territory`.
3. Select `Event type`.
4. Set `Date`.
5. Enter `School / partner`.
6. Enter `Event name`.
7. Enter `Notes`.
8. Click `Log recruitment activity`.

The event appears in:

- Student 360 recruitment history
- Student 360 timeline
- Today's Work recruitment follow-up
- Reporting source performance

### APIs

```http
GET /api/v1/recruitment/events
POST /api/v1/recruitment/events/{eventId}/attendees
```

---

## 22. Reporting

### Purpose

Reporting gives leadership and counselors visibility into funnel movement, workload, handoff SLA, and source performance.

### Current Reporting Areas

- overview metrics
- operational impact trend
- inquiry-to-registered funnel
- handoff SLA
- counselor workload
- source performance

### Metrics

- incomplete to complete conversion
- average days to complete
- average days complete to decision
- auto-index success rate
- admit to deposit conversion
- melt rate
- funnel counts from Inquiry to Registered
- handoff open count
- handoff overdue count
- handoff completion rate
- assigned students by counselor
- source / partner / territory volume

### APIs

```http
GET /api/v1/reporting/overview
GET /api/v1/reporting/funnel
GET /api/v1/reporting/stage-aging
GET /api/v1/reporting/counselor-workload
GET /api/v1/reporting/handoffs
```

If live aggregation endpoints are unavailable, the frontend derives reporting from loaded student records where possible.

---

## 23. Prospect Portal

### Purpose

Prospect portal surfaces external prospect submissions and lets staff merge or review prospective students alongside existing Student 360 records.

### Capabilities

- display prospect submissions
- merge prospect data into student display records
- support portal-driven intake and early funnel visibility

### Future Enhancements

- parent/family engagement
- event registration
- application-start tracking
- source campaign attribution

---

## 24. Integrations

### Purpose

Integrations support external system connectivity and data mapping.

### Current Integration Areas

- transcript upload and processing
- chat/course catalog lookup
- document processing
- future email/SMS providers
- future SIS registration
- future financial aid package status
- future housing/orientation/bursar status

### Integration Rules

- Do not duplicate an institution's authoritative system when integration is better.
- Store enough local status to power admissions operations.
- Keep external identifiers and provider metadata for auditability.
- All integration calls must be tenant-scoped.

---

## 25. Admin

### Purpose

Admin supports tenant and user configuration.

### Capabilities

- manage users when permitted
- view platform tenant controls when permitted
- manage integration-related access when permitted
- inspect role, permission, and sensitivity configuration

---

## 26. Data Model Summary

### StudentRecord

Core fields:

- id
- name
- preferredName
- email
- phone
- program
- degreeProgram
- institutionGoal
- stage
- risk
- advisor / owner
- city
- source
- population
- summary
- fitScore
- depositLikelihood
- creditsAccepted
- lastActivity
- lastContactedAt
- nextFollowUpAt
- nextAction
- contactOutcome
- checklist
- transcripts
- interactions
- handoffs
- postAdmitMilestones
- territory
- sourceSchool
- partnerSchool

### Interaction

- id
- studentId
- type
- outcome
- title
- description
- note
- nextAction
- nextFollowUpAt
- occurredAt
- actor
- source

### Communication

- id
- studentId
- channel
- templateKey
- templateLabel
- subject
- message
- status
- nextFollowUpAt
- occurredAt
- actor
- provider metadata when available

### Handoff

- id
- studentId
- targetTeam
- owner
- ownerId
- priority
- status
- dueAt
- blocker
- summary
- createdAt
- createdBy
- updatedAt

### PostAdmitMilestone

- id
- studentId
- label
- status
- owner
- dueAt
- blocker
- updatedAt

### RecruitmentEvent

- id
- studentId
- territory
- school
- partner
- eventType
- eventName
- occurredAt
- notes
- actor

---

## 27. API Contract Summary

### Auth And User

```http
GET /api/v1/me
POST /api/v1/auth/login
POST /api/v1/auth/change-password
```

### Students

```http
GET /api/v1/students
GET /api/v1/students/{studentId}
PATCH /api/v1/students/{studentId}
POST /api/v1/students/{studentId}/next-action
```

### Checklist And Readiness

```http
GET /api/v1/students/{studentId}/checklist
POST /api/v1/students/{studentId}/checklist/items/{itemId}/status
GET /api/v1/students/{studentId}/readiness
```

### Interactions And Communications

```http
GET /api/v1/students/{studentId}/interactions
POST /api/v1/students/{studentId}/interactions
GET /api/v1/communication/templates
POST /api/v1/students/{studentId}/communications/log
```

### Handoffs

```http
GET /api/v1/handoffs
POST /api/v1/students/{studentId}/handoffs
POST /api/v1/handoffs/{handoffId}/status
```

### Post-Admit

```http
GET /api/v1/students/{studentId}/post-admit-readiness
POST /api/v1/students/{studentId}/milestones/{milestoneId}/status
```

### Work

```http
GET /api/v1/work/counselor/today
GET /api/v1/work/today
GET /api/v1/work/today/board
POST /api/v1/work/today/orchestrate
GET /api/v1/work/today/orchestrations/latest
```

### Documents

```http
POST /api/v1/transcripts/uploads
GET /api/v1/transcripts/uploads/{transcriptId}/status
GET /api/v1/documents/queue
GET /api/v1/documents/exceptions
GET /api/v1/documents/{documentId}/content
POST /api/v1/documents/{documentId}/reprocess-upload
```

### Operations Queues

```http
GET /api/v1/incomplete
GET /api/v1/review-ready
GET /api/v1/yield
GET /api/v1/melt
```

### Reporting

```http
GET /api/v1/reporting/overview
GET /api/v1/reporting/funnel
GET /api/v1/reporting/stage-aging
GET /api/v1/reporting/counselor-workload
GET /api/v1/reporting/handoffs
```

### Recruitment

```http
GET /api/v1/recruitment/events
POST /api/v1/recruitment/events/{eventId}/attendees
```

### Trust

```http
GET /api/v1/trust/cases
GET /api/v1/trust/transcripts/{transcriptId}/details
POST /api/v1/trust/transcripts/{transcriptId}/{action}
```

---

## 28. Audit Requirements

Backend should audit:

- sign in failures and privileged auth events
- student program changes
- next action changes
- checklist item updates
- interaction creation
- communication logging and delivery status changes
- handoff creation
- handoff assignment changes
- handoff status changes
- milestone status changes
- document reprocessing
- trust case actions
- decision release actions
- integration sync events

Audit records should include:

- tenant ID
- actor ID
- action
- entity type
- entity ID
- before/after values when appropriate
- timestamp
- request correlation ID when available

---

## 29. Error Handling

### Frontend Expectations

- `401`: clear local session and route to login.
- `403`: show access denied or unauthorized tenant message.
- `404` or `405` for newly introduced endpoints: use local optimistic fallback when possible.
- Network failure: show safe fallback or error state.
- Partial reporting failure: keep derived reporting available.

### Backend Expectations

- Return structured error payloads:

```json
{
  "detail": "Human readable message"
}
```

or:

```json
{
  "message": "Human readable message"
}
```

---

## 30. Operational Metrics

Product success should be measured by:

- fewer students stalled in incomplete status
- faster incomplete-to-complete conversion
- faster complete-to-decision turnaround
- higher admit-to-deposit conversion
- lower deposited student melt
- fewer overdue handoffs
- higher percentage of student records with next action and follow-up
- better visibility into source and territory performance
- reduced manual transcript triage
- improved course equivalency confidence for transfer students

---

## 31. Current Fallback Behavior

The frontend intentionally supports fallback behavior while backend endpoints mature.

Fallbacks include:

- deriving work items from loaded students
- optimistic local next-action updates
- optimistic local interaction saves
- optimistic local communication logging
- optimistic local handoff creation
- optimistic local milestone updates
- deriving admitted/yield cards from student records
- deriving deposit/melt cards from student records
- deriving reporting from student records
- fallback course equivalency mapping when catalog lookup fails

Fallback behavior should be removed or reduced as backend persistence becomes reliable.

---

## 32. Remaining Product Gaps

### High Priority

- real outbound email and SMS send support
- response and reply tracking
- durable backend audit for all counselor workflow changes
- official source of truth for registration status
- financial aid package integration
- bursar/student account hold integration
- export/download for reporting

### Medium Priority

- parent/family engagement
- event registration and attendance import
- counselor travel calendar integration
- richer territory management
- bulk outreach from selected work buckets
- assistant-generated communication drafts through approved chat integration

### Lower Priority

- advanced campaign sequencing
- deep event management
- advanced source attribution modeling
- configurable institutional workflow templates

---

## 33. Acceptance Criteria

### Counselor Workbench

- A counselor can start from `Today's Work`.
- A counselor can identify overdue follow-ups.
- A counselor can filter students by pipeline bucket.
- A counselor can open Student 360 from a work item.
- A counselor can log contact and set next follow-up.

### Student 360

- A counselor can update selected program.
- A counselor can review checklist, timeline, documents, outreach, handoff, yield, and recruitment context.
- A counselor can log interactions.
- A counselor can log outreach.
- A counselor can create handoffs.
- A counselor can update post-admit milestones.
- A counselor can log recruitment attribution.

### Documents And Equivalency

- A user with access can inspect transcript lineage.
- A user with access can view extracted course evidence.
- Course equivalency appears only for college transcript courses.
- Course equivalency uses selected program.
- Transfer credit totals are visible.

### Handoffs

- Handoffs have target, owner, due date, priority, status, and blocker/request.
- Handoffs appear on Student 360.
- Handoffs appear in timeline.
- Handoffs appear in Today's Work.
- Handoff SLA appears in reporting.

### Post-Admit

- Staff can see why an admitted student has not deposited.
- Staff can see why a deposited student has not registered.
- Milestones have owners, due dates, status, and blockers.
- Blockers appear in Deposit / Melt and Today's Work.

### Reporting

- Leadership can view funnel from Inquiry to Registered.
- Leadership can view handoff SLA.
- Leadership can view counselor workload.
- Leadership can view source performance.
- Reporting falls back safely when aggregation endpoints are unavailable.

---

## 34. Release Notes For Current Version

This version includes:

- expanded counselor workbench
- canonical pipeline status alignment
- Student 360 program dropdown
- college transcript course equivalency card
- timeline activity composer
- outreach templates and communication logging
- cross-office handoff creation
- post-admit readiness milestones
- recruitment source and event logging
- reporting additions for funnel, handoff SLA, counselor workload, and source performance
- backend endpoint targeting for deployed counselor and reporting APIs
- auth handling for expired tokens returning users to login

---

## 35. Documentation Index

Related docs:

- `docs/counselor-workflow-product-plan.md`
- `docs/admissions-counselor-hour-by-hour-system-runbook.md`
- `docs/product-functionality.md`
- `docs/frontend-backend-field-contract.md`
- `docs/backend-api-build-spec.md`
- `docs/backend-delivery-spec.md`
- `docs/training-guide.md`
