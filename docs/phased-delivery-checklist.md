# crtfyStudent Phased Delivery Checklist

Last updated: 2026-06-04

## Purpose

This checklist turns the broad crtfyStudent product roadmap into an executable phase-by-phase delivery plan.

The delivery principle is:

> Build the admissions operating layer first, then expand into intelligence, yield, handoff, integrations, and scale.

The near-term product claim remains:

> Traditional CRMs manage engagement. crtfyStudent manages admissions.

## Delivery Guardrails

- [ ] Keep crtfyStudent focused on admissions operations, not generic CRM sprawl.
- [ ] Own student work state from inquiry through class-ready.
- [ ] Integrate with marketing automation, SIS, financial aid, communication, and document systems where they are systems of record.
- [ ] Avoid building full marketing automation, event registration, billing, SIS registration, financial aid packaging, or a student portal of record.
- [ ] Ship vertical slices that connect data model, workflow, UI, audit history, and reporting.
- [ ] Every protected workflow must be tenant-scoped, permission-aware, and audit-friendly.

## Phase 0: Define CRM Replacement Boundaries

Goal: align product, sales, engineering, and investor language before additional build work.

- [x] Create the CRM replacement capability matrix.
- [x] Label every major capability as `own`, `integrate`, or `do not build`.
- [x] Standardize product vocabulary:
  - [x] Admissions Operating System
  - [x] Admissions CRM Core
  - [x] Student 360
  - [x] Today's Work
  - [x] Transcript Intelligence
  - [x] Decision Workspace
  - [x] Yield and Handoff
  - [x] Admissions Evidence Graph
- [x] Define role ownership for counselor, processor, evaluator, decision director, trust analyst, transfer specialist, financial aid, registrar, leadership, and admin.
- [ ] Update sales and investor messaging so crtfyStudent can replace a CRM at smaller schools and coexist with CRM/SIS systems at larger schools.

Acceptance:

- [ ] Approved CRM replacement matrix exists.
- [x] No ambiguity remains around SIS, financial aid, marketing automation, or student portal boundaries.
- [x] Product, sales, and engineering use the same lifecycle language.

## Phase 1: Admissions CRM Core

Goal: make crtfyStudent useful before an application exists.

- [x] Define core student identity contract.
- [x] Add frontend compatibility for source reference and attribution fields.
- [x] Add frontend compatibility for population, program interest, and term interest fields.
- [x] Add frontend compatibility for owner assignment fields.
- [x] Add lifecycle stage constants and frontend compatibility.
- [x] Add Student 360 timeline surface for interaction/history events.
- [ ] Implement backend core student identity entities.
- [ ] Implement backend source reference and attribution model.
- [ ] Implement backend population, program interest, and term interest models.
- [ ] Implement backend owner assignment and ownership history.
- [ ] Implement backend lifecycle stage model.
- [ ] Implement backend interaction history.
- [ ] Add audit events for ownership, stage, source, and status changes.
- [x] Support manual inquiry creation in the Prospect Portal frontend flow.
- [ ] Persist manual inquiry creation in backend.
- [ ] Support API or CSV inquiry import.
- [ ] Support prospect-to-applicant conversion without duplicate creation.
- [x] Add frontend leadership counts by stage, owner, source, and population from Student 360 records.
- [ ] Add backend leadership counts by stage, owner, source, and population.
- [x] Create backend instructions for Phase 1 Admissions CRM Core.

Acceptance:

- [x] Frontend can display a prospect or applicant with stage, source, owner, next action, and history when backend returns those fields.
- [ ] Backend persists a prospect or applicant with stage, source, owner, next action, and history.
- [ ] Source attribution persists through lifecycle changes.
- [ ] Ownership changes are audited.
- [x] Frontend can answer: who is this student, where did they come from, who owns them, what stage are they in, and what is next.
- [ ] Backend source-of-truth can answer: who is this student, where did they come from, who owns them, what stage are they in, and what is next.

Delivery status:

