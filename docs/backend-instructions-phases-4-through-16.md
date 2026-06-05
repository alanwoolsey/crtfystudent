# Backend Instructions: Phases 4 Through 16

Last updated: 2026-06-04

## Purpose

This is the consolidated backend handoff for the remaining crtfyStudent roadmap phases.

The frontend already contains live-ready surfaces for checklist, document queue, trust, decision studio, yield, melt, reporting, admin, and work orchestration. Production completion now depends on backend source-of-truth schemas, endpoints, background jobs, audit events, integration syncs, and seed data.

## Global Requirements

- Every protected endpoint requires `Authorization: Bearer <access_token>`.
- Every protected endpoint requires `X-Tenant-Id: <tenant_id>`.
- Validate tenant membership and permissions on every request.
- Return JSON errors with `detail` or `message`.
- Return `401`, `403`, `404`, and `422` consistently.
- Every write must create an audit event and, when student-facing, a Student 360 timeline event.
- All list endpoints should support `limit`, `offset`, `q`, tenant scoping, and stable sort order.
- Sensitive academic, transcript-image, trust/fraud, notes, and released-decision details must be redacted when the user lacks the required sensitivity tier.

## Phase 4: Checklist And Application Completion Engine

Frontend already supports checklist item statuses, readiness labels, checklist progress, incomplete queues, and item completion calls.

Required backend:

- Checklist template admin APIs.
- Template versioning by population, program, term, and student type.
- Conditional, required, optional, waivable, blocking, and non-blocking rule evaluation.
- Checklist generation on application creation/submission.
- Checklist audit history.

Primary endpoints:

- `GET /api/v1/checklist/templates`
- `POST /api/v1/checklist/templates`
- `PATCH /api/v1/checklist/templates/{templateId}`
- `POST /api/v1/checklist/templates/{templateId}/publish`
- `POST /api/v1/students/{studentId}/checklist/generate`
- `GET /api/v1/students/{studentId}/checklist`
- `POST /api/v1/students/{studentId}/checklist/items/{itemId}/status`

Done when backend can answer what exactly blocks an applicant from completion.

## Phase 5: Document-To-Checklist And Transcript Intelligence

Frontend already supports single upload, batch/ZIP upload, document queues, exception summaries, run details, stored reprocess, replacement reprocess, release/quarantine actions, and transcript detail display.

Required backend:

- Document queue source-of-truth records.
- Document-to-student and document-to-checklist matching.
- Confidence-based auto-completion.
- Human review routing.
- Transcript extraction persistence.
- Stored-file reprocess and replacement upload orchestration.

Primary endpoints:

- `GET /api/v1/documents/queue`
- `GET /api/v1/documents/exceptions`
- `POST /api/v1/transcripts/uploads`
- `POST /api/v1/documents/{documentId}/link-checklist-item`
- `POST /api/v1/documents/{documentId}/reprocess`
- `POST /api/v1/documents/{documentId}/reprocess-upload`
- `POST /api/v1/documents/{documentId}/release`
- `POST /api/v1/documents/{documentId}/quarantine`
- `GET /api/v1/documents/{documentId}/exception-summary`
- `GET /api/v1/documents/{documentId}/run-details`
- `GET /api/v1/transcripts/{transcriptId}/results`

Done when a document can move a checklist item to complete or needs-review with explainable confidence.

## Phase 6: Today's Work And Counselor Workbench

Frontend already supports prioritized sections, live/derived mode, board buckets, summary metrics, route recommendations, item routing, bucket routing, and backend-backed search.

Required backend:

- Work item projection table or materialized view.
- Interaction logging actions.
- SLA and stale-work indicators.
- Manager workload by owner/team.

Primary endpoints:

- `GET /api/v1/work/today`
- `GET /api/v1/work/today/board`
- `GET /api/v1/work/summary`
- `POST /api/v1/work/today/{studentId}/route`
- `GET /api/v1/work/today/{studentId}/recommendation`
- `POST /api/v1/work/today/orchestrate`
- `POST /api/v1/students/{studentId}/interactions`

Done when staff actions create interaction history and managers can see workload by owner/team.

## Phase 7: Duplicate, Identity, And Trust Foundation

Frontend already has Trust Center and Student 360 trust tabs with live trust case/detail/action endpoints.

Required backend:

- Duplicate detection and merge review APIs.
- Field-level identity conflict records.
- Trust case model with evidence, severity, release block, reviewer notes, assignment, resolution actions, and audit history.
- Route trust blocks into Today's Work and Student 360 timeline.

Primary endpoints:

- `GET /api/v1/identity/duplicates`
- `GET /api/v1/identity/duplicates/{candidateId}`
- `POST /api/v1/identity/duplicates/{candidateId}/merge`
- `POST /api/v1/identity/duplicates/{candidateId}/dismiss`
- `GET /api/v1/trust/cases`
- `GET /api/v1/trust/transcripts/{transcriptId}/details`
- `POST /api/v1/trust/transcripts/{transcriptId}/block`
- `POST /api/v1/trust/transcripts/{transcriptId}/unblock`
- `POST /api/v1/trust/transcripts/{transcriptId}/resolve`
- `POST /api/v1/trust/transcripts/{transcriptId}/escalate`
- `POST /api/v1/trust/transcripts/{transcriptId}/assign`

Done when duplicate and trust actions are auditable and can block/clear release.

## Phase 8: Transfer And Academic Evidence Workflows

Frontend already displays transcript evidence, accepted credits, academic trends, credit estimate in decision details, and transfer-value signals in yield-related surfaces when backend provides them.

Required backend:

- Transfer evidence summary.
- Articulation gap detection.
- Transfer specialist queue.
- Academic evidence confidence/provenance.
- Transfer value signal for yield prioritization.

Primary endpoints:

- `GET /api/v1/students/{studentId}/transfer-evidence`
- `GET /api/v1/transfer/articulation-gaps`
- `POST /api/v1/transfer/articulation-gaps/{gapId}/route`
- `GET /api/v1/transfer/specialist-queue`

Done when transfer evidence is visible from Student 360 and decision review, with routable articulation gaps.

## Phase 9: Decision Workspace And Release Controls

Frontend already supports decision packet list/detail, packet creation, recommendation generation, timeline, note, assignment, snapshot, agent details, and review actions.

Required backend:

- Decision packet source of truth.
- Evidence snapshots.
- Recommendation generation and review workflow.
- Release gates.
- Final outcome release actions.
- Audit trail for packet, recommendation, review, and release.

Primary endpoints:

- `GET /api/v1/decisions`
- `POST /api/v1/decisions`
- `GET /api/v1/decisions/{decisionId}`
- `GET /api/v1/decisions/{decisionId}/snapshot`
- `GET /api/v1/decisions/{decisionId}/timeline`
- `GET /api/v1/decisions/{decisionId}/agent-details`
- `POST /api/v1/decisions/{decisionId}/recommendation`
- `POST /api/v1/decisions/{decisionId}/review`
- `POST /api/v1/decisions/{decisionId}/release`
- `POST /api/v1/decisions/{decisionId}/hold`
- `POST /api/v1/decisions/{decisionId}/reopen`

Done when final decisions cannot release if configured gates fail.

## Phase 10: Admitted Student Yield

Frontend already has a live-ready admitted/yield queue with search, filters, owner, yield score, milestone completion, program, next step, and Student 360 links.

Required backend:

- Yield queue projection.
- Yield score/risk reasons.
- Recommended interventions.
- Yield interaction logging and next follow-up.
- Leadership filters by owner, program, risk, and deposit status.

Primary endpoints:

- `GET /api/v1/yield`
- `POST /api/v1/students/{studentId}/yield/interventions`
- `POST /api/v1/students/{studentId}/yield/follow-up`

Done when counselors can see admitted students to work, why they matter, and log interventions.

## Phase 11: Deposit, Melt, And Cross-Office Milestones

Frontend already has a live-ready Deposit/Melt page with views for all-clear, at-risk, FAFSA, orientation, final transcript, and registration blockers.

Required backend:

- Deposit event capture from SIS, CRM, manual update, import, or API.
- Configurable milestone templates by tenant/program/population.
- Office ownership.
- Melt risk computation.
- Cross-office notes/follow-up/escalation/completion.

Primary endpoints:

- `GET /api/v1/melt`
- `POST /api/v1/students/{studentId}/deposit`
- `GET /api/v1/milestones/templates`
- `POST /api/v1/milestones/templates`
- `POST /api/v1/students/{studentId}/milestones/{milestoneId}/status`
- `POST /api/v1/students/{studentId}/melt/interventions`

