# crtfy Student Training Guide

Last updated: 2026-05-05

## Purpose

This guide trains staff to use crtfy Student for transcript-led admissions operations. It covers the common work patterns for admissions counselors, document processors, evaluators, directors, trust analysts, administrators, leadership users, and integration staff.

Use this guide for:

- New user onboarding.
- Role-specific training.
- Refresher sessions before go-live.
- Standard operating procedure documentation.
- Internal support and troubleshooting.

## Product Overview

crtfy Student is an admissions operating system for transcript-led enrollment workflows. The product helps teams move students from prospect and application intake through document processing, checklist completion, readiness review, decision packet approval, yield, melt prevention, and downstream handoff.

Core concepts:

- Student 360 is the central student record.
- Today's Work is the daily prioritization queue.
- Documents Queue is the transcript and admissions-document processing workspace.
- Decision Studio is the recommendation and decision-packet review workspace.
- Trust Center is the trust, provenance, and fraud-sensitive case workspace.
- Admin is the access, user, and work-projection operations workspace.
- Agent-backed workflows provide normalized run results, rationale, action history, and routing guidance.

## Training Outcomes

After training, users should be able to:

- Sign in and understand their tenant, role, permissions, and sensitivity access.
- Navigate the application shell and find the correct workspace for a task.
- Use Today's Work to prioritize student movement.
- Open and interpret Student 360.
- Upload, monitor, reprocess, replace, quarantine, release, index, confirm, or reject documents when authorized.
- Understand document-agent, trust-agent, decision-agent, and orchestrator-agent outcomes.
- Use Decision Studio to generate and review recommendations.
- Use Trust Center to review, block, unblock, assign, escalate, and resolve cases.
- Use yield and melt views to protect admitted-student conversion.
- Use Admin to manage users and monitor work projection health.
- Know what to do when a page, queue, document, or agent run reports an error.

## Recommended Training Plan

### Session 1: Orientation

Audience: all users

Duration: 45 to 60 minutes

Topics:

- Product purpose.
- Main navigation.
- User profile and access model.
- Student 360 overview.
- Today's Work overview.
- Basic search and filtering.

Hands-on practice:

1. Sign in.
2. Open User Profile.
3. Confirm assigned roles, permissions, and sensitivity tiers.
4. Open Today's Work.
5. Open one student from a queue.
6. Return to the queue using navigation.

### Session 2: Admissions Operations

Audience: counselors, processors, managers

Duration: 60 to 90 minutes

Topics:

- Today's Work.
- Incomplete Applications.
- Student checklist.
- Transcript upload.
- Document exceptions.
- Routing students to document, trust, or decision ownership.

Hands-on practice:

1. Filter Today's Work.
2. Open a student with a blocker.
3. Review checklist status.
4. Mark an allowed checklist item complete.
5. Upload or review a transcript.
6. Route a student using a backend route recommendation.

### Session 3: Document Operations

Audience: admissions processors, operations staff, administrators

Duration: 60 to 90 minutes

Topics:

- Documents Queue views.
- Enriched exception reasons.
- Stored reprocess.
- Replacement-file reprocess.
- Agent run polling.
- Action history.
- Match confirmation and rejection.
- Indexing, quarantine, and release.

Hands-on practice:

1. Open Documents Queue.
2. Filter to Processing failed or Needs human review.
3. Open exception details.
4. Interpret run status, transcript status, result code, and suggested action.
5. Reprocess an existing file or replace a file.
6. Confirm success only when both agent run and transcript status complete.

### Session 4: Decision Review

Audience: reviewers, evaluators, directors

Duration: 60 minutes

Topics:

- Ready for Review.
- Decision Studio list.
- Decision packet details.
- Decision snapshot.
- Recommendation confidence and rationale.
- Last reviewed snapshot.
- Accept recommendation.
- Request more evidence.

Hands-on practice:

1. Open Decision Studio.
2. Open a decision packet.
3. Generate a recommendation.
4. Review fit, credit estimate, confidence, rationale, trust posture, and evidence.
5. Accept the recommendation or request evidence.
6. Record the snapshot version.

### Session 5: Trust Review