- [x] Student record normalization accepts identity, source, campaign, population, program interest, term interest, owner, stage, and next-action aliases.
- [x] Prospect Portal can submit manual inquiry intake to the backend when available.
- [x] Student 360 timeline can show live or derived history.
- [x] Dashboard shows CRM Core leadership counts from loaded Student 360 records.
- [ ] Backend still needs source-of-truth persistence, imports, conversion, owner/stage writes, interactions, and audit history.

## Phase 2: Inquiry Capture And Prospect Portal

Goal: create an admissions-aware front door for top-of-funnel work.

- [x] Build frontend inquiry form by student type.
- [x] Capture program interest, term interest, population, prior institution, consent, and source in the frontend contract.
- [x] Support optional transcript upload during inquiry in the frontend flow.
- [ ] Create prospect records from inquiry submissions.
- [ ] Create transcript-first prospect records.
- [ ] Parse transcript-first uploads and attach fit or transfer signals where available.
- [ ] Capture structured chatbot or knowledgebase admissions signals if chatbot intake is included.
- [x] Build Prospect Portal summary with next step, transcript status, counselor contact, and application start link fallback.
- [x] Create backend instructions for Phase 2 inquiry capture and Prospect Portal APIs.

Acceptance:

- [ ] A prospect can be created from form, transcript upload, or chatbot/knowledgebase signal.
- [ ] Source attribution attaches automatically.
- [ ] Prospect appears in Student 360.
- [ ] Prospect appears in Today's Work when action is required.
- [ ] Prospect can start an application without duplicate record creation.

Delivery status:

- [x] Prospect Portal no longer depends on `prospectExperiences` mock data for the primary screen.
- [x] Prospect Portal submits to `POST /api/v1/prospects/inquiries` when backend is available.
- [x] Prospect Portal submits transcript-first uploads to `POST /api/v1/prospects/transcripts/uploads` when a file is selected.
- [x] Prospect Portal falls back to a derived preview with visible live-vs-derived status.
- [ ] Backend prospect persistence, transcript processing, fit projection, Today's Work projection, and duplicate-safe conversion remain required.

## Phase 3: Student 360 As Admissions Record

Goal: make Student 360 the canonical admissions operating record.

- [x] Show student summary with contact, population, program, owner, stage, readiness, risk, fit, last activity, and next action.
- [x] Add frontend timeline events for inquiry, application, checklist, documents, transcripts, trust, outreach, decisions, deposit, handoff, and sync errors.
- [x] Add tabs or sections for overview, checklist, documents, transcript evidence, decisions, trust, yield, and handoff.
- [x] Add frontend/backend-compatible search by name, email, student ID, source, program, and stage.
- [x] Enforce role, permission, academic sensitivity, and trust sensitivity rules in the frontend.
- [x] Create backend instructions for Phase 3 canonical Student 360 and timeline APIs.

Acceptance:

- [x] Student 360 loads for applicant/student records.
- [x] Staff can work a student without opening a separate CRM in the current frontend-supported flows.
- [x] Sensitive information is hidden from users without permission.
- [x] The frontend can answer: what is the full admissions story for this student from live or derived timeline data.
- [ ] Backend canonical timeline provides the source-of-truth admissions story.

Delivery status:

- [x] Student 360 includes a Timeline tab.
- [x] Timeline prefers `GET /api/v1/students/{studentId}/timeline`.
- [x] Timeline falls back to derived events from identity, source, checklist, transcripts, readiness, and recommendation data.
- [x] Student search now sends `q` to the backend and locally filters by ID, name, email, source, stage, population, program, owner, institution, risk, fit, and next action.
- [ ] Backend must implement canonical student detail, search, timeline ingestion, redaction, and audit-backed event history.

## Phase 4: Checklist And Application Completion Engine

Goal: turn application completion into structured work.

