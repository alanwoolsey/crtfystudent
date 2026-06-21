# crtfy Student Next-Steps Phased Implementation Checklist

Last updated: 2026-06-20

## Purpose

This checklist turns the next-step roadmap into an executable implementation plan. It accounts for work already present in the current app, while identifying the backend, integration, trust, portal, AI, and communication-provider work still needed.

Status key:

- `[x]` Built or substantially present in the current app.
- `[~]` Partially built, frontend-ready, or backed by optimistic/local fallback.
- `[ ]` Not built or needs full backend/integration implementation.

---

## Phase 1: crtfy Student Foundation

Timeline: months 0-3

Goal: get a credible MVP to market quickly around the core admissions operating system.

### 1. Tenant, Auth, RBAC, And Audit Baseline

- [x] Tenant-aware frontend session state.
- [x] Protected navigation.
- [x] Role-aware route access.
- [x] Permission-aware UI rendering.
- [x] Sensitivity-tier gates for academic, transcript, and trust-sensitive areas.
- [x] Expired token behavior routes user back to login on `401`.
- [ ] Backend tenant isolation verified across every new endpoint.
- [ ] Backend role/permission enforcement verified across every new endpoint.
- [ ] Backend sensitivity-tier enforcement verified for academic, transcript, trust, and decision data.
- [ ] Audit records for key user actions.
- [ ] Audit viewer or admin audit export.

Required roles:

- [x] Admissions counselor.
- [x] Admissions processor.
- [x] Reviewer/evaluator.
- [x] Trust analyst.
- [x] Registrar/transfer specialist.
- [x] Financial aid.
- [x] Decision releaser/director.
- [x] Read-only leadership.
- [x] Integration service.

Acceptance:

- [ ] User cannot access another tenant's students, documents, handoffs, or reports.
- [ ] Unauthorized user cannot view hidden sensitive data through direct route or API calls.
- [ ] Key actions produce audit events with actor, tenant, timestamp, entity, and before/after values.

### 2. Student 360

- [x] Student 360 route and profile shell.
- [x] Overview tab.
- [x] Timeline tab.
- [x] Outreach tab.
- [x] Checklist tab.
- [x] Documents tab.
- [x] Decisions tab.
- [x] Trust tab.
- [x] Yield / Deposit tab.
- [x] Handoff tab.
- [x] Recruitment tab.
- [x] Program/degree dropdown.
- [x] Next action display.
- [x] Last contact and next follow-up display.
- [x] Academic signal card.
- [x] Subject GPA card.
- [x] Test score display.
- [x] Course equivalency card for college transcripts.
- [~] Student detail backend contract expanded for interactions, handoffs, milestones, territory, and source fields.
- [ ] Backend persistence for all Student 360 fields.
- [ ] Backend timeline includes all student events without frontend derivation.

Core fields:

- [x] Student profile.
- [x] Program.
- [x] Stage.
- [x] Owner.
- [x] Source.
- [x] Population.
- [x] Checklist.
- [x] Transcripts/documents.
- [x] Interactions.
- [x] Handoffs.
- [x] Post-admit milestones.
- [x] Next action.
- [x] Next follow-up.
- [x] Last activity.
- [x] Trust status.
- [x] Readiness status.

Acceptance:

- [x] Student 360 is the center of the product experience.
- [ ] Every backend workflow writes an event back to Student 360.
- [ ] Student detail can be loaded from backend without relying on frontend fallback data.

### 3. Today's Work

- [x] Today's Work page.
- [x] Counselor workbench.
- [x] Due follow-up bucket.
- [x] Inquiry bucket.
- [x] Prospect bucket.
- [x] Applicant bucket.
- [x] Incomplete bucket.
- [x] Complete bucket.
- [x] Admitted bucket.
- [x] Deposited/Committed bucket.
- [x] Registered bucket.
- [x] Exceptions surfaces through existing work sections.
- [x] Open handoffs section.
- [x] Post-admit blockers section.
- [x] Recruitment follow-up section.
- [x] Quick action modal.
- [x] Log contact.
- [x] Set next follow-up.
- [x] Request missing document note.
- [x] Route/handoff note.
- [~] Primary read endpoint set to `GET /api/v1/work/counselor/today`.
- [~] Fallback to older `GET /api/v1/work/today`.
- [ ] Backend workbench read model fully verified.
- [ ] Backend-driven bucket counts and SLA aging.

