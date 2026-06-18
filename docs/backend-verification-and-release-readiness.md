# Backend Verification And Release Readiness

Last updated: 2026-06-04

## Purpose

Use this runbook after backend says Phases 1-16 are implemented. Do not mark the backend checklist items complete until these checks pass against a seeded tenant.

## Required Test Tenant

Seed one tenant with:

- One manual inquiry.
- One transcript-first prospect.
- One incomplete applicant with multiple missing checklist items.
- One one-item-away applicant.
- One received transcript needing review.
- One ready-for-review applicant.
- One ready-for-decision applicant.
- One trust-blocked applicant.
- One duplicate-candidate record.
- One admitted student with yield risk.
- One deposited student with missing milestones.
- One handoff/sync-error case.
- At least two owners/counselors.
- At least one user per major role.

## Environment Checks

- [ ] Deployed frontend `VITE_API_URL` points to the intended backend.
- [ ] `/api/v1/me` returns current user, tenant, roles, permissions, scopes, and sensitivity tiers.
- [ ] Every protected request includes `Authorization` and `X-Tenant-Id`.
- [ ] Invalid auth returns `401`.
- [ ] Valid auth without tenant/permission returns `403`.
- [ ] Missing scoped records return `404`.
- [ ] Invalid writes return `422`.

## Smoke Test Order

### 1. Auth And Access

- [ ] Sign in as admissions counselor.
- [ ] Confirm Today's Work, Student 360, Incomplete, Prospect Portal, and Yield are accessible.
- [ ] Sign in as trust analyst.
- [ ] Confirm Trust Center is accessible and non-trust users are denied or redacted.
- [ ] Sign in as read-only leadership.
- [ ] Confirm reporting/dashboard access and no write actions.

### 2. Admissions CRM Core

- [ ] `GET /api/v1/students` loads student cards without mock fallback.
- [ ] Search by name, email, student ID, source, program, and stage.
- [ ] `GET /api/v1/students/{studentId}` loads direct Student 360.
- [ ] Student 360 shows stage, source, owner, population, program, term, next action, and timeline.
- [ ] Owner/stage changes create audit and timeline events.

### 3. Prospect Portal

- [ ] Create a manual inquiry.
- [ ] Create a transcript-first prospect.
- [ ] Confirm source attribution persists.
- [ ] Confirm prospect appears in Student 360.
- [ ] Confirm prospect appears in Today's Work when action is required.
- [ ] Convert prospect to applicant without duplicate creation.

### 4. Checklist And Readiness

- [ ] Checklist templates exist by population/program/term.
- [ ] Student checklist persists.
- [ ] Completing an item updates completion percent.
- [ ] Completing an item updates one-item-away.
- [ ] Completing an item updates readiness.
- [ ] Checklist writes create audit/timeline events.

### 5. Today's Work

- [ ] `GET /api/v1/work/today` loads quickly.
- [ ] `GET /api/v1/work/today/board` loads grouped buckets.
- [ ] `GET /api/v1/work/summary` returns counts.
- [ ] Route recommendation returns a reason.
- [ ] Route action changes owner/queue and creates audit/timeline events.
- [ ] One-click interaction logging creates interaction history.

### 6. Documents And Transcript Intelligence

- [ ] Upload a single transcript.
- [ ] Upload a ZIP/batch transcript package.
- [ ] Confirm processing status polling completes.
- [ ] Document queue shows received, needs-review, failed, duplicate, quarantined, and trust-flagged examples.
- [ ] Link a document to a checklist item.
- [ ] Auto-complete high-confidence checklist item.
- [ ] Route low-confidence match to human review.
- [ ] Reprocess stored file.
- [ ] Replace bad file and rerun processing.
- [ ] Confirm success requires both agent run success and transcript persistence success.

### 7. Trust And Duplicate

- [ ] Duplicate candidate list loads.
- [ ] Duplicate detail shows match confidence and reasons.
- [ ] Merge preserves source references and audit history.
- [ ] Trust case list loads.
- [ ] Trust detail shows evidence and release block state.
- [ ] Block/unblock/resolve/escalate/assign actions create audit/timeline events.
- [ ] Decision release is blocked while active trust block exists.

### 8. Transfer And Academic Evidence

- [ ] Student 360 shows transfer evidence summary.
- [ ] Decision packet shows credit estimate, parser confidence, transcript evidence, and source provenance.
- [ ] Articulation gap routes to transfer specialist queue.
- [ ] Transfer value appears in yield/counselor prioritization where applicable.

### 9. Decisions

- [ ] Ready for Review queue loads.
- [ ] Decision list loads.
- [ ] Decision packet detail loads.
- [ ] Generate recommendation.
- [ ] Accept recommendation.
- [ ] Request more evidence.
- [ ] Hold/reopen/release outcome.
- [ ] Release gates block invalid releases.
- [ ] Final decision creates audit/timeline events.

### 10. Yield, Melt, And Handoff

- [ ] Yield queue loads with score, reason, owner, program, and next step.
- [ ] Log yield intervention and next follow-up.
- [ ] Deposit event updates Student 360.
- [ ] Melt queue loads missing milestones.
- [ ] Update milestone status.
- [ ] Handoff package loads.
- [ ] Sync error queue loads.
- [ ] Retry and acknowledge sync errors.

### 11. Integrations, Reporting, Admin

- [ ] Connectors load from `GET /api/v1/connectors`, not fallback.
- [ ] Connector detail and mapping load.
- [ ] Connector test returns validation result.
- [ ] Sync runs and errors are visible.
- [ ] Reporting overview loads live metrics.
- [ ] Operational/outcome/benchmark endpoints load.
- [ ] Drilldown opens underlying queue.
- [ ] Admin users, roles, sensitivity tiers, scopes, and work projection jobs load.

## Performance Gates

- [ ] Today's Work first useful content under 2 seconds for seeded tenant.
- [ ] Student 360 direct load under 2 seconds.
- [ ] Work board/grouping must not block primary queue render.
- [ ] Search requests are debounced and backend queries are indexed.
- [ ] Large list endpoints use pagination.

## Release Gates

- [ ] `npm run build` passes.
- [ ] No screen depends on fallback data in the seeded tenant.
- [ ] All write paths create audit events.
- [ ] All student-facing writes create timeline events.
- [ ] Permissions and sensitivity redaction verified by role.
- [ ] Backend migrations and seed scripts are repeatable.
- [ ] Deployment environment variables are confirmed.
- [ ] Rollback plan exists.