- [ ] Create checklist templates by population, program, term, and student type.
- [ ] Support required, optional, conditional, waivable, blocking, and non-blocking items.
- [x] Add frontend support for checklist item states: not started, requested, received, needs review, waived, complete, blocked, rejected, expired.
- [x] Add frontend support for readiness states: incomplete, nearly complete, ready for review, blocked by document, blocked by trust, blocked by transfer review, ready for decision, ready for release.
- [ ] Build checklist admin for templates, rules, conditional logic, required items, and audit history.
- [ ] Auto-generate checklist on application creation or submission.
- [x] Surface missing and nearly complete applicants in operational queues using live APIs or derived fallback.
- [x] Create backend instructions for Phase 4 checklist template, generation, rules, and audit APIs.

Acceptance:

- [ ] Checklist templates can be configured by population, program, and term.
- [x] Completing an item updates frontend readiness/fallback state.
- [x] Missing checklist items appear in Incomplete Applications or Today's Work.
- [x] Staff can distinguish missing evidence from received-but-needs-review evidence in the frontend.
- [ ] The system can answer: what exactly is blocking this applicant from becoming complete?

Delivery status:

- [x] Student 360 checklist can render Phase 4 item statuses and complete items through backend status endpoint when available.
- [x] Incomplete Applications and Today's Work can surface missing, nearly complete, and received-needs-review states.
- [ ] Backend must still implement checklist template admin, conditional rule evaluation, generation, persistence, and audit history.

## Phase 5: Document-To-Checklist And Transcript Intelligence

Goal: make document processing directly move applicants forward.

- [x] Support frontend single upload, batch upload, ZIP upload, replacement upload, and stored reprocess flows.
- [ ] Support SFTP, provider intake, and manual backend intake.
- [x] Build frontend document queue views for needs-review, failed, duplicate, quarantined, and trust-flagged states when backend provides them.
- [ ] Add document-to-student matching confidence.
- [ ] Add document-to-checklist matching.
- [ ] Auto-complete high-confidence checklist items.
- [ ] Route low-confidence matches to human review.
- [ ] Extract transcript institution, attendance dates, GPA, credits, courses, grades, degrees, transfer evidence, confidence, and audit timeline.
- [x] Show frontend actionable exception reasons, suggested actions, latest run status, failure message, action history, reprocess, and replace options when backend provides them.
- [x] Create backend instructions for Phase 5 document-to-checklist and transcript intelligence APIs.

Acceptance:

- [ ] Transcript upload can match to student and checklist items.
- [ ] High-confidence items can auto-complete.
- [ ] Low-confidence or failed documents route to review.
- [ ] Reprocess success requires both processing run success and transcript persistence success.
- [ ] The system can answer: did this document move the student forward, and if not, what should happen next?

Delivery status:

- [x] Documents Queue calls live document queue, exception, run-detail, release/quarantine, stored reprocess, and replacement reprocess endpoints.
- [x] Transcript upload flow supports single file and ZIP/batch processing with polling.
- [ ] Backend must still persist matching confidence, checklist links, extraction evidence, auto-completion, and reprocess success criteria.

## Phase 6: Today's Work And Counselor Workbench

Goal: make crtfyStudent the daily operating console.

- [x] Build frontend prioritized work sections:
  - [ ] New inquiries
  - [ ] No first touch
  - [ ] Started not submitted
  - [x] Incomplete applicants
  - [x] One item away
  - [ ] Stalled applicants
  - [x] Document blocked
  - [x] Trust blocked
  - [x] Ready for review
  - [ ] Decision waiting
  - [ ] Admitted with no recent touch
  - [ ] Deposit risk
  - [ ] Melt risk
  - [ ] Handoff risk
- [x] Add work item fields for student, stage, owner, program, population, readiness, priority, reason to act, suggested action, blocking item, and last activity.
- [ ] Add one-click counselor logging for calls, emails, texts, voicemail, replies, appointments, document requests, application links, notes, follow-ups, no response, and escalations.
- [x] Add frontend routing controls for document, trust, and decision routing when backend supports it.
- [ ] Add stale work and SLA indicators.
- [x] Create backend instructions for Phase 6 work projection, interaction logging, SLA, and workload APIs.

