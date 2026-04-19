# crtfy Student Finish Plan

## Objective

Finish the application from **Command Center** through **Crtfy Integrations** with a clear delivery sequence and explicit ownership boundaries across:

- Frontend
- Backend API
- Database

This document is written to be executable. It is not a brainstorm. Each section includes:

- current state
- missing work
- frontend changes
- backend changes
- database changes
- backend Codex handoff notes

---

## Delivery Principles

- Keep auth and tenant context mandatory for every protected API call.
- Prefer one canonical student record shape across list, profile, queue, trust, and decision views.
- Treat transcript upload, parsing, trust, recommendation, and sync as separate stateful workflows.
- Ship vertical slices, not disconnected screens.
- Eliminate remaining seed/mock data page by page as live APIs become available.

---

## Current State Snapshot

### Already implemented

- Login gate with tenant-aware session handling
- Forced new-password flow
- In-session password change
- Tenant-aware authenticated request headers
- Async transcript upload flow:
  - start upload
  - poll status
  - fetch results
- Student 360 list uses live backend data
- Student 360 profile page can render live-shaped student records

### Still mostly prototype/mock

- Command Center
- Prospect Portal
- Decision Studio
- Workflows
- Trust Center
- Crtfy Integrations

---

## Master Checklist

### Platform / Cross-cutting

- [x] Auth gate and session persistence
- [x] Tenant-aware API headers
- [x] Async transcript upload
- [x] Student 360 list live data
- [ ] Global API client abstraction for authenticated tenant-aware fetches
- [ ] Standard loading / empty / error state components
- [ ] Toast or notification system for async actions
- [ ] Route guards for expired session / tenant authorization failures
- [ ] Audit-friendly frontend event tracking

### Command Center

- [ ] Replace mock dashboard cards with live metrics
- [ ] Replace mock funnel with live funnel data
- [ ] Replace mock routing mix with live routing data
- [ ] Replace mock activity feed with live events
- [ ] Replace mock outcome agents with live operational agent summaries

### Prospect Portal

- [ ] Decide whether this is internal preview only or student-facing production UI
- [ ] Build real transcript upload / fit preview flow for prospects
- [ ] Add real program-fit response rendering
- [ ] Add missing requirements / next-step payloads
- [ ] Add advisor CTA / handoff flow

### Student 360

- [x] List page uses live students endpoint
- [ ] Add backend search or debounced query search
- [ ] Add live profile hydration by id if list data is partial
- [ ] Add transcript detail provenance and status fields from backend
- [ ] Add refresh / refetch after upload completion and mutations

### Decision Studio

- [ ] Replace mock workbench with live decision queue / recommendations
- [ ] Add release / hold / request-info actions
- [ ] Add explainability payload rendering
- [ ] Add policy hit / rationale / confidence rendering
- [ ] Add downstream sync action state

### Workflows

- [ ] Replace mock queue with live workflow items
- [ ] Add filters, search, and pagination
- [ ] Add row click to detail or student context
- [ ] Add assignment / ownership actions
- [ ] Add queue status transitions

### Trust Center

- [ ] Replace mock trust cases with live trust cases
- [ ] Add evidence bundle rendering
- [ ] Add release-block / release-allowed indicators
- [ ] Add resolution actions and notes
- [ ] Add trust policy / rule metadata

### Crtfy Integrations

- [ ] Replace mock integration cards with live integration catalog / tenant connection states
- [ ] Add tenant-specific integration status
- [ ] Add sync direction, health, latency, last run, and error state
- [ ] Add connection detail page or modal
- [ ] Add connector event / sync history

---

## Recommended Plan of Attack

## Phase 1: Stabilize the shared platform

### Goal

Stop duplicating request logic and make every page ready for live data.

### Frontend

- Add a shared authenticated API helper:
  - attaches `Authorization: Bearer <access_token>`
  - attaches `X-Tenant-Id: <tenant_id>`
  - standardizes JSON parsing and error handling
- Add shared UI primitives for:
  - loading
  - empty state
  - recoverable error
  - retry action
- Add a central session-expired handler for `401`
- Add a tenant-authorization handler for `403`

### Backend

