# crtfy Student Product Functionality

Last updated: 2026-05-05

## Product Summary

crtfy Student is an admissions operating system for transcript-led enrollment workflows. It helps admissions, operations, evaluators, trust analysts, directors, and integration teams move students from prospect intake through transcript processing, readiness review, decision packet approval, yield, melt prevention, and downstream handoff.

The product combines:

- A tenant-scoped authenticated workspace.
- Student 360 records.
- Transcript upload and document processing.
- Work queues for incomplete, review-ready, exception, trust, yield, and melt stages.
- Agent-backed document, trust, decision, and orchestration workflows.
- Decision packet generation and review.
- Trust case management.
- Work projection and admin operations.
- Reporting and integration planning surfaces.

## Core Platform Capabilities

### Authentication And Tenant Context

The product supports tenant-scoped sign-in through backend auth endpoints.

Capabilities:

- Sign in with username/password.
- Complete required new-password challenge.
- Persist authenticated session locally.
- Load current user profile from `/api/v1/me`.
- Attach `Authorization: Bearer <access_token>` and `X-Tenant-Id: <tenant_id>` to protected API calls.
- Retry protected API calls once on `401`.
- Change password from the user menu.
- Sign out and clear local auth state.

User context includes:

- Tenant identity.
- Display name and email.
- Roles.
- Permissions.
- Sensitivity tiers.
- Scope boundaries.
- Record exceptions.

### Role, Permission, And Sensitivity Gating

Every major screen is protected by role, permission, or sensitivity requirements. The UI hides navigation and blocks routes when the current user lacks access.

Supported role keys:

- `admissions_counselor`
- `admissions_processor`
- `reviewer_evaluator`
- `decision_releaser_director`
- `trust_analyst`
- `registrar_transfer_specialist`
- `financial_aid`
- `read_only_leadership`
- `integration_service`

Supported access patterns:

- Role-based access.
- Permission-based access.
- Sensitivity-tier access, including academic and trust/fraud-sensitive data.
- Scope-aware user profile display.

### Global Shell

The authenticated app shell provides:

- Sidebar navigation based on current user access.
- Breadcrumb reflecting the current workspace.
- Global search box that applies `q` query parameters to searchable areas.
- Global transcript upload button.
- Upload progress modal.
- Background batch upload status chip.
- Notifications icon placeholder.
- User menu with profile, password change, and sign out.

Searchable routes:

- Today's Work
- Prospect Portal
- Student 360
- Documents Queue
- Exceptions Queue

## Transcript And Document Processing

### Global Transcript Upload

Users can upload transcript files from the top bar.

Supported behavior:

- Upload one transcript file.
- Upload ZIP/batch transcript packages.
- Send multipart form data to `/api/v1/transcripts/uploads`.
- Pass `document_type=auto`.
- Pass `use_bedrock=true`.
- Poll single transcript status at `/api/v1/transcripts/uploads/{transcriptId}/status`.
- Poll batch status at `/api/v1/transcripts/uploads/batches/{batchId}/status`.
- Fetch parsed results from `/api/v1/transcripts/{transcriptId}/results`.
- Show upload, processing, completed, and failed states.
- Show per-file batch progress.
- Keep batch processing visible in the shell while users continue working.
- Navigate to a student profile after a successful single-file upload when a student is resolved.
- Refresh students after batch completion.

Transcript result handling:

- Validates that a student can be resolved.
- Validates that extracted courses exist.
- Maps parsed demographics, GPA, institution, credits, courses, metadata, confidence, and audit timeline into student-facing transcript data.
- Marks fraudulent or trust-flagged uploads as trust holds.
- Builds local fallback student records when needed.

### Documents Queue

The Documents Queue is the operational surface for transcript and admissions-document processing.

Views:

- Received not indexed
- Auto-matched
- Needs human review
- Processing failed
- Duplicate uploads
- Quarantined

Capabilities:

- Load enriched document exceptions from `/api/v1/documents/exceptions`.
- Fall back to `/api/v1/documents/queue` if enriched exceptions are unavailable.
- Search by document type, student, source, or status.
- See document metrics for documents in view, trust flagged documents, and needs-human-review documents.
- Inspect document type, matched student, confidence, source, received date, document status, transcript status, latest run status, reason, and suggested action.
- Open matched student records.
- Confirm document match.
- Reject document match.
- Index document.
- Quarantine document.
- Release quarantined document.
- Reprocess the stored original file.
- Replace file bytes and reprocess.
- Poll agent run and transcript persistence together.
- Treat reprocessing as successful only when the agent run and transcript status are both completed.
- Treat reprocessing as failed if either the agent run or transcript status fails.
- View exception details and document run details.