Each work item should show:

- [x] Student.
- [x] Program.
- [x] Stage.
- [x] Owner.
- [x] Blocker.
- [x] Last contact.
- [x] Next follow-up.
- [x] Next action.
- [x] Urgency.
- [x] Due date.

Acceptance:

- [x] Counselor can start from Today's Work and identify priority students.
- [x] Counselor can open Student 360 from a work item.
- [x] Counselor can log a contact and set next follow-up.
- [ ] Backend persists all work item changes and updates queue state.
- [ ] Queue state refreshes consistently across users.

### 4. Checklist Readiness

- [x] Checklist tab.
- [x] Checklist progress.
- [x] Required item status display.
- [x] Mark reviewed / mark complete actions.
- [~] Backend status update endpoint integration.
- [ ] Configurable checklist templates by program/population.
- [ ] Backend checklist requirements model.
- [ ] Backend checklist audit events.

Checklist item types:

- [x] Transcript.
- [x] Application.
- [x] Essay.
- [x] Recommendation.
- [x] Test score.
- [x] Fee.
- [x] FAFSA/aid package placeholder.
- [x] Final transcript.
- [x] Orientation.
- [x] Advising.
- [x] Registration.
- [x] Housing.
- [x] Bursar/student account.

Statuses:

- [x] Not started.
- [x] Requested.
- [x] Received.
- [x] Needs review.
- [x] Blocked.
- [x] Rejected.
- [x] Expired.
- [x] Complete.
- [x] Waived.

Acceptance:

- [x] Incomplete checklist items create clear next actions.
- [ ] Backend emits checklist events into timeline.
- [ ] Checklist changes update Today's Work and reporting.

### 5. Timeline And Interaction Logging

- [x] Manual interaction composer.
- [x] Activity type selector.
- [x] Outcome selector.
- [x] Note field.
- [x] Next action field.
- [x] Next follow-up field.
- [x] Timeline filters.
- [~] `POST /api/v1/students/{studentId}/interactions` integration.
- [ ] `GET /api/v1/students/{studentId}/interactions` fully integrated and verified.
- [ ] Backend interaction entity.
- [ ] Interaction audit events.

Supported event types:

- [x] Call.
- [x] Text.
- [x] Email.
- [x] Meeting.
- [x] Family conversation.
- [x] Campus visit.
- [x] Note.
- [x] Handoff.
- [x] Document event.
- [x] Trust event.
- [x] Post-admit milestone.
- [x] Recruitment event.

Acceptance:

- [x] Counselor can log activity without communication-provider integration.
- [x] Activity appears immediately in Student 360.
- [ ] Activity persists and appears for other users after reload.

### 6. Basic Outreach Templates, No Send Yet

- [x] Outreach tab.
- [x] Template picker.
- [x] Channel selector.
- [x] Editable subject.
- [x] Editable message draft.
- [x] Next follow-up field.
- [x] Log outreach action.
- [~] `POST /api/v1/students/{studentId}/communications/log` integration.
- [ ] `GET /api/v1/communication/templates` integration.
- [ ] Copy message button.
- [ ] Communication provider abstraction on backend.
- [ ] Communication status model.

Template categories:

- [x] New inquiry.
- [x] Application help.
- [x] Missing transcript.
- [x] Missing requirement.
- [x] Admission offer.
- [x] Deposit reminder.
- [x] Registration reminder.
- [x] Orientation reminder.

Current buttons/actions:

- [ ] Copy message.
- [x] Log outreach.
- [x] Set next follow-up.
- [x] Create handoff.

Phase 1 exit criteria:

- [x] Counselor logs in.
- [x] Counselor opens Today's Work.
- [x] Counselor sees students by blocker and priority.
- [x] Counselor opens Student 360.
- [x] Counselor reviews checklist and documents.
- [x] Counselor logs an interaction.
- [x] Counselor sets a next follow-up.
- [x] Counselor creates a handoff.
- [x] Counselor updates readiness.
- [~] Counselor sees reporting update.
- [ ] All of the above persist through backend and audit events.

