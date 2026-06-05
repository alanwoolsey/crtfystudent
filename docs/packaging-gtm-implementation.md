# crtfyStudent Packaging, GTM, And Implementation

Last updated: 2026-06-04

## Package 1: crtfyStudent Operations

Buyer promise:

> Run daily admissions execution from inquiry through application completion without spreadsheet workarounds.

Primary modules:

- Admissions CRM Core
- Prospect Portal
- Student 360
- Checklist And Application Completion Engine
- Today's Work
- Documents Queue

Best fit:

- Small and mid-sized institutions replacing a lightweight CRM workflow.
- Teams with high incomplete-application volume.
- Teams that need counselor/process ownership clarity quickly.

Implementation focus:

- Tenant setup
- Roles and permissions
- Student/import source mapping
- Checklist templates
- Today's Work work buckets
- QA seed data

## Package 2: crtfyStudent Decision Intelligence

Buyer promise:

> Make admissions decisions faster, explainable, gated, and defensible.

Primary modules:

- Transcript Intelligence
- Document-To-Checklist Link
- Transfer And Academic Evidence
- Trust Foundation
- Decision Workspace
- Release Controls

Best fit:

- Transfer-heavy institutions.
- Schools with decision latency or evidence-quality problems.
- Teams that need trust, provenance, and audit discipline.

Implementation focus:

- Transcript/document intake
- Parser and evidence persistence
- Trust policy setup
- Decision packet templates
- Release gate configuration
- Evaluator/director training

## Package 3: crtfyStudent Yield And Handoff

Buyer promise:

> Protect admit-to-deposit and deposit-to-class-ready movement with operational visibility.

Primary modules:

- Admitted Student Yield
- Deposit / Melt
- Cross-Office Milestones
- Handoff Command Center
- Sync Error Queue

Best fit:

- Institutions with summer melt risk.
- Teams with handoff gaps between admissions, registrar, financial aid, advising, and housing/orientation.
- Leadership teams that need enrollment-risk visibility before census.

Implementation focus:

- Deposit event ingestion
- Milestone template setup
- Office ownership model
- Handoff package definition
- Sync error routing
- Yield/melt reporting

## Package 4: crtfyStudent Platform

Buyer promise:

> Make crtfyStudent repeatable to implement, integrate, govern, and measure.

Primary modules:

- Integration Console
- Implementation Toolkit
- Admin And Permissions
- Operational Reporting
- Benchmarks
- Graduate And Program Review Expansion

Best fit:

- Larger schools coexisting with Slate, Salesforce, Element451, Banner, Colleague, PeopleSoft, Jenzabar, or Workday Student.
- Multi-school or multi-program implementations.
- Institutions needing stronger governance and reporting.

Implementation focus:

- Connector setup
- Object and field mapping
- Permission and sensitivity design
- Sync observability
- Benchmark dimensions
- Graduate/program review configuration

## 30-Day Implementation Checklist

- Confirm package scope and success metrics.
- Configure tenant, roles, permissions, and sensitivity tiers.
- Import or connect initial student/prospect records.
- Configure lifecycle stages, source mapping, population, program, and term fields.
- Configure checklist templates for first production population.
- Seed QA records for incomplete, one-item-away, ready-for-review, trust-blocked, yield-risk, and melt-risk scenarios.
- Train counselors and processors on Today's Work, Student 360, checklist, and document workflows.
- Validate protected endpoints, tenant scoping, and audit events.

## 60-Day Implementation Checklist

- Connect transcript/document processing to checklist progress.
- Enable confidence-based checklist auto-completion and exception routing.
- Configure trust cases and release-block policy.
- Configure decision packet review and release gates.
- Train evaluators, directors, trust analysts, and transfer specialists.
- Add operational reporting for completion, document, trust, and decision metrics.
- Review queue aging and workload by owner/team.

## 90-Day Implementation Checklist

- Enable admitted yield queue.
- Connect deposit event capture.
- Configure melt milestones and office ownership.
- Enable handoff package and sync error visibility.
- Add connector observability and mapping validation.
- Train leadership and cross-office teams.
- Review package expansion opportunities and pricing tier.

## Training Plan By Role

| Role | Training focus |
|---|---|
| Admissions counselor | Today's Work, Student 360, checklist blockers, interaction logging, yield follow-up |
| Admissions processor | Documents Queue, matching, reprocess, replacement upload, checklist linkage |
| Reviewer/evaluator | Ready for Review, transfer evidence, decision packet review |
| Decision director | Release gates, approval workflow, final outcome controls |
| Trust analyst | Trust cases, evidence, block/unblock, escalation, audit posture |
| Registrar/transfer specialist | Transfer evidence, articulation gaps, handoff package |
| Financial aid | Aid-sensitive yield and melt milestones |
| Leadership | Reporting, workload, conversion, decision speed, yield, melt |
| Admin/integration user | Roles, permissions, sensitivity tiers, connectors, implementation readiness |

## Demo Scripts By Package

### Operations Demo

1. Open Today's Work.
2. Filter to one-item-away applicants.
3. Open Student 360.
4. Review checklist blocker and readiness.
5. Complete a checklist item.
6. Return to Today's Work and show the queue movement.

### Decision Intelligence Demo

1. Upload or open a transcript/document.
2. Show document exception or auto-match status.
3. Open transfer evidence in Student 360.
4. Open Decision Studio.
5. Generate/review recommendation.
6. Show trust posture and release gate behavior.

### Yield And Handoff Demo

1. Open Admitted Yield.
2. Review yield score and next step.
3. Open Deposit/Melt.
4. Show missing milestone and owner.
5. Open Student 360 handoff.
6. Explain how unresolved handoff risks route to work.

### Platform Demo

1. Open Admin.
2. Show roles, permissions, sensitivity tiers, and scopes.
3. Open Connectors.
4. Show connector status and mapping strategy.
5. Open Reporting.
6. Drill from metric narrative to queue implication.

## Pricing Model Assumptions

Pricing should scale with:

- Institution size.
- Annual inquiry/applicant volume.
- Package modules enabled.
- Number and complexity of integrations.
- Transcript/document processing volume.
- Decision/release workflow complexity.
- Graduate/program review complexity.
- Implementation and support requirements.

Suggested packaging model:

- Base platform fee by institution size.
- Module fee by package.
- Usage tier for transcript/document processing.
- Integration fee by connector complexity.
- Implementation fee by data migration, configuration, and training scope.

