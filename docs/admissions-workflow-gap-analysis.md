# Admissions Workflow Mapping, Gaps, and Recommendations

This document is now the working checklist for the admissions workflow buildout.

Legend:

- `[x]` done in the current product
- `[~]` partially done or UI exists but workflow is not complete
- `[ ]` not done yet

## Product Positioning

- [x] Keep the product focused on admissions operations, not rebuilding Slate
- [x] Keep the product focused on staff workflow, not only feature modules
- [x] Preserve differentiated strengths:
  - [x] transcript ingestion
  - [x] trust / provenance
  - [x] decision packet / explainability
  - [x] student-centric record
- [x] Reposition the primary UX around `Today's Work`
- [x] Keep `Student 360`, `Decision Studio`, `Trust Center`, and `Prospect Portal` as named product surfaces
- [ ] Add enough engagement signals to prioritize work without becoming a full CRM

## Current Frontend State

### App shell and access

- [x] Authenticated tenant-aware app shell
- [x] `/api/v1/me` bootstrap and machine-key RBAC support
- [x] Role-aware navigation
- [x] Route guards and access denied state
- [x] User dropdown with profile, change password, and sign out
- [x] User profile screen
- [x] Admin screen with user-management UI

### Primary product surfaces

- [x] `Today's Work`
- [x] `Student 360`
- [x] `Decision Studio`
- [x] `Trust Center`
- [x] `Prospect Portal`
- [x] `Incomplete Applications`
- [x] `Ready for Review`
- [x] `Admitted / Yield`
- [x] `Deposit / Melt`
- [x] `Reporting`
- [x] `Integrations`
- [x] `Admin`

### Live backend-connected pages

- [x] Student list backed by live `/api/v1/students`
- [x] Student detail backed by live `/api/v1/students/{studentId}`
- [x] Student checklist backed by live checklist endpoints
- [x] Today's Work backed by live work summary and work items endpoints
- [x] Incomplete Applications backed by live `/api/v1/incomplete`
- [x] Ready for Review backed by live `/api/v1/review-ready`
- [x] Admitted / Yield backed by live `/api/v1/yield`
- [x] Deposit / Melt backed by live `/api/v1/melt`
- [x] Reporting backed by live `/api/v1/reporting/overview`
- [x] Decision Studio list backed by live `/api/v1/decisions`
- [x] Decision packet detail backed by live decision detail endpoints
- [x] Trust Center backed by live `/api/v1/trust/cases`

### UI / workflow improvements already shipped

- [x] Today's Work as the default home screen
- [x] Today's Work summary cards
- [x] Today's Work charts:
  - [x] blocker mix
  - [x] work funnel
  - [x] priority mix
- [x] Today's Work tabbed queue surface:
  - [x] Needs attention now
  - [x] Close to completion
  - [x] Ready for decision
  - [x] Exceptions
- [x] Fixed-height Today’s Work queue panel with internal scrolling
- [x] Local search inside `Needs attention now`
- [x] Signal pills in the top bar made real
- [x] Search support across top bar and student/work routes

## Workflow Mapping Checklist

## 1. New prospect comes in

- [~] `Prospect Portal` exists in the product shell
- [ ] Real inquiry intake
- [ ] Source capture
- [ ] Event / form / list import workflow
- [ ] Application-start ingestion from top-of-funnel sources

## 2. Record gets matched and cleaned

- [~] Canonical student record concept exists in `Student 360`
- [ ] Duplicate detection queue
- [ ] Merge workflow
- [ ] Source correction workflow
- [ ] Identity resolution confidence

## 3. Student is put into the right population

- [~] Population-like tags and values appear in workflow UI
- [ ] Rules-based population assignment:
  - [ ] first-year
  - [ ] transfer
  - [ ] graduate
  - [ ] dual credit
  - [ ] international
  - [ ] readmit

## 4. Source and territory are assigned

- [~] Owner / advisor fields exist in UI
- [ ] Territory routing engine
- [ ] Source-based routing
- [ ] Program-based routing
- [ ] Reassignment workflow

## 5. Initial communication flow starts

- [ ] Email cadence
- [ ] SMS cadence
- [ ] Behavior-triggered nudges
- [ ] Engagement monitoring
- [ ] Reply handling

## 6. Inquiry is qualified

- [~] Fit score and recommendation concepts exist
- [~] Program viability is partially represented
- [ ] Residency qualification workflow
- [ ] Start-term qualification workflow
- [ ] Missing-critical-info triage

## 7. Application is started

- [ ] Applicant status transition workflow
- [ ] Application-source tracking
- [ ] Started-not-submitted model

## 8. Checklist items are created

- [x] Checklist UI exists
- [x] Checklist read endpoint is wired
- [x] Checklist item update endpoint is wired
- [~] Checklist status model exists:
  - [x] missing
  - [x] needs_review
  - [x] complete
- [ ] Checklist templates by population
- [ ] Optional vs required item logic
- [ ] Due dates / aging

## 9. Missing items are chased

- [x] Incomplete Applications page exists
- [x] Incomplete queue is backend-connected
- [x] Views for:
  - [x] submitted missing items
  - [x] nearly complete
  - [x] aging / stalled
  - [x] missing transcript
  - [x] missing residency
  - [x] missing FAFSA
- [x] Checklist-clearing workflow from queue rows
- [ ] Reminder sending
- [ ] Counselor outreach logging from incomplete queue
- [ ] SLA tracking by owner

## 10. Documents are received and indexed

- [x] Transcript upload
- [x] Async processing and polling
- [x] Batch transcript upload
- [x] Parsed transcript results mapped into student context
- [x] Trust posture integrated with document handling
- [~] Document-to-student linkage is conceptually strong
- [x] First-class Documents Queue page
- [~] Human indexing workflow
- [ ] Received-not-indexed queue
- [x] Reprocess / quarantine / release actions