---

## Phase 2: Document Intelligence, Extraction, And Trust

Timeline: months 2-5

Goal: make transcript extraction and trust/fraud review the strongest product wedge.

### 1. Transcript And Document Intake

- [x] Single upload.
- [x] Batch upload.
- [x] Upload status modal.
- [x] Background batch status.
- [x] Documents Queue page.
- [x] Document exception page.
- [x] Student 360 transcript lineage.
- [x] Transcript course row viewer.
- [x] Transcript PDF/content viewer when backend returns document content.
- [~] Reprocess action integration.
- [ ] Replace document action.
- [ ] Backend document classification.
- [ ] Backend student matching confidence.
- [ ] Backend queue routing.
- [ ] Backend lineage model.

Queue fields:

- [x] Document type.
- [x] Student match.
- [x] Confidence.
- [x] Upload source.
- [x] Status.
- [x] Latest run.
- [x] Exception reason.
- [x] Suggested action.
- [x] Trust flag.
- [x] Received date.

Acceptance:

- [ ] Upload transcript -> extraction runs -> match suggested -> course rows appear -> checklist updates.

### 2. Extraction Engine Abstraction

- [ ] Define `ExtractionProvider` interface.
- [ ] Add provider registry/configuration.
- [ ] Support Freedom C# engine if licensed.
- [ ] Support Python extraction engine.
- [ ] Support future extraction providers.
- [ ] Support partner-provided extraction.
- [ ] Normalize extraction output into one product schema.
- [ ] Store processing metadata and provider version.
- [ ] Store source coordinates/page references where available.

Normalized result should include:

- [ ] Document type.
- [ ] Student identity.
- [ ] Institution.
- [ ] Transcript rows.
- [ ] Course rows.
- [ ] GPA fields.
- [ ] Terms.
- [ ] Credits.
- [ ] Grades.
- [ ] Confidence.
- [ ] Warnings.
- [ ] Source coordinates/page references.
- [ ] Processing metadata.

Acceptance:

- [ ] Product can switch extraction provider without rewriting Student 360, checklist, trust, or reporting surfaces.

### 3. Trust Center

- [x] Trust Center page.
- [x] Student 360 Trust tab.
- [x] Trust sensitivity gates.
- [x] Trust action placeholders.
- [ ] Backend trust case entity.
- [ ] Assign reviewer.
- [ ] Quarantine document persistence.
- [ ] Request replacement workflow.
- [ ] Resolve case persistence.
- [ ] Block decision release from trust state.
- [ ] Trust audit trail.

Trust case fields:

- [ ] Student.
- [ ] Document.
- [ ] Trust status.
- [ ] Risk level.
- [ ] Fraud/trust signals.
- [ ] Confidence.
- [ ] Reviewer.
- [ ] Decision impact.
- [ ] Resolution.
- [ ] Notes.
- [ ] Audit trail.

Acceptance:

- [ ] Trust case can block or clear decision release.
- [ ] Trust resolution appears on Student 360 timeline.

### 4. Transcript Fraud Detection

- [ ] Inconsistent student identity signal.
- [ ] Institution mismatch signal.
- [ ] Suspicious formatting signal.
- [ ] Manipulated PDF metadata signal.
- [ ] Impossible term/course pattern signal.
- [ ] Grade/credit inconsistency signal.
- [ ] Duplicate/reused transcript template signal.
- [ ] Course rows inconsistent with totals signal.
- [ ] Low extraction confidence on critical fields signal.
- [ ] Mismatch against known institutional profile signal.
- [ ] Suspicious upload/source behavior signal.
- [ ] UI wording uses "trust signals", "requires review", and "confidence" instead of accusatory fraud language.

Acceptance:

- [ ] Trust signals are explainable and reviewable by authorized users.

### 5. Document Fraud Expansion

- [ ] Trust architecture supports non-transcript documents.
- [ ] Recommendation letter trust support.
- [ ] Essay trust support.
- [ ] Identity document trust support.
- [ ] Financial document trust support.
- [ ] Residency document trust support.
- [ ] Immunization/health program document trust support.
- [ ] Military/veteran document trust support.
- [ ] International document trust support.

