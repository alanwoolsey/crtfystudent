# Admissions Counselor Workflow Product Plan

Last updated: 2026-06-19

## Purpose

This plan turns the admissions counselor workflow analysis into an executable product roadmap for crtfyStudent.

The current product already supports a meaningful admissions operations layer: Student 360, document intake, checklist readiness, decision workflows, trust review, yield/deposit views, and canonical student pipeline statuses. The next product push should make the system feel like a daily counselor workbench, not only a record and queue viewer.

## Product Goal

Help admissions teams move students from:

`Inquiry -> Prospect -> Applicant -> Incomplete -> Complete -> Admitted -> Deposited/Committed -> Registered`

with clear ownership, communication history, next actions, cross-office handoffs, and funnel accountability.

## Current Coverage Snapshot

### Strongly Supported

- [x] Student 360 profile and student list.
- [x] Canonical pipeline statuses:
  - Inquiry
  - Prospect
  - Applicant
  - Incomplete
  - Complete
  - Admitted
  - Deposited/Committed
  - Registered
- [x] Program/degree selection on Student 360.
- [x] Transcript/document intake and processing workflow.
- [x] College transcript equivalency surface tied to selected program.
- [x] Checklist readiness and missing-item tracking.
- [x] Incomplete application queue.
- [x] Ready-for-review and decision surfaces.
- [x] Trust/document exception workflow.
- [x] Admitted/yield and deposit/melt surfaces.
- [x] Role-aware access controls.

### Partially Supported

- [x] Counselor daily dashboard as a complete workbench.
- [x] Student interaction timeline as a full CRM activity history.
- [x] Notes, ownership, and timeline events across every student action.
- [x] Cross-office handoffs with owners, due dates, SLAs, and outcomes.
- [x] Funnel reporting by counselor, program, source, and stage.
- [x] Post-admit readiness across financial aid, housing, orientation, advising, registration, and student accounts.

### Not Yet Supported

- [ ] Email, SMS, phone, and meeting workflows.
- [x] Outreach cadences and reminders.
- [x] Communication templates.
- [x] Campus visits, open houses, webinars, college fairs, and high school visit management.
- [x] Financial aid package and affordability workflows.
- [ ] Parent/family engagement.
- [x] Territory management.
- [x] Bursar/student account readiness.
- [x] International, veteran, athletics, accessibility, or housing-specific admissions workflows.

## Delivery Principles

- [ ] Keep the product focused on admissions operations, not generic CRM sprawl.
- [ ] Make Today's Work the operational home screen for counselors.
- [ ] Treat communication, tasks, documents, decisions, and handoffs as one student timeline.
- [ ] Keep every action tenant-scoped, permission-aware, and audit-friendly.
- [ ] Prefer integrations for communication, SIS registration, financial aid packaging, billing, and event platforms where those systems are already the system of record.
- [ ] Ship vertical slices that include data model, API, UI, audit event, and reporting impact.

---

## Phase 1: Counselor Workbench Foundation

Goal: make the product usable as a daily counselor operating screen.

### Capabilities

- [x] Expand Today's Work into a counselor-specific dashboard.
- [x] Add work buckets for:
  - [x] New inquiries needing first touch.
  - [x] Prospects needing follow-up.
  - [x] Applicants who started but did not submit.
  - [x] Incomplete applications.
  - [x] Complete applications ready for review.
  - [x] Admitted students without deposit.
  - [x] Deposited/committed students not registered.
- [x] Add student-level next action, owner, due date, and urgency.
- [x] Add quick actions:
  - [x] Open Student 360.
  - [x] Add note.
  - [x] Mark contacted.
  - [x] Set next follow-up.
  - [x] Request missing document.
  - [x] Route to operations/reviewer/financial aid.

### Frontend Checklist

