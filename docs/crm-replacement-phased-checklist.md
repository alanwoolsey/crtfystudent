# crtfy Student CRM Replacement Phased Checklist

Last updated: 2026-06-21

## Purpose

This checklist turns the broader product strategy into an implementation plan for making `crtfy Student` a focused admissions CRM and operating platform that can replace Slate, Element451, or Salesforce for admissions teams without becoming a full marketing automation suite.

The execution pace will be faster than the roadmap dates in the source strategy. Treat the phase numbers as sequencing, not calendar commitments. Several capabilities already exist in the current app and should be hardened rather than rebuilt.

Status key:

- `[x]` Built or substantially present.
- `[~]` Partially built, frontend-ready, or backed by fallback behavior.
- `[ ]` Not built or needs full backend/integration implementation.

## Positioning

`crtfy Student` replaces bloated admissions CRMs with a focused, easy-to-use admissions intelligence platform. It gives institutions the portal, pipeline, Student 360, review, decision, communication, transcript extraction, fraud detection, governed AI, and enrollment-readiness workflows needed to move students from first interest to registered without forcing admissions teams into a complex enterprise CRM.

The product should own:

- [x] Admissions CRM.
- [~] Applicant portal.
- [x] Student 360.
- [x] Application/checklist workflow.
- [~] Transcript extraction.
- [~] Fraud/trust detection.
- [~] Review/decision workflow.
- [x] Counselor workbench.
- [x] Yield/deposit/melt workflow.
- [~] Communication execution control plane.
- [ ] Governed AI.
- [~] Events, lightweight.
- [~] SIS/partner integration layer.

The product should partner for:

- [ ] Broad marketing automation through HubSpot or similar.
- [ ] Advanced communication execution through Computer Instruments or provider abstraction.
- [ ] SIS official registration/academic record data.
- [ ] Financial aid, housing, bursar, and other downstream systems of record.

---

## Phase 0: Company, IP, And Partner Foundation

Goal: make the product legally and commercially clean before scaling as a replacement platform.

### Deliverables

- [ ] crtfy Student entity and cap table.
- [ ] Founder/IP assignment.
- [ ] Freedom / Shamrock / crtfy asset agreement.
- [ ] Rights to extraction engine.
- [ ] Rights to admissions portal.
- [ ] Rights to transcript fraud detection.
- [ ] Rights to document fraud expansion.
- [ ] Rights to crtfy AI governance.
- [ ] Rights to existing customer targeting.
- [ ] Rights to EAB/Jenzabar opportunity path.
- [ ] Shamrock reseller agreement.
- [ ] Direct sales rights.
- [ ] Other reseller rights.
- [ ] SAFE/funding package.
- [ ] Clean product ownership statement.

### Exit Criteria

- [ ] crtfy Student can sell direct.
- [ ] crtfy Student can be resold by Shamrock and approved partners.
- [ ] crtfy Student can integrate or white-label through SIS partners.
- [ ] Product ownership is clear enough for enterprise buyers and investors.

---

## Phase 1: Core Admissions CRM Replacement

Goal: build the minimum product that can replace the daily admissions CRM experience.

### 1. Admissions Pipeline

Current app supports the core pipeline. Add decision and inactive statuses needed for CRM replacement.

- [x] Inquiry.
- [x] Prospect.
- [x] Applicant.
- [x] Incomplete.
- [x] Complete.
- [~] Ready for Review.
- [ ] Decisioned.
- [x] Admitted.
- [x] Deposited/Committed.
- [x] Registered.
- [ ] Denied.
- [ ] Waitlisted.
- [ ] Deferred.
- [ ] Withdrawn.
- [ ] Cancelled.
- [ ] Inactive.
- [ ] Admitted with condition.

Implementation checklist:

- [ ] Update canonical stage constants.
- [ ] Update Student 360 stage display.
- [ ] Update Students list filters.
- [ ] Update Today's Work buckets.
- [ ] Update Reporting funnel.
- [ ] Add backend stage transition model.
- [ ] Add stage history.
- [ ] Audit every stage change.

### 2. Student 360 As CRM Record

