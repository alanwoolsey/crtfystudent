# Admissions Implementation Plan

## Objective

Turn `crtfy student` from a strong middle-of-funnel intelligence prototype into a daily operating system for admissions staff.

The first implementation goal is not breadth. It is daily usefulness.

Success means an admissions counselor can:

- log in
- see who to work
- move incomplete applications forward
- review ready students quickly
- make confident decisions
- track who is likely to enroll

## Product Strategy to Implement

## Core Story

The core product story is:

`We get applications completed faster, decisions made faster, and deposits protected better.`

## Core UX Principle

The primary UX is no longer a set of product modules.

The primary UX becomes:

- `Today's Work`
- supporting detail views beneath it

Existing surfaces such as Student 360, Decision Studio, Trust Center, and Integrations remain important, but they should support the operator workflow rather than define it.

## Delivery Principles

- Start with the daily admissions workflow, not feature completeness.
- Build around `Incomplete -> Complete` first.
- Add only enough signals to prioritize human work.
- Reuse existing Student 360, transcript, trust, and decision packet foundations.
- Avoid building a full CRM, full chatbot, or full campaign engine.
- Keep all workflows tenant-scoped and audit-friendly.

## Implementation Phases

## Phase 1: Make It Usable Daily

Timeline:

- 0 to 30 days

Goal:

- an admissions counselor can work a full day in the product

## Scope

### 1. Incomplete Application Engine

Build a real requirements model by applicant population.

Required capabilities:

- checklist templates by population:
  - first-year
  - transfer
  - graduate
  - international
  - readmit
- checklist item statuses:
  - missing
  - received
  - needs_review
  - complete
- completion percent calculation
- `one item away` flag
- required vs optional items
- item aging timestamps

### 2. Incomplete Work Queue

Build the first operational queue admissions staff will use daily.

Required views:

- started not submitted
- submitted missing items
- nearly complete
- aging buckets:
  - 3 days
  - 7 days
  - 14+ days

Required sort options:

- closest to complete
- time since last activity
- newest document uploaded
- highest fit

### 3. Document -> Checklist Automation

Turn transcript and document processing into real progress.

Required behavior:

- when transcript is received and parsed, map it to checklist items
- show confidence score for auto-match
- auto-complete high-confidence items
- route low-confidence cases to exception review
- expose `received but not indexed` state

### 4. Basic Reasons to Act

Add a lightweight prioritization layer.

Initial signals:

- missing one item
- stalled X days
- new document uploaded
- ready for decision

### 5. `Today's Work` Shell

Build the new primary home screen.

Initial sections:

- `Needs Attention Now`
- `Close to Completion`
- `Ready for Decision`
- `Exceptions`

Each student row should show:

- student name
- population
- current stage
- completion percent
- reason to act
- suggested action
- owner

## Outcome of Phase 1

- replaces spreadsheets and manual follow-up tracking for incomplete apps
- gives counselors an actual daily starting point
- connects transcript/document strength to the highest-frequency workflow

## Phase 2: Make It Smart

Timeline:

- 30 to 60 days

Goal:

- system tells staff what to do next

## Scope

### 1. Counselor Workbench

Make `Today's Work` the real operator console.

Sections:

- `Needs Attention`
- `Close to Complete`
- `Ready for Review`
- `Exceptions`

Each student should show:

- reason to act
- suggested action
- blockers
- confidence / readiness

### 2. Duplicate Resolution System

Required capabilities:

- duplicate match candidates
- confidence score
- match reasons
- merge review UI
- field-level conflict resolution
- source correction controls

### 3. Prioritization Scoring

Build a simple, explainable priority model.

Inputs:

- completion percent
- time decay
- last activity
- fit score
- reason-to-act signals

Outputs:

- priority score
- priority band:
  - urgent
  - today
  - soon

### 4. Decision Readiness Indicator

Add explicit readiness states:

- ready_for_decision
- blocked_by_missing_item
- blocked_by_trust
- blocked_by_review