## 11. Application becomes complete

- [~] Readiness model exists
- [~] Decision-ready state exists
- [ ] Rules-driven completeness engine across all requirements
- [ ] Explicit complete / ready-for-review transition logic

## 12. Reader or counselor review begins

- [x] `Student 360` evaluation surface exists
- [x] `Decision Studio` exists
- [x] `Ready for Review` queue exists and is live
- [x] Review list prioritization by waiting time / readiness is represented
- [ ] Claim review action
- [ ] Reassign reviewer action
- [ ] Return-to-incomplete workflow

## 13. Special cases are routed

- [x] `Trust Center` exists
- [x] Exceptions queue exists
- [~] Assignment concepts exist in decisions
- [ ] Transfer-specialist routing
- [ ] International routing
- [ ] Athletic / nursing / committee routing
- [ ] Program-specific special case bins

## 14. Decision recommendation is entered

- [x] Decision packet creation
- [x] Decision recommendation / rationale model
- [x] Decision status updates
- [x] Decision notes
- [x] Decision assignment

## 15. Decision is finalized

- [~] Decision status workflow exists
- [ ] Release workflow fully operationalized
- [ ] Letter / communication trigger
- [ ] Portal-facing release state
- [ ] Reopen / hold / revoke policy workflow

## 16. Admitted student communications begin

- [x] Admitted / Yield page exists
- [x] Admitted / Yield is backend-connected
- [ ] Outbound admitted communications
- [ ] Event invite workflow
- [ ] Housing reminder workflow
- [ ] Deposit reminder workflow

## 17. Counselor works the admitted pool

- [x] Yield score display exists
- [x] Admitted queue views exist
- [x] Assigned counselor is visible
- [ ] Log outreach action
- [ ] Intervention completion action
- [ ] Behavioral signals beyond current yield score

## 18. Deposit or intent-to-enroll is received

- [x] Deposit / Melt page exists
- [x] Deposit / Melt is backend-connected
- [~] Deposit status is represented in yield/melt workflow
- [ ] True deposit event capture
- [ ] Auto-shift into pre-matriculation workflow

## 19. Handoff to next offices starts

- [x] Integrations page exists
- [~] Integration / handoff strategy is represented
- [ ] Student-level handoff status
- [ ] Sync errors by office
- [ ] Retry / acknowledge operational handoff workflow
- [ ] SIS / FA / registrar / advising readiness surface

## 20. Melt prevention follow-up

- [x] Deposit / Melt page exists
- [x] Melt queue is backend-connected
- [x] Missing milestones are shown
- [x] Melt risk is shown
- [ ] Milestone status update action
- [ ] Follow-up logging action
- [ ] Cross-office notes

## Pain Point Coverage Checklist

### Pain points we are meaningfully addressing

- [x] Transcript and document collection complexity
- [x] Trust and provenance risk
- [x] Transfer credit uncertainty
- [x] Scattered student context across records and files
- [x] Daily incomplete-application visibility
- [x] Review-ready visibility
- [x] Yield and melt visibility

### Pain points partially addressed

- [~] Incomplete applications that stall out
- [~] Counselor task prioritization
- [~] Admit-to-deposit prioritization
- [~] Summer melt visibility
- [~] Cross-office reporting

### Pain points still not solved

- [ ] Duplicate cleanup
- [ ] Manual follow-up orchestration
- [ ] Dynamic engagement signals
- [ ] Top-of-funnel inquiry handling
- [ ] Full downstream handoff execution

## Phase Checklist

## Phase 1: Make It Usable Daily

- [x] Today's Work shell
- [x] Summary cards
- [x] Queue sections / tabs
- [x] Incomplete queue page
- [x] Checklist read/update wiring
- [x] Basic reasons to act
- [x] Readiness indicator
- [x] Document-linked student context
- [~] Checklist engine by population
- [ ] Document-to-checklist automation

## Phase 2: Make It Smart

- [x] Counselor workbench shape in Today's Work
- [x] Priority bands in work items
- [x] Decision readiness states
- [ ] Duplicate resolution system
- [ ] Field-level merge controls
- [ ] Full prioritization scoring model persisted by backend

## Phase 3: Win the Enrollment Game

- [x] Admitted / Yield page
- [x] Deposit / Melt page
- [x] Yield and melt API wiring
- [x] Melt milestone visibility
- [ ] Outreach logging
- [ ] Milestone updates
- [ ] Cross-office collaboration workflow

## Phase 4: Platform Leverage

- [x] Integrations surface exists
- [x] Admin surface exists
- [x] Reporting surface exists
- [ ] Integration execution layer
- [ ] Student-level sync status
- [ ] Handoff error queues
- [ ] Advanced decision automation
- [ ] Light engagement signals via integrations

## Recommended Next Checklist

Highest-value next items:

- [ ] Build Documents Queue
- [ ] Add duplicate detection and merge workflow
- [ ] Wire outreach logging from yield and melt pages
- [ ] Wire reviewer actions from Ready for Review
- [ ] Wire milestone update actions from Deposit / Melt
- [ ] Add student-level handoff / sync status
- [ ] Build checklist templates by population
- [x] Build Documents Queue

## Completion Definition

The product is not complete when more screens exist.

It is complete when an admissions employee can:

- [x] log in
- [x] see who to work
- [x] review ready students
- [x] inspect transcript-backed student context
- [x] inspect trust and decision context
- [~] move incomplete apps forward quickly
- [~] know who is likely to enroll
- [ ] prevent melt with real intervention actions
- [ ] work without spreadsheets or disconnected side workflows
