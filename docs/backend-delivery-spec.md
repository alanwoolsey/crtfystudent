# Backend Delivery Spec

## Objective

This is the backend execution spec for turning `crtfy student` into a daily admissions operating system.

This is not a temporary frontend support document.

This is the durable backend contract and delivery plan for:

- checklist truth
- `Today's Work` queue truth
- document-to-checklist automation
- decision readiness
- exceptions and duplicates groundwork
- yield and melt groundwork

Backend should be able to work ahead of frontend using this document.

## Product Outcome Backend Must Enable

An admissions counselor must be able to:

- open the app
- see who to work
- understand why each student matters now
- clear blockers
- move students from incomplete to complete
- move complete students into decision
- later track admit, deposit, and melt risk

The backend is responsible for the system of record and the derived operational state that makes that possible.

## Non-Negotiable Backend Principles

- tenant-scoped from day one
- audit-friendly from day one
- explicit workflow state, not inferred ad hoc in the frontend
- response shapes designed for operator screens, not raw table dumps
- document, checklist, trust, and decision workflows remain linked
- no dependency on frontend-derived calculations for production truth

## Authentication and Tenant Rules

Every protected endpoint must:

- require `Authorization: Bearer <access_token>`
- require `X-Tenant-Id: <tenant_id>`
- validate the authenticated user can access the supplied tenant
- reject cross-tenant entity access

Error behavior must be consistent:

- `401` invalid or expired auth
- `403` valid auth but invalid tenant access
- `404` entity not found
- `422` invalid payload or invalid status transition
- JSON error with `detail` or `message`

## Backend Workstreams

Backend can run these in parallel, with `A` and `B` first.

### A. Checklist Domain

Owns:

- templates
- student checklist instantiation
- status transitions
- completion math
- blocker identification

### B. Work Queue Domain

Owns:

- work-item aggregation
- section assignment
- priority scoring
- reason-to-act generation
- summary counts

### C. Document Automation Domain

Owns:

- mapping transcript/document events to checklist items
- confidence scoring
- document exception queue hooks

### D. Decision Readiness Domain

Owns:

- readiness state
- readiness blockers
- handoff from checklist completion to review queue

### E. Data Hygiene Domain

Owns:

- duplicate candidates
- merge actions
- source correction groundwork

### F. Enrollment Operations Domain

Owns:

- admitted status
- deposit tracking
- enrollment milestones
- melt-risk groundwork

## Delivery Order

## Wave 1: Required Immediately

1. checklist read/write
2. work items
3. work summary
4. document-to-checklist linkage
5. readiness state

## Wave 2: Build In Parallel Once Wave 1 Schema Is Stable

1. duplicate candidate pipeline
2. decision-readiness endpoint
3. document exceptions endpoint
4. owner assignment support in work items

## Wave 3: Build Ahead of Frontend

1. admitted/deposit pipeline
2. milestones
3. melt scoring
4. integration run visibility

## Durable Domain Model

## 1. Checklist Templates

### Tables

- `checklist_templates`
- `checklist_template_items`

### Purpose

Define required and optional checklist items by population and optionally by program.

### Recommended fields

#### `checklist_templates`

- `id`
- `tenant_id`
- `name`
- `population`
- `program_id` nullable
- `start_term_code` nullable
- `active`
- `version`
- `created_at`
- `updated_at`

#### `checklist_template_items`

- `id`
- `template_id`
- `code`
- `label`
- `required`
- `sort_order`
- `document_type` nullable
- `review_required_default`
- `active`
- `created_at`
- `updated_at`

## 2. Student Checklist State

### Tables

- `student_checklists`
- `student_checklist_items`

### Purpose

Persist the real admissions completion state for each student.

### Recommended fields

#### `student_checklists`

- `id`
- `tenant_id`
- `student_id`
- `template_id`
- `population`
- `completion_percent`
- `one_item_away`
- `status`
- `created_at`
- `updated_at`