- Ensure all protected endpoints consistently return:
  - `401` for invalid/expired auth
  - `403` for tenant access denied
  - `detail` or `message` in JSON error payloads
- Align response shape conventions across all pages

### Database

- No major schema work required if auth/session tables already exist
- Confirm tenant ownership joins are indexed:
  - `user_id + tenant_id`
  - any tenant-scoped access-control table

### Backend Codex handoff

```md
Implement consistent protected API behavior across all tenant-scoped endpoints:

- Require access_token auth
- Require X-Tenant-Id header
- Validate the authenticated user can act in the supplied tenant
- Return:
  - 401 for invalid/expired auth
  - 403 for valid auth but invalid tenant access
  - JSON errors with `detail` or `message`

Do not accept tenant_id in request bodies for protected endpoints.
```

---

## Phase 2: Finish Command Center

### Goal

Turn the dashboard into a real operational landing page backed by live tenant metrics.

### Frontend changes

- Replace `dashboardStats` mock cards with API-backed summary metrics
- Replace `journeyFunnel` chart with backend funnel payload
- Replace `workloadByStage` pie with live workload routing summary
- Replace `outcomeAgents` panel with live agent/KPI summaries
- Replace `inboxFeed` with live operational events
- Add date range selection if backend supports time windows
- Add empty states when a tenant has low/no activity

### Backend changes

Create a dashboard endpoint set. Recommended options:

- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/funnel`
- `GET /api/v1/dashboard/routing-mix`
- `GET /api/v1/dashboard/activity`
- `GET /api/v1/dashboard/agents`

Or combine them into:

- `GET /api/v1/dashboard`

Recommended response sections:

- `stats`
- `funnel`
- `routing_mix`
- `agents`
- `activity`

### Database changes

Likely required:

- materialized views or aggregate tables for tenant metrics
- event table for operational activity feed
- workflow counts by state
- conversion funnel snapshots
- agent KPI rollups

Recommended tables/views:

- `tenant_dashboard_daily`
- `tenant_activity_events`
- `tenant_agent_metrics`
- `tenant_funnel_metrics`

### Backend Codex handoff

```md
Build live Command Center APIs for a tenant-scoped dashboard.

Need:
- summary metrics
- funnel data
- routing mix
- activity feed
- agent KPI summaries

Requirements:
- tenant-scoped via X-Tenant-Id
- auth via Bearer access_token
- return shapes that can directly replace the existing dashboard mock structures
- include enough timestamps and IDs for future drill-down
```

---

## Phase 3: Finish Student 360

### Goal

Make Student 360 fully live and resilient.

### Frontend changes

- Keep live list page
- Add debounced backend search:
  - `GET /api/v1/students?q=...`
- Add explicit student detail fetch by id if needed:
  - `GET /api/v1/students/{studentId}`
- Refetch list after transcript upload completion
- Add profile-level retry and not-found behavior
- Normalize nullable fields for:
  - `recommendation`
  - `transcripts`
  - `termGpa`
  - `checklist`
- Add pagination or infinite scroll if student volume grows

### Backend changes

- Keep `GET /api/v1/students`
- Add or confirm `GET /api/v1/students?q=...`
- Add `GET /api/v1/students/{studentId}`
- Ensure returned student shape fully supports:
  - card
  - profile
  - transcript modal

### Database changes

Likely required:

- student search indexes:
  - `tenant_id, name`
  - `tenant_id, advisor`
  - `tenant_id, institution_goal`
- transcript-to-student linkage
- recommendation snapshot storage
- GPA / academic trend storage or derivation

Recommended schema checks:

- `students`
- `student_transcripts`
- `student_recommendations`
- `student_checklist_items`
- `student_term_gpa`

### Backend Codex handoff

```md
Finish Student 360 APIs.

Need:
- GET /api/v1/students
- GET /api/v1/students?q=...
- GET /api/v1/students/{studentId}

Return a student shape that supports:
- list cards
- profile header
- recommendation section
- transcript lineage
- transcript course modal
- term GPA chart

