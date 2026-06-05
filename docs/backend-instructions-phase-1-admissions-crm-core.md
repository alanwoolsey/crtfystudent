# Backend Instructions: Phase 1 Admissions CRM Core

Last updated: 2026-06-04

## Copy/Paste Brief For Backend

Build the Admissions CRM Core backend for crtfyStudent.

The product outcome is:

> A prospect or applicant has a canonical identity, source attribution, lifecycle stage, owner, next action, interaction history, audit history, and leadership rollups before an application is complete.

This is the foundation underneath Prospect Portal, Student 360, Today's Work, checklist readiness, yield, melt, and handoff.

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
- Source attribution must survive lifecycle, owner, and duplicate-merge changes.

## Build Order

1. Canonical student/prospect identity schema.
2. Source reference and attribution schema.
3. Lifecycle stage and owner assignment schema.
4. Interaction history schema.
5. Student list/detail/search endpoints.
6. Manual inquiry creation endpoint.
7. API/CSV inquiry import endpoint.
8. Prospect-to-applicant conversion with duplicate protection.
9. Leadership counts endpoint.
10. Audit events for every write.

## Required Tables

### `students`

- `id`
- `tenant_id`
- `student_number` nullable
- `first_name`
- `last_name`
- `preferred_name` nullable
- `email`
- `phone` nullable
- `city` nullable
- `state` nullable
- `population`
- `program_interest` nullable
- `term_interest` nullable
- `lifecycle_stage`
- `status`
- `source_id` nullable
- `owner_user_id` nullable
- `next_best_action` nullable
- `created_at`
- `updated_at`

### `student_source_references`

- `id`
- `tenant_id`
- `student_id`
- `source`
- `source_category`
- `campaign` nullable
- `external_reference_id` nullable
- `first_touch`
- `last_touch`
- `metadata_json`
- `captured_at`

### `student_owner_assignments`

- `id`
- `tenant_id`
- `student_id`
- `owner_user_id` nullable
- `queue_key` nullable
- `assignment_reason`
- `assigned_by_user_id` nullable
- `assigned_at`
- `ended_at` nullable

### `student_interactions`

- `id`
- `tenant_id`
- `student_id`
- `interaction_type`
- `direction`
- `subject` nullable
- `body` nullable
- `outcome` nullable
- `next_follow_up_at` nullable
- `actor_user_id` nullable
- `source`
- `metadata_json`
- `occurred_at`

### `student_stage_history`

- `id`
- `tenant_id`
- `student_id`
- `from_stage` nullable
- `to_stage`
- `reason` nullable
- `changed_by_user_id` nullable
- `changed_at`

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

## Required Lifecycle Stages

Start with:

- `inquiry`
- `qualified_inquiry`
- `application_started`
- `submitted`
- `incomplete`
- `nearly_complete`
- `ready_for_review`
- `decision_ready`
- `admitted`
- `denied`
- `waitlisted`
- `deposited`
- `handoff_in_progress`
- `class_ready`
- `trust_hold`
- `withdrawn`

## Required Endpoints

### `GET /api/v1/students`

Permission: `view_student_360`.

Query params:

- `q`
- `stage`
- `population`
- `owner`
- `source`
- `program`
- `limit`
- `offset`

Must support list cards, Today's Work fallback, Student 360, Incomplete, Ready for Review, Yield, and Melt.

### `GET /api/v1/students/{studentId}`

Permission: `view_student_360`.

Return canonical identity, source, owner, stage, program interest, term interest, next action, readiness summary, and last activity.

### `POST /api/v1/inquiries`

Permission: `view_student_360` or `edit_checklist`.

Create a manual inquiry/prospect and return the canonical student/prospect response.

### `POST /api/v1/inquiries/imports`

Permission: admin/import permission.

Accept CSV or JSON import payloads. Return an import job ID and row-level results.

### `POST /api/v1/students/{studentId}/owner`

Permission: owner assignment permission.

Request:

```json
{
  "ownerUserId": "usr_42",
  "queueKey": null,
  "reason": "Transfer inquiry routed by territory"
}
```

Required side effects:

- End the previous active owner assignment.
- Create a new owner assignment.
- Write stage/timeline/audit events.

### `POST /api/v1/students/{studentId}/stage`

Permission: lifecycle update permission.

Request:

```json
{
  "stage": "qualified_inquiry",
  "reason": "Student confirmed program interest"
}
```

Required side effects:

- Validate transition.
- Write stage history.
- Recompute Today's Work if needed.
- Write audit event.

### `POST /api/v1/students/{studentId}/interactions`

Permission: `view_student_360` or interaction logging permission.

Request:

```json
{
  "interactionType": "call",
  "direction": "outbound",
  "subject": "First touch",
  "body": "Reviewed transfer pathway and requested transcript.",
  "outcome": "document_requested",
  "nextFollowUpAt": "2026-06-07T15:00:00Z"
}
```

### `POST /api/v1/prospects/{prospectId}/convert-application`

Permission: `edit_checklist`.

Required behavior:

- Check duplicates before conversion.
- Reuse existing student when a duplicate is confirmed.
- Preserve source references, interactions, transcript evidence, and audit history.
- Create or attach application/checklist state.

### `GET /api/v1/dashboard/admissions-crm-core`

Permission: `view_dashboards`.

Return leadership counts by:

- stage
- owner
- source
- population

Example:

```json
{
  "counts": {
    "byStage": [{ "label": "Incomplete", "count": 18 }],
    "byOwner": [{ "label": "Elian Brooks", "count": 12 }],
    "bySource": [{ "label": "transcript_first", "count": 9 }],
    "byPopulation": [{ "label": "transfer", "count": 21 }]
  }
}
```

## Backend Acceptance Criteria

- [ ] A prospect/applicant has canonical identity, source, population, program interest, term interest, owner, stage, next action, and history.
- [ ] `GET /api/v1/students` supports search and all frontend student-card fields.
- [ ] `GET /api/v1/students/{studentId}` supports direct Student 360 loads.
- [ ] Manual inquiry creation persists.
- [ ] API/CSV inquiry import persists row-level results.
- [ ] Owner assignment history is retained and audited.
- [ ] Stage history is retained and audited.
- [ ] Interaction history is retained and visible in Student 360 timeline.
- [ ] Prospect-to-applicant conversion prevents duplicate student creation.
- [ ] Leadership counts by stage, owner, source, and population are available.

## Frontend Compatibility Notes

The current frontend already accepts:

- `studentId` or `id`
- `owner`, `advisor`, or `assignedOwner`
- `stage`, `lifecycleStage`, or `lifecycle_stage`
- `source`, `leadSource`, or `sourceReference`
- `program`, `programInterest`, or `program_interest`
- `termInterest` or `term_interest`
- `nextBestAction`, `next_best_action`, or `suggestedAction.label`

Production Phase 1 is not complete until backend persistence, import, owner/stage writes, interaction history, conversion, and audit events are implemented.