#### `student_checklist_items`

- `id`
- `student_checklist_id`
- `tenant_id`
- `student_id`
- `template_item_id` nullable
- `code`
- `label`
- `required`
- `status`
- `received_at` nullable
- `needs_review` boolean
- `completed_at` nullable
- `due_at` nullable
- `source_document_id` nullable
- `source_confidence` nullable
- `updated_by_user_id` nullable
- `updated_by_system` boolean
- `updated_at`

### Accepted status values

- `missing`
- `received`
- `needs_review`
- `complete`
- optional later:
  - `waived`
  - `not_required`

## 3. Signals and Work Queue

### Tables

- `student_signals`
- `student_priority_scores`
- optional materialized `student_work_items`

### Purpose

Produce the operator queue without forcing frontend business logic.

### Recommended fields

#### `student_signals`

- `id`
- `tenant_id`
- `student_id`
- `signal_type`
- `signal_label`
- `signal_value` nullable
- `severity`
- `active`
- `detected_at`
- `expires_at` nullable
- `source`
- `metadata_json`

#### `student_priority_scores`

- `id`
- `tenant_id`
- `student_id`
- `priority_score`
- `priority_band`
- `reason_code`
- `computed_at`

### Initial signal types

- `missing_one_item`
- `stalled`
- `new_document_uploaded`
- `ready_for_decision`
- `trust_block`
- `pending_evidence`
- `duplicate_candidate`
- `deposit_risk`

## 4. Decision Readiness

### Table or computed view

- `student_decision_readiness`

### Purpose

Provide explicit readiness, not UI guesswork.

### Recommended fields

- `tenant_id`
- `student_id`
- `readiness_state`
- `reason_code`
- `reason_label`
- `blocking_item_count`
- `trust_blocked`
- `computed_at`

### Initial readiness states

- `ready_for_decision`
- `blocked_by_missing_item`
- `blocked_by_review`
- `blocked_by_trust`

## 5. Document Linkage

### Tables

- reuse transcript/document tables where possible
- add `document_checklist_links` if needed

### Purpose

Tie incoming documents to checklist progress with explicit evidence.

### Recommended fields

- `id`
- `tenant_id`
- `student_id`
- `document_id`
- `checklist_item_id`
- `match_confidence`
- `match_status`
- `linked_at`
- `linked_by`

### Match status values

- `auto_completed`
- `needs_review`
- `unresolved`

## 6. Duplicates

### Tables

- `duplicate_candidates`
- `duplicate_merge_actions`

### Recommended fields

#### `duplicate_candidates`

- `id`
- `tenant_id`
- `primary_student_id`
- `candidate_student_id`
- `confidence_score`
- `match_reasons_json`
- `status`
- `created_at`
- `resolved_at` nullable

#### `duplicate_merge_actions`

- `id`
- `tenant_id`
- `candidate_id`
- `resolved_by_user_id`
- `resolution`
- `field_conflicts_json`
- `created_at`

## 7. Enrollment Operations

### Tables

- `student_enrollment_milestones`
- `student_yield_scores`
- `student_melt_scores`

### Purpose

Allow backend to keep building while frontend finishes earlier workflow phases.

## Core Computation Rules

These must live on the backend.

## Completion Percent

Calculate using required checklist items only.

Suggested rule:

- numerator = required items with status `complete`
- denominator = total required items
- round to integer percent

## One Item Away

True when:

- required incomplete item count = 1

## Blocking Items

A blocking item is any required item whose status is:

- `missing`
- `needs_review`
- optional later:
  - `received`

## Work Section Assignment

### `exceptions`

Use when any of these are true:

- trust hold active
- pending evidence signal active
- unresolved exception signal active

### `ready`

Use when:

- readiness state = `ready_for_decision`

### `close`

Use when:

- one item away
- or completion percent >= 75 and not blocked by trust

### `attention`

Use for remaining incomplete students

## Priority Assignment

Initial explainable rule set:

### `urgent`

