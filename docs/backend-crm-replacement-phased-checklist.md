# Backend CRM Replacement Phased Checklist

Last updated: 2026-06-21

## Purpose

This backend checklist mirrors `docs/crm-replacement-phased-checklist.md` and translates the product phases into backend deliverables: data models, APIs, jobs, integrations, audit events, and reporting aggregations.

Execution will move faster than the roadmap dates. Treat phases as sequencing and dependency order, not fixed timeline.

Status key:

- `[x]` Implemented and verified.
- `[~]` Partially implemented, deployed, or frontend-compatible but needs hardening.
- `[ ]` Not implemented or not verified.

---

## Backend Principles

- [ ] Every endpoint is tenant-scoped.
- [ ] Every protected endpoint enforces auth.
- [ ] Every endpoint rejects cross-tenant entity access.
- [ ] Every write action creates an audit event.
- [ ] Every operational action can appear in Student 360 timeline.
- [ ] Every blocker can appear in Today's Work.
- [ ] Every stage, owner, checklist, document, trust, communication, handoff, review, and milestone change is reportable.
- [ ] Backend returns `401` for expired/invalid token so frontend routes to login.
- [ ] Backend returns consistent JSON errors using `detail` or `message`.

---

## Phase 0: Company, IP, And Partner Foundation

Goal: prepare backend ownership, tenant, partner, and reseller metadata for enterprise/partner scale.

### Tenant / Partner Metadata

- [ ] Add tenant legal owner fields.
- [ ] Add reseller/channel attribution fields.
- [ ] Add partner mode flag.
- [ ] Add external partner account IDs.
- [ ] Add white-label configuration ownership metadata.
- [ ] Add data processing agreement / contract metadata fields.

### Audit / Compliance Foundation

- [ ] Add audit event table if not already durable.
- [ ] Add actor, tenant, entity type, entity ID, action, before/after, timestamp, request ID.
- [ ] Add correlation ID support.
- [ ] Add API request log for partner endpoints.
- [ ] Add audit export endpoint.

Suggested endpoints:

```http
GET /api/v1/audit/events
GET /api/v1/audit/events/export
```

---

## Phase 1: Core Admissions CRM Replacement

Goal: persist the core admissions CRM experience.

### 1. Admissions Pipeline

Add or verify canonical stage support:

- [ ] Inquiry.
- [ ] Prospect.
- [ ] Applicant.
- [ ] Incomplete.
- [ ] Complete.
- [ ] Ready for Review.
- [ ] Decisioned.
- [ ] Admitted.
- [ ] Deposited/Committed.
- [ ] Registered.
- [ ] Denied.
- [ ] Waitlisted.
- [ ] Deferred.
- [ ] Withdrawn.
- [ ] Cancelled.
- [ ] Inactive.
- [ ] Admitted with condition.

Backend tasks:

- [ ] Add lifecycle stage enum/config table.
- [ ] Add stage transition validation.
- [ ] Add stage history table.
- [ ] Add stage transition audit events.
- [ ] Update student list filters.
- [ ] Update funnel reporting.
- [ ] Update Today's Work bucket generation.

Suggested endpoints:

```http
POST /api/v1/students/{studentId}/stage
GET /api/v1/students/{studentId}/stage-history
```

### 2. Student 360 Backend Contract

Expand `GET /api/v1/students/{studentId}` to return:

- [ ] Profile fields.
- [ ] Application fields.
- [ ] Program/degree.
- [ ] Owner.
- [ ] Source.
- [ ] Population.
- [ ] Checklist.
- [ ] Documents/transcripts.
- [ ] Interactions.
- [ ] Communications.
- [ ] Handoffs.
- [ ] Post-admit milestones.
- [ ] Recruitment source fields.
- [ ] Review state.
- [ ] Decision state.
- [ ] Trust/fraud summary.
- [ ] Audit availability flag.

Required shape additions:

```json
{
  "lastContactedAt": "",
  "nextFollowUpAt": "",
  "nextAction": "",
  "contactOutcome": "",
  "interactions": [],
  "communications": [],
  "handoffs": [],
  "postAdmitMilestones": [],
  "territory": "",
  "sourceSchool": "",
  "partnerSchool": "",
  "trustSummary": {},
  "reviewSummary": {},
  "decisionSummary": {}
}
```

Suggested endpoints:

