# Phase 6 Today's Work Tickets

Last updated: 2026-06-04

## Objective

Make Today's Work the daily operating console for admissions staff.

The backend owns projection, priority, and reason-to-act. The frontend owns an efficient, scannable operating surface.

## Epic A: Work Projection

### Ticket A1: Build work projection service

Build a service that composes:

- student identity
- owner assignment
- lifecycle stage
- checklist summary
- readiness
- document status
- trust status
- decision status
- interaction recency

Acceptance:

- [ ] Produces one active work item per student per dominant work reason.
- [ ] Work item includes section, bucket, priority, reason-to-act, suggested action, owner, blockers, and last activity.
- [ ] Projection is tenant-scoped.

### Ticket A2: Define section assignment

Support sections:

- `attention`
- `close`
- `ready`
- `exceptions`

Acceptance:

- [ ] Exceptions take precedence over ready/close/attention.
- [ ] Ready includes ready-for-review and ready-for-decision.
- [ ] Close includes one-item-away and high-completion incomplete students.
- [ ] Attention includes remaining active incomplete work.

### Ticket A3: Define work bucket assignment

Support buckets:

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

Acceptance:

- [ ] Every work item has a bucket.
- [ ] Bucket label is display-ready.
- [ ] Bucket rules are documented and test-covered.

## Epic B: Priority And Reasons

### Ticket B1: Priority scoring

Support:

- `urgent`
- `today`
- `soon`

Acceptance:

- [ ] Priority is explainable.
- [ ] Priority score is numeric.
- [ ] Priority reason is returned with code and label.
- [ ] One-item-away, trust-blocked, and document exception students rank highest.

### Ticket B2: Reason-to-act generation

Start with:

- `missing_one_item`
- `stalled`
- `new_document_uploaded`
- `ready_for_decision`
- `trust_block`
- `pending_evidence`
- `duplicate_candidate`
- `incomplete`
- `needs_review`

Acceptance:

- [ ] Every work item has one primary reason-to-act.
- [ ] Reason label is human-readable.
- [ ] Reason code is stable for reporting.

### Ticket B3: Suggested action generation

Start with:

- `review_document`
- `request_missing_item`
- `clear_last_blocker`
- `review_trust_case`
- `open_decision_review`
- `follow_up`
- `route_to_specialist`

Acceptance:

- [ ] Every work item has one suggested action.
- [ ] Suggested action aligns with top blocker.
- [ ] Suggested action is stable enough for future one-click actions.

## Epic C: Work APIs

### Ticket C1: Work summary endpoint

Endpoint:

- `GET /api/v1/work/summary`

Acceptance:

- [ ] Returns `needsAttention`, `closeToCompletion`, `readyForDecision`, and `exceptions`.
- [ ] Respects tenant and user scope.
- [ ] Supports future owner/team filters without breaking response.

### Ticket C2: Today's Work list endpoint

Endpoint:

- `GET /api/v1/work/today`

Query params:

- `section`
- `population`
- `owner`
- `priority`
- `aging_bucket`
- `q`
- `limit`
- `offset`

Acceptance:

- [ ] Response shape matches `TodayWorkItem`.
- [ ] Filters are tenant-scoped and permission-scoped.
- [ ] Search covers student name, email, program, owner, reason, and blocker label.

### Ticket C3: Today's Work board endpoint

Endpoint:

- `GET /api/v1/work/today/board`

Acceptance:

- [ ] Returns grouped work buckets.
- [ ] Each group includes key, label, total, and items.
- [ ] Empty groups can be omitted.

### Ticket C4: Legacy compatibility endpoint

Endpoint:

- `GET /api/v1/work/items`

Acceptance:

- [ ] Returns same item shape as `work/today`.
- [ ] Can be implemented as alias or compatibility wrapper.
- [ ] Existing frontend fallback remains stable.

## Epic D: Work Actions

### Ticket D1: Clear top blocker

Behavior:

- Uses checklist status update endpoint for checklist blockers.

Acceptance:

- [ ] Work item updates after blocker is cleared.
- [ ] Student checklist and readiness are recalculated.
- [ ] Audit event is written.

### Ticket D2: Route work item

Endpoint:

- `POST /api/v1/work/today/{studentId}/route`

Request:

```json
{
  "nextAgent": "document_agent",
  "note": "Transcript evidence needs review."
}
```

Acceptance:

- [ ] Route updates owner agent or queue owner.
- [ ] Route writes audit event.
- [ ] Route creates interaction/history event.

### Ticket D3: Route recommendation

Endpoint:

- `GET /api/v1/work/today/{studentId}/recommendation`

Acceptance:

- [ ] Returns recommended agent/queue and reason.
- [ ] Recommendation is deterministic for Phase 6.
- [ ] Does not require LLM/agent orchestration for first release.

## Epic E: Interaction Logging

### Ticket E1: Create interaction model

Build `student_interactions`.

Fields:

- `id`
- `tenant_id`
- `student_id`
- `interaction_type`
- `interaction_label`
- `note`
- `created_by_user_id`
- `created_at`
- `metadata_json`

Acceptance:

- [ ] Interactions are tenant-scoped.
- [ ] Interactions appear in Student 360 timeline.

### Ticket E2: Log work action

Endpoint:

- `POST /api/v1/students/{studentId}/interactions`

Support interaction types:

- `called`
- `emailed`
- `texted`
- `voicemail_left`
- `student_replied`
- `appointment_booked`
- `document_requested`
- `application_link_sent`
- `internal_note`
- `follow_up_scheduled`
- `no_response`
- `escalated`

Acceptance:

- [ ] Interaction write updates last activity.
- [ ] Interaction write can refresh work priority.
- [ ] Interaction write is audited or included in timeline history.

## Epic F: Frontend Workbench

### Ticket F1: Add explicit fallback state

Acceptance:

- [ ] Today's Work clearly labels live vs derived data.
- [ ] Empty live queues do not look like errors.
- [ ] Backend unavailable state includes retry.

### Ticket F2: Add section filters

Acceptance:

- [ ] Search filters current tab.
- [ ] User can filter by owner, priority, and population when backend supports it.

### Ticket F3: Add one-click interaction buttons

Acceptance:

- [ ] Buttons exist for common counselor actions.
- [ ] Buttons call backend interaction endpoint.
- [ ] Successful action updates work item last activity.

## Phase 6 Done When

- [ ] Today's Work is the default home screen.
- [ ] Every work item explains why it matters.
- [ ] Every work item recommends one next action.
- [ ] Counselors can clear blockers or log actions from the workbench.
- [ ] Managers can see workload by owner/team.
- [ ] Frontend no longer depends on derived student fallback for tenants with live work data.