- trust block active
- one item away
- high-value student plus blocker

### `today`

- ready for decision
- completion percent >= 75
- recent document upload requiring review

### `soon`

- all other active work

Backend should persist both:

- machine-usable priority band
- human-readable reason code / label

## Required API Contracts

## 1. Get Student Checklist

`GET /api/v1/students/{studentId}/checklist`

### Response

```json
{
  "studentId": "STU-10482",
  "population": "transfer",
  "completionPercent": 83,
  "oneItemAway": true,
  "status": "incomplete",
  "items": [
    {
      "id": "chk_1",
      "code": "application_form",
      "label": "Application form",
      "required": true,
      "status": "complete",
      "receivedAt": "2026-04-18T15:30:00Z",
      "completedAt": "2026-04-18T15:31:00Z",
      "sourceDocumentId": null,
      "sourceConfidence": null
    },
    {
      "id": "chk_2",
      "code": "official_transcript",
      "label": "Official transcript",
      "required": true,
      "status": "needs_review",
      "receivedAt": "2026-04-19T12:10:00Z",
      "completedAt": null,
      "sourceDocumentId": "TR-1001",
      "sourceConfidence": 0.93
    }
  ]
}
```

## 2. Update Checklist Item Status

`POST /api/v1/students/{studentId}/checklist/items/{itemId}/status`

### Request

```json
{
  "status": "complete"
}
```

### Response

Return the full updated checklist.

```json
{
  "studentId": "STU-10482",
  "population": "transfer",
  "completionPercent": 100,
  "oneItemAway": false,
  "status": "complete",
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
      "status": "complete",
      "sourceDocumentId": "TR-1001",
      "sourceConfidence": 0.93
    }
  ]
}
```

### Required side effects

On successful update:

- recalculate checklist completion
- update decision readiness
- update work-item section and priority
- write audit event

## 3. Get Work Summary

`GET /api/v1/work/summary`

### Response

```json
{
  "summary": {
    "needsAttention": 18,
    "closeToCompletion": 9,
    "readyForDecision": 11,
    "exceptions": 4
  }
}
```

## 4. Get Work Items

`GET /api/v1/work/items`

### Supported query params

- `section`
- `population`
- `owner`
- `priority`
- `aging_bucket`
- `q`
- `limit`
- `offset`

### Response

```json
{
  "items": [
    {
      "id": "work_123",
      "studentId": "STU-10482",
      "studentName": "Mira Holloway",
      "population": "transfer",
      "stage": "incomplete",
      "completionPercent": 83,
      "priority": "urgent",
      "section": "close",
      "owner": {
        "id": "usr_42",
        "name": "Elian Brooks"
      },
      "reasonToAct": {
        "code": "missing_one_item",
        "label": "One item away: Official transcript"
      },
      "suggestedAction": {
        "code": "review_document",
        "label": "Review official transcript"
      },
      "blockingItems": [
        {
          "id": "chk_2",
          "code": "official_transcript",
          "label": "Official transcript",
          "status": "needs_review"
        }
      ],
      "checklistSummary": {
        "totalRequired": 6,
        "completedCount": 5,
        "missingCount": 0,
        "needsReviewCount": 1,
        "oneItemAway": true
      },
      "fitScore": 94,
      "depositLikelihood": 82,
      "program": "BS Nursing Transfer",
      "institutionGoal": "Harbor Gate University",
      "risk": "Low",
      "lastActivity": "2 hours ago"
    }
  ],
  "total": 42
}
```

## 5. Link Document to Checklist Item

`POST /api/v1/documents/{documentId}/link-checklist-item`

### Request

```json
{
  "studentId": "STU-10482",
  "checklistItemId": "chk_2",
  "matchConfidence": 0.93,
  "matchStatus": "needs_review"
}
```

### Response

Return the updated checklist item or full checklist.

## 6. Get Document Exceptions

`GET /api/v1/documents/exceptions`

### Purpose

