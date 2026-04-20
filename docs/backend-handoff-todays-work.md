# Backend Handoff: Today's Work and Checklist Contract

## Purpose

This document defines the backend contract needed to support the current frontend implementation of:

- `Today's Work`
- student checklist progress
- blocker-clearing actions

The frontend already supports optimistic local fallback. These endpoints will replace that fallback with authoritative tenant-scoped data.

## Current Frontend Surfaces Depending on This Contract

- [src/pages/TodaysWorkPage.jsx](C:\alan\crtfystudent\src\pages\TodaysWorkPage.jsx)
- [src/pages/StudentProfilePage.jsx](C:\alan\crtfystudent\src\pages\StudentProfilePage.jsx)
- [src/lib/workApi.js](C:\alan\crtfystudent\src\lib\workApi.js)
- [src/lib/studentWorkflow.js](C:\alan\crtfystudent\src\lib\studentWorkflow.js)
- [src/context/StudentRecordsContext.jsx](C:\alan\crtfystudent\src\context\StudentRecordsContext.jsx)

## Required Auth Rules

All endpoints must:

- require `Authorization: Bearer <access_token>`
- require `X-Tenant-Id: <tenant_id>`
- reject cross-tenant access
- return:
  - `401` for invalid/expired auth
  - `403` for valid auth but wrong tenant access
  - `404` for missing entity
  - JSON error payload with `detail` or `message`

## Phase 1 Endpoints

## 1. Work Summary

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

## 2. Work Items

`GET /api/v1/work/items`

### Optional query params

- `section`
- `population`
- `owner`
- `priority`
- `aging_bucket`
- `q`

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
  ]
}
```

## 3. Student Checklist

`GET /api/v1/students/{studentId}/checklist`

### Response

The frontend accepts either a bare array or an object with `items` or `checklist`.

Preferred shape:

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

## 4. Update Checklist Item Status

`POST /api/v1/students/{studentId}/checklist/items/{itemId}/status`

### Request

```json
{
  "status": "complete"
}
```

### Accepted statuses

- `missing`
- `received`
- `needs_review`
- `complete`

### Response

Return the full updated checklist, not just the changed item. That lets the frontend refresh work and student detail without guessing.

```json
{
  "studentId": "STU-10482",
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

## Required Derived Logic

The backend should own these calculations:

- `completionPercent`
- `oneItemAway`
- `reasonToAct`
- `suggestedAction`
- `section`
- `priority`

The frontend can derive them temporarily, but they should move server-side for consistency across reporting, queueing, and integrations.

## Recommended Entity Model

## Checklist Templates

- `checklist_templates`
- `checklist_template_items`

Recommended fields:

- `id`
- `tenant_id`
- `population`
- `code`
- `name`
- `active`

## Student Checklist State

- `student_checklists`
- `student_checklist_items`

Recommended fields:

- `id`
- `tenant_id`
- `student_id`
- `template_item_id`
- `code`
- `label`
- `required`
- `status`
- `received_at`
- `completed_at`
- `due_at`
- `needs_review`
- `source_document_id`
- `source_confidence`
- `updated_by`
- `updated_at`

## Signals / Work Items

- `student_signals`
- `student_priority_scores`
- optional materialized `student_work_items`

Recommended signal types:

- `missing_one_item`
- `stalled`
- `new_document_uploaded`
- `ready_for_decision`
- `trust_block`
- `duplicate_candidate`
- `deposit_risk`

## Business Rules Needed Immediately

## Section assignment

- `exceptions`
  - trust hold
  - pending evidence
  - unresolved exception
- `ready`
  - completion is 100% or decision-ready
- `close`
  - one item away or completion >= 75%
- `attention`
  - everything else still incomplete

## Priority assignment

- `urgent`
  - trust block
  - one item away
- `today`
  - ready for decision
  - fit score high
  - completion >= 75%
- `soon`
  - everything else

## Document-to-Checklist Hook

When transcript or document processing completes, backend should:

1. identify relevant checklist item(s)
2. attach `sourceDocumentId`
3. store `sourceConfidence`
4. set status:
   - `complete` for high-confidence automatic matches
   - `needs_review` for medium-confidence matches
   - leave as `missing` when unresolved

That is the bridge between the current transcript pipeline and the new admissions workflow.

## Frontend Expectations

The frontend currently tolerates missing backend support by:

- deriving work items from student records
- optimistically updating checklist items locally

Once the above endpoints are live, the intended behavior is:

- `Today's Work` loads from backend
- Student 360 checklist loads from backend
- checklist status actions persist server-side and refresh queue state

## Immediate Backend Build Order

1. `GET /api/v1/students/{studentId}/checklist`
2. `POST /api/v1/students/{studentId}/checklist/items/{itemId}/status`
3. `GET /api/v1/work/items`
4. `GET /api/v1/work/summary`

That order gives the frontend a real operator action path first, then upgrades the home screen from derived to authoritative queueing.