## Outcome of Phase 2

- reduces counselor wasted effort
- reduces decision latency
- adds data hygiene controls
- makes the system feel proactive instead of reactive

## Phase 3: Win the Enrollment Game

Timeline:

- 60 to 90 days

Goal:

- impact deposits and enrollment, not just processing speed

## Scope

### 1. Admitted -> Deposit Pipeline

Required capabilities:

- admitted list
- deposit status
- days since admit
- owner and last touch

### 2. Yield Prioritization

Required signals:

- high likelihood to enroll
- high transfer-credit value
- engaged vs disengaged
- event/visit activity if available

### 3. Melt Prevention

Track post-deposit milestones:

- FAFSA
- housing
- orientation
- final transcript
- registration

Build:

- melt-risk score
- `At Risk` queue

### 4. Cross-Office Visibility

Expose milestone ownership and status across:

- admissions
- financial aid
- registrar
- advising
- housing

## Outcome of Phase 3

- ties the product to enrollment outcomes
- supports budget justification
- moves the product beyond decisioning into enrollment operations

## Phase 4: Platform Leverage

Timeline:

- 90+ days

Goal:

- become the intelligence layer above existing systems

## Scope

### 1. Integration Execution Layer

- student-level sync status
- sync error queues
- downstream handoff package
- last successful sync visibility

### 2. Advanced Decision Automation

- auto-admit rules
- explainable reasoning
- exception flags

### 3. Light Engagement Signals

Do not build a full engagement suite.

Only add:

- email-open status via integration
- page visit or recent activity via integration
- chatbot escalation signals via partner integration

## Outcome of Phase 4

- `crtfy student` sits above Slate and Element451 instead of trying to replace both

## UX / IA Changes

## New Primary Navigation

Recommended near-term navigation:

1. `Today's Work`
2. `Students`
3. `Decision Review`
4. `Admit / Yield`
5. `Melt Watch`
6. `Exceptions`
7. `Integrations`

## Mapping Existing Screens

| Existing screen | Future role |
|---|---|
| Command Center | Evolve into `Today's Work` |
| Student 360 | Canonical student detail and context view |
| Decision Studio | Decision Review workspace |
| Trust Center | Exceptions / trust detail view |
| Workflows | Fold into `Today's Work` and `Exceptions` |
| Prospect Portal | Later or integration-dependent surface |
| Integrations | Platform admin and handoff visibility |

## Data Model Additions

## New Core Entities

### Checklist templates

- `checklist_templates`
- `checklist_template_items`

### Student checklist state

- `student_checklists`
- `student_checklist_items`

Recommended fields:

- `student_id`
- `population`
- `item_code`
- `item_label`
- `status`
- `required`
- `received_at`
- `completed_at`
- `due_at`
- `needs_review`
- `source_document_id`
- `source_confidence`

### Work queue / prioritization

- `student_work_items`
- `student_signals`
- `student_priority_scores`

Recommended signal types:

- `missing_one_item`
- `stalled`
- `new_document_uploaded`
- `ready_for_decision`
- `trust_block`
- `duplicate_candidate`
- `deposit_risk`

### Duplicate handling

- `duplicate_candidates`
- `duplicate_merge_actions`

### Yield / melt

- `student_enrollment_milestones`
- `student_yield_scores`
- `student_melt_scores`

## API Plan

## Phase 1 APIs

### Today's Work

- `GET /api/v1/work/summary`
- `GET /api/v1/work/items`

Recommended filters:

- `section`
- `population`
- `owner`
- `priority`
- `aging_bucket`

### Checklist

- `GET /api/v1/students/{studentId}/checklist`
- `POST /api/v1/students/{studentId}/checklist/items/{itemId}/status`
- `GET /api/v1/checklist/templates`

### Document linkage

- `POST /api/v1/documents/{documentId}/link-checklist-item`
- `GET /api/v1/documents/exceptions`

## Phase 2 APIs