Acceptance:

- [x] Counselors can start the day from Today's Work.
- [x] Every work item explains why it matters and what action is recommended.
- [ ] Logged actions update interaction history.
- [ ] Managers can see workload by owner and team.

Delivery status:

- [x] Today's Work loads `work/today`, `work/today/board`, `work/summary`, route recommendation, route item, bucket route, and orchestration endpoints when available.
- [x] Today's Work shows live-vs-derived mode and avoids blocking primary queue load on optional board grouping.
- [ ] Backend must still implement one-click interaction logging, stale/SLA indicators, and manager workload rollups.

## Phase 7: Duplicate, Identity, And Trust Foundation

Goal: prevent bad identity and trust states from corrupting admissions decisions.

- [ ] Add duplicate candidate detection.
- [ ] Show match confidence and match reasons.
- [ ] Add merge review and field-level conflict handling.
- [ ] Add identity correction and source reference preservation.
- [x] Add frontend Trust Center surface for trust cases, evidence, release block state, notes, assignment, and resolution actions.
- [ ] Add backend trust case model, evidence bundle, severity, release block state, reviewer notes, and resolution actions.
- [x] Route trust blocks into Today's Work and Student 360 when backend work/readiness payloads provide them.
- [x] Create backend instructions for Phase 7 duplicate, identity, and trust APIs.

Acceptance:

- [ ] Staff can review and resolve duplicate candidates.
- [ ] Trust cases can block or clear decision release.
- [ ] Identity and trust actions are audited.

Delivery status:

- [x] Trust Center calls live trust case list, detail, block/unblock, resolve, escalate, and assign endpoints.
- [x] Student 360 has trust-sensitive tab redaction and readiness support.
- [ ] Backend must still implement duplicate detection/merge, identity correction, trust persistence, and audit-backed release blocking.

## Phase 8: Transfer And Academic Evidence Workflows

Goal: turn academic evidence into transfer and review action.

- [x] Build frontend transfer/academic evidence display in Student 360 and Decision Studio when backend provides evidence.
- [ ] Add transfer credit estimate where possible.
- [ ] Add articulation gap routing.
- [ ] Add transfer specialist queue.
- [x] Add frontend support for academic evidence confidence and source provenance when backend provides it.
- [x] Add frontend support for transfer-value signals in decision/yield surfaces when backend provides them.
- [x] Create backend instructions for Phase 8 transfer evidence, articulation gap, and specialist queue APIs.

Acceptance:

- [ ] Transfer evidence is visible from Student 360 and decision review.
- [ ] Articulation gaps route to a specialist.
- [ ] Transfer value can inform yield or intervention recommendations.

Delivery status:

- [x] Student 360 can show GPA trend, credits accepted, transcript evidence, and protected academic details.
- [x] Decision Studio can show credit estimate, transcript evidence, parser confidence, trust posture, and recommendation rationale.
- [ ] Backend must still implement transfer evidence summaries, articulation gap detection/routing, and transfer specialist queue.

## Phase 9: Decision Workspace And Release Controls

Goal: make decisions faster, defensible, gated, and auditable.

- [x] Build frontend Ready for Review queue.
- [x] Build frontend decision packet list and detail.
- [x] Include frontend evidence summary, transcript summary, transfer estimate, trust posture, fit rationale, recommendation, confidence, supporting evidence, snapshot version, and reviewer notes when backend provides them.
- [x] Add frontend actions to accept recommendation, request more evidence, hold, reopen, or release outcome when backend supports them.
- [ ] Configure release gates for checklist, trust, recommendation review, approvals, policy conditions, letter readiness, and SIS/portal sync readiness.
- [ ] Support admit, deny, waitlist, defer, admit with condition, hold, reopen, revoke, and return to incomplete.
- [x] Create backend instructions for Phase 9 decision packet, recommendation, review, release, and gate APIs.

