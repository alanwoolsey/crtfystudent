# crtfyStudent CRM Replacement Boundaries

Last updated: 2026-06-04

## Decision

crtfyStudent replaces the admissions operating layer, not every system that touches enrollment.

The product owns the work state from inquiry to class-ready. It integrates with marketing, SIS, financial aid, communication, document, and event systems where those systems remain the institutional source of record.

## Product Claim

Traditional CRMs manage engagement. crtfyStudent manages admissions.

## crtfyStudent Owns

| Capability | Product owner surface |
|---|---|
| Inquiry record | Admissions CRM Core, Student 360 |
| Prospect profile | Admissions CRM Core, Prospect Portal, Student 360 |
| Applicant profile | Student 360 |
| Student 360 | Student 360 |
| Counselor owner | Student 360, Today's Work, Admin |
| Territory or segment assignment | Admissions CRM Core, Admin |
| Source attribution | Admissions CRM Core, Reporting |
| Application stage | Student 360, Today's Work |
| Checklist status | Incomplete Applications, Student 360 |
| Document status | Documents Queue, Student 360 |
| Transcript status | Documents Queue, Student 360 |
| Readiness status | Today's Work, Ready for Review, Decision Studio |
| Interaction history | Student 360, Today's Work |
| Decision status | Decision Studio, Student 360 |
| Yield status | Admitted / Yield, Student 360 |
| Melt status | Deposit / Melt, Student 360 |
| Handoff status | Handoff Command Center, Student 360 |
| Operational reporting | Reporting |

## crtfyStudent Integrates With

| External area | Integration posture |
|---|---|
| Marketing automation | Import campaign/source/engagement signals; do not build campaign automation. |
| External forms | Accept inquiry and application-start events. |
| SIS | Sync identity, deposit, decision, registration, and handoff status where permitted. |
| Financial aid systems | Import milestone and risk signals; do not package aid. |
| Communication tools | Log interaction events and send operational nudges through approved providers. |
| Transcript providers | Intake official and unofficial transcript events. |
| Document stores | Store references, statuses, and provenance; do not replace enterprise document management by default. |
| Event systems | Import attendance and engagement signals; do not build event registration. |
| Chatbot / knowledgebase channels | Capture structured admissions intent and escalation signals. |

## crtfyStudent Does Not Build

| Capability | Boundary reason |
|---|---|
| Full campaign builder | Marketing suites already own design, segmentation, deliverability, and automation. |
| Email design tool | Not core to admissions work-state execution. |
| Event registration system | Event platforms already own capacity, check-in, reminders, and registration operations. |
| Full SIS replacement | SIS remains system of record for registration, billing, official enrollment, and academic records. |
| Registration and billing | Outside admissions operating workflow. |
| Financial aid packaging | Aid systems remain source of record and compliance owner. |
| Student portal of record | crtfyStudent may surface next steps, but should not become the official portal. |

## Standard Lifecycle Stages

- Inquiry
- Qualified inquiry
- Application started
- Application submitted
- Incomplete applicant
- Complete / ready for review
- In review
- Decision pending
- Admitted
- Denied
- Waitlisted
- Deferred
- Deposited
- Handoff in progress
- Class-ready
- Enrolled / in classes
- Melt risk
- Withdrawn / inactive

## Standard Readiness States

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

## Standard Work Buckets

- New inquiries
- No first touch
- Application started, not submitted
- Incomplete applicants
- One item away
- Stalled applicants
- Document blocked
- Trust blocked
- Ready for review
- Decision waiting
- Admitted, no recent touch
- Deposit risk
- Melt risk
- Handoff risk

## Role Ownership

| Role | Primary work inside crtfyStudent |
|---|---|
| Admissions counselor | Daily work, outreach, incomplete movement, yield, melt |
| Admissions processor | Document intake, matching, indexing, reprocessing |
| Evaluator | Evidence review and recommendation review |
| Decision director | Approvals, release gates, decision workflow |
| Trust analyst | Trust cases, blocks, escalations, resolutions |
| Transfer specialist | Articulation gaps and transfer evidence |
| Financial aid | Milestone visibility and handoff risk |
| Registrar | Readiness and sync exceptions |
| Leadership | Metrics, forecasts, bottlenecks |
| Admin / integration staff | Access, mappings, system health, sync errors |

## Acceptance Checklist

- [x] CRM replacement boundary artifact exists.
- [x] Product areas are labeled as own, integrate, or do not build.
- [x] Lifecycle, readiness, and work bucket vocabulary is documented.
- [x] Role ownership is documented.
- [ ] Sales and investor materials use this language.
- [ ] Backend contracts use these lifecycle and readiness states.
- [x] Frontend constants use these lifecycle and readiness states.