Audience: trust analysts, directors, authorized administrators

Duration: 60 to 90 minutes

Topics:

- Trust Center queue.
- Trust risk level.
- Trust summary, rationale, and recommended action.
- Trust blocked state.
- Trust-agent latest outcome.
- Assign, block, unblock, escalate, and resolve.

Hands-on practice:

1. Open Trust Center.
2. Select a trust case.
3. Review summary, rationale, recommended action, and latest result code.
4. Add notes.
5. Assign or escalate the case.
6. Block or unblock progression when appropriate.
7. Resolve the case when evidence supports resolution.

### Session 6: Administration

Audience: tenant admins, operations leads

Duration: 60 to 90 minutes

Topics:

- User and access management.
- Roles, permissions, sensitivity tiers, and scopes.
- Work projection status.
- Projection rebuild.
- Projection jobs.
- Retry and cancel operations.
- Operational checks after deployment or tenant warm-up.

Hands-on practice:

1. Open Admin.
2. Review users and access details.
3. Open work projection status.
4. Run a projection chunk when appropriate.
5. Review projection jobs.
6. Retry a failed job.
7. Confirm projection readiness.

## Access And Security Basics

The application is tenant-scoped. Every protected request uses the authenticated session and tenant context.

Users should know:

- Their visible navigation depends on roles, permissions, sensitivity tiers, and scopes.
- Missing a menu item usually means the user does not have access.
- Academic records may require the `academic_record` sensitivity tier.
- Trust and fraud-sensitive data may require the `trust_fraud_flags` sensitivity tier.
- Final decision release requires specific permissions.
- The User Profile page shows the user's access context.

Common role keys:

- `admissions_counselor`
- `admissions_processor`
- `reviewer_evaluator`
- `decision_releaser_director`
- `trust_analyst`
- `registrar_transfer_specialist`
- `financial_aid`
- `read_only_leadership`
- `integration_service`

## Navigation Basics

The authenticated shell includes:

- Sidebar navigation.
- Breadcrumb.
- Global search.
- Transcript upload button.
- Upload progress modal.
- Batch upload status chip.
- Notifications placeholder.
- User menu.

Search behavior:

- Search terms apply to searchable pages through `q` parameters.
- Searchable areas include Today's Work, Prospect Portal, Student 360, Documents Queue, and Exceptions Queue.

## Standard Daily Workflow For Counselors

1. Open Today's Work.
2. Review summary cards and queue buckets.
3. Start with urgent or ready-to-move students.
4. Open Student 360 for context.
5. Review checklist, readiness, documents, trust posture, and next best action.
6. Clear allowed checklist blockers.
7. Upload transcripts when a student provides a document.
8. Route the student to document, trust, or decision ownership when needed.
9. Use Admitted / Yield for admitted-student conversion.
10. Use Deposit / Melt for post-admit risk.

Counselor success criteria:

- Important students are accounted for.
- Blockers are either resolved or clearly routed.
- Outreach is based on evidence, not guesswork.
- Students closest to completion receive attention first.

## Today's Work Training

Today's Work is the main daily operating queue. It organizes students by what can be moved now.

Key areas:

- Summary cards.
- Blocker mix chart.
- Work funnel chart.
- Priority mix chart.
- Backend-grouped buckets when available.
- Student rows with owner, readiness, priority, reason to act, suggested action, and agent context.

Important fields:

- Current owner agent.
- Current stage.
- Recommended agent.
- Queue group.
- Priority score.
- Blocking items.
- Document-agent result code.
- Trust-agent result code.
- Decision-agent result code.

Recommended behavior:

1. Review high-level counts first.
2. Inspect urgent groups before lower-priority groups.
3. Use route recommendations when unsure which team should own the next action.
4. Add a note when routing needs explanation.
5. Refresh after routing to confirm current owner and stage update.

Routing destinations:

- `document_agent`: document processing or transcript issue.
- `trust_agent`: trust, fraud, provenance, or release-blocking risk.
- `decision_agent`: recommendation or decision review.

## Student 360 Training

Student 360 is the system-of-record view for one applicant or prospect.

Use it to answer:

- Who is the student?
- What program or institution goal are they pursuing?
- What stage are they in?
- What is blocking movement?
- What documents are attached?
- Is the student ready for decision review?
- Is there a trust hold?
- What is the next best action?

Primary tabs:

- Overview.
- Documents.
- Decisions.
- Trust.
- Yield / Deposit.
- Handoff.

Checklist workflow:

1. Open the Checklist area.
2. Review completion percentage and blockers.
3. Read the next-best action.
4. Mark items complete only when verified.
5. Watch readiness and queue placement update after checklist movement.

Sensitivity behavior:

- Academic details may be hidden without academic sensitivity access.
- Trust details may be hidden without trust/fraud sensitivity access.

## Transcript Upload Training

Users can upload transcripts from the global top bar.

Supported upload types:

- Single transcript file.
- ZIP or batch transcript package.

Upload workflow:

1. Click the global transcript upload button.
2. Choose a file.
3. Wait for upload confirmation.
4. Watch processing status.
5. For single-student matches, open the resolved student profile.
6. For batch uploads, continue working while the shell shows background status.

Expected states:

- Uploading.
- Processing.
- Completed.
- Failed.

When an upload fails:

1. Check Documents Queue.
2. Open exception details.
3. Review the reason and suggested action.
4. Reprocess the stored file or replace the file if authorized.

## Documents Queue Training

Documents Queue is the operational workspace for transcript and admissions-document processing.

Queue views:

- Received not indexed.
- Auto-matched.
- Needs human review.
- Processing failed.
- Duplicate uploads.
- Quarantined.

Common actions:

- Confirm match.
- Reject match.
- Index document.
- Quarantine document.
- Release quarantined document.
- Reprocess stored file.
- Replace file and reprocess.
- View exception details.
- View run details.

How to read a document row:

- Document type tells what was uploaded.
- Matched student shows the linked student.
- Confidence shows matching or parser confidence where available.
- Document status shows document state.
- Transcript status shows transcript persistence state.
- Latest run status shows agent processing state.
- Reason explains the current exception.
- Suggested action tells staff what to do next.

Stored reprocess workflow:

1. Use when the original file is correct and should be retried.
2. Click Reprocess.
3. The app calls the stored reprocess endpoint.
4. Watch agent run and transcript status.
5. Treat the operation as successful only when both complete.

Replacement reprocess workflow:

1. Use when the original file is wrong, corrupted, incomplete, or outdated.
2. Click Replace file.
3. Choose the corrected transcript.
4. The app uploads replacement bytes and reruns processing.
5. Watch agent run and transcript status.
6. Read backend errors directly if either fails.

Action history:

- Use result message and result code first.
- Use tool name to understand which step ran.
- `completed` means the step finished.
- `failed` means the step failed.
- `skipped` can be neutral for optional context or linking steps when the overall run and transcript status completed.

Useful document result codes:

- `transcript_processed`
- `transcript_parsed`
- `transcript_persisted`
- `student_context_loaded`
- `checklist_item_linked`
- `student_context_unavailable`
- `document_context_unavailable`
- `document_processing_failed`

## Incomplete Applications Training

Incomplete Applications is for started applications with missing items.

Use it to:

- Find students closest to completion.
- See missing items.
- Identify stalled students.
- Open Student 360.
- Clear checklist blockers when authorized.

Recommended workflow:

1. Filter to nearly complete or high-priority students.
2. Open the student.
3. Verify missing items.
4. Complete verified checklist steps.
5. Use outreach outside the app as needed.

## Ready For Review Training

Ready for Review tracks students complete enough for evaluation or decision review.

Use it to:

- Find files ready for evaluator action.
- Watch review waiting time or SLA context.
- Confirm transfer or review context.
- Open the student profile or Decision Studio.

Recommended workflow:

1. Start with the longest-waiting or highest-priority ready students.
2. Open the student or decision packet.
3. Confirm evidence and trust posture.
4. Move the packet into decision review.

## Decision Studio Training

Decision Studio is where staff inspect, generate, review, and defend decision recommendations.

List page:

- Search and filter decision packets.
- Review student, program, status, readiness, assignment, recommendation, and update time.
- Open packet details.
- Generate recommendations where available.