Done when missing milestones appear in Deposit/Melt and every milestone has office owner/status.

## Phase 12: Handoff Command Center

Frontend has Student 360 handoff tab placeholders, but no dedicated Handoff Command Center yet.

Required backend:

- Student-level handoff status.
- Office readiness tracking.
- Handoff package.
- Sync error queue with retry/acknowledge.
- Filters by handoff status, office, owner, and aging.

Primary endpoints:

- `GET /api/v1/handoff`
- `GET /api/v1/students/{studentId}/handoff`
- `POST /api/v1/students/{studentId}/handoff/status`
- `GET /api/v1/sync-errors`
- `POST /api/v1/sync-errors/{errorId}/retry`
- `POST /api/v1/sync-errors/{errorId}/acknowledge`

Done when unresolved handoff risks are visible and retryable.

## Phase 13: Integration Console And Implementation Toolkit

Frontend has a connector strategy surface and Admin user/role/sensitivity/scope/work-projection tools. Connectors are still mock-only.

Required backend:

- Connector marketplace/status/config.
- Authentication validation.
- Object and field mapping.
- Sync observability.
- Implementation checklist/go-live readiness.

Primary endpoints:

- `GET /api/v1/connectors`
- `GET /api/v1/connectors/{connectorId}`
- `POST /api/v1/connectors/{connectorId}/connect`
- `POST /api/v1/connectors/{connectorId}/test`
- `GET /api/v1/connectors/{connectorId}/mappings`
- `PATCH /api/v1/connectors/{connectorId}/mappings`
- `GET /api/v1/sync/runs`
- `GET /api/v1/implementation/readiness`
- `POST /api/v1/implementation/checklist/{itemId}/status`

Done when admin can determine connector health and implementation readiness without mock data.

## Phase 14: Operational Reporting, Intelligence, And Benchmarks

Frontend already calls `GET /api/v1/reporting/overview` and displays fallback/live metrics for completion, decision speed, document quality, yield, and melt.

Required backend:

- Operational metric computation.
- Outcome metric computation.
- Benchmark dimensions by program, term, population, owner, source, region, student type, transfer status, and institution type.
- Explainable score reasons.
- Drill-down from metric to queue.

Primary endpoints:

- `GET /api/v1/reporting/overview`
- `GET /api/v1/reporting/operational`
- `GET /api/v1/reporting/outcomes`
- `GET /api/v1/reporting/benchmarks`
- `GET /api/v1/reporting/drilldown`

Done when leadership can identify where admissions execution is slowing down and which queue/action explains it.

## Phase 15: Graduate And Program Review Expansion

Frontend has generic decision packet and role/scope foundations, but no dedicated graduate workspace.

Required backend:

- Graduate workspace entities.
- Program queues.
- Department permissions and scoped review access.
- Faculty packet/rubric/committee status.
- Graduate-specific flags.

Primary endpoints:

- `GET /api/v1/graduate/program-queues`
- `GET /api/v1/graduate/applicants/{studentId}/packet`
- `POST /api/v1/graduate/applicants/{studentId}/rubric`
- `POST /api/v1/graduate/applicants/{studentId}/committee-recommendation`
- `GET /api/v1/graduate/departments/{departmentId}/permissions`

Done when graduate applicants can route to program-level faculty review with permissions and committee status.

## Phase 16: Packaging, GTM, And Customer Implementation

Docs already include a delivery plan, product functionality guide, training guide, day-in-the-life docs, and this phased checklist. Packaging is not yet formalized into a package/pricing/demo-script artifact.

Required product/docs:

- Package 1: crtfyStudent Operations.
- Package 2: crtfyStudent Decision Intelligence.
- Package 3: crtfyStudent Yield And Handoff.
- Package 4: crtfyStudent Platform.
- 30/60/90-day implementation plan by package.
- Training plan by role.
- Demo script by package.
- Pricing model assumptions by institution size, applicant volume, modules, integrations, and implementation complexity.

Recommended docs:

- `docs/packaging-gtm-implementation.md`
- `docs/demo-scripts-by-package.md`
- `docs/pricing-model-assumptions.md`

Done when package promise, go-live path, training, demo, and pricing assumptions are explicit.