- [x] Add counselor dashboard mode to Today's Work.
- [x] Add bucket filters aligned to canonical pipeline statuses.
- [x] Add compact work cards with student, program, status, owner, blocker, last contact, next action, and due date.
- [x] Add empty/loading/error states for each bucket.
- [x] Add student quick-action menu.
- [x] Add visual SLA warnings for overdue follow-up.

### Backend Checklist

- [x] Add work item read model for counselor dashboard.
- [x] Add next-action and due-date fields to student work state.
- [ ] Add endpoint: `GET /api/v1/work/counselor/today`.
- [~] Add endpoint: `POST /api/v1/students/{studentId}/next-action`.
- [ ] Add audit events for next-action changes.

Note: frontend now calls `POST /api/v1/students/{studentId}/next-action` when available and falls back to optimistic local state when the endpoint returns `404` or `405`.

### Acceptance

- [x] A counselor can start the day from Today's Work and see who needs action first.
- [x] Every work item links back to Student 360.
- [x] Work items are filtered by pipeline status and urgency.
- [ ] Next action and due date changes persist and are audited.

---

## Phase 2: Interaction History and Notes

Goal: make Student 360 the relationship record, not just the document/readiness record.

### Capabilities

- [x] Add structured student notes.
- [x] Add interaction events:
  - [x] Call.
  - [x] Text.
  - [x] Email.
  - [x] Meeting.
  - [x] Family conversation.
  - [x] Campus visit.
  - [x] Webinar/open house attendance.
- [x] Add last contact and next contact fields.
- [x] Add interaction outcome:
  - [x] Reached student.
  - [x] Left message.
  - [x] No response.
  - [x] Needs follow-up.
  - [x] Not interested.
  - [x] Ready to apply.
  - [x] Ready to deposit.

### Frontend Checklist

- [x] Add activity composer to Student 360 timeline.
- [x] Add note entry modal.
- [x] Add interaction type selector.
- [x] Add outcome selector.
- [x] Add next follow-up date/time.
- [x] Add activity filters on timeline.
- [x] Show last contact and next contact on Student 360 overview.
- [x] Show recent activity on student cards or Today’s Work cards.

### Backend Checklist

- [ ] Add student interaction entity.
- [ ] Add note entity or typed interaction notes.
- [ ] Add endpoint: `GET /api/v1/students/{studentId}/interactions`.
- [~] Add endpoint: `POST /api/v1/students/{studentId}/interactions`.
- [ ] Include interactions in Student 360 timeline.
- [ ] Add audit events for created/updated interactions.

Note: frontend now calls `POST /api/v1/students/{studentId}/interactions` when available and falls back to optimistic local timeline state when the endpoint returns `404` or `405`.

### Acceptance

- [x] A counselor can log a call, email, text, or meeting from Student 360.
- [x] The activity appears in the student timeline immediately after save.
- [x] Today’s Work can prioritize students based on last contact and next follow-up.

---

## Phase 3: Outreach and Communication Workflow

Goal: help counselors execute follow-up, not just track it.

### Capabilities

- [x] Add communication templates by pipeline status.
- [x] Add suggested outreach prompts for:
  - [x] New inquiry.
  - [x] Application help.
  - [x] Missing transcript.
  - [x] Missing essay/fee/recommendation.
  - [x] Admission offer.
  - [x] Deposit reminder.
  - [x] Registration/orientation reminder.
- [ ] Add communication draft generation through approved assistant/chat integration.
- [x] Add manual send tracking for schools without email/SMS integration.
- [ ] Add optional integration hooks for email/SMS providers.

### Frontend Checklist

- [x] Add outreach panel to Student 360.
- [x] Add template picker.
- [x] Add editable message draft.
- [x] Add channel selector: call, email, text, other.
- [x] Add send/log action.
- [x] Add communication history display.
- [x] Add bulk outreach list for selected work bucket.

### Backend Checklist

- [ ] Add communication template model.
- [ ] Add endpoint: `GET /api/v1/communication/templates`.
- [x] Frontend calls `POST /api/v1/students/{studentId}/communications/log` when available and falls back locally on `404` or `405`.
- [ ] Add integration abstraction for outbound email/SMS providers.
- [ ] Store message metadata and delivery/log status.