Detail page:

- Load the decision snapshot.
- Load decision-agent details.
- Generate a recommendation.
- Review fit, credit estimate, confidence, rationale, evidence, trust status, and action history.
- Accept the recommendation.
- Request more evidence.
- Add review notes.
- View last reviewed snapshot.
- Confirm snapshot version for auditability.

Decision recommendation workflow:

1. Open Decision Studio.
2. Select a packet.
3. Click Generate recommendation if no current recommendation exists or if updated evidence should be considered.
4. Review recommendation confidence and rationale.
5. Review supporting evidence and trust posture.
6. Add a review note if helpful.
7. Accept recommendation or request evidence.
8. Record snapshot version when shown.

Decision review actions:

- `accept_recommendation`: approves the recommendation workflow state.
- `request_evidence`: moves the packet back for more evidence.

Useful decision result codes:

- `decision_context_assembled`
- `decision_readiness_loaded`
- `decision_trust_status_loaded`
- `decision_supporting_evidence_loaded`
- `decision_recommendation_generated`

## Trust Center Training

Trust Center is the workspace for document provenance, identity, fraud-sensitive signals, and release-blocking risk.

Queue fields:

- Student.
- Severity or risk level.
- Signal.
- Evidence or rationale.
- Status.
- Trust blocked state.
- Latest run status.
- Latest result code.
- Owner.
- Recommended action.

Details panel:

- Student and document context.
- Owner and opened date.
- Latest trust-agent outcome.
- Risk level.
- Trust summary.
- Rationale.
- Result code.
- Trust blocked state.
- Trigger event.
- Step history.

Trust actions:

- Assign.
- Block.
- Unblock.
- Escalate.
- Resolve.

Trust workflow:

1. Open Trust Center.
2. Select the highest-risk or oldest active case.
3. Review summary, rationale, and recommended action.
4. Review latest run outcome and action history.
5. Assign the case if ownership is unclear.
6. Block progression when risk should stop release or review.
7. Escalate when deeper review is required.
8. Resolve when evidence supports clearing the case.
9. Unblock only when progression is allowed.

Useful trust result codes:

- `trust_case_blocked`
- `trust_case_unblocked`
- `trust_document_quarantined`
- `trust_document_released`
- `trust_case_assigned`
- `trust_case_resolved`
- `trust_case_escalated`
- `document_match_confirmed`
- `document_match_rejected`

## Exceptions Queue Training

Exceptions Queue focuses on students stopped by trust holds, pending evidence, or review blockers.

Use it to:

- See trust-blocked students separately from other exceptions.
- Open related student records.
- Understand blocker reasons.
- Coordinate between counselor, document, trust, and decision workflows.

Recommended workflow:

1. Start with trust-blocked or high-severity items.
2. Open the student or trust case.
3. Determine whether the issue belongs to documents, trust, or decisions.
4. Route or resolve the blocker.

## Admitted / Yield Training

Admitted / Yield focuses on admitted students with conversion potential.

Use it to:

- Prioritize admitted students who need next intervention.
- Review deposit status.
- Review yield score.
- Review milestone completion.
- Review owner, last activity, program, and next step.
- Open Student 360 for follow-up context.

Recommended workflow:

1. Filter to high likelihood, missing next step, scholarship-sensitive, or no recent activity.
2. Review yield score and deposit status.
3. Open Student 360 for the student.
4. Use the next best action to guide outreach.
5. Record follow-up outside the app if the logging endpoint is not available.

## Deposit / Melt Training

Deposit / Melt focuses on admitted or deposited students at risk before enrollment.

Use it to:

- Review melt risk.
- See missing milestones.
- See owner, deposit date, last outreach, and program.
- Open Student 360.
- Prioritize interventions after deposit.

Recommended workflow:

1. Filter to at-risk students.
2. Review missing milestones.
3. Prioritize high melt risk and multiple blockers.
4. Open Student 360.
5. Coordinate intervention with the owner.

## Reporting Training

Reporting provides operational and leadership metrics.

Use it to:

- Monitor completion.
- Monitor decision speed.
- Monitor yield.
- Monitor melt.
- Review funnel and queue patterns.
- Support leadership dashboard reviews.

Recommended workflow for leadership users:

1. Review top-level metrics.
2. Compare completion, decision speed, yield, and melt.
3. Use queue pages for operational follow-up.
4. Treat reporting as a management surface, not a case-resolution surface.

## Integrations Training

Integrations explains how crtfy Student fits with school systems.

Use it to:

- Plan CRM, SIS, document store, messaging, reporting, and handoff integrations.
- Explain where crtfy Student acts as the decision layer.
- Align implementation planning with admissions operations.

Current boundary:

- This is primarily a planning and positioning surface unless live integration actions are enabled for the tenant.

## Admin Training

Admin supports user access and operational maintenance.

User access tasks:

- View users.
- Search users.
- Manage roles.
- Manage permissions.
- Manage sensitivity tiers.
- Manage scope boundaries.
- Support admin-enabled accounts.

Work projection tasks:

- View projection status.
- Rebuild one projection chunk.
- Rebuild full projection.
- List projection jobs.
- View one projection job.
- Retry a failed job.
- Cancel a running or queued job.

Healthy projection state:

- `ready` is true.
- Projected students match total students.
- Remaining students is 0.
- Current job is completed or absent.
- No unresolved current job error is present.

Projection troubleshooting:

1. If queues look empty or stale, open Admin.
2. Check projection status.
3. If projection is incomplete, rebuild a chunk or rebuild all.
4. If a job failed, read the error.
5. Retry the failed job.
6. Poll status until ready.
7. Escalate to engineering if repeated failures occur.

Projection job statuses:

- `queued`
- `running`
- `completed`
- `failed`
- `canceled`

## User Profile Training

User Profile shows the signed-in user's workspace identity.

Review it when:

- A user cannot see a page.
- A user cannot see academic data.
- A user cannot see trust data.
- A user cannot perform an action.
- A user needs to verify tenant identity.

Fields:

- Display name.
- Email.
- Tenant.
- Tenant slug.
- Tenant ID.
- Roles.
- Permissions.
- Sensitivity tiers.
- Scopes.
- Record exceptions.

## Agent Concepts For Non-Technical Users

Agents are backend workflows that return structured results to the UI. Users do not need to understand implementation details, but they should understand how to interpret outcomes.

Document Agent:

- Parses transcripts.
- Persists transcript results.
- Looks up student context.
- Links checklist items.
- Reports processing failures.

Trust Agent:

- Tracks trust flags and cases.
- Supports block, unblock, assign, resolve, and escalate actions.
- Produces trust summaries and rationale.

Decision Agent:

- Assembles decision context.
- Generates recommendations.
- Provides fit, credit estimate, confidence, rationale, and evidence.
- Persists reviewed snapshots.

Orchestrator Agent:

- Prioritizes Today's Work.
- Groups work into backend-owned buckets.
- Recommends routing hints.
- Persists orchestration runs.

Lifecycle Agent:

- Currently backend-only.
- Defines admit-to-deposit lifecycle scoring and recommendations.
- Visible UI should continue using student, yield, and melt fields until public lifecycle endpoints are added.

## How To Interpret Status

Common processing statuses:

- `queued`: waiting to start.
- `running`: in progress.
- `completed`: finished successfully.
- `failed`: finished with an error.
- `skipped`: optional step did not run; not always a failure.

Common student movement signals:

- Ready for decision: student can move to decision review.
- Needs review: a human must inspect something.
- Missing items: required evidence is still absent.
- Trust hold: progression is blocked by trust risk.
- Melt risk: admitted or deposited student may not enroll without intervention.

## Troubleshooting Guide

### User Cannot Sign In

Check:

- Correct username and password.
- Whether a new-password challenge is required.
- Whether the user is active.
- Whether tenant access is configured.

Escalate if:

- Credentials are correct but sign-in still fails.
- The user is active but receives tenant authorization errors.

### User Cannot See A Page

Check:

- User Profile roles.
- Permissions.
- Sensitivity tiers.
- Scope boundaries.

Common causes:

- Missing `view_student_360`.
- Missing `view_decision_packet`.
- Missing `manage_trust_cases`.
- Missing `view_dashboards`.
- Missing academic or trust sensitivity tier.

### Student Data Looks Missing

Check:

- Search filters.
- Student scope restrictions.
- Whether the student exists in `/api/v1/students`.
- Whether work projection is ready.
- Whether fallback data is being used.

### Today's Work Numbers Look Wrong

Check:

- Whether the page is still loading.
- Whether backend board groups loaded.
- Whether fallback student-derived data is in use.
- Work projection readiness in Admin.
- Latest orchestration run status.

### Document Reprocess Does Not Complete

Check:

- Agent run status.
- Transcript upload status.
- Run result code.
- Run result error.
- Action history.

Remember:

- Reprocess is successful only when agent run and transcript status both complete.
- Failure in either status means the operation failed.
- Skipped optional context/linking steps are not necessarily failures.

### Decision Recommendation Looks Incomplete

Check:

- Decision snapshot.
- Decision-agent details.
- Latest run result.
- Recommendation confidence.
- Rationale list.
- Supporting evidence.
- Trust status.

If evidence is missing, use Request evidence.

### Trust Case Is Blocking A Student

Check:

- Trust blocked state.
- Risk level.
- Summary and rationale.
- Recommended action.
- Latest result code.
- Owner.

Only unblock when the evidence supports progression.

### Yield Or Melt Scores Look Unexpected

Check:

- Whether the backend sent fractional values or 0 to 100 values.
- Deposit status.
- Missing milestones.
- Last activity or outreach.
- Student stage and risk.

## Standard Operating Procedures

### SOP: Start The Day As A Counselor

1. Sign in.
2. Open Today's Work.
3. Review urgent work.
4. Open top student records.
5. Resolve simple checklist blockers.
6. Route work that belongs to document, trust, or decision teams.
7. Check yield and melt queues before end of day.

### SOP: Recover A Failed Transcript

1. Open Documents Queue.
2. Filter to Processing failed.
3. Open exception details.
4. Read reason and suggested action.
5. If original file is valid, click Reprocess.
6. If file is wrong, click Replace file.
7. Watch agent run and transcript status.
8. Confirm completion or read error.
9. Open Student 360 to confirm student state.

### SOP: Review A Decision Packet

1. Open Decision Studio.
2. Open the packet.
3. Generate or load recommendation.
4. Review confidence and rationale.
5. Review evidence and trust status.
6. Add a review note.
7. Accept recommendation or request evidence.
8. Confirm snapshot version.

### SOP: Resolve A Trust Case

1. Open Trust Center.
2. Select the case.
3. Review risk level, summary, rationale, and latest result.
4. Add notes.
5. Assign or escalate if more investigation is needed.
6. Block or keep blocked if progression should stop.
7. Resolve and unblock only when evidence supports clearing the case.

### SOP: Restore Queue Health As An Admin

1. Open Admin.
2. Review work projection status.
3. If not ready, run rebuild chunk or rebuild all.
4. Review projection jobs.
5. Retry failed jobs.
6. Cancel stale running jobs only when appropriate.
7. Confirm queues load normally.

## Practice Exercises

### Exercise 1: Find And Move A Blocked Student

Goal: use Today's Work and Student 360 to identify and resolve a simple blocker.

Steps:

1. Open Today's Work.
2. Find a student with a missing checklist item.
3. Open Student 360.
4. Review checklist and readiness.
5. Mark an allowed item complete.
6. Return to Today's Work and confirm the student state changed.

Success criteria:

- The trainee can explain the blocker.
- The trainee knows whether they were allowed to update it.
- The trainee can confirm the queue reflects the change.

### Exercise 2: Reprocess A Document

Goal: understand document exception recovery.

Steps:

1. Open Documents Queue.
2. Filter to Processing failed.
3. Open exception details.
4. Identify reason and suggested action.
5. Start stored reprocess.
6. Watch agent run and transcript status.

Success criteria:

- The trainee can explain why both statuses matter.
- The trainee can identify success and failure states.
- The trainee can read the result code and message.

### Exercise 3: Review A Recommendation

Goal: interpret decision-agent output.