Document action endpoints:

- `POST /api/v1/documents/{documentId}/confirm-match`
- `POST /api/v1/documents/{documentId}/reject-match`
- `POST /api/v1/documents/{documentId}/index`
- `POST /api/v1/documents/{documentId}/quarantine`
- `POST /api/v1/documents/{documentId}/release`
- `POST /api/v1/documents/{documentId}/reprocess`
- `POST /api/v1/documents/{documentId}/reprocess-upload`

Document detail endpoints:

- `GET /api/v1/documents/{documentId}/exception-summary`
- `GET /api/v1/documents/{documentId}/run-details`
- `GET /api/v1/agent-runs/{agentRunId}`
- `GET /api/v1/agent-runs/{agentRunId}/actions`
- `GET /api/v1/transcripts/uploads/{transcriptId}/status`

Document-agent action history:

- Shows normalized action result message/code when available.
- Shows action tool name.
- Shows action status.
- Handles `completed`, `failed`, and `skipped`.
- Treats skipped context/linking steps as neutral optional steps when the run and transcript persistence completed.

Useful document result codes:

- `transcript_processed`
- `transcript_parsed`
- `transcript_persisted`
- `student_context_loaded`
- `checklist_item_linked`
- `student_context_unavailable`
- `document_context_unavailable`
- `document_processing_failed`

Useful document action tool names:

- `parse_transcript`
- `complete_processing_upload`
- `lookup_student_context`
- `link_transcript_checklist_item`
- `fail_processing_upload`

## Today's Work

Today's Work is the primary daily operating queue. It prioritizes the students and work items that staff can move now.

Data sources:

- Preferred live list: `GET /api/v1/work/today?limit=100`
- Preferred live board: `GET /api/v1/work/today/board?limit=100`
- Fallback live work summary/items:
  - `GET /api/v1/work/summary`
  - `GET /api/v1/work/items`
- Local derived fallback from student records.

Capabilities:

- View summary cards for needs attention, close to completion, ready for decision, and exceptions.
- View blocker mix chart.
- View work funnel chart.
- View priority mix chart.
- Use backend-grouped queue buckets when available.
- Fall back to local sections when board groups are unavailable.
- Search the attention section.
- Open student profile.
- Open decision queue.
- Clear the top checklist blocker.
- Get backend route recommendation for a student.
- Route a student to document, trust, or decision ownership.
- Add optional routing notes.
- Use route recommendation directly.
- Run a persisted orchestration for today's work.
- Load latest persisted orchestration.
- Show orchestrator run ID and result code.
- Use bucket-level route hints.
- Route a whole bucket using `groups[n].routeHint`.

Orchestrator endpoints:

- `GET /api/v1/work/today`
- `GET /api/v1/work/today/board`
- `GET /api/v1/work/today/{studentId}/recommendation`
- `POST /api/v1/work/today/orchestrate`
- `GET /api/v1/work/today/orchestrations/latest`
- `POST /api/v1/work/today/{studentId}/route`

Routing destinations:

- `document_agent`
- `trust_agent`
- `decision_agent`

Work item fields surfaced:

- Student name and ID.
- Population.
- Program.
- Institution goal.
- Readiness.
- Priority.
- Reason to act.
- Suggested action.
- Owner.
- Last activity.
- Current owner agent.
- Current stage.
- Recommended agent.
- Queue group.
- Priority score.
- Blocking items.
- Document agent result code.
- Trust agent result code.
- Decision agent result code.

## Student 360

Student 360 is the system of record view for individual applicants and prospects.

Students list capabilities:

- Load students from `/api/v1/students`.
- Search students with `q`.
- Filter by all, ready, needs review, trust hold, admitted, and melt risk.
- Show student cards with program, stage, risk, tags, fit score, deposit likelihood, last activity, and next best action.
- Open student profile.

Student profile capabilities:

- View demographic and contact summary.
- View program, institution goal, stage, risk, advisor, city, GPA, accepted credits, transcript count, fit score, deposit likelihood, and last activity.
- View tags and summary narrative.
- View checklist/progress items.
- Load live checklist from `/api/v1/students/{studentId}/checklist`.
- Optimistically update checklist items through `/api/v1/students/{studentId}/checklist/items/{itemId}/status`.
- Load readiness from `/api/v1/students/{studentId}/readiness`.
- View transcripts.
- View transcript timeline/audit details.
- View decision/recommendation posture.
- View trust posture behind sensitivity gates.
- View yield/deposit and handoff panels.
- Release decision action placeholder for authorized users.