All responses must be tenant-scoped and use:
- Authorization: Bearer <access_token>
- X-Tenant-Id: <tenant_id>
```

---

## Phase 4: Finish Prospect Portal

### Goal

Turn the current concept screen into a real pre-application experience.

### Frontend changes

- Build a real prospect transcript upload flow
- Add upload progress and polling states for prospects
- Render live fit results:
  - best-fit program
  - likely accepted credits
  - missing prerequisites
  - scholarship estimate if available
  - next step CTA
- Support advisor handoff / meeting CTA
- Add student-safe empty/error states

### Backend changes

Recommended endpoints:

- `POST /api/v1/prospects/transcripts/uploads`
- `GET /api/v1/prospects/transcripts/uploads/{transcriptId}/status`
- `GET /api/v1/prospects/transcripts/{transcriptId}/results`
- `GET /api/v1/prospects/{prospectId}/fit`
- `POST /api/v1/prospects/{prospectId}/next-step`

If this uses the same transcript infrastructure as Student 360, backend can share services and expose a prospect-facing orchestration layer.

### Database changes

Likely required:

- `prospects`
- `prospect_transcripts`
- `prospect_fit_results`
- `prospect_next_actions`
- CTA / microsite engagement events

### Backend Codex handoff

```md
Build the live Prospect Portal flow.

Need:
- transcript upload for a prospect/pre-app user
- polling and results retrieval
- program fit response
- next-step recommendation response

The response should support:
- best-fit program
- transfer estimate
- missing requirements
- next step CTA
- optional advisor handoff
```

---

## Phase 5: Finish Decision Studio

### Goal

Turn the static workbench into an actionable decisioning surface.

### Frontend changes

- Replace `decisionWorkbench` mock table with live decisions queue
- Add row selection and decision packet detail
- Show:
  - academic fit
  - trust evidence
  - transfer certainty
  - rationale
  - confidence
- Add actions:
  - release outcome
  - hold
  - request evidence
  - route to advisor
  - sync downstream
- Add optimistic/pending action states

### Backend changes

Recommended endpoints:

- `GET /api/v1/decisions`
- `GET /api/v1/decisions/{decisionId}`
- `POST /api/v1/decisions/{decisionId}/release`
- `POST /api/v1/decisions/{decisionId}/hold`
- `POST /api/v1/decisions/{decisionId}/request-evidence`
- `POST /api/v1/decisions/{decisionId}/sync`

### Database changes

Likely required:

- `decision_packets`
- `decision_reasons`
- `decision_policy_hits`
- `decision_actions`
- `decision_sync_jobs`

### Backend Codex handoff

```md
Implement Decision Studio APIs for decision packet review and actioning.

Need:
- list view
- detail view
- explainability payload
- action endpoints for release/hold/request-evidence/sync

All decision packets must be tenant-scoped and linked back to students and transcripts.
```

---

## Phase 6: Finish Workflows

### Goal

Make the workflow page the real exception queue and operations console.

### Frontend changes

- Replace `queueItems` mock data
- Add real filters:
  - priority
  - owner
  - status
  - integration-ready
- Add search
- Add pagination
- Add row click or action menu
- Add assignment / reassignment controls

### Backend changes

Recommended endpoints:

- `GET /api/v1/workflows`
- `GET /api/v1/workflows?q=...`
- `POST /api/v1/workflows/{workflowId}/assign`
- `POST /api/v1/workflows/{workflowId}/status`

### Database changes

Likely required:

- `workflow_items`
- `workflow_assignments`
- `workflow_status_history`
- `workflow_priority_rules`

Indexes:

- `tenant_id + status`
- `tenant_id + owner`
- `tenant_id + priority`

### Backend Codex handoff

```md
Build the Workflows queue as a tenant-scoped operational worklist.

Need:
- list API
- filtering
- search
- assignment
- status updates
- enough metadata to support row detail and future SLA reporting
```

---

## Phase 7: Finish Trust Center

### Goal

Make trust review a real product surface instead of a mock feed.

### Frontend changes

- Replace `trustCases` mock data
- Add trust case detail view or modal
- Render:
  - severity
  - signal type
  - evidence bundle
  - release block state
  - reviewer notes
- Add actions:
  - clear
  - escalate
  - request official document
  - maintain hold

### Backend changes

Recommended endpoints:

- `GET /api/v1/trust/cases`
- `GET /api/v1/trust/cases/{caseId}`
- `POST /api/v1/trust/cases/{caseId}/clear`
- `POST /api/v1/trust/cases/{caseId}/hold`
- `POST /api/v1/trust/cases/{caseId}/request-official`

### Database changes

Likely required:

- `trust_cases`
- `trust_case_evidence`
- `trust_case_actions`
- `trust_signals`
- `trust_policies`

### Backend Codex handoff

```md
Implement Trust Center APIs for live trust review.

