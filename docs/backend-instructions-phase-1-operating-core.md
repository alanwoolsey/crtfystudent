# Backend Instructions: Phase 1 Operating Core

Last updated: 2026-06-04

## Copy/Paste Brief For Backend

Build the Phase 1 operating-core backend for crtfyStudent.

The product outcome is:

> A counselor logs in, sees incomplete students grouped by what matters, opens a student, and clears one blocker using document evidence.

Backend must own the production truth for checklist state, readiness state, Today's Work, document-to-checklist linkage, and audit history. The frontend may derive fallback work items for demos, but production behavior must come from backend endpoints.

## Non-Negotiables

- Every protected endpoint requires `Authorization: Bearer <access_token>`.
- Every protected endpoint requires `X-Tenant-Id: <tenant_id>`.
- Validate user access to the tenant on every request.
- Do not accept tenant IDs from request bodies for protected endpoints.
- Return `401` for invalid/expired auth.
- Return `403` for valid auth without tenant/permission access.
- Return `404` when a scoped record does not exist.
- Return `422` for invalid payloads or invalid state transitions.
- Errors must return JSON with `detail` or `message`.
- Every write must create an audit event.

## Build Order

1. Checklist schema and seed templates.
2. Student checklist instantiation/backfill.
3. Checklist read/write endpoints.
4. Readiness computation.
5. Today's Work summary and item projection.
6. Document-to-checklist linkage.
7. Seed/demo tenant data for QA.

## Required Tables

### `checklist_templates`

- `id`
- `tenant_id`
- `name`
- `population`
- `program_id` nullable
- `term_code` nullable
- `active`
- `version`
- `created_at`
- `updated_at`

### `checklist_template_items`

- `id`
- `template_id`
- `code`
- `label`
- `required`
- `optional`
- `conditional`
- `waivable`
- `blocking`
- `document_type` nullable
- `sort_order`
- `active`
- `created_at`
- `updated_at`

### `student_checklists`

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

### `student_checklist_items`

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
- `completed_at` nullable
- `due_at` nullable
- `source_document_id` nullable
- `source_confidence` nullable
- `updated_by_user_id` nullable
- `updated_by_system`
- `updated_at`

### `student_decision_readiness`

Can be a table, materialized view, or computed service response.

- `tenant_id`
- `student_id`
- `readiness_state`
- `reason_code`
- `reason_label`
- `blocking_item_count`
- `trust_blocked`
- `computed_at`

### `student_signals`

- `id`
- `tenant_id`
- `student_id`
- `signal_type`
- `signal_label`
- `severity`
- `active`
- `detected_at`
- `expires_at` nullable
- `source`
- `metadata_json`

### `student_priority_scores`

- `id`
- `tenant_id`
- `student_id`
- `priority_score`
- `priority_band`
- `reason_code`
- `computed_at`

### `document_checklist_links`

- `id`
- `tenant_id`
- `student_id`
- `document_id`
- `checklist_item_id`
- `match_confidence`
- `match_status`
- `linked_at`
- `linked_by`

### `audit_events`

- `id`
- `tenant_id`
- `entity_type`
- `entity_id`
- `action`
- `actor_type`
- `actor_user_id` nullable
- `metadata_json`
- `occurred_at`

## Required State Values

### Checklist item status

Support these now:

- `not_started`
- `requested`
- `received`
- `needs_review`
- `waived`
- `complete`
- `blocked`
- `rejected`
- `expired`

The frontend also tolerates legacy `missing`; if backend uses `not_started`, include labels/reason codes that make missing requirements obvious.

### Readiness states

Support:

- `in_progress`
- `incomplete`
- `nearly_complete`
- `ready_for_review`
- `blocked_by_document`
- `blocked_by_trust`
- `blocked_by_transfer_review`
- `blocked_by_decision_evidence`
- `ready_for_decision`
- `ready_for_release`

Also tolerate current frontend fallback aliases:

- `blocked_by_missing_item`
- `blocked_by_review`

### Work sections

Support:

- `attention`
- `close`
- `ready`
- `exceptions`

### Priority bands

Support:

- `urgent`
- `today`
- `soon`

### Reason-to-act codes

Start with:

- `missing_one_item`
- `stalled`
- `new_document_uploaded`
- `ready_for_decision`
- `trust_block`
- `pending_evidence`
- `duplicate_candidate`
- `deposit_risk`
- `incomplete`
- `needs_review`

## Computation Rules

### Completion percent

Use required checklist items only:

```text
completion_percent = round(required complete items / required total items * 100)
```

### One item away

True when exactly one required item is not complete.

### Blocking items

For Phase 1, blocking items are required items with status:

- `not_started`
- `requested`
- `received`
- `needs_review`
- `blocked`
- `rejected`
- `expired`

Do not count `waived` as blocking.

### Readiness

Use this first-pass precedence:

1. Active trust block -> `blocked_by_trust`
2. Required item rejected/expired/blocked -> `blocked_by_document`
3. Required item received or needs_review -> `ready_for_review` or `blocked_by_document`, depending local policy
4. Missing required items and one item away -> `nearly_complete`
5. Missing required items -> `incomplete`
6. All required items complete and no trust block -> `ready_for_decision`
7. Decision reviewed and release gates clear -> `ready_for_release`

For the current frontend, map `incomplete` to `blocked_by_missing_item` only if needed for compatibility.

### Work section assignment

Use this first-pass precedence:

1. `exceptions`: trust block, document exception, pending evidence, duplicate candidate, or unresolved manual exception
2. `ready`: readiness is `ready_for_decision` or `ready_for_review`
3. `close`: one item away or completion percent >= 75 and not exception-blocked
4. `attention`: remaining active incomplete work

### Priority

Use an explainable rule first, not a black box:

- `urgent`: trust block, one item away, document exception, or high-fit student with active blocker
- `today`: ready for review/decision, completion percent >= 75, or recent document upload needing review
- `soon`: everything else

Return both machine value and human reason:

```json
{
  "priority": "urgent",
  "priorityScore": 92,
  "reasonToAct": {
    "code": "missing_one_item",
    "label": "One item away: Official transcript"
  }
}
```

## Required Endpoints

### `GET /api/v1/students/{studentId}/checklist`

Permission: `view_student_360`

Return:

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
    }
  ]
}
```

### `POST /api/v1/students/{studentId}/checklist/items/{itemId}/status`

Permission: `edit_checklist`

Request:

```json
{
  "status": "complete"
}
```

Return the full updated checklist.

Required side effects:

- Recalculate completion percent.
- Recalculate one-item-away.
- Recalculate readiness.
- Recalculate work item section/priority.
- Write audit event.

### `GET /api/v1/students/{studentId}/readiness`

Permission: `view_student_360`

Return:

```json
{
  "studentId": "STU-10482",
  "state": "ready_for_decision",
  "label": "Ready for decision",
  "reason": "All required items are complete and trust is clear.",
  "tone": "low",
  "reasonCode": "all_required_complete",
  "blockingItemCount": 0,
  "trustBlocked": false,
  "blockers": [],
  "computedAt": "2026-06-04T17:00:00Z"
}
```

### `GET /api/v1/work/summary`

Permission: `view_student_360`

Return:

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

### `GET /api/v1/work/today`

Permission: `view_student_360`

Query params:

- `section`
- `population`
- `owner`
- `priority`
- `aging_bucket`
- `q`
- `limit`
- `offset`

Return:

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
      "priorityScore": 92,
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
      "readiness": {
        "state": "nearly_complete",
        "label": "Nearly complete",
        "tone": "medium",
        "reason": "One required item remains."
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
      "program": "BS Nursing Transfer",
      "institutionGoal": "Harbor Gate University",
      "risk": "Low",
      "lastActivity": "2026-06-04T15:30:00Z",
      "updatedAt": "2026-06-04T15:30:00Z"
    }
  ],
  "total": 42
}
```

### `GET /api/v1/work/today/board`

Permission: `view_student_360`

Return:

```json
{
  "board": {
    "groups": [
      {
        "key": "one_item_away",
        "label": "One item away",
        "total": 9,
        "routeHint": {
          "nextAgent": "document_agent",
          "reason": "Most blockers are document review items.",
          "actionLabel": "Route bucket to document"
        },
        "items": []
      }
    ]
  }
}
```

The frontend accepts any group key, but prefer standard work buckets:

- `new_inquiries`
- `no_first_touch`
- `started_not_submitted`
- `incomplete_applicants`
- `one_item_away`
- `stalled_applicants`
- `document_blocked`
- `trust_blocked`
- `ready_for_review`
- `decision_waiting`
- `admitted_no_recent_touch`
- `deposit_risk`
- `melt_risk`
- `handoff_risk`

### `POST /api/v1/documents/{documentId}/link-checklist-item`

Permission: `edit_checklist`

Request:

```json
{
  "studentId": "STU-10482",
  "checklistItemId": "chk_2",
  "matchConfidence": 0.93,
  "matchStatus": "needs_review"
}
```

Valid `matchStatus` values:

- `auto_completed`
- `needs_review`
- `unresolved`

Required behavior:

- Persist document-checklist link.
- If `auto_completed`, update checklist item to `complete`.
- If `needs_review`, update checklist item to `needs_review`.
- Recalculate checklist, readiness, and work projection.
- Write audit event.

## Seed Data Required For QA

Seed at least one tenant with:

- [ ] One incomplete applicant with multiple missing items.
- [ ] One one-item-away applicant.
- [ ] One student with a received transcript that needs review.
- [ ] One ready-for-review or ready-for-decision student.
- [ ] One trust-blocked student.
- [ ] One unassigned student.
- [ ] At least two owners/counselors.

## Backend Acceptance Criteria

- [ ] Checklist state persists in database.
- [ ] Checklist updates recalculate completion, readiness, and work items.
- [ ] Today's Work loads from backend without relying on frontend-derived fallback.
- [ ] Work items include section, priority, reason-to-act, suggested action, owner, checklist summary, and blockers.
- [ ] Readiness endpoint returns state, label, reason, tone, blockers, and computed timestamp.
- [ ] Document-to-checklist link can move a checklist item to `complete` or `needs_review`.
- [ ] Every write creates an audit event.
- [ ] All endpoints are tenant-scoped and permission-checked.

## Frontend Compatibility Notes

The current frontend already calls:

- `GET /api/v1/students`
- `GET /api/v1/students?q=...`
- `GET /api/v1/students/{studentId}/checklist`
- `POST /api/v1/students/{studentId}/checklist/items/{itemId}/status`
- `GET /api/v1/students/{studentId}/readiness`
- `GET /api/v1/work/today`
- `GET /api/v1/work/today/board`
- `GET /api/v1/work/summary`
- `GET /api/v1/work/items`

For Phase 1, prefer implementing `work/today` and `work/today/board`; keep `work/items` and `work/summary` compatible for fallback and older screens.

Field-level frontend contract:

- [frontend-backend-field-contract.md](frontend-backend-field-contract.md)