```http
GET /api/v1/students
POST /api/v1/students
GET /api/v1/students/{studentId}
PATCH /api/v1/students/{studentId}
```

### 3. Today's Work Backend

Build/verify durable workbench read model.

Queues:

- [ ] New inquiries.
- [ ] Overdue follow-ups.
- [ ] Incomplete applications.
- [ ] Missing transcript.
- [ ] Missing requirement.
- [ ] Documents needing review.
- [ ] Trust exceptions.
- [ ] Ready for review.
- [ ] Decision pending.
- [ ] Admitted no deposit.
- [ ] Deposited not registered.
- [ ] Open handoffs.

Suggested endpoints:

```http
GET /api/v1/work/counselor/today
GET /api/v1/work/counselor/today/board
```

Work item shape:

```json
{
  "id": "",
  "studentId": "",
  "studentName": "",
  "pipelineStatus": "",
  "program": "",
  "owner": { "id": "", "name": "" },
  "blocker": "",
  "lastContactedAt": "",
  "nextFollowUpAt": "",
  "nextAction": "",
  "priority": "urgent|today|soon",
  "dueAt": "",
  "reasonToAct": { "code": "", "label": "" },
  "blockingItems": [],
  "routeHint": null
}
```

Backend tasks:

- [ ] Generate work items from student stage, checklist, interactions, handoffs, trust, review, and milestones.
- [ ] Include SLA aging.
- [ ] Include deep link target metadata where possible.
- [ ] Refresh projection after relevant writes.
- [ ] Add work projection rebuild job.

### 4. Interactions And Activities

Models:

- [ ] `student_interactions`.
- [ ] `interaction_notes` if notes are separate.
- [ ] `student_timeline_events` view or read model.

Suggested endpoints:

```http
GET /api/v1/students/{studentId}/interactions
POST /api/v1/students/{studentId}/interactions
GET /api/v1/students/{studentId}/timeline
```

Interaction fields:

- [ ] type.
- [ ] direction.
- [ ] outcome.
- [ ] title.
- [ ] note/description.
- [ ] next action.
- [ ] next follow-up.
- [ ] actor.
- [ ] occurred at.
- [ ] source: manual/system/integration/AI/provider.

Audit:

- [ ] Interaction created.
- [ ] Interaction edited.
- [ ] Note created.
- [ ] Next follow-up changed.

### 5. Ownership And Next Action

Suggested endpoint:

```http
POST /api/v1/students/{studentId}/next-action
```

Persist:

- [ ] owner ID.
- [ ] next action.
- [ ] next follow-up date.
- [ ] last contacted date.
- [ ] contact outcome.
- [ ] blocker.
- [ ] priority.

Models:

- [ ] Ownership assignment.
- [ ] Ownership history.
- [ ] Next action history.

Audit:

- [ ] Owner changed.
- [ ] Next action changed.
- [ ] Follow-up changed.

---

## Phase 2: Applicant Portal Replacement

Goal: persist and configure the admissions front door.

### 1. Prospect Portal

Models:

- [ ] Prospect.
- [ ] Inquiry.
- [ ] Contact preference.
- [ ] Consent.
- [ ] Source attribution.

Suggested endpoints:

```http
POST /api/v1/portal/inquiries
GET /api/v1/portal/inquiries/{inquiryId}
POST /api/v1/portal/inquiries/{inquiryId}/convert
```

Backend tasks:

- [ ] Persist inquiry form.
- [ ] Deduplicate against existing students.
- [ ] Create or update Student 360.
- [ ] Preserve source attribution.
- [ ] Create timeline event.
- [ ] Add new inquiry to Today's Work.

### 2. Application Portal

Models:

- [ ] Application.
- [ ] Application answer.
- [ ] Application requirement.
- [ ] Application status history.
- [ ] Applicant profile.
- [ ] Application draft/save state.

Suggested endpoints:

```http
POST /api/v1/portal/applications
GET /api/v1/portal/applications/{applicationId}
PATCH /api/v1/portal/applications/{applicationId}
POST /api/v1/portal/applications/{applicationId}/submit
POST /api/v1/portal/applications/{applicationId}/documents
```

Backend tasks:

- [ ] Configurable application form.
- [ ] Save and resume.
- [ ] Submit application.
- [ ] Application status.
- [ ] Checklist status.
- [ ] Missing item visibility.
- [ ] Document upload.
- [ ] Parent/family placeholder fields.
- [ ] Payment placeholder fields.