Current Student 360 is close to the desired replacement record. Expand and harden.

Tabs:

- [x] Overview.
- [ ] Profile.
- [ ] Application.
- [x] Timeline.
- [~] Communications.
- [x] Checklist.
- [x] Documents.
- [~] Transcript Intelligence.
- [x] Trust / Fraud.
- [~] Review.
- [x] Decisions.
- [x] Yield / Deposit.
- [x] Handoff.
- [x] Recruitment Source.
- [ ] Audit.

Implementation checklist:

- [ ] Split profile/application fields out of Overview where useful.
- [ ] Add `Application` tab with answers, status, submitted date, application type, term, and program.
- [ ] Add `Transcript Intelligence` tab or rename/expand current equivalency and academic signal areas.
- [ ] Add `Communications` tab or fold current Outreach + communication history into a clearer CRM-style surface.
- [ ] Add `Audit` tab for permitted staff.
- [ ] Ensure every tab can load from backend state after refresh.

### 3. Today's Work

Current app has counselor workbench and several work sections. Extend queue coverage for replacement positioning.

Queues:

- [x] New inquiries.
- [x] Overdue follow-ups.
- [x] Incomplete applications.
- [x] Missing transcript via checklist/outreach.
- [x] Missing requirement via checklist/outreach.
- [~] Documents needing review.
- [x] Trust exceptions.
- [x] Ready for review.
- [ ] Decision pending.
- [x] Admitted no deposit.
- [x] Deposited not registered.
- [x] Open handoffs.

Implementation checklist:

- [ ] Add `Decision pending` bucket.
- [ ] Add `Documents needing review` bucket if backend returns document-review work separately.
- [ ] Add backend queue reason codes for each bucket.
- [ ] Add SLA color/aging per bucket.
- [ ] Make every work item deep-link to the exact Student 360 tab.

### 4. Interactions And Activities

- [x] Call.
- [x] Email.
- [x] SMS/text.
- [x] Meeting.
- [x] Note.
- [x] Event/recruitment activity.
- [x] Handoff.
- [~] Review activity.
- [~] Trust activity.
- [~] System activity.

Implementation checklist:

- [ ] Add backend interaction entity if not fully complete.
- [ ] Load interactions from backend on Student 360.
- [ ] Add activity source: manual, system, integration, AI, provider callback.
- [ ] Add activity direction for communications: inbound/outbound/internal.
- [ ] Audit creates and edits.

### 5. Ownership And Next Action

Every active student should have:

- [x] Owner.
- [x] Stage.
- [x] Blocker.
- [x] Next action.
- [x] Next follow-up date.
- [x] Last contact.
- [x] Last activity.
- [x] Priority.
- [x] Risk.

Implementation checklist:

- [ ] Backend owner assignment.
- [ ] Ownership history.
- [ ] Bulk owner reassignment.
- [ ] Owner workload reporting.
- [ ] Required next action validation for active students.

### Phase 1 Exit Demo

- [x] Counselor logs in.
- [x] Counselor sees Today's Work.
- [x] Counselor opens a stuck applicant.
- [x] Counselor sees missing transcript.
- [x] Counselor logs contact.
- [x] Counselor sets next follow-up.
- [x] Counselor creates handoff.
- [~] Counselor moves student forward.
- [~] Leadership dashboard updates.
- [ ] All changes persist and audit across users.

---

## Phase 2: Applicant Portal Replacement

Goal: replace the front-door admissions intake experience.

### 1. Prospect Portal

- [x] Prospect portal route exists.
- [~] Inquiry/prospect frontend flow.
- [ ] Inquiry form persistence.
- [ ] Program interest.
- [ ] Contact information.
- [ ] Source tracking.
- [ ] Consent/contact preferences.
- [ ] Event interest placeholder.
- [ ] Application-start CTA.

### 2. Application Portal

- [ ] Configurable application form.
- [ ] Program-specific requirements.
- [ ] Document upload.
- [ ] Application status.
- [ ] Checklist status.
- [ ] Missing item visibility.
- [ ] Submit application.
- [ ] Save and resume.
- [ ] Applicant profile updates.
- [ ] Parent/family placeholder.
- [ ] Payment integration placeholder.