Student profile tabs:

- Overview
- Documents
- Decisions
- Trust
- Yield / Deposit
- Handoff

## Prospect Portal

Prospect Portal is a transcript-led front door concept for pre-application engagement.

Capabilities:

- Position crtfy Student as a value-first prospect experience.
- Explain transcript-led conversion before application start.
- Show prospect-facing experience modules.
- Describe how a transcript can drive program fit, estimated path, transfer value, and next best action.
- Support the product narrative for replacing static inquiry forms with useful, personalized admissions guidance.

## Incomplete Applications

Incomplete Applications is an operational queue for started applications, missing items, and students closest to complete.

Capabilities:

- Load incomplete queue data where live endpoints exist.
- Derive fallback queue from student records.
- Show missing items and completion state.
- Highlight nearly complete students.
- Surface blockers.
- Open student records.
- Clear checklist blockers when authorized.
- Prioritize students closest to completion.

## Ready For Review

Ready for Review tracks files complete enough to move into evaluator or decision review.

Capabilities:

- Load review-ready data where live endpoints exist.
- Derive fallback queue from student records.
- Show students operationally ready for review.
- Highlight review SLA or days waiting.
- Show transfer/review context.
- Open student records.
- Route users toward Decision Studio.

## Decision Studio

Decision Studio is where staff create, inspect, approve, and defend decision packets.

List capabilities:

- Load decision queue records.
- Filter and search decision packets.
- Show student, program, status, readiness, assignment, recommendation, and updated time.
- Open decision packet details.
- Generate recommendations from the list when available.

Detail capabilities:

- Load decision details.
- Load decision snapshot from `/api/v1/decisions/{decisionId}/snapshot`.
- Load decision agent details from `/api/v1/decisions/{decisionId}/agent-details`.
- Generate decision recommendation with `POST /api/v1/decisions/{decisionId}/recommendation`.
- Review decision recommendation with `POST /api/v1/decisions/{decisionId}/review`.
- Accept recommendation.
- Request more evidence.
- Store and display snapshot version.
- Show recommendation fit, credit estimate, and rationale.
- Show latest decision-agent run result.
- Show decision-agent artifacts.
- Show last reviewed snapshot.
- Show action history for decision context assembly and recommendation generation.
- Manage review note text.
- Manage assignment, notes, status, and timeline through existing decision packet endpoints.

Decision review actions:

- `accept_recommendation`
- `request_evidence`

Decision result codes:

- `decision_context_assembled`
- `decision_recommendation_generated`

## Trust Center

Trust Center is the trust and provenance workflow for documents, identity, and release-blocking signals.

Queue capabilities:

- Load trust cases from `/api/v1/trust/cases`.
- Show active trust case count.
- Show student, severity/risk level, signal, evidence/rationale, status, trust blocked state, latest run status, latest result code, owner, and recommended action.
- Select a case for details.
- Use backend-provided `summary.riskLevel`, `summary.summary`, `summary.rationale`, and `summary.recommendedAction`.

Details capabilities:

- Load case details from `/api/v1/trust/transcripts/{transcriptId}/details`.
- Show student, student ID, document, owner, opened date, and recommended action.
- Show latest trust-agent run outcome.
- Show risk level, trust summary, rationale, result code, trust blocked state, and trigger event.
- Add action notes.
- Assign case to a user ID.
- Block a trust case.
- Unblock a trust case.
- Escalate a trust case.
- Resolve a trust case.
- Show success and error states.
- Show step history from normalized action results.

Trust action endpoints:

- `POST /api/v1/trust/transcripts/{transcriptId}/block`
- `POST /api/v1/trust/transcripts/{transcriptId}/unblock`
- `POST /api/v1/trust/transcripts/{transcriptId}/assign`
- `POST /api/v1/trust/transcripts/{transcriptId}/resolve`
- `POST /api/v1/trust/transcripts/{transcriptId}/escalate`

Trust result codes:

- `trust_case_blocked`
- `trust_case_unblocked`
- `trust_document_quarantined`
- `trust_document_released`
- `trust_case_assigned`
- `trust_case_resolved`
- `trust_case_escalated`
- `document_match_confirmed`
- `document_match_rejected`

## Exceptions Queue

Exceptions Queue focuses on trust holds, pending evidence, and review blockers that stop students from moving forward.

Capabilities:

- Derive exception items from student/work state.
- Load active trust case feed from `/api/v1/trust/cases`.
- Separate trust-blocked students from other exception items.
- Show blocker/reason text.
- Show active trust cases when the trust service is available.
- Open related student records.

## Admitted / Yield

Admitted / Yield focuses on admitted students with conversion potential.

Capabilities:

- Load or derive admitted/yield candidates.
- Show strongest conversion opportunities.
- Surface deposit status, yield score, milestone completion, owner, last activity, program, and next step.
- Open student profiles.
- Help counselors prioritize admitted students who need the next intervention.

## Deposit / Melt

Deposit / Melt focuses on students at risk between deposit intent and actual enrollment.

Capabilities:

- Load or derive deposit/melt candidates.
- Surface melt risk.
- Show missing milestones.
- Show owner, deposit date, last outreach, and program.
- Open student profiles.
- Help staff prioritize interventions after deposit.

## Reporting

Reporting provides operational and leadership metrics.

Capabilities:

- Show completion, decision speed, yield, and melt metrics.
- Visualize queue and funnel patterns.
- Surface operational performance summaries.
- Support leadership/read-only dashboards through `view_dashboards`.

## Integrations

The Integrations page describes and organizes external system fit.

Capabilities:

- Show how crtfy Student plugs into existing school systems.
- Position the product as the decision layer on top of CRMs, SIS systems, document stores, communications tools, and reporting systems.
- Support integration planning for systems such as CRM, SIS, document management, transcript sources, messaging, and downstream handoff.

## Admin

Admin supports tenant, access, and operational maintenance.

User and access capabilities:

- View tenant users.
- Manage roles.
- Manage permissions.
- Manage access tiers.
- Manage scope boundaries.
- Support admin-enabled accounts.

Work projection capabilities:

- View projection readiness for `student_work_state`.
- Load projection status from `/api/v1/work/projection/status`.
- Rebuild one projection chunk.
- Rebuild full projection.
- List projection jobs.
- View one projection job.
- Retry a projection job.
- Cancel a projection job.
- Show projected students, total students, remaining students, readiness, last projected time, cursor, current job status, and job errors.
- Show recent projection history.

Projection endpoints:

- `GET /api/v1/work/projection/status`
- `POST /api/v1/work/projection/rebuild`
- `POST /api/v1/work/projection/rebuild-all`
- `GET /api/v1/work/projection/jobs`
- `GET /api/v1/work/projection/jobs/{jobId}`
- `POST /api/v1/work/projection/jobs/{jobId}/retry`
- `POST /api/v1/work/projection/jobs/{jobId}/cancel`

Projection job statuses:

- `queued`
- `running`
- `completed`
- `failed`
- `canceled`

## User Profile

The User Profile page shows the current user's admissions workspace identity.

Capabilities:

- View display name, email, tenant, tenant slug, and tenant ID.
- View roles.
- View permissions.
- View sensitivity tiers.
- View scopes.
- View record exceptions.
- Confirm what screens and data the user can access.

## Access Matrix

| Area | Primary permissions or roles |
| --- | --- |
| Today's Work | `view_dashboards` or `view_student_360` |
| Prospect Portal | `view_dashboards` or `view_student_360` |
| Student 360 | `view_student_360` |
| Student Profile | `view_student_360` |
| Incomplete Applications | `view_student_360` |
| Documents Queue | `view_sensitive_docs`, `manage_trust_cases`, or `view_student_360` |
| Ready for Review | `view_decision_packet` or `view_student_360` with `academic_record` sensitivity |
| Decision Studio | `view_decision_packet` or `release_decision` |
| Trust Center | `manage_trust_cases` or `view_trust_flags` |
| Exceptions Queue | `manage_trust_cases` or `view_trust_flags` |
| Admitted / Yield | `view_student_360` or `view_dashboards` |
| Deposit / Melt | `view_student_360` or `view_dashboards` |
| Integrations | `manage_integrations` |
| Reporting | `view_dashboards` |
| Admin | `admin_users_view`, `manage_integrations`, or `release_decision` |
| User Profile | Any recognized workspace role |

## Live API And Fallback Behavior

The frontend is designed to work progressively as backend surfaces come online.

Live-first behavior:

- Uses tenant-authenticated endpoints when available.
- Normalizes wrapped list responses and raw array responses.
- Uses enriched backend read models where available.
- Polls long-running transcript, document, and projection jobs.

Fallback behavior:

- Students can drive derived queues when live work endpoints are unavailable.
- Today's Work can derive work from student records.
- Incomplete, review-ready, yield, and melt surfaces can derive items from student data.
- Checklist updates use optimistic UI and can fall back locally when backend checklist service is unavailable.
- Documents Queue falls back from enriched document exceptions to the base documents queue.