### 3. Portal Admin / White Label

Models:

- [ ] Portal branding.
- [ ] Portal content.
- [ ] Custom fields.
- [ ] Program list.
- [ ] Requirement templates.
- [ ] Checklist rules.
- [ ] Application deadlines.
- [ ] Status messages.
- [ ] Confirmation pages.
- [ ] Partner mode.

Suggested endpoints:

```http
GET /api/v1/admin/portal/config
PATCH /api/v1/admin/portal/config
GET /api/v1/portal/config
```

### 4. Partner API Layer

Suggested endpoints:

```http
POST /api/v1/partners/applications
POST /api/v1/partners/documents
GET /api/v1/partners/documents/{documentId}/status
GET /api/v1/partners/students/{studentId}/readiness
GET /api/v1/partners/students/{studentId}/trust
GET /api/v1/partners/students/{studentId}/transcript-data
GET /api/v1/partners/students/{studentId}/portal-link
POST /api/v1/partners/webhooks
```

Backend tasks:

- [ ] Partner auth.
- [ ] Partner rate limits.
- [ ] Partner audit logs.
- [ ] Partner usage tracking.
- [ ] External application ID mapping.
- [ ] Webhook delivery and retry.

---

## Phase 3: Transcript Extraction And Document Intelligence

Goal: normalize extraction and document processing into durable backend services.

### 1. Extraction Provider Abstraction

Models:

- [ ] Extraction provider config.
- [ ] Extraction run.
- [ ] Normalized document result.
- [ ] Extracted transcript.
- [ ] Extracted course row.
- [ ] Extraction warning/error.
- [ ] Evidence/page reference.

Provider support:

- [ ] Python engine.
- [ ] Freedom C# engine if licensed/contributed.
- [ ] Future partner engines.

Suggested flow:

```text
Document upload
-> extraction run
-> normalized result
-> student match
-> checklist update
-> fraud API check
-> trust evaluation
-> Student 360 evidence
```

Suggested endpoints:

```http
POST /api/v1/documents/{documentId}/extract
GET /api/v1/documents/{documentId}/extraction-runs
GET /api/v1/documents/{documentId}/normalized-result
POST /api/v1/documents/{documentId}/reprocess-upload
```

### 2. Document Queue

Statuses:

- [ ] uploaded.
- [ ] processing.
- [ ] processed.
- [ ] needs_review.
- [ ] matched.
- [ ] unmatched.
- [ ] exception.
- [ ] rejected.
- [ ] duplicate.
- [ ] trust_flagged.

Suggested endpoints:

```http
GET /api/v1/documents/queue
GET /api/v1/documents/exceptions
POST /api/v1/documents/{documentId}/status
POST /api/v1/documents/{documentId}/replace
POST /api/v1/documents/{documentId}/approve-extraction
```

### 3. Transcript Viewer Data

Backend should return:

- [ ] Original document content URL or streaming endpoint.
- [ ] Extracted fields.
- [ ] Extracted courses.
- [ ] Confidence.
- [ ] Evidence references.
- [ ] Correction state.
- [ ] Extraction run metadata.

Suggested endpoint:

```http
GET /api/v1/documents/{documentId}/content
GET /api/v1/documents/{documentId}/transcript-view
```

### 4. Checklist Automation

When extraction completes:

- [ ] Mark transcript received.
- [ ] Determine official/unofficial status.
- [ ] Determine college/high school transcript.
- [ ] Update GPA when present.
- [ ] Update test scores when present.
- [ ] Update course prerequisites when configured.
- [ ] Resolve missing transcript checklist item.
- [ ] Write timeline event.
- [ ] Recompute Today's Work.

---

## Phase 4: Trust And Fraud Center

Goal: integrate existing transcript fraud API and convert JSON results into product trust workflow.

## 1. Transcript Fraud API Integration

Important: fraud detection API already exists. Backend should pass the transcript/document to that API and use the JSON result.

### Configuration

- [ ] Add fraud API base URL config.
- [ ] Add fraud API auth config.
- [ ] Add tenant-level fraud policy config.
- [ ] Add timeout/retry config.
- [ ] Add feature flag: fraud check enabled.

### Request Contract

Define with fraud API owner:

- [ ] Does API expect raw file bytes, signed document URL, document ID, extracted JSON, or a combined payload?
- [ ] Required headers/auth.
- [ ] Required metadata.
- [ ] Max file size.
- [ ] Supported file types.
- [ ] Sync vs async response.

Recommended metadata:

```json
{
  "tenantId": "",
  "studentId": "",
  "documentId": "",
  "transcriptId": "",
  "extractionRunId": "",
  "uploadSource": "",
  "institution": "",
  "studentName": "",
  "submittedAt": ""
}
```

### Execution

- [ ] Trigger fraud API call after upload if raw file is enough.
- [ ] Trigger fraud API call after extraction if extracted data is required.
- [ ] Store request metadata.
- [ ] Store raw JSON response.
- [ ] Store provider run ID.
- [ ] Store response schema version.
- [ ] Retry transient failures.
- [ ] Mark fraud check unavailable on hard failure.
- [ ] Do not block all processing on fraud API outage unless tenant policy requires blocking.

Suggested endpoints/internal jobs:

```http
POST /api/v1/documents/{documentId}/fraud-check
GET /api/v1/documents/{documentId}/fraud-checks
```

Internal job:

```text
runTranscriptFraudCheck(documentId)
```

### Normalized Trust Result

Map fraud API JSON into:

```json
{
  "documentId": "",
  "studentId": "",
  "trustStatus": "clear|requires_review|blocked|unavailable",
  "riskLevel": "low|medium|high|critical",
  "confidence": 0.0,
  "signals": [
    {
      "code": "",
      "label": "",
      "severity": "low|medium|high|critical",
      "description": "",
      "evidence": []
    }
  ],
  "summary": "",
  "recommendedAction": "clear|review|request_replacement|quarantine|block_decision",
  "provider": "existing_fraud_api",
  "providerRunId": "",
  "rawResponseId": ""
}
```

Models:

- [ ] Fraud check run.
- [ ] Fraud raw response.
- [ ] Trust result.
- [ ] Trust signal.
- [ ] Trust case.

### Result Usage

- [ ] If clear, write trust result and timeline event.
- [ ] If requires review, create trust case.
- [ ] If blocked, create trust case and block decision release.
- [ ] If critical, quarantine document if tenant policy requires it.
- [ ] Add trust exception to Today's Work.
- [ ] Add trust summary to Student 360.
- [ ] Include trust status in Ready for Review.
- [ ] Include trust status in Decision Packet.
- [ ] Include trust cases in reporting.
- [ ] Notify assigned trust queue/role.

### Safe Wording

- [ ] Store raw fraud API labels internally.
- [ ] Expose user-facing labels as "trust signals".
- [ ] Use "requires review" for counselor-facing UI.
- [ ] Hide detailed signals from unauthorized users.
- [ ] Only trust-authorized users can see high-risk signal detail.

### Audit

- [ ] Fraud API request created.
- [ ] Fraud API response received.
- [ ] Trust result normalized.
- [ ] Trust case created.
- [ ] Document quarantined.
- [ ] Replacement requested.
- [ ] Decision release blocked.
- [ ] Trust case resolved.

## 2. Trust Case Workflow

Suggested endpoints:

```http
GET /api/v1/trust/cases
GET /api/v1/trust/cases/{caseId}
POST /api/v1/trust/cases/{caseId}/assign
POST /api/v1/trust/cases/{caseId}/quarantine
POST /api/v1/trust/cases/{caseId}/request-replacement
POST /api/v1/trust/cases/{caseId}/resolve
POST /api/v1/trust/cases/{caseId}/block-decision
POST /api/v1/trust/cases/{caseId}/clear-decision
```

Trust case fields:

- [ ] Student.
- [ ] Document.
- [ ] Trust status.
- [ ] Risk level.
- [ ] Signals.
- [ ] Confidence.
- [ ] Reviewer.
- [ ] Decision impact.
- [ ] Resolution.
- [ ] Notes.
- [ ] Audit trail.

## 3. Document Fraud Expansion

Design trust result schema to support:

- [ ] Recommendation letters.
- [ ] Residency documents.
- [ ] Financial documents.
- [ ] Identity documents.
- [ ] Essays.
- [ ] International credentials.
- [ ] Health program documents.
- [ ] Military/veteran documents.

---

## Phase 5: Review, Reader, And Decision Studio

Goal: close the Slate replacement gap with backend-backed review and decision workflows.