Phase 2 exit criteria:

- [ ] Upload transcript.
- [ ] Extraction runs.
- [ ] Student match is suggested.
- [ ] Course rows appear.
- [ ] Checklist updates.
- [ ] Trust signals are generated.
- [ ] Trust case opens if needed.
- [ ] Reviewer resolves or blocks.
- [ ] Student 360 timeline records the event.

---

## Phase 3: Admissions Portal And Partner-Ready White Label

Timeline: months 3-6

Goal: create a front door Jenzabar or other partners can embed or white-label.

### 1. Prospect/Application Portal

- [x] Prospect portal route exists.
- [x] Manual inquiry/prospect frontend flow.
- [ ] Inquiry form production backend persistence.
- [ ] Application start flow.
- [ ] Portal document upload.
- [ ] Portal checklist visibility.
- [ ] Missing item status.
- [ ] Application status.
- [ ] Contact preferences.
- [ ] Basic message center placeholder.
- [ ] Student profile update.
- [ ] Program selection.
- [ ] Parent/family placeholder.
- [ ] Portal data pushes into Student 360.

Acceptance:

- [ ] Student submits inquiry/application and Student 360 is created or updated.

### 2. White-Label Configuration

- [ ] Institution branding model.
- [ ] Logo configuration.
- [ ] Color/theme configuration.
- [ ] Custom URL/domain support.
- [ ] Program list configuration.
- [ ] Checklist requirements configuration.
- [ ] Portal copy/content configuration.
- [ ] Privacy/consent text configuration.
- [ ] Document upload rules.
- [ ] Partner mode flag.
- [ ] Admin UI for white-label settings.

Acceptance:

- [ ] Tenant can expose a branded portal without code changes.

### 3. Partner API Layer

- [ ] `POST /api/v1/partners/applications`.
- [ ] `POST /api/v1/partners/documents`.
- [ ] `GET /api/v1/partners/documents/{id}/status`.
- [ ] `GET /api/v1/partners/students/{id}/readiness`.
- [ ] `GET /api/v1/partners/students/{id}/trust`.
- [ ] `GET /api/v1/partners/students/{id}/transcript-data`.
- [ ] `GET /api/v1/partners/students/{id}/portal-link`.
- [ ] `POST /api/v1/partners/webhooks`.
- [ ] Partner API authentication.
- [ ] Partner API rate limits.
- [ ] Partner API audit logs.

Acceptance:

- [ ] Partner can create application, upload document, and retrieve processing/readiness/trust status.

### 4. Partner Audit And Usage Tracking

- [ ] Track partner.
- [ ] Track tenant.
- [ ] Track applications created.
- [ ] Track documents uploaded.
- [ ] Track extraction runs.
- [ ] Track trust cases.
- [ ] Track API calls.
- [ ] Track errors.
- [ ] Track latency.
- [ ] Track usage volume.
- [ ] Usage dashboard for partner billing.

Phase 3 exit criteria:

- [ ] Student submits portal inquiry/application.
- [ ] Student uploads transcript.
- [ ] crtfy processes document.
- [ ] Student 360 is created/updated.
- [ ] Checklist and trust status update.
- [ ] Partner/SIS can retrieve status by API.

---

## Phase 4: Decision Readiness, Review, And Course Equivalency

Timeline: months 5-8

Goal: help institutions move from complete file to decision faster.

### 1. Ready For Review

- [x] Ready for Review page.
- [x] Student 360 Decisions tab.
- [x] Readiness chip/status.
- [ ] Claim review action.
- [ ] Assign reviewer action.
- [ ] Open packet action wired to backend packet.
- [ ] Request more info action.
- [ ] Escalate action.
- [ ] Mark review complete action.
- [ ] Reviewer due date/SLA backend support.

Fields:

- [x] Student.
- [x] Program.
- [x] Readiness score/status.
- [x] Missing items.
- [x] Trust status.
- [x] Academic signal.
- [x] Transcript summary.
- [ ] Reviewer.
- [ ] Review due date.

Acceptance:

- [ ] Complete student appears in Ready for Review and can be assigned through review completion.

### 2. Decision Packet