### Acceptance

- [x] A counselor can choose a template, personalize it, and log/send it.
- [x] Communication appears in Student 360 timeline.
- [x] Follow-up date can be set from the same flow.

---

## Phase 4: Cross-Office Handoffs

Goal: make admissions, operations, financial aid, registrar, advising, and academic department work visible and accountable.

### Handoff Types

- [x] Counselor -> Admissions Operations.
- [x] Operations -> Application Reviewer.
- [x] Admissions -> Financial Aid.
- [x] Admissions -> Academic Department / Program Director.
- [x] Admissions -> Registrar / Transfer Specialist.
- [x] Admissions -> Advising / Student Success.
- [x] Admissions -> Housing / Orientation.
- [x] Admissions -> Bursar / Student Accounts.

### Frontend Checklist

- [x] Add handoff panel to Student 360.
- [x] Add create handoff action.
- [x] Add target team/role selector.
- [x] Add owner, due date, priority, status, and blocker fields.
- [x] Add handoff queue page or filters in Today’s Work.
- [x] Add handoff status on student profile and timeline.

### Backend Checklist

- [ ] Add handoff entity.
- [ ] Add handoff assignment and ownership history.
- [ ] Add endpoint: `GET /api/v1/handoffs`.
- [x] Frontend calls `POST /api/v1/students/{studentId}/handoffs` when available and falls back locally on `404` or `405`.
- [ ] Add endpoint: `POST /api/v1/handoffs/{handoffId}/status`.
- [ ] Add audit events for handoff creation, assignment, status changes, and completion.

### Acceptance

- [x] A counselor can create a handoff with an owner and due date.
- [x] Receiving teams can see assigned handoffs.
- [x] Handoff status is visible in Student 360 and Today’s Work.
- [x] Overdue handoffs are visible and reportable.

---

## Phase 5: Post-Admit Readiness

Goal: support the admitted-to-registered part of the enrollment funnel.

### Readiness Areas

- [x] Financial aid package.
- [x] Scholarship status.
- [x] Deposit/commitment.
- [x] Housing application.
- [x] Orientation.
- [x] Advising appointment.
- [x] Registration status.
- [x] Bursar/student account blocker.
- [x] International student documentation.
- [x] Veteran/military benefit status.
- [x] Accessibility/accommodation handoff.

### Frontend Checklist

- [x] Add post-admit readiness card to Student 360.
- [x] Expand Admitted / Yield page with readiness blockers.
- [x] Expand Deposit / Melt page with registration and orientation blockers.
- [x] Add milestone checklist for admitted and deposited students.
- [x] Add downstream owner and due date per milestone.

### Backend Checklist

- [ ] Add admitted student milestone model.
- [ ] Add endpoint: `GET /api/v1/students/{studentId}/post-admit-readiness`.
- [x] Frontend calls `POST /api/v1/students/{studentId}/milestones/{milestoneId}/status` when available and falls back locally on `404` or `405`.
- [ ] Add SIS/financial-aid/housing/orientation integration placeholders.
- [ ] Add audit events for milestone updates.

### Acceptance

- [x] Staff can see why an admitted student has not deposited.
- [x] Staff can see why a deposited student has not registered.
- [x] Post-admit blockers have owners and due dates.
- [x] Registered status is derived from authoritative registration signal when available.

---

## Phase 6: Funnel Reporting and Accountability

Goal: make conversion, workload, and response time measurable.

### Metrics

- [x] Inquiry to Prospect conversion.
- [x] Prospect to Applicant conversion.
- [x] Applicant to Complete conversion.
- [x] Complete to Admitted conversion.
- [x] Admitted to Deposited/Committed conversion.
- [x] Deposited/Committed to Registered conversion.
- [x] Average response time by counselor.
- [x] Average days in stage.
- [x] Completed applications by source.
- [x] Yield by program.
- [x] Territory performance.
- [x] Event attendance conversion.
- [x] Handoff aging and SLA performance.