### 3. Portal Admin

- [ ] Branded portal settings.
- [ ] Custom fields.
- [ ] Program list.
- [ ] Requirement templates.
- [ ] Checklist rules.
- [ ] Application deadlines.
- [ ] Status messages.
- [ ] Confirmation pages.
- [ ] Email/SMS template triggers, log-only at first.

### 4. White-Label / Partner Mode

- [ ] Tenant branding.
- [ ] Partner branding toggle.
- [ ] Embedded portal mode.
- [ ] API-first submission.
- [ ] Webhook events.
- [ ] Iframe/hosted link options.
- [ ] External application ID mapping.

### Phase 2 Exit Demo

- [ ] Student starts application.
- [ ] Student uploads transcript.
- [ ] Portal shows checklist.
- [ ] crtfy creates Student 360.
- [ ] Counselor sees applicant in Today's Work.
- [ ] Document extraction begins.

---

## Phase 3: Transcript Extraction And Document Intelligence

Goal: make crtfy better than Slate, Element451, and Salesforce where they are weakest.

### 1. Extraction Engine Abstraction

- [ ] Define extraction provider interface.
- [ ] Add provider config per tenant.
- [ ] Support Python engine.
- [ ] Support Freedom C# engine if licensed/contributed.
- [ ] Support future partner engines.
- [ ] Normalize provider output into one document result schema.

Normalized output:

- [ ] Student identity.
- [ ] School/institution.
- [ ] Transcript type.
- [ ] Courses.
- [ ] Terms.
- [ ] Grades.
- [ ] Credits.
- [ ] GPA.
- [ ] Degree/program indicators.
- [ ] Extraction confidence.
- [ ] Document metadata.
- [ ] Evidence/page references.
- [ ] Warnings/errors.

### 2. Document Queue

- [x] Uploaded.
- [~] Processing.
- [~] Processed.
- [x] Needs review.
- [~] Matched.
- [~] Unmatched.
- [x] Exception.
- [~] Rejected.
- [ ] Duplicate.
- [x] Trust flagged.

Implementation checklist:

- [ ] Add duplicate document detection.
- [ ] Add processor assignment.
- [ ] Add approve extraction action.
- [ ] Add correction workflow.
- [ ] Add replace document action.
- [ ] Add extraction run details view for processors.

### 3. Transcript Viewer

- [x] Original document view when backend returns content.
- [x] Extracted fields/courses.
- [x] Confidence display.
- [~] Evidence references.
- [ ] Correction workflow.
- [~] Reprocess.
- [ ] Replace.
- [ ] Approve extraction.

### 4. Checklist Automation

Extraction should update:

- [ ] Transcript received.
- [ ] Official/unofficial status.
- [ ] College/high school transcript.
- [ ] Course prerequisites.
- [ ] GPA.
- [ ] Test scores when present.
- [ ] Missing transcript items.

### Phase 3 Exit Demo

- [ ] Transcript uploaded.
- [ ] Extraction runs.
- [ ] Courses appear.
- [ ] Checklist updates.
- [ ] Confidence shown.
- [ ] Exception routed to processor.
- [ ] Student 360 updates automatically.

---

## Phase 4: Trust And Fraud Center

Goal: make trust/fraud a product category, not a hidden feature.

Important implementation note: transcript fraud detection already has an API available. The product should pass the transcript/document to that API and receive a JSON result, then normalize and use those results in Trust Center, Student 360, decision blocking, and reporting.

### 1. Transcript Fraud API Integration

- [ ] Define fraud API endpoint configuration per environment.
- [ ] Define request contract for transcript/document payload.
- [ ] Support sending uploaded transcript file, document ID, or extracted transcript payload based on fraud API requirement.
- [ ] Include tenant ID, student ID, document ID, upload source, and extraction run ID in metadata.
- [ ] Call fraud API after transcript upload/extraction completes.
- [ ] Retry transient fraud API failures.
- [ ] Store raw fraud API JSON response.
- [ ] Normalize fraud API response into product trust schema.
- [ ] Version the fraud API response schema.
- [ ] Show fraud API status in document processing timeline.
- [ ] Add failure state: fraud check unavailable.
- [ ] Do not block all processing if fraud API is unavailable unless tenant policy requires it.

