# Phase 1 Operating Core Backlog

Last updated: 2026-06-04

## Objective

Deliver the first operating-core slice: a counselor can open crtfyStudent, see incomplete admissions work, understand why each student matters, and move a blocker forward from Student 360 or Today's Work.

## Working Slice

The first production slice is:

> A counselor logs in, sees incomplete students grouped by what matters, opens a student, and clears one blocker using document evidence.

## Epic 1: Canonical Student Record

- [ ] Define canonical student response shape.
- [ ] Confirm `GET /api/v1/students` supports list cards, Today's Work fallback, Student 360, Incomplete, Ready for Review, Yield, and Melt.
- [ ] Confirm `GET /api/v1/students?q=...` searches name, email, student ID, source, program, and stage.
- [ ] Add or confirm `GET /api/v1/students/{studentId}` for direct Student 360 loads.
- [ ] Normalize owner, source, population, lifecycle stage, program interest, and term interest.
- [ ] Add audit events for stage and owner changes.

Done when:

- [ ] Student list and profile no longer require local mock data for a signed-in tenant.
- [ ] A student record can answer identity, source, owner, stage, and next action.

## Epic 2: Checklist Truth

- [ ] Create `checklist_templates`.
- [ ] Create `checklist_template_items`.
- [ ] Create `student_checklists`.
- [ ] Create `student_checklist_items`.
- [ ] Support statuses: `not_started`, `requested`, `received`, `needs_review`, `waived`, `complete`, `blocked`, `rejected`, `expired`.
- [ ] Calculate completion percent.
- [ ] Calculate `oneItemAway`.
- [ ] Return checklist summary with completed, missing, needs-review, and blocker counts.
- [ ] Audit item status changes.

Done when:

- [ ] `GET /api/v1/students/{studentId}/checklist` returns a persisted checklist.
- [ ] `POST /api/v1/students/{studentId}/checklist/items/{itemId}/status` updates status and returns the updated checklist.
- [ ] Completing checklist items updates readiness.

## Epic 3: Today's Work Projection

- [ ] Build work item projection from student, checklist, document, trust, and decision state.
- [ ] Support work sections: `attention`, `close`, `ready`, `exceptions`.
- [ ] Support standard work buckets from the CRM boundary artifact.
- [ ] Generate reason-to-act code and label.
- [ ] Generate suggested action code and label.
- [ ] Generate priority score and priority band.
- [ ] Include owner and queue ownership.
- [ ] Include blocking items.
- [ ] Include last activity and due date where available.

Done when:

- [ ] `GET /api/v1/work/today` returns live work items.
- [ ] `GET /api/v1/work/today/board` returns grouped work buckets.
- [ ] `GET /api/v1/work/summary` returns summary counts.
- [ ] Today's Work loads live state without frontend-derived fallback for a tenant with data.

## Epic 4: Document-To-Checklist Link

- [ ] Persist document-to-student match confidence.
- [ ] Persist document-to-checklist match confidence.
- [ ] Auto-complete checklist items when confidence crosses threshold.
- [ ] Route low-confidence matches to document exception review.
- [ ] Expose received-not-indexed state.
- [ ] Support reprocess stored file.
- [ ] Support replace bad file and rerun processing.

Done when:

- [ ] A parsed transcript can move a checklist item to `complete` or `needs_review`.
- [ ] Failed or uncertain documents explain the reason and suggested action.
- [ ] Reprocess success requires processing success and transcript persistence success.

## Epic 5: Interaction And Ownership

- [ ] Add `student_interactions`.
- [ ] Add `student_owner_assignments`.
- [ ] Add ownership history.
- [ ] Support manual owner assignment.
- [ ] Support queue ownership.
- [ ] Support one-click work logs: called, emailed, texted, voicemail, reply, appointment, document requested, internal note, next follow-up, no response, escalated.
- [ ] Surface interactions in Student 360 timeline.

Done when:

- [ ] Work actions create interaction history.
- [ ] Ownership changes are visible and audited.
- [ ] Today's Work can filter by owner and queue.

## Epic 6: Readiness Contract

- [ ] Implement readiness state service.
- [ ] Support `in_progress`, `incomplete`, `nearly_complete`, `ready_for_review`, `blocked_by_document`, `blocked_by_trust`, `blocked_by_transfer_review`, `blocked_by_decision_evidence`, `ready_for_decision`, and `ready_for_release`.
- [ ] Return reason codes and human-readable labels.
- [ ] Return blockers.
- [ ] Make readiness visible in Student 360, Today's Work, Incomplete, and Ready for Review.

Done when:

- [ ] `GET /api/v1/students/{studentId}/readiness` returns state, label, reason, tone, and blockers.
- [ ] Readiness is not inferred ad hoc by production frontend code.

## First Engineering Tickets

- [ ] Backend: create checklist schema migration.
- [ ] Backend: implement checklist read/write endpoints.
- [ ] Backend: implement work item projection endpoint.
- [ ] Backend: implement work summary endpoint.
- [ ] Backend: connect transcript/document result to checklist status update.
- [x] Backend handoff: write copy/paste Phase 1 instructions.
- [x] Backend handoff: tag current frontend fields as keep/rename/contract/remove/later.
- [x] Frontend: centralize lifecycle/readiness/work constants.
- [x] Frontend: make Today's Work and Incomplete consume the same readiness labels.
- [x] Frontend: add explicit empty/loading/error states for checklist/work queue fallback.
- [ ] QA: seed one tenant with incomplete, one-item-away, ready-for-review, and trust-blocked students.

Backend handoff:

- [backend-instructions-phase-1-operating-core.md](backend-instructions-phase-1-operating-core.md)
- [frontend-backend-field-contract.md](frontend-backend-field-contract.md)

Next phase ticket splits:

- [phase-4-checklist-engine-tickets.md](phase-4-checklist-engine-tickets.md)
- [phase-6-todays-work-tickets.md](phase-6-todays-work-tickets.md)

## Delivery Status

### 2026-06-04

Completed frontend Phase 1 alignment:

- [x] Shared lifecycle, checklist, readiness, work section, reason, and priority constants.
- [x] Derived checklist/workflow logic supports Phase 1 checklist statuses.
- [x] Student detail payload accepts wrapped backend responses.
- [x] Student list payload accepts `owner`, `population`, and `studentId` aliases.
- [x] Readiness chip consumes backend `state` or legacy `readinessState`.
- [x] Student 360 checklist renders Phase 1 statuses with readable labels.
- [x] Today's Work, Incomplete, Ready for Review, Exceptions, and Workflows show live-vs-derived data state with retry.
- [x] Live queue screens avoid duplicate refetches when fallback student data changes.
- [x] Today's Work renders the primary live queue before loading optional board grouping.
- [x] Backend-backed queue searches are debounced to reduce request volume while typing.

Remaining Phase 1 blockers:

- [ ] Backend checklist schema and seeded templates.
- [ ] Backend checklist read/write endpoints.
- [ ] Backend readiness endpoint backed by persisted/computed truth.
- [ ] Backend Today's Work projection endpoints.
- [ ] Backend document-to-checklist linkage.
- [ ] QA seed tenant.