Feed the later exceptions queue without redesigning the backend.

## 7. Get Student Readiness

`GET /api/v1/students/{studentId}/readiness`

### Response

```json
{
  "studentId": "STU-10482",
  "readinessState": "blocked_by_review",
  "reasonCode": "needs_review",
  "reasonLabel": "Official transcript requires staff review",
  "blockingItemCount": 1,
  "trustBlocked": false,
  "computedAt": "2026-04-20T18:45:00Z"
}
```

## Audit Requirements

Backend must emit audit history for:

- checklist item status changes
- document linkage changes
- work-item priority recalculation if persisted
- duplicate merge actions
- readiness state changes

At minimum each audit event needs:

- `tenant_id`
- `entity_type`
- `entity_id`
- `action`
- `actor_type`
- `actor_user_id` nullable
- `metadata_json`
- `occurred_at`

## Performance Expectations

## Work queue endpoints

Need to support daily operator use without noticeable lag.

Target:

- p95 under 500ms for common filtered requests in normal tenant volume

## Checklist read/write

Target:

- p95 under 300ms for single-student checklist read
- p95 under 500ms for checklist update with recalculation

If needed:

- materialize work items
- cache summary counts
- recompute async after document events

## Migration / Rollout Plan

## Step 1

Add checklist schema and seed at least one template per population.

## Step 2

Backfill student checklist state for existing students.

## Step 3

Ship checklist read endpoint.

## Step 4

Ship checklist update endpoint with audit and recalculation.

## Step 5

Ship work-item aggregation and summary endpoints.

## Step 6

Attach transcript/document processing outputs to checklist items.

## Step 7

Ship readiness endpoint and duplicate groundwork.

## Acceptance Criteria

## Checklist

- student checklist can be read by id
- checklist update persists correctly
- completion percent is backend-owned
- one-item-away is backend-owned
- audit entry exists for every mutation

## Work Queue

- `Today's Work` can load fully from backend
- each work item has stable section, priority, and blocker data
- queue summary matches underlying work items

## Document Automation

- transcript processing can update checklist state
- low-confidence mapping creates `needs_review`, not silent completion
- unresolved mappings are queryable as exceptions

## Readiness

- readiness state updates after checklist mutations
- ready students can be distinguished from blocked students without frontend inference

## Recommended Team Split

If backend has multiple engineers, split ownership like this:

### Engineer 1

- checklist schema
- checklist service
- checklist endpoints

### Engineer 2

- work-item aggregation
- summary endpoint
- readiness service

### Engineer 3

- document-to-checklist linkage
- exception hooks
- duplicate groundwork

### Engineer 4, if available

- admitted/deposit/milestone schema and endpoints
- integration run visibility groundwork

## Immediate Backend Ticket List

1. Create checklist template tables and migrations
2. Create student checklist tables and migrations
3. Implement checklist instantiation service by population
4. Implement completion calculation service
5. Implement checklist read endpoint
6. Implement checklist status update endpoint
7. Implement audit events for checklist changes
8. Implement readiness service
9. Implement work-item aggregation service
10. Implement work summary endpoint
11. Implement work items endpoint
12. Implement document-to-checklist linkage service
13. Implement document exceptions endpoint
14. Create duplicate candidate schema
15. Create enrollment milestone schema

## What Frontend Is Already Waiting On

The current frontend will immediately consume these once shipped:

- `GET /api/v1/students/{studentId}/checklist`
- `POST /api/v1/students/{studentId}/checklist/items/{itemId}/status`
- `GET /api/v1/work/items`
- `GET /api/v1/work/summary`

Everything else in this document can move in parallel while frontend continues building:

- document linkage
- readiness
- duplicates
- milestones
- yield/melt groundwork

## Final Instruction to Backend

Do not optimize for temporary compatibility hacks.

Implement checklist truth, work-item truth, and readiness truth as first-class backend domains. The frontend should become a thin operator surface over those domains, not a place where workflow state is invented.