### Frontend Checklist

- [x] Add funnel dashboard by date range.
- [x] Add filters for counselor, program, population, source, territory, and stage.
- [x] Add stage aging report.
- [x] Add counselor workload report.
- [x] Add handoff SLA report.
- [ ] Add export/download where appropriate.

### Backend Checklist

- [ ] Add reporting aggregation endpoints.
- [ ] Add endpoint: `GET /api/v1/reporting/funnel`.
- [ ] Add endpoint: `GET /api/v1/reporting/stage-aging`.
- [ ] Add endpoint: `GET /api/v1/reporting/counselor-workload`.
- [ ] Add endpoint: `GET /api/v1/reporting/handoffs`.
- [ ] Add event/history tables needed for accurate stage duration and conversion math.

### Acceptance

- [x] Leadership can see the funnel from Inquiry to Registered.
- [x] Counselors can see personal workload and follow-up performance.
- [x] Teams can identify stuck stages and overdue handoffs.

---

## Phase 7: Events, Territory, and Recruitment Support

Goal: cover the recruitment work that happens before application and outside the office.

### Capabilities

- [x] Territory assignment.
- [x] High school / transfer partner records.
- [x] College fair and visit tracking.
- [x] Open house and webinar attendance.
- [x] Event-to-student attribution.
- [ ] Counselor travel/recruitment calendar integration.

### Frontend Checklist

- [x] Add territory field and filters to Student 360.
- [x] Add source school / partner school fields.
- [x] Add event attendance section to Student 360 timeline.
- [x] Add recruitment source performance report.
- [x] Add event import or manual attendance upload.

### Backend Checklist

- [ ] Add territory model.
- [ ] Add school/partner organization model.
- [ ] Add event participation model.
- [ ] Add endpoint: `GET /api/v1/recruitment/events`.
- [ ] Add endpoint: `POST /api/v1/recruitment/events/{eventId}/attendees`.
- [ ] Add reporting rollups by territory, school, source, and event.

### Acceptance

- [x] Counselors can connect inquiries to territories, schools, and recruitment events.
- [x] Leadership can see event/source yield through the funnel.

---

## Recommended Build Order

1. Phase 1: Counselor Workbench Foundation.
2. Phase 2: Interaction History and Notes.
3. Phase 4: Cross-Office Handoffs.
4. Phase 5: Post-Admit Readiness.
5. Phase 6: Funnel Reporting and Accountability.
6. Phase 3: Outreach and Communication Workflow.
7. Phase 7: Events, Territory, and Recruitment Support.

Reasoning:

- Workbench and interaction history create the daily operating surface.
- Handoffs and post-admit readiness make the product more than a CRM.
- Reporting becomes stronger once interactions, stages, and handoffs are real events.
- Outreach and events can integrate with third-party tools after the operational record is stable.

## Near-Term Milestone: Counselor Workbench MVP

Target outcome: a counselor can start the day, know who to contact, record what happened, and set the next action.

### MVP Checklist

- [x] Add `lastContactedAt`, `nextFollowUpAt`, and `nextAction` to student display model.
- [x] Add Add Note / Log Contact action to Student 360.
- [x] Add interaction timeline entries.
- [x] Add Today's Work bucket for overdue follow-up.
- [x] Add Today's Work bucket for new inquiry first touch.
- [x] Add Today's Work bucket for incomplete application follow-up.
- [x] Add simple funnel counts by pipeline status.
- [ ] Persist interactions and next-action changes through backend.
- [ ] Audit interaction and next-action changes.

### MVP Acceptance

- [x] A counselor can identify the top follow-ups for the day.
- [x] A counselor can log a contact.
- [x] A counselor can set the next follow-up.
- [x] Student 360 reflects that activity.
- [x] Leadership can see basic status counts.