### Ready For Review

Models:

- [ ] Review queue item.
- [ ] Review assignment.
- [ ] Review due date/SLA.
- [ ] Review status.

Suggested endpoints:

```http
GET /api/v1/review-ready
POST /api/v1/reviews/{studentId}/assign
POST /api/v1/reviews/{reviewId}/claim
POST /api/v1/reviews/{reviewId}/complete
```

Readiness rule inputs:

- [ ] Required checklist complete.
- [ ] Documents processed.
- [ ] Trust clear or reviewed.
- [ ] Application submitted.
- [ ] Program requirements met.

### Reader Packet

Models:

- [ ] Decision packet.
- [ ] Review note.
- [ ] Review rubric.
- [ ] Review score.
- [ ] Reviewer recommendation.

Suggested endpoints:

```http
GET /api/v1/decisions/{decisionId}/snapshot
GET /api/v1/decisions/{decisionId}/packet
POST /api/v1/decisions/{decisionId}/review
POST /api/v1/decisions/{decisionId}/recommendation
```

Packet should include:

- [ ] Profile.
- [ ] Application answers.
- [ ] Documents.
- [ ] Transcript summary.
- [ ] Extracted courses.
- [ ] Trust status.
- [ ] Checklist readiness.
- [ ] Notes.
- [ ] Scoring/rubric.
- [ ] Recommendation.

### Decision Studio

Suggested endpoints:

```http
GET /api/v1/decisions
POST /api/v1/decisions/{decisionId}/release
POST /api/v1/decisions/{decisionId}/hold
POST /api/v1/decisions/{decisionId}/letter
```

Backend tasks:

- [ ] Decision recommendation.
- [ ] Decision blockers.
- [ ] Final decision.
- [ ] Decision release permission check.
- [ ] Decision letter/template placeholder.
- [ ] Decision audit.
- [ ] Batch release later.

---

## Phase 6: Communications Control Plane

Goal: build communication workflow now and plug in providers later.

### Provider Abstraction

Models:

- [ ] Communication provider.
- [ ] Tenant communication provider config.
- [ ] Communication template.
- [ ] Communication log.
- [ ] Provider delivery event.
- [ ] Consent/opt-out record.

Providers:

- [ ] log-only.
- [ ] SMTP/email future.
- [ ] SMS future.
- [ ] HubSpot future.
- [ ] Computer Instruments future.
- [ ] Jenzabar/SIS communication future.

Suggested endpoints:

```http
GET /api/v1/communication/templates
POST /api/v1/students/{studentId}/communications/log
POST /api/v1/students/{studentId}/communications/send
POST /api/v1/communication/provider-callbacks/{provider}
```

Twilio SMS contract for `POST /api/v1/students/{studentId}/communications/send`:

- Accept frontend payloads with `channel: "text"`, `provider: "twilio"`, `to` or `recipientPhone`, `message`, `templateKey`, `templateLabel`, `subject`, `nextFollowUpAt`, `actor`, and `source`.
- Validate the student has a phone number and the tenant is allowed to text the student.
- Send through Twilio server-side only. Required backend environment/config: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`.
- Persist the communication log with `status`, `provider: "twilio"`, `providerMessageId` or `messageSid`, `to`, `message`, `channel`, `occurredAt`, and delivery/error detail.
- Return `{ communication: { ... } }` so Student 360 can add the sent text to communication history and timeline.

### Communication Log Fields

- [ ] Channel.
- [ ] Direction.
- [ ] Template.
- [ ] Subject/message.
- [ ] Status.
- [ ] Actor.
- [ ] Provider.
- [ ] Provider ID.
- [ ] Next follow-up.
- [ ] Consent.
- [ ] Audit ID.

### HubSpot Integration Path

- [ ] OAuth/API config.
- [ ] Lead sync.
- [ ] Campaign source.
- [ ] Marketing contact status.
- [ ] Lifecycle stage.
- [ ] Email engagement summary.
- [ ] Campaign attribution.
- [ ] Form submissions.
- [ ] Handoff to crtfy when admissions action starts.

---

## Phase 7: Governed AI Built Into Workflow

Goal: backend support for governed AI summaries, next-best actions, and draft generation.

### AI Governance Models

- [ ] AI prompt template.
- [ ] AI run.
- [ ] AI source citation/reference.
- [ ] AI policy decision.
- [ ] AI approval state.
- [ ] AI audit event.

Suggested endpoints:

```http
POST /api/v1/ai/students/{studentId}/summary
POST /api/v1/ai/students/{studentId}/next-best-action
POST /api/v1/ai/students/{studentId}/draft-communication
POST /api/v1/ai/trust-cases/{caseId}/explanation
POST /api/v1/ai/runs/{runId}/approve
POST /api/v1/ai/runs/{runId}/reject
```

Governance requirements:

- [ ] Enforce tenant scope.
- [ ] Enforce RBAC.
- [ ] Enforce sensitivity tiers.
- [ ] Hide trust details from unauthorized users.
- [ ] Store source data used.
- [ ] Store prompt/template.
- [ ] Store output.
- [ ] Store policy decision.
- [ ] Store approval state.
- [ ] Human approval before external-facing use.

---

## Phase 8: Yield, Deposit, Melt, And Enrollment Readiness

Goal: own post-admit movement with durable backend state.

### Yield Board

Suggested endpoint:

```http
GET /api/v1/yield
POST /api/v1/students/{studentId}/deposit-status
```

Backend tasks:

- [ ] Newly admitted.
- [ ] No recent activity.
- [ ] Missing deposit.
- [ ] Scholarship-sensitive.
- [ ] High-value transfer.
- [ ] Admitted with blocker.
- [ ] High likelihood no action.

### Deposit / Melt Board

Suggested endpoint:

```http
GET /api/v1/melt
```

Backend tasks:

- [ ] Deposited all clear.
- [ ] Missing final transcript.
- [ ] Missing orientation.
- [ ] Missing advising.
- [ ] Registration incomplete.
- [ ] Financial aid blocker.
- [ ] Housing blocker.
- [ ] Bursar hold placeholder.

### Post-Admit Milestones

Suggested endpoints:

```http
GET /api/v1/students/{studentId}/post-admit-readiness
POST /api/v1/students/{studentId}/milestones/{milestoneId}/status
```

Milestones:

- [ ] Financial aid package.
- [ ] Scholarship.
- [ ] Deposit.
- [ ] Housing.
- [ ] Orientation.
- [ ] Advising.
- [ ] Registration.
- [ ] Bursar/account.
- [ ] International docs.
- [ ] Veteran benefits.
- [ ] Accessibility.

Integrations:

- [ ] SIS registration signal.
- [ ] Financial aid package signal.
- [ ] Housing signal.
- [ ] Orientation signal.
- [ ] Bursar hold signal.

### Cross-Office Handoffs

Suggested endpoints:

```http
GET /api/v1/handoffs
POST /api/v1/students/{studentId}/handoffs
POST /api/v1/handoffs/{handoffId}/status
```

Targets:

- [ ] Financial aid.
- [ ] Registrar.
- [ ] Advising.
- [ ] Housing.
- [ ] Bursar.
- [ ] Academic department.
- [ ] International office.
- [ ] Athletics.
- [ ] Student success.

---

## Phase 9: Reporting, ROI, And Executive Control

Goal: provide aggregation endpoints for leadership dashboards and ROI.

### Core Reporting Endpoints

```http
GET /api/v1/reporting/overview
GET /api/v1/reporting/funnel
GET /api/v1/reporting/stage-aging
GET /api/v1/reporting/counselor-workload
GET /api/v1/reporting/reviewer-workload
GET /api/v1/reporting/documents
GET /api/v1/reporting/extraction
GET /api/v1/reporting/trust
GET /api/v1/reporting/handoffs
GET /api/v1/reporting/source-performance
GET /api/v1/reporting/roi
```

Metrics:

- [ ] Inquiry-to-registered funnel.
- [ ] Stage aging.
- [ ] Incomplete-to-complete conversion.
- [ ] Complete-to-decision turnaround.
- [ ] Admit-to-deposit conversion.
- [ ] Deposit-to-registration conversion.
- [ ] Melt risk.
- [ ] Counselor workload.
- [ ] Reviewer workload.
- [ ] Document processing volume.
- [ ] Extraction accuracy/confidence.
- [ ] Trust/fraud cases.
- [ ] Handoff SLA.
- [ ] Source performance.
- [ ] HubSpot campaign attribution if integrated.

### ROI Dashboard

- [ ] Students moved forward.
- [ ] Days saved.
- [ ] Manual document work reduced.
- [ ] Incomplete backlog reduced.
- [ ] Trust cases resolved.
- [ ] Extra deposits influenced.
- [ ] Melt blockers surfaced.

### Export

```http
GET /api/v1/reporting/{reportKey}/export.csv
GET /api/v1/reporting/{reportKey}/snapshot.pdf
```

- [ ] CSV export.
- [ ] PDF snapshot.
- [ ] Scheduled email later.
- [ ] API reporting endpoint.

---

## Phase 10: Advanced Replacement Features

Goal: close remaining CRM replacement gaps.

### Event Management

Models:

- [ ] Event.
- [ ] Event registration.
- [ ] Event attendance.
- [ ] Event follow-up task.
- [ ] Event source attribution.

Suggested endpoints:

```http
GET /api/v1/recruitment/events
POST /api/v1/recruitment/events
POST /api/v1/recruitment/events/{eventId}/attendees
POST /api/v1/recruitment/events/{eventId}/attendance
```

### Territory Management

Models:

- [ ] Territory.
- [ ] High school.
- [ ] Partner school.
- [ ] Transfer partner.
- [ ] Recruiter assignment.

Suggested endpoints:

```http
GET /api/v1/territories
POST /api/v1/territories
POST /api/v1/territories/{territoryId}/assignments
```

### Duplicate Management

Models:

- [ ] Duplicate candidate.
- [ ] Merge decision.
- [ ] Source priority.
- [ ] Merge audit trail.

Suggested endpoints:

```http
GET /api/v1/students/duplicates
POST /api/v1/students/duplicates/{duplicateId}/merge
POST /api/v1/students/duplicates/{duplicateId}/dismiss
```

### Data Import/Export

- [ ] CSV import.
- [ ] API import.
- [ ] SIS import.
- [ ] HubSpot import.
- [ ] Slate/Salesforce migration import.
- [ ] Export to SIS.
- [ ] Webhooks.

Suggested endpoints:

```http
POST /api/v1/imports
GET /api/v1/imports/{importId}
POST /api/v1/exports
GET /api/v1/webhooks
POST /api/v1/webhooks
```

### Admin Configuration

Configurable:

- [ ] Roles.
- [ ] Permissions.
- [ ] Stages.
- [ ] Checklist templates.
- [ ] Programs.
- [ ] Decision rules.
- [ ] Review rubrics.
- [ ] Portal branding.
- [ ] Communication templates.
- [ ] Fraud rules.
- [ ] Integrations.

---

## Phase 11: Computer Instruments Integration

Goal: turn communication control plane into execution when contract is ready.

### Provider Setup

- [ ] Provider credentials.
- [ ] Tenant enablement.
- [ ] Consent rules.
- [ ] Quiet hours.
- [ ] Callback endpoint.
- [ ] Provider event signature verification.

Suggested endpoints:

```http
POST /api/v1/communication/providers/computer-instruments/send
POST /api/v1/communication/providers/computer-instruments/callback
GET /api/v1/communication/providers/computer-instruments/status/{providerMessageId}
```

### Capabilities

- [ ] SMS send.
- [ ] Voice/call workflow.
- [ ] Callback.
- [ ] Reminders.
- [ ] Call outcomes.
- [ ] Bidirectional response status.
- [ ] Failed delivery.
- [ ] Opt-out/consent.
- [ ] Quiet hours.
- [ ] Campaign enrollment from Today's Work.
- [ ] Student response updates.
- [ ] Timeline updates.
- [ ] Reporting attribution.

---

## Immediate Backend Fast-Track Priorities

1. [ ] Add missing pipeline statuses and stage history.
2. [ ] Harden `GET /api/v1/students/{studentId}` to return all Student 360 arrays.
3. [ ] Persist interactions, communications, handoffs, milestones, and next actions.
4. [ ] Finish `GET /api/v1/work/counselor/today`.
5. [ ] Integrate transcript fraud API after upload/extraction.
6. [ ] Normalize fraud API JSON into trust result schema.
7. [ ] Auto-create trust cases and decision blockers from fraud results.
8. [ ] Add backend timeline read model.
9. [ ] Add review assignment, rubric, and decision release models.
10. [ ] Add reporting aggregations and CSV export.
11. [ ] Add applicant portal persistence.
12. [ ] Add duplicate detection and migration/import tools.
