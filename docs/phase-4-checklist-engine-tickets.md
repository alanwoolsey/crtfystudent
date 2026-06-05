# Phase 4 Checklist Engine Tickets

Last updated: 2026-06-04

## Objective

Turn application completion into a persisted, configurable workflow.

This phase is backend-heavy. The frontend should consume backend checklist truth and avoid owning completion rules.

## Epic A: Checklist Template Model

### Ticket A1: Create checklist template schema

Build:

- `checklist_templates`
- `checklist_template_items`

Acceptance:

- [ ] Templates are tenant-scoped.
- [ ] Templates support population, program, term, and active/version fields.
- [ ] Template items support required, optional, conditional, waivable, blocking, document type, and sort order.

### Ticket A2: Seed baseline templates

Build templates for:

- first-year
- transfer
- graduate
- international
- readmit

Acceptance:

- [ ] Each population has at least one active default template.
- [ ] Required transcript/document items are represented.
- [ ] Seed data can be safely rerun.

### Ticket A3: Template selection service

Build service that selects the correct template by:

- tenant
- population
- program
- term
- student type

Acceptance:

- [ ] More specific template wins over general template.
- [ ] Inactive templates are ignored.
- [ ] Missing template returns a clear `422` or controlled fallback.

## Epic B: Student Checklist State

### Ticket B1: Create student checklist schema

Build:

- `student_checklists`
- `student_checklist_items`

Acceptance:

- [ ] Student checklists are tenant-scoped.
- [ ] Student checklist items preserve template item references where available.
- [ ] Student checklist items can exist without a template item for one-off admin additions.

### Ticket B2: Instantiate checklist for applicant

Trigger checklist creation when:

- application is created
- application is submitted
- active applicant is imported
- admin manually initializes checklist

Acceptance:

- [ ] Duplicate student checklist is not created.
- [ ] Checklist item states default correctly.
- [ ] Checklist creation writes audit event.

### Ticket B3: Backfill existing students

Build migration/backfill task.

Acceptance:

- [ ] Existing students receive checklists based on available population/program/term.
- [ ] Backfill logs skipped records and reasons.
- [ ] Backfill is tenant-safe.

## Epic C: Checklist State Machine

### Ticket C1: Define valid item statuses

Support:

- `not_started`
- `requested`
- `received`
- `needs_review`
- `waived`
- `complete`
- `blocked`
- `rejected`
- `expired`

Acceptance:

- [ ] Invalid statuses return `422`.
- [ ] Statuses are documented in API output.
- [ ] Legacy `missing` is translated to `not_started` where needed.

### Ticket C2: Implement status transitions

Build transition validation for common movements:

- `not_started` -> `requested`
- `requested` -> `received`
- `received` -> `needs_review`
- `received` -> `complete`
- `needs_review` -> `complete`
- any active state -> `waived`
- any active state -> `blocked`
- `blocked` -> `needs_review`
- `rejected` -> `requested`

Acceptance:

- [ ] Invalid transition returns `422`.
- [ ] Every transition writes audit event.
- [ ] Status update response returns full updated checklist.

### Ticket C3: Completion calculation

Build completion summary from required items only.

Acceptance:

- [ ] `completionPercent` is rounded integer.
- [ ] `oneItemAway` is true only when exactly one required item is incomplete.
- [ ] Waived required items do not block completion.
- [ ] Checklist-level status updates after every item change.

## Epic D: Readiness Rules

### Ticket D1: Implement readiness computation

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

Acceptance:

- [ ] Readiness includes `state`, `label`, `reason`, `tone`, `reasonCode`, `blockers`, and `computedAt`.
- [ ] Trust block takes precedence over checklist completeness.
- [ ] Readiness recalculates after checklist, document, and trust changes.

### Ticket D2: Implement readiness endpoint

Endpoint:

- `GET /api/v1/students/{studentId}/readiness`

Acceptance:

- [ ] Endpoint is tenant-scoped.
- [ ] Endpoint requires `view_student_360`.
- [ ] Response shape matches backend Phase 1 instructions.

## Epic E: Checklist API

### Ticket E1: Read student checklist

Endpoint:

- `GET /api/v1/students/{studentId}/checklist`

Acceptance:

- [ ] Endpoint returns wrapper with summary and items.
- [ ] Endpoint is tenant-scoped.
- [ ] Endpoint requires `view_student_360`.
- [ ] `404` when student does not exist in tenant.

### Ticket E2: Update checklist item status

Endpoint:

- `POST /api/v1/students/{studentId}/checklist/items/{itemId}/status`

Acceptance:

- [ ] Endpoint requires `edit_checklist`.
- [ ] Endpoint validates transition.
- [ ] Endpoint recalculates checklist summary.
- [ ] Endpoint recalculates readiness.
- [ ] Endpoint refreshes work projection.
- [ ] Endpoint writes audit event.
- [ ] Endpoint returns full updated checklist.

## Epic F: Checklist Admin

### Ticket F1: List checklist templates

Endpoint:

- `GET /api/v1/checklist/templates`

Acceptance:

- [ ] Supports filters for population, program, term, and active.
- [ ] Requires admin/config permission.

### Ticket F2: Create and update templates

Endpoints:

- `POST /api/v1/checklist/templates`
- `PATCH /api/v1/checklist/templates/{templateId}`

Acceptance:

- [ ] Writes audit event.
- [ ] Does not mutate existing instantiated student checklists unless explicitly requested.
- [ ] Supports versioning.

### Ticket F3: Preview template match

Endpoint:

- `GET /api/v1/checklist/templates/preview?studentId=...`

Acceptance:

- [ ] Returns selected template and selection rationale.
- [ ] Helps admins debug population/program/term rules.

## Phase 4 Done When

- [ ] Templates can be configured by population, program, and term.
- [ ] New applications automatically receive a checklist.
- [ ] Checklist items show status, owner/source where available, due date, and blocker status.
- [ ] Completing an item updates readiness and Today's Work.
- [ ] Staff can distinguish missing evidence from received-but-needs-review evidence.