- [x] Decision Studio page exists.
- [x] Decision detail route exists.
- [x] Student profile evidence appears across Student 360.
- [ ] Backend decision packet entity.
- [ ] Packet generation endpoint.
- [ ] Reviewer notes.
- [ ] Recommendation persistence.
- [ ] Release blockers.
- [ ] Decision release audit.

Decision packet should include:

- [x] Profile.
- [x] Checklist status.
- [x] Documents.
- [x] Transcript summary.
- [x] Trust status.
- [x] Academic signal.
- [x] Course equivalency.
- [ ] Reviewer notes.
- [ ] Recommendation.
- [ ] Release blockers.

### 3. Course Equivalency / Transfer Fit

- [x] Course equivalency card.
- [x] Selected-program lookup.
- [x] Catalog/chat lookup integration.
- [x] Fallback subject matching.
- [x] Might-transfer and likely-will-not-transfer credit totals.
- [ ] Registrar approval workflow.
- [ ] Equivalency backend persistence.
- [ ] Match status model.
- [ ] Institution catalog source tracking.

Statuses:

- [x] Suggested.
- [ ] Needs registrar review.
- [ ] Approved.
- [ ] Rejected.

Acceptance:

- [ ] Equivalency can be routed to registrar and approved/rejected.

### 4. Registrar Handoff

- [x] Handoff target supports Registrar / Transfer Specialist.
- [x] Handoff target supports Academic Department.
- [x] Handoff appears in Student 360.
- [x] Handoff appears in Today's Work.
- [ ] Registrar-specific queue.
- [ ] Registrar approval status writes back to equivalency rows.

Phase 4 exit criteria:

- [ ] Student becomes complete.
- [ ] Student appears in Ready for Review.
- [ ] Reviewer opens decision packet.
- [ ] Reviewer sees transcript/course/trust evidence.
- [ ] Course equivalency can be sent to registrar.
- [ ] Trust issue blocks or clears release.
- [ ] Decision readiness updates.

---

## Phase 5: Yield, Deposit, Melt, And Cross-Office Accountability

Timeline: months 6-9

Goal: prove crtfy Student improves enrollment movement after admission.

### 1. Admitted / Yield Board

- [x] Admitted / Yield page.
- [x] Newly admitted view.
- [x] No recent activity view.
- [x] Missing next step view.
- [x] Scholarship-sensitive view.
- [x] High-value transfer view.
- [x] High likelihood view.
- [x] At-risk fallback through score/risk.
- [x] Open student action.
- [x] Log outreach through Student 360.
- [x] Set next follow-up through Student 360.
- [x] Create financial aid handoff through Student 360.
- [x] Update post-admit milestone through Student 360.
- [ ] Update deposit status backend action.
- [ ] Yield queue backend endpoint fully verified.

### 2. Deposit / Melt Board

- [x] Deposit / Melt page.
- [x] Deposited all-clear view.
- [x] At-risk view.
- [x] Missing FAFSA view.
- [x] Missing final transcript view.
- [x] Missing orientation view.
- [x] Registration incomplete view.
- [x] Bursar/account hold placeholder through milestone.
- [ ] Melt queue backend endpoint fully verified.

### 3. Post-Admit Readiness

- [x] Milestone checklist in Student 360.
- [x] Financial aid package.
- [x] Scholarship status.
- [x] Deposit.
- [x] Housing.
- [x] Orientation.
- [x] Advising.
- [x] Registration.
- [x] Bursar/student account.
- [x] International documentation.
- [x] Veteran benefits.
- [x] Accessibility/accommodations.
- [x] Owner.
- [x] Due date.
- [x] Status.
- [x] Blocker.
- [x] Last updated.
- [~] Notes through blocker/activity fields.
- [ ] Backend milestone persistence fully verified.

### 4. Handoff SLA Reporting

- [x] Handoff queue in Today's Work.
- [x] Handoff SLA in Reporting.
- [x] Open handoffs metric.
- [x] Overdue handoffs metric.
- [x] Handoff completion rate metric.
- [ ] Average time to close.
- [ ] Handoffs by target team.
- [ ] Handoffs by stage.
- [~] Students blocked by handoffs.
- [ ] Backend aggregation endpoint fully verified.