Acceptance:

- [x] Decision packet opens from Decision Studio and Ready for Review routes when backend provides a packet ID.
- [x] Frontend recommendation detail includes rationale, evidence, confidence, trust posture, and academic context when backend provides it.
- [ ] Decision cannot release if required gates fail.
- [ ] Final decision and approvals are audited.

Delivery status:

- [x] Decision Studio calls live decision list, create, detail, snapshot, timeline, agent-details, recommendation, and review endpoints.
- [x] Decision detail supports notes, assignment, recommendation generation, evidence review, and reviewed snapshot display.
- [ ] Backend must still implement release gates, final outcome state machine, and audited final approvals.

## Phase 10: Admitted Student Yield

Goal: make admitted-student work operational and evidence-based.

- [x] Build frontend admitted student/yield queue.
- [x] Show frontend yield score, milestone completion, owner, program, and next step when backend provides them.
- [x] Support frontend intervention/next-step display when backend provides recommendations.
- [ ] Log yield interventions and next follow-up.
- [ ] Add leadership filters by owner, program, risk, and deposit status.
- [x] Create backend instructions for Phase 10 yield queue, scoring, intervention, and follow-up APIs.

Acceptance:

- [x] Counselors can see which admitted students to work and why in the frontend when backend provides yield records.
- [x] Yield risk reasons are visible when backend provides them.
- [ ] Interventions update history and reporting.

Delivery status:

- [x] Admitted Yield page calls `GET /api/v1/yield` with view/search params and links records to Student 360.
- [ ] Backend must still implement yield scoring reasons, intervention writes, follow-up history, and leadership rollups.

## Phase 11: Deposit, Melt, And Cross-Office Milestones

Goal: protect enrollment after admit and deposit.

- [ ] Capture deposit events from SIS, CRM, manual update, import, or API.
- [ ] Create configurable milestones for FAFSA, aid package, housing, orientation, final transcript, immunization, advising, registration, placement test, international documentation, and program-specific requirements.
- [ ] Assign milestone owners by office.
- [ ] Calculate melt risk from missing milestones, aging, no recent activity, aid delay, final transcript missing, orientation incomplete, registration incomplete, deposit without next action, and program blockers.
- [x] Add frontend Deposit/Melt queue for missing FAFSA, orientation, final transcript, registration, and all-clear views.
- [ ] Add backend cross-office notes, follow-up, owner update, escalation, completion, and missed milestone reason.
- [x] Create backend instructions for Phase 11 deposit, milestone, melt risk, and intervention APIs.

Acceptance:

- [ ] Deposit event updates Student 360.
- [x] Missing milestones appear in Deposit / Melt workflows when backend provides them.
- [ ] Each milestone has owner office and status.
- [ ] The system can answer: what is preventing this admitted or deposited student from becoming class-ready?

Delivery status:

- [x] Deposit/Melt page calls `GET /api/v1/melt` with view/search params and displays risk, owner, deposit date, and missing milestones.
- [ ] Backend must still implement deposit capture, configurable milestones, office ownership, melt scoring, and cross-office writes.

## Phase 12: Handoff Command Center

Goal: make enrollment handoff visible before failures become student-impacting.

- [x] Add frontend Student 360 handoff tab placeholder for student-level handoff state.
- [ ] Add backend student-level handoff states.
- [ ] Track office readiness for admissions, registrar, financial aid, advising, housing/orientation, and academic program where configured.
- [ ] Build handoff package with identity, program, term, decision, checklist, transcript status, credit estimate, trust clearance, deposit, milestones, notes, and sync history.
- [ ] Build sync error queue with reason, source, destination, retry, acknowledge, owner, aging, last run, and resolution history.
- [ ] Add filters by handoff status, office, owner, and aging.
- [x] Create backend instructions for Phase 12 handoff status, package, office readiness, and sync-error APIs.

Acceptance:

- [x] Student 360 shows a handoff section.
- [ ] Handoff Command Center shows unresolved risks.
- [ ] Authorized users can retry or acknowledge sync errors.
- [ ] The system can answer: which admitted or deposited students are not operationally ready for classes?

Delivery status:

- [x] Student 360 has a handoff tab for downstream readiness and sync posture.
- [ ] A dedicated Handoff Command Center page and backend handoff/sync-error source-of-truth remain to be built.

## Phase 13: Integration Console And Implementation Toolkit

Goal: make implementation repeatable across school environments.

- [x] Build live-ready frontend connector strategy surface.
- [ ] Build live integration marketplace for HubSpot, Slate, Element451, Salesforce, Banner, Colleague, PeopleSoft, Jenzabar, Workday Student, document imaging, SFTP, transcript providers, and messaging tools.
- [ ] Show live connector status, authentication, last sync, sync frequency, object mapping, field mapping, error count, data quality warnings, and permission validation.
- [x] Build frontend admin console for tenant users, roles, permissions, sensitivity tiers, scopes, and work projection operations.
- [ ] Build implementation console with tenant checklist, population config, checklist templates, source mapping, program/term mapping, document intake, CRM/SIS mapping, and go-live readiness.
- [x] Add frontend work-projection sync observability for status, jobs, retries, cancel, and rebuild.
- [ ] Add connector sync observability for runs, errors, retries, acknowledgements, mapping warnings, and system event logs.
- [x] Create backend instructions for Phase 13 connector marketplace, mapping, sync, and implementation readiness APIs.

Acceptance:

- [x] Admin can view live-or-fallback connector status in the frontend.
- [ ] Admin can view live connector status.
- [ ] Field mapping UI exists for priority objects.
- [ ] Sync errors are visible and actionable.
- [ ] Implementation team can tell whether a tenant is ready for go-live.

Delivery status:

- [x] Admin page uses live APIs for users, roles, sensitivity tiers, scope options, and work-projection job controls.
- [x] Connectors page calls `GET /api/v1/connectors` when available and falls back to planned connector coverage.
- [ ] Backend still needs live connector/mapping/sync APIs.

## Phase 14: Operational Reporting, Intelligence, And Benchmarks

Goal: let leadership manage admissions execution, not just view static reports.

- [x] Add frontend reporting overview for completion, decision speed, document quality, yield, and melt.
- [ ] Report full operational metrics for daily active users, completed work items, outreach, checklist completion, auto-completion, documents processed, document failures, trust cases, decisions, recommendations, yield interventions, melt interventions, and sync error resolution.
- [x] Report frontend outcome metrics for incomplete-to-complete, complete-to-decision, auto-index, admit-to-deposit, and melt when backend provides them.
- [ ] Report full outcome metrics for inquiry-to-application, completion rate, incomplete aging, transcript turnaround, exception rate, duplicate resolution, complete-to-decision, admit-to-deposit, transfer conversion, melt risk resolution, deposited-to-enrolled, and handoff sync aging.
- [ ] Add benchmarks by program, term, population, owner, source, region, student type, transfer status, and institution type.
- [ ] Make every score explainable with reason codes, source evidence, last updated time, confidence, recommended action, and human override.
- [ ] Support drill-down from metric to underlying queue.
- [x] Create backend instructions for Phase 14 reporting, benchmark, explanation, and drill-down APIs.

Acceptance:

- [x] Reporting shows completion, decision speed, yield, and melt from live or fallback overview metrics.
- [ ] Queue aging can be filtered by owner and stage.
- [ ] Priority scores and recommendations show evidence.
- [ ] The system can answer: where is admissions execution slowing down, and what action will improve enrollment outcomes?

Delivery status:

- [x] Reporting page calls `GET /api/v1/reporting/overview` and displays live-vs-fallback overview metrics.
- [ ] Backend must still implement full operational/outcome metrics, benchmarks, score explanations, and queue drill-down.

## Phase 15: Graduate And Program Review Expansion

Goal: support decentralized graduate and program-level review without forcing an undergraduate workflow onto faculty-led admissions.