## Agent Surfaces

### Document Agent

Responsibilities:

- Parse transcript.
- Persist transcript processing results.
- Lookup student context.
- Link transcript checklist items.
- Mark processing failure.
- Return normalized run and action results.

Frontend usage:

- Reprocess stored documents.
- Reprocess replacement uploads.
- Poll run status.
- Poll transcript status.
- Inspect action history.
- Render result codes and messages.

### Trust Agent

Responsibilities:

- Manage trust flags.
- Provide trust case context.
- Create, assign, escalate, resolve, block, and unblock trust cases.
- Track trust run and action outcomes.
- Provide explainable trust summary fields.

Frontend usage:

- Trust queue rows.
- Trust details panel.
- Trust action workflow.
- Step history.

### Decision Agent

Responsibilities:

- Assemble decision context.
- Generate recommendation.
- Return fit, credit estimate, rationale, evidence, trust signals, metrics, and artifacts.
- Persist review snapshots.

Frontend usage:

- Decision recommendation drawer/panel.
- Decision packet snapshot.
- Accept recommendation.
- Request more evidence.
- Show last reviewed snapshot.

### Orchestrator Agent

Responsibilities:

- Prioritize today's work.
- Group work into backend-owned buckets.
- Recommend route hints at bucket and student level.
- Persist orchestration runs.
- Provide latest orchestration snapshot.

Frontend usage:

- Today's Work board.
- Orchestrate work action.
- Latest orchestration reload.
- Bucket route controls.
- Student route controls.

## Primary User Workflows

### Counselor Daily Workflow

1. Open Today's Work.
2. Review priority groups and blockers.
3. Clear checklist blockers where possible.
4. Open Student 360 records for context.
5. Upload transcripts as needed.
6. Route students to document, trust, or decision ownership.
7. Work admitted/yield and melt queues for conversion follow-up.

### Document Operations Workflow

1. Open Documents Queue.
2. Filter to processing failed, needs human review, or quarantined.
3. Inspect enriched exception reason and suggested action.
4. Confirm or reject matches.
5. Reprocess stored file or replace the file.
6. Poll agent/transcript status.
7. Inspect run details and action history.
8. Index, quarantine, or release documents.

### Trust Analyst Workflow

1. Open Trust Center.
2. Review risk level, summary, rationale, and recommended action.
3. Inspect latest trust-agent outcome.
4. Review action history.
5. Block or unblock progression.
6. Assign, escalate, or resolve the trust case.
7. Confirm exception and trust queues update.

### Evaluator Or Director Workflow

1. Open Ready for Review or Decision Studio.
2. Open decision packet details.
3. Load or generate a decision recommendation.
4. Review evidence, trust posture, fit, credits, and rationale.
5. Accept recommendation or request more evidence.
6. Reference snapshot version for auditability.
7. Release or manage downstream decision state where authorized.

### Administrator Workflow

1. Open Admin.
2. Review users, roles, permissions, tiers, and scopes.
3. Check work projection readiness.
4. Rebuild projection chunks or full projection.
5. Review projection jobs.
6. Retry failed jobs.
7. Cancel running or queued projection jobs.
8. Use integrations and reporting surfaces for operational readiness.

## Current Product Boundaries

The product currently includes both live-integrated functionality and planned/positioning surfaces.

Live-integrated areas include:

- Authentication.
- Tenant user context.
- Student list.
- Transcript upload and polling.
- Checklist load/update.
- Readiness load.
- Documents Queue and document-agent reprocess polling.
- Decision recommendation and review endpoints.
- Trust Center queue/details/actions.
- Today's Work orchestration, routing, and live board.
- Work projection admin operations.

Conceptual or partially mocked/derived areas include:

- Prospect Portal experience.
- Some queue fallback calculations.
- Yield and melt queue derivations when live endpoints are absent.
- Reporting metrics when live reporting endpoints are incomplete.
- Integration planning content.

## Related Documents

- [Frontend Agent Integration](FRONTEND_AGENT_INTEGRATION.md)
- [Backend API Build Spec](backend-api-build-spec.md)
- [Backend Delivery Spec](backend-delivery-spec.md)
- [Backend Handoff - Today's Work](backend-handoff-todays-work.md)
- [Admissions Implementation Plan](admissions-implementation-plan.md)
- [Admissions Workflow Gap Analysis](admissions-workflow-gap-analysis.md)