Phase 5 exit criteria:

- [x] Admitted student can have missing financial aid milestone.
- [x] Counselor can create financial aid handoff.
- [x] Handoff appears in Today's Work and reporting.
- [x] Financial aid blocker can be updated in milestone.
- [ ] Student moves to deposited/registered readiness from authoritative backend signal.

---

## Phase 6: Reporting, ROI, And Executive Dashboard

Timeline: months 7-10

Goal: make product value measurable.

### 1. Leadership Dashboard

- [x] Reporting page.
- [x] Inquiry-to-registered funnel.
- [~] Stage aging endpoint integration.
- [x] Incomplete-to-complete conversion.
- [x] Average days to complete.
- [x] Complete-to-decision turnaround.
- [x] Admit-to-deposit conversion.
- [x] Melt rate.
- [ ] Document processing volume.
- [ ] Extraction success rate.
- [ ] Trust case volume.
- [ ] Trust case resolution time.
- [x] Counselor workload.
- [x] Handoff SLA.
- [x] Source/territory performance.
- [ ] Date range filter.
- [ ] Program filter.
- [ ] Owner/counselor filter.
- [ ] Export/download.

### 2. ROI Dashboard

- [ ] Students moved from incomplete to complete.
- [ ] Days saved in transcript processing.
- [ ] Overdue handoffs reduced.
- [ ] Additional admits/deposits influenced.
- [ ] Melt-risk blockers surfaced.
- [ ] Documents processed automatically.
- [ ] Manual review avoided.
- [ ] ROI summary card.
- [ ] Exportable executive report.

Phase 6 exit criteria:

- [~] Product can show where students are stuck.
- [~] Product can show who owns blockers.
- [~] Product can show funnel counts and handoff SLA.
- [ ] Product can show operational movement improved since go-live using historical baseline.

---

## Phase 7: Governed AI Without Overbuilding

Timeline: months 8-12

Goal: add governed AI where it improves workflow.

### Governance Foundation

- [ ] AI actions obey role permissions.
- [ ] AI actions obey sensitivity tiers.
- [ ] AI actions obey student data access scope.
- [ ] Unauthorized users cannot see hidden trust details through AI.
- [ ] Audit every AI-generated recommendation.
- [ ] Human approval required for external-facing messages.
- [ ] No direct external send until communication provider integration is approved.
- [ ] Policy check result stored with AI output.

### 1. Student Status Summary

- [ ] Add `Summarize this student` button.
- [ ] Include current stage.
- [ ] Include missing items.
- [ ] Include document status.
- [ ] Include trust flags if authorized.
- [ ] Include last contact.
- [ ] Include next action.
- [ ] Include open handoffs.
- [ ] Include recommended follow-up.
- [ ] Store summary audit event.

### 2. Next-Best-Action Recommendation

- [ ] Generate recommendation from stage, checklist, documents, contact history, and handoffs.
- [ ] Explain why recommendation was made.
- [ ] Let counselor accept or ignore recommendation.
- [ ] If accepted, write next action and follow-up.
- [ ] Store recommendation audit event.

### 3. Outreach Draft Generation

- [ ] Generate draft from selected template and student context.
- [ ] User reviews draft before use.
- [ ] User can copy or log draft manually.
- [ ] Policy check before draft is shown or logged.
- [ ] Store generated draft audit event.

### 4. Trust Case Explanation

- [ ] Summarize why case was flagged.
- [ ] Summarize evidence.
- [ ] Recommend review action.
- [ ] State what should not be used in decision yet.
- [ ] Hide sensitive trust detail from unauthorized users.

### 5. Counselor Coaching / Role Assistant

- [ ] Answer "How should I handle this transfer student?"
- [ ] Answer "What does this blocker mean?"
- [ ] Answer "What should I do with a trust case?"
- [ ] Answer "What is next for an admitted student missing orientation?"
- [ ] Tie answers to approved policy/source knowledge.

Phase 7 exit criteria:

- [ ] Open Student 360.
- [ ] AI summarizes student.
- [ ] AI recommends next action.
- [ ] AI drafts counselor message.
- [ ] Policy check is applied.
- [ ] Generated draft and audit event are logged.
- [ ] No external send occurs.