- `GET /api/v1/duplicates`
- `POST /api/v1/duplicates/{candidateId}/merge`
- `GET /api/v1/priorities`
- `GET /api/v1/students/{studentId}/readiness`

## Phase 3 APIs

- `GET /api/v1/admits`
- `GET /api/v1/melt-watch`
- `GET /api/v1/students/{studentId}/milestones`
- `POST /api/v1/students/{studentId}/milestones/{milestoneId}/status`

## Frontend Execution Plan

## First Screen to Build

Build `Today's Work` first.

This should replace the current dashboard as the default landing page.

## First Frontend Tickets

1. Create `TodaysWorkPage.jsx`
2. Replace current Command Center route with `Today's Work`
3. Add work-section cards:
   - Needs Attention Now
   - Close to Completion
   - Ready for Decision
   - Exceptions
4. Add reusable student work row component
5. Add checklist progress chip component
6. Add reason-to-act badge component
7. Add links from work rows to Student 360 and Decision Review

## Backend Execution Plan

## First Backend Contracts to Define

1. Student checklist item shape
2. Work item shape
3. Reason-to-act signal shape
4. Completion percent calculation
5. Decision readiness shape

## First Backend Tickets

1. Add checklist template tables
2. Add student checklist item tables
3. Add completion-percent calculation service
4. Add work-item aggregation query/service
5. Add document-to-checklist linking service
6. Add work summary endpoint
7. Add work items endpoint

## Suggested Phase 1 Work Item Shape

```json
{
  "id": "work_123",
  "studentId": "STU-10482",
  "studentName": "Mira Holloway",
  "population": "transfer",
  "stage": "incomplete",
  "completionPercent": 83,
  "priority": "urgent",
  "owner": {
    "id": "usr_42",
    "name": "Elian Brooks"
  },
  "reasonToAct": {
    "code": "missing_one_item",
    "label": "Missing transcript"
  },
  "suggestedAction": {
    "code": "request_document_review",
    "label": "Review transcript and clear checklist"
  },
  "blockingItems": [
    {
      "code": "official_transcript",
      "label": "Official transcript",
      "status": "needs_review"
    }
  ],
  "lastActivityAt": "2026-04-20T10:30:00Z"
}
```

## Suggested Phase 1 Checklist Summary Shape

```json
{
  "studentId": "STU-10482",
  "population": "transfer",
  "completionPercent": 83,
  "oneItemAway": true,
  "items": [
    {
      "id": "chk_1",
      "code": "application_form",
      "label": "Application form",
      "required": true,
      "status": "complete"
    },
    {
      "id": "chk_2",
      "code": "official_transcript",
      "label": "Official transcript",
      "required": true,
      "status": "needs_review",
      "sourceDocumentId": "TR-1001",
      "sourceConfidence": 0.93
    }
  ]
}
```

## Suggested Sequencing Inside the Current Repo

## Step 1

Replace the current dashboard concept with `Today's Work`.

## Step 2

Extend Student 360 to render real checklist progress and blockers.

## Step 3

Connect transcript processing results to checklist status updates.

## Step 4

Add readiness states into Decision Studio and student rows.

## Step 5

Add duplicates and exceptions into the same operator workflow.

## What Not to Build Now

- full CRM records management
- full chatbot platform
- full campaign builder
- full application builder
- advanced committee workflow engine

## Definition of Done for Phase 1

Phase 1 is done when:

- `Today's Work` is the default home screen
- incomplete students are grouped into meaningful daily sections
- each student has checklist progress and a reason to act
- transcript/document processing can move checklist items automatically
- counselors can work incomplete apps without spreadsheets

## Immediate Next Ticket Recommendation

Start with two vertical slices in parallel:

1. `Today's Work` frontend shell using mock-compatible live-ready data shapes
2. checklist + work-item backend contract design

The first real milestone is simple:

`A counselor logs in, sees incomplete students grouped by what matters, opens a student, and clears one blocker using document evidence.`