Expected normalized trust result:

```json
{
  "documentId": "",
  "studentId": "",
  "trustStatus": "clear|requires_review|blocked|unavailable",
  "riskLevel": "low|medium|high|critical",
  "confidence": 0.0,
  "signals": [
    {
      "code": "metadata_mismatch",
      "label": "PDF metadata requires review",
      "severity": "medium",
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

### 2. Fraud API Result Usage

- [ ] Create trust case automatically when `trustStatus = requires_review`.
- [ ] Quarantine or block document when `trustStatus = blocked` or risk is critical.
- [ ] Add Trust / Fraud event to Student 360 timeline.
- [ ] Show trust badge on Student 360 Overview.
- [ ] Show detailed trust signals only to authorized users.
- [ ] Show safe message to unauthorized users: `Document requires trust review`.
- [ ] Block decision release if trust result requires review or blocked.
- [ ] Surface trust exceptions in Today's Work.
- [ ] Include trust cases in Reporting.
- [ ] Include trust status in Ready for Review.
- [ ] Include trust status in Decision Packet.
- [ ] Support manual override by authorized trust analyst.
- [ ] Audit fraud API result receipt.
- [ ] Audit trust case creation.
- [ ] Audit trust analyst resolution.

### 3. Transcript Fraud Signals

The existing fraud API may return its own signal names. Map them into product-friendly trust signals.

- [ ] Manipulated PDF metadata.
- [ ] Inconsistent layout/template.
- [ ] School identity mismatch.
- [ ] Suspicious grade/credit changes.
- [ ] Altered totals.
- [ ] Unusual course patterns.
- [ ] Duplicate transcript patterns.
- [ ] Inconsistent student identity.
- [ ] Extraction confidence conflict.
- [ ] Known institution profile mismatch.
- [ ] Unofficial/unsupported source risk.

Wording rules:

- [ ] Use `trust signal`.
- [ ] Use `requires review`.
- [ ] Use `confidence`.
- [ ] Avoid accusing language such as `fraudulent` in general counselor-facing UI.
- [ ] Reserve high-risk language for authorized trust users.

### 4. Document Fraud Expansion

Design the trust model so the same JSON/result workflow can support:

- [ ] Recommendation letters.
- [ ] Residency documents.
- [ ] Financial documents.
- [ ] Identity documents.
- [ ] Essays.
- [ ] International credentials.
- [ ] Health program documents.
- [ ] Military/veteran documents.

### 5. Trust Case Workflow

- [~] Trust Center exists.
- [x] Student 360 Trust tab exists.
- [x] Sensitivity gates exist.
- [ ] Open trust case.
- [ ] Assign reviewer.
- [ ] Set risk level.
- [ ] Review evidence.
- [ ] Add resolution.
- [ ] Quarantine document.
- [ ] Request replacement.
- [ ] Block decision release.
- [ ] Clear decision release.
- [ ] Preserve audit trail.

### Phase 4 Exit Demo

- [ ] Document is uploaded.
- [ ] Extraction completes.
- [ ] Fraud API receives transcript.
- [ ] Fraud API returns JSON result.
- [ ] crtfy normalizes result.
- [ ] Trust case opens if needed.
- [ ] Decision release is blocked if needed.
- [ ] Trust analyst reviews evidence.
- [ ] Case is cleared or replacement is requested.
- [ ] Audit record is preserved.

---

## Phase 5: Review, Reader, And Decision Studio

Goal: close the Slate replacement gap.

### 1. Ready For Review Queue

Students enter when:

- [ ] Required checklist complete.
- [ ] Documents processed.
- [ ] Trust clear or reviewed.
- [ ] Application submitted.
- [ ] Program requirements met.

Implementation checklist:

- [x] Ready for Review page exists.
- [~] Readiness logic exists.
- [ ] Backend review-ready rule engine.
- [ ] Reviewer assignment.
- [ ] Reviewer workload.
- [ ] Review due dates.
- [ ] Escalation.

### 2. Reader Experience

Reader packet:

- [x] Student profile.
- [~] Application answers.
- [x] Documents.
- [x] Transcript summary.
- [x] Extracted courses.
- [x] Trust status.
- [x] Checklist readiness.
- [x] Notes.
- [ ] Scoring/rubric.
- [ ] Recommendation.

### 3. Review Assignment

- [ ] Assign reviewer.
- [ ] Assign faculty reviewer.
- [ ] Assign program reviewer.
- [ ] Assign second reviewer.
- [ ] Due dates.
- [ ] Reviewer workload.
- [ ] Escalation.

### 4. Rubrics

- [ ] Academic fit.
- [ ] Program fit.
- [ ] Transcript strength.
- [ ] Prerequisites.
- [ ] Essay/interview.
- [ ] Recommendation.
- [ ] Overall rating.
- [ ] Admit/deny/waitlist/conditional recommendation.

### 5. Decision Studio

- [x] Decision Studio route exists.
- [x] Student 360 Decisions tab exists.
- [ ] Decision recommendation backend.
- [ ] Decision blockers.
- [ ] Final decision.
- [ ] Decision release permission.
- [ ] Decision letter/template placeholder.
- [ ] Decision audit.
- [ ] Batch release later.

### Phase 5 Exit Demo

- [ ] Applicant becomes complete.
- [ ] Applicant appears in Ready for Review.
- [ ] Reviewer opens packet.
- [ ] Reviewer completes rubric.
- [ ] Decision director releases decision.
- [ ] Admitted student appears in yield workflow.

---

## Phase 6: Communications Control Plane

Goal: build communication workflow now and plug in Computer Instruments later.

### 1. Provider Abstraction

- [ ] `log-only` provider.
- [ ] SMTP/email future provider.
- [ ] SMS future provider.
- [ ] HubSpot future provider.
- [ ] Computer Instruments future provider.
- [ ] Jenzabar/SIS communication future provider.
- [ ] Tenant provider configuration.
- [ ] Provider delivery callback model.

### 2. Communication History

Track:

- [x] Channel.
- [ ] Direction.
- [x] Template.
- [x] Subject/message.
- [x] Status.
- [x] Actor.
- [ ] Provider.
- [ ] Provider ID.
- [x] Next follow-up.
- [ ] Consent.
- [ ] Audit ID.

### 3. Template Library

- [x] Inquiry response.
- [x] Application started/application help.
- [x] Missing transcript.
- [x] Missing document.
- [ ] Application complete.
- [ ] Review started.
- [x] Admitted.
- [x] Deposit reminder.
- [x] Orientation reminder.
- [x] Registration incomplete.
- [ ] Trust document replacement request.

### 4. Manual Execution

- [~] Generate draft through templates.
- [ ] Copy message button.
- [x] Log as email/SMS/call.
- [x] Set next follow-up.
- [x] Update timeline.

### 5. HubSpot Integration Path

- [ ] Lead sync.
- [ ] Campaign source.
- [ ] Marketing contact status.
- [ ] Lifecycle stage.
- [ ] Email engagement summary.
- [ ] Campaign attribution.
- [ ] Form submissions.
- [ ] Handoff to crtfy when admissions action starts.

### Phase 6 Exit Demo

- [x] Counselor chooses missing transcript template.
- [x] Draft appears.
- [ ] Counselor copies message.
- [x] Counselor logs communication.
- [x] Next follow-up appears in Today's Work.
- [ ] Same workflow can be configured to send through a provider later.

---

## Phase 7: Governed AI Built Into Workflow

Goal: make AI useful, safe, and better than generic chat.

### 1. Student Summary

- [ ] `Summarize student status` button.
- [ ] Stage.
- [ ] Blocker.
- [ ] Checklist.
- [ ] Transcript status.
- [ ] Trust status.
- [ ] Last interaction.
- [ ] Next action.
- [ ] Open handoffs.
- [ ] Recommended step.

### 2. Next-Best Action

AI recommends:

- [ ] Contact student.
- [ ] Request transcript.
- [ ] Route to registrar.
- [ ] Escalate trust review.
- [ ] Assign reviewer.
- [ ] Send deposit reminder.
- [ ] Create financial aid handoff.

### 3. Draft Communication

- [ ] Missing document messages.
- [ ] Admitted student follow-up.
- [ ] Deposit reminder.
- [ ] Registration reminder.
- [ ] Trust replacement request.
- [ ] Counselor call script.

### 4. Review Assistant

- [ ] Transcript summary.
- [ ] Prerequisites.
- [ ] Course patterns.
- [ ] Missing academic evidence.
- [ ] Trust concerns.
- [ ] Decision blockers.

### 5. Policy And Audit

Every AI action should log:

- [ ] User.
- [ ] Student.
- [ ] Prompt/template.
- [ ] Source data used.
- [ ] Output.
- [ ] Policy decision.
- [ ] Approval state.
- [ ] Timestamp.

Governance rules:

- [ ] AI respects RBAC.
- [ ] AI respects sensitivity tiers.
- [ ] AI respects tenant scope.
- [ ] Human approval required before external-facing use.
- [ ] No direct external send until provider integration is approved.

### Phase 7 Exit Demo

- [ ] Open Student 360.
- [ ] AI summarizes student.
- [ ] AI recommends next action.
- [ ] AI drafts message.
- [ ] Policy check runs.
- [ ] Counselor approves/logs.
- [ ] Audit trail is created.

---

## Phase 8: Yield, Deposit, Melt, And Enrollment Readiness

Goal: own post-admit movement competitors often leave scattered.

### 1. Yield Board

- [x] Admitted no recent activity.
- [x] Admitted missing deposit.
- [x] Scholarship-sensitive.
- [x] High-value transfer.
- [~] Admitted with blocker.
- [x] High-likelihood no action.

### 2. Deposit / Melt Board

- [x] Deposited all clear.
- [x] Missing final transcript.
- [x] Missing orientation.
- [x] Missing advising.
- [x] Registration incomplete.
- [x] Financial aid blocker.
- [x] Housing blocker.
- [x] Bursar hold placeholder.

### 3. Post-Admit Milestones

- [x] Financial aid package.
- [x] Scholarship.
- [x] Deposit.
- [x] Housing.
- [x] Orientation.
- [x] Advising.
- [x] Registration.
- [x] Bursar/account.
- [x] International docs.
- [x] Veteran benefits.
- [x] Accessibility.
- [ ] Backend authoritative milestone persistence verified.
- [ ] SIS registration signal integration.
- [ ] Financial aid package integration.
- [ ] Housing/orientation integration.
- [ ] Bursar hold integration.

### 4. Cross-Office Handoffs

- [x] Financial aid.
- [x] Registrar.
- [x] Advising.
- [x] Housing.
- [x] Bursar.
- [x] Academic department.
- [x] International office through custom target/future extension.
- [ ] Athletics target.
- [x] Student success.

### Phase 8 Exit Demo

- [x] Admitted student has not deposited.
- [x] Counselor sees blocker.
- [ ] AI recommends action.
- [x] Handoff to financial aid created.
- [x] Milestone updated.
- [~] Leadership sees melt risk reduced.

---

## Phase 9: Reporting, ROI, And Executive Control

Goal: make leadership believe crtfy is measurable and operational.

### Core Reports

- [x] Inquiry-to-registered funnel.
- [~] Stage aging.
- [x] Incomplete-to-complete conversion.
- [x] Complete-to-decision turnaround.
- [x] Admit-to-deposit conversion.
- [ ] Deposit-to-registration conversion.
- [x] Melt risk.
- [x] Counselor workload.
- [ ] Reviewer workload.
- [ ] Document processing volume.
- [ ] Extraction accuracy/confidence.
- [ ] Trust/fraud cases.
- [x] Handoff SLA.
- [x] Source performance.
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

- [ ] CSV export.
- [ ] PDF snapshot.
- [ ] Scheduled email later.
- [~] API reporting endpoints.

### Phase 9 Exit Demo

- [x] VP Enrollment sees funnel health.
- [~] VP sees where students are stuck.
- [x] VP sees counselor workload.
- [ ] VP sees reviewer workload.
- [~] VP sees document/fraud impact.
- [~] VP sees conversion and ROI trend.

---

## Phase 10: Advanced Replacement Features

Goal: close remaining Slate/Salesforce gaps without becoming bloated.

### 1. Basic Event Management

- [x] Campus visit activity.
- [x] Open house/webinar activity.
- [x] High school visit activity.
- [x] College fair activity.
- [ ] Event registration.
- [ ] Attendance.
- [x] Follow-up task.
- [x] Source attribution.

### 2. Territory Management

- [x] Counselor territories placeholder.
- [x] High schools/source schools.
- [x] Partner schools.
- [x] Transfer partners.
- [x] Source schools.
- [ ] Recruiter assignments.
- [ ] Territory dashboards.

### 3. Duplicate Management

- [ ] Duplicate detection.
- [ ] Merge workflow.
- [ ] Source priority.
- [ ] Audit trail.

### 4. Data Import/Export

- [ ] CSV import.
- [ ] API import.
- [ ] SIS import.
- [ ] HubSpot import.
- [ ] Slate/Salesforce migration import.
- [ ] Export to SIS.
- [ ] Webhooks.

### 5. Admin Configuration

- [~] Roles.
- [~] Permissions.
- [ ] Stages.
- [ ] Checklist templates.
- [ ] Programs.
- [ ] Decision rules.
- [ ] Review rubrics.
- [ ] Portal branding.
- [ ] Communication templates.
- [ ] Fraud rules.
- [ ] Integrations.

### 6. Migration Toolkit

Build importers for:

- [ ] Students.
- [ ] Prospects.
- [ ] Applications.
- [ ] Document metadata.
- [ ] Checklist items.
- [ ] Interactions.
- [ ] Decisions.
- [ ] Events.
- [ ] Source codes.
- [ ] Users/owners.

---

## Phase 11: Computer Instruments Integration

Goal: turn communication control plane into best-in-class execution after contract is ready.

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

### Execution Loop

- [ ] crtfy identifies action.
- [ ] AI/template drafts message or call script.
- [ ] Policy/approval check.
- [ ] Computer Instruments executes.
- [ ] Response/status returns.
- [ ] Student 360 updates.
- [ ] Today's Work updates.
- [ ] ROI dashboard updates.

---

## Replacement-Ready Must-Haves

Before claiming full replacement for Slate/Salesforce/Element451 admissions workflows:

- [ ] Applicant portal.
- [ ] Configurable application.
- [x] Student 360.
- [x] Admissions pipeline.
- [x] Checklist.
- [x] Documents.
- [~] Transcript extraction.
- [~] Application review.
- [~] Decision workflow.
- [x] Communication history/templates.
- [x] Counselor workbench.
- [x] Reporting.
- [x] Roles/permissions.
- [~] Integrations/import/export.
- [~] Audit.

Differentiators:

- [~] Transcript extraction.
- [~] Fraud/trust detection through existing fraud API.
- [ ] Governed AI.
- [ ] Better communication execution.
- [x] Simpler UX.
- [x] Handoff accountability.
- [x] Post-admit readiness.
- [x] Transfer/course equivalency.

Partnered:

- [ ] Marketing automation through HubSpot.
- [ ] Advanced communications through Computer Instruments.
- [ ] SIS/financial/housing/bursar via integrations.

---

## Immediate Fast-Track Priorities

Because execution will move faster than the roadmap timelines, prioritize these next:

1. [ ] Add missing pipeline statuses and update funnel/reporting.
2. [ ] Build Application tab and applicant portal persistence.
3. [ ] Wire transcript fraud API after extraction/upload.
4. [ ] Normalize fraud API JSON into Trust Center schema.
5. [ ] Auto-create trust cases and decision release blockers from fraud results.
6. [ ] Harden backend persistence for interactions, communications, handoffs, milestones, and work queues.
7. [ ] Add reviewer assignment, rubric, and decision release workflow.
8. [ ] Add copy-message action and communication provider abstraction.
9. [ ] Add reporting export and ROI dashboard.
10. [ ] Add duplicate detection and migration/import tools.