---

## Phase 8: Computer Instruments Integration

Timeline: after contract is ready.

Goal: turn logged outreach into real communication execution.

### Provider Abstraction

- [ ] Define `CommunicationProvider`.
- [ ] Add `logOnly` provider.
- [ ] Add `emailProviderFuture` placeholder.
- [ ] Add `smsProviderFuture` placeholder.
- [ ] Add `computerInstrumentsFuture` placeholder.
- [ ] Tenant-level provider configuration.
- [ ] Provider credentials storage.
- [ ] Provider audit events.

### Minimum Viable Integration Loop

- [ ] Select crtfy Student work item.
- [ ] Use approved template/message/call script.
- [ ] Send request to Computer Instruments.
- [ ] SMS/call/reminder/callback executes.
- [ ] Status/outcome callback returns.
- [ ] Student 360 timeline updates.
- [ ] Next follow-up updates.
- [ ] Today's Work queues update.
- [ ] Reporting shows communication impact.

### Capabilities

- [ ] Provider configuration.
- [ ] SMS send.
- [ ] Call workflow.
- [ ] Reminder workflow.
- [ ] Callback capture.
- [ ] Delivery status.
- [ ] Failed delivery.
- [ ] Response/call outcome.
- [ ] Opt-out/consent tracking.
- [ ] Quiet hours.
- [ ] Message audit.
- [ ] Campaign enrollment from work queues.
- [ ] Bulk outreach.

Do not build before contract:

- [x] Current app supports `logOnly`-style manual outreach logging.
- [ ] Computer Instruments contract finalized.
- [ ] Security review completed.
- [ ] Consent and opt-out requirements approved.
- [ ] Callback payload shape agreed.

Phase 8 exit criteria:

- [ ] Counselor logs outreach from work item.
- [ ] Message/call is sent through Computer Instruments.
- [ ] Callback updates Student 360 timeline.
- [ ] Work queues update based on outcome.
- [ ] Reporting includes communication impact.

---

## Cross-Phase Technical Checklist

### Backend Durability

- [ ] Every optimistic frontend action has a durable backend endpoint.
- [ ] Every durable action writes an audit event.
- [ ] Every event can be included in Student 360 timeline.
- [ ] Every blocker can appear in Today's Work.
- [ ] Every operational event can roll up into reporting.

### Data Quality

- [ ] Student identity deduplication.
- [ ] Prospect-to-applicant conversion without duplicate records.
- [ ] Source attribution retained through lifecycle changes.
- [ ] Owner history retained.
- [ ] Stage history retained.
- [ ] Document lineage retained.
- [ ] Trust resolution retained.

### Reporting Readiness

- [ ] Stage history table.
- [ ] Interaction history table.
- [ ] Handoff history table.
- [ ] Checklist status history table.
- [ ] Document processing history table.
- [ ] Trust case history table.
- [ ] Communication delivery history table.
- [ ] Recruitment source/event history table.

### Demo Readiness

- [ ] Seed demo tenant.
- [ ] Seed counselor user.
- [ ] Seed processor user.
- [ ] Seed reviewer user.
- [ ] Seed trust analyst user.
- [ ] Seed financial aid user.
- [ ] Seed leadership user.
- [ ] Seed inquiry, prospect, applicant, incomplete, complete, admitted, deposited, and registered students.
- [ ] Seed transcript upload examples.
- [ ] Seed trust case example.
- [ ] Seed transfer equivalency example.
- [ ] Seed financial aid blocker example.
- [ ] Seed handoff SLA example.
- [ ] Seed recruitment event example.

---

## Recommended Build Order From Here

1. Finish durable backend persistence and audit for Phase 1 frontend workflows.
2. Finish document extraction abstraction and trust case workflow.
3. Harden portal and partner API for Jenzabar-ready demos.
4. Make Ready for Review and Decision Packet backend-backed.
5. Make yield, melt, handoff, and post-admit readiness fully persistent and reportable.
6. Add executive ROI dashboard.
7. Add governed AI summaries and draft generation.
8. Integrate Computer Instruments only after provider contract, consent, and callback requirements are stable.