Steps:

1. Open Decision Studio.
2. Open a packet.
3. Generate a recommendation.
4. Review fit, credit estimate, confidence, and rationale.
5. Accept or request evidence.

Success criteria:

- The trainee can explain the recommendation rationale.
- The trainee can identify trust or evidence concerns.
- The trainee can explain the review action they chose.

### Exercise 4: Manage A Trust Case

Goal: practice trust case triage.

Steps:

1. Open Trust Center.
2. Select an active case.
3. Review summary, rationale, owner, trust blocked state, and result code.
4. Assign, escalate, block, unblock, or resolve based on scenario instructions.

Success criteria:

- The trainee does not unblock without evidence.
- The trainee can explain the case outcome.
- The trainee can identify the owner and next action.

### Exercise 5: Check Projection Health

Goal: understand admin queue-readiness operations.

Steps:

1. Open Admin.
2. Review projection status.
3. Open projection jobs.
4. Identify whether any job failed.
5. Retry a failed job in a training environment.

Success criteria:

- The trainee can identify healthy and unhealthy projection states.
- The trainee knows when to retry or escalate.

## Role-Based Quick Reference

| Role | Primary pages | Primary tasks |
| --- | --- | --- |
| Admissions counselor | Today's Work, Student 360, Incomplete Applications, Yield, Melt | Move students, clear blockers, guide outreach |
| Admissions processor | Documents Queue, Student 360 | Match, index, reprocess, replace, and resolve document issues |
| Reviewer/evaluator | Ready for Review, Decision Studio, Student 360 | Review evidence and recommendations |
| Decision releaser/director | Decision Studio, Reporting, Student 360 | Approve, request evidence, monitor decision posture |
| Trust analyst | Trust Center, Exceptions Queue, Student 360 | Investigate, block, unblock, assign, escalate, resolve |
| Registrar/transfer specialist | Ready for Review, Student 360, Decision Studio | Review academic and transfer evidence |
| Financial aid | Student 360, Yield, Melt | Monitor aid-sensitive conversion and milestone risks |
| Read-only leadership | Reporting, Today's Work, Yield, Melt | Monitor operations and outcomes |
| Integration service/admin | Integrations, Admin, Reporting | Manage operational readiness and system fit |

## Glossary

Agent run: A backend workflow execution with status, result code, message, metrics, and artifacts.

Checklist blocker: A missing or review-needed item stopping student movement.

Decision packet: The assembled review context for a student's admissions decision.

Decision snapshot: The exact decision context payload reviewed during a recommendation action.

Document exception: A document processing, matching, duplicate, trust, or indexing issue requiring attention.

Melt risk: The risk that an admitted or deposited student will not enroll.

Projection: Backend read model used to make work queues fast and stable.

Readiness: The current operational state describing whether a student can move forward.

Sensitivity tier: Access classification controlling academic or trust/fraud-sensitive data.

Tenant: The school or organization workspace.

Trust hold: A release or progression block caused by trust or provenance concerns.

Yield score: A signal used to prioritize admitted students for conversion outreach.

## Go-Live Readiness Checklist

Before go-live, confirm:

- Users can sign in.
- Users have correct roles and permissions.
- Sensitivity tiers are assigned correctly.
- Today's Work loads.
- Student 360 loads.
- Transcript upload works in the target environment.
- Documents Queue shows exceptions and actions.
- Decision Studio can load packets.
- Trust Center can load active cases.
- Admin projection status is ready.
- Reporting loads expected metrics.
- Staff know escalation paths.

## Support Escalation Checklist

When escalating an issue, include:

- Tenant.
- User email.
- Page where the issue occurred.
- Student ID, document ID, transcript ID, decision ID, or job ID.
- Timestamp.
- Visible error message.
- Agent run ID when available.
- Result code when available.
- Steps to reproduce.

## Related Documents

- [Product Functionality](product-functionality.md)
- [Frontend Agent Integration](FRONTEND_AGENT_INTEGRATION.md)
- [Admissions Counselor Day In The Life](admissions-counselor-day-in-the-life.md)
- [Administrator Day In The Life](administrator-day-in-the-life.md)