- [x] Add role/scope foundation that can support graduate department permissions later.
- [ ] Build graduate workspace with program queues, department permissions, graduate checklist, faculty packets, committee status, coordinator workflow, and central graduate handoff.
- [x] Reuse frontend Decision Studio packet foundation for future graduate committee packet.
- [ ] Build graduate-specific committee packet with application summary, transcript summary, GPA, program fit, recommendation materials, test score fields, trust posture, prior institution, notes, rubric, and committee recommendation.
- [ ] Add graduate-specific flags for assistantship, fellowship, faculty advisor interest, prerequisites, international requirements, and department-specific requirements.
- [x] Create backend instructions for Phase 15 graduate workspace, faculty packet, rubric, and committee APIs.

Acceptance:

- [ ] Graduate applicants route to program-level queues.
- [ ] Faculty reviewers can view packet data based on permissions.
- [ ] Rubric review and committee recommendation are captured.
- [ ] The system can answer: where is this graduate applicant in program review, and what evidence or decision is still needed?

Delivery status:

- [x] Existing admin scopes, sensitivity tiers, and Decision Studio can be reused as foundations.
- [ ] Dedicated graduate workspace, program queues, faculty packet UI, rubric capture, and backend APIs remain to be built.

## Phase 16: Packaging, GTM, And Customer Implementation

Goal: turn product capability into packages customers and investors can understand.

- [x] Define Package 1: crtfyStudent Operations.
- [x] Define Package 2: crtfyStudent Decision Intelligence.
- [x] Define Package 3: crtfyStudent Yield And Handoff.
- [x] Define Package 4: crtfyStudent Platform.
- [x] Build first 30-day implementation checklist.
- [x] Build first 60-day implementation checklist.
- [x] Build first 90-day implementation checklist.
- [x] Map training plans by role.
- [x] Build demo script per package.
- [x] Tie pricing model to institution size, applicant volume, modules, integrations, and implementation complexity.
- [x] Create backend/product instructions for Phase 16 packaging, implementation, training, demo, and pricing artifacts.

Acceptance:

- [x] Each package has clear modules and buyer promise.
- [x] 30/60/90-day implementation plan exists.
- [x] Training plan maps to roles.
- [x] Demo scripts exist by package.
- [x] The system can answer: what package does this school need, how fast can they go live, and what outcome should they expect?

Delivery status:

- [x] Master checklist includes first 30/60/90-day execution plan.
- [x] Training guide maps product use to roles.
- [x] Package definitions, demo scripts, and pricing model assumptions are written in `packaging-gtm-implementation.md`.

## Recommended Delivery Waves

### Wave 1: Operating Core

Phases:

- [x] Phase 0: CRM replacement boundaries
- [ ] Phase 1: Admissions CRM Core
- [x] Phase 3: Student 360 frontend foundation
- [x] Phase 4: Checklist engine frontend/API contract
- [x] Phase 6: Today's Work frontend foundation

Outcome:

- [ ] Counselors can run daily incomplete-application work in crtfyStudent.

### Wave 2: Transcript-Led Movement

Phases:

- [x] Phase 5: Document-to-checklist and transcript intelligence frontend/API contract
- [x] Phase 7: Trust foundation frontend/API contract
- [ ] Phase 7: Duplicate and identity foundation backend/product build
- [x] Phase 8: Transfer and academic evidence frontend/API contract

Outcome:

- [ ] Documents and transcripts move students forward with explainable confidence and routed exceptions.

### Wave 3: Defensible Decisions

Phases:

- [x] Phase 9: Decision Workspace frontend/API contract
- [ ] Phase 9: Release controls backend/product build

Outcome:

- [ ] Decisions are evidence-backed, gated, and auditable.

### Wave 4: Enrollment Outcomes

Phases:

- [x] Phase 10: Admitted Student Yield frontend/API contract
- [x] Phase 11: Deposit, melt, and milestones frontend/API contract
- [x] Phase 12: Handoff Student 360 frontend foundation
- [ ] Phase 12: Handoff Command Center backend/product build