Need:
- tenant-scoped trust case list
- trust case detail with evidence
- action endpoints for clear/hold/request-official/escalate
- release-block status tied back to decision and transcript entities
```

---

## Phase 8: Finish Crtfy Integrations

### Goal

Make integrations tenant-aware, operational, and observable.

### Frontend changes

- Replace `connectorCards` mock data
- Show actual tenant integration state:
  - connected
  - disconnected
  - error
  - syncing
- Add last sync, latency, direction, and coverage
- Add integration detail panel/modal
- Add sync history and recent failures

### Backend changes

Recommended endpoints:

- `GET /api/v1/integrations`
- `GET /api/v1/integrations/{integrationId}`
- `GET /api/v1/integrations/{integrationId}/runs`
- `POST /api/v1/integrations/{integrationId}/sync`
- `POST /api/v1/integrations/{integrationId}/disconnect`

### Database changes

Likely required:

- `tenant_integrations`
- `integration_runs`
- `integration_run_errors`
- `integration_capabilities`
- credentials or secrets should live in a secure secret store, not the app DB when possible

### Backend Codex handoff

```md
Build tenant-scoped Crtfy Integrations APIs.

Need:
- integration catalog for a tenant
- connection state
- sync/run history
- manual sync trigger
- error visibility

Return enough data to replace the current integration mock cards and support detail drill-down.
```

---

## Suggested Execution Order

1. Platform cleanup / shared API client
2. Command Center
3. Student 360 completion
4. Decision Studio
5. Workflows
6. Trust Center
7. Crtfy Integrations
8. Prospect Portal

### Why this order

- Command Center depends on cross-domain metrics and validates tenant-scoped analytics early.
- Student 360 is already partially live and becomes the canonical record surface.
- Decision Studio, Workflows, and Trust Center all depend on the same student/transcript/decision entities.
- Integrations should be built once sync jobs and decision payloads are real.
- Prospect Portal can move later if internal operator workflows are the near-term priority. If GTM priority changes, move Prospect Portal up immediately after Student 360.

---

## Definition of Done by Surface

## Command Center done when

- all cards and charts use live APIs
- no mock dashboard data remains
- activity feed is tenant-scoped and time-ordered

## Student 360 done when

- list and profile use live records only
- upload completion updates the student list and profile correctly
- profile survives refresh and direct-link load

## Decision Studio done when

- every row is a real decision packet
- actions mutate real backend state
- rationale/explainability are rendered from backend payloads

## Workflows done when

- queue is live
- operators can filter, assign, and change status

## Trust Center done when

- cases are live
- evidence is visible
- trust actions update release state

## Integrations done when

- tenant sees only their integrations
- sync health/run history is live
- integration cards are no longer mock data

---

## Remaining Frontend Cleanup After Feature Completion

- [ ] Remove unused mock data exports from `src/data/mockData.js`
- [ ] Move all live fetch logic to a shared API module
- [ ] Add typed response normalization if the project moves to TypeScript
- [ ] Add route-level tests for auth + tenant failures
- [ ] Add visual regression passes for loading/error states

---

## Notes for Backend / DB Coordination

- Every new endpoint should be tenant-scoped from day one.
- Prefer backend response shapes that directly match the current UI model.
- Avoid forcing frontend joins across separate endpoints for one visible panel when a composed backend response is more stable.
- Every write endpoint should return enough updated state to refresh the relevant page without a blind full reload when practical.

---

## Immediate Next Ticket Recommendation

Start with **Command Center live data**.

It is the highest-value planning anchor for the rest of the app because it forces agreement on:

- tenant-scoped metrics
- event model
- workflow states
- agent KPIs
- funnel definitions

Once that contract is stable, the same backend entities will power Student 360, Decision Studio, Workflows, Trust Center, and Integrations.