Outcome:

- [ ] The product protects admit-to-deposit and deposit-to-class-ready movement.

### Wave 5: Scale Layer

Phases:

- [x] Phase 13: Admin implementation toolkit frontend/API contract
- [x] Phase 13: Live-ready integration console frontend/API contract
- [ ] Phase 13: Live integration console backend/product build
- [x] Phase 14: Reporting overview frontend/API contract
- [ ] Phase 14: Benchmarks and drill-down backend/product build
- [x] Phase 15: Graduate review foundation via roles/scopes/Decision Studio
- [ ] Phase 15: Dedicated graduate workspace backend/product build
- [x] Phase 16: 30/60/90 and role training docs
- [x] Phase 16: Package definitions, demo scripts, and pricing model

Outcome:

- [ ] crtfyStudent becomes repeatable to implement, measurable to operate, and easier to package.

## First 30 / 60 / 90 Day Execution Checklist

### First 30 Days

- [x] Finalize CRM replacement boundary matrix.
- [x] Lock lifecycle stages and student work state language.
- [x] Confirm canonical student record shape.
- [ ] Build or harden checklist templates and checklist item state.
- [x] Make Today's Work the default operator surface.
- [x] Show incomplete, one-item-away, ready-for-review, and exception buckets.
- [x] Connect Student 360 to checklist blockers and next action.
- [x] Define backend contracts for work items, checklist, readiness, and interaction history.
- [ ] Train counselors and processors on daily workflow.

### First 60 Days

- [ ] Connect transcript/document processing to checklist progress.
- [ ] Add confidence-based auto-completion and exception routing.
- [ ] Add duplicate candidate review.
- [ ] Add trust case foundation and release block state.
- [ ] Add readiness state into Student 360 and Decision Workspace.
- [ ] Build Ready for Review queue.
- [ ] Start decision packet and recommendation review workflow.
- [ ] Train evaluators, decision directors, trust analysts, and transfer specialists.

### First 90 Days

- [ ] Build admitted student yield queue.
- [ ] Add deposit event capture.
- [ ] Add melt milestones and office ownership.
- [ ] Add handoff status and sync error visibility.
- [ ] Add baseline leadership reporting.
- [ ] Add connector status visibility for priority integrations.
- [ ] Train leadership and cross-office users.

## Current Repo Alignment

Existing surfaces already present in the frontend should map this way:

| Current surface | Delivery role |
|---|---|
| `TodaysWorkPage` | Primary operating console |
| `StudentsPage` and `StudentProfilePage` | Student 360 record |
| `IncompletePage` | Checklist and completion workflow |
| `DocumentsQueuePage` | Document intake and exception workflow |
| `ReadyForReviewPage` | Review queue |
| `DecisionStudioPage` | Decision Workspace |
| `TrustCenterPage` | Trust and exception review |
| `AdmittedYieldPage` | Yield workflow |
| `DepositMeltPage` | Melt milestone workflow |
| `ConnectorsPage` | Integration console |
| `ReportingPage` | Operational reporting |
| `AdminPage` | Tenant and configuration toolkit |

## Immediate Next Tickets

- [x] Convert this checklist into issue tracker epics by phase.
- [x] Split Phase 1 into schema/API/UI tickets.
- [x] Create backend instructions for the Phase 1 operating-core slice.
- [x] Review existing mock data and tag each field as `keep`, `rename`, `backend contract`, `remove`, or `later`.
- [x] Split Phase 4 into checklist template, student checklist, readiness, and admin tickets.
- [x] Split Phase 6 into Today's Work summary, work items, filters, actions, and interaction logging tickets.
- [x] Add a delivery status section to the Phase 1 backlog after the first implementation pass.
- [x] Create consolidated backend instructions for Phases 4-16.
- [x] Update Phase 4-16 checklist items with frontend/API-contract coverage and remaining backend/product gaps.
