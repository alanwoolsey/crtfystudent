# Admissions Workflow Mapping, Gaps, and Recommendations

## Purpose

This document maps the current `crtfy student` prototype to a real small-school admissions workflow, compares it against both Slate and Element451, identifies what is already helping, shows the gaps, and recommends what to build next.

The goal is not to rebuild Slate. The goal is to build something more useful for an admissions employee at a small school:

- faster response
- less manual cleanup
- fewer stalled applications
- better document handling
- clearer prioritization
- stronger handoff after deposit

## Current Product Thesis

Based on the current codebase, the product is strongest where it:

- centers work on a canonical student record instead of disconnected documents
- treats transcript ingestion, trust, and explainable recommendation as product surfaces
- aims to give operators a decision-ready packet instead of raw file handling
- positions integrations as coexistence, not rip-and-replace

That is directionally better than trying to become a general-purpose CRM. It is especially relevant for small schools that need speed and operational leverage more than extreme workflow configurability.

## Executive Summary

Right now, the prototype covers the middle of the funnel better than the top or bottom:

- strongest: transcript intake, student record unification, trust review framing, decision packet framing
- partial: dashboard metrics, student search/list, decision workbench
- weak or missing: inquiry intake, duplicate management, population routing, communications, checklist operations, document indexing workflow, daily incomplete-applicant work, deposit/yield tooling, post-deposit melt prevention, downstream handoff

The product already addresses several real pain points:

- transcript and document collection complexity
- trust and provenance risk around documents
- transfer credit uncertainty
- scattered student context across multiple records or documents

The product is not yet addressing the most frequent day-to-day pain points for a small admissions team:

- incomplete applications that stall out
- duplicate cleanup and source correction
- counselor task prioritization
- manual follow-up orchestration
- admitted-to-deposit conversion work
- post-deposit melt prevention
- cross-office handoff visibility

The best path forward is to keep the differentiated core and wrap it in operator-grade workflow around:

1. incomplete-to-complete application worklists
2. document-to-checklist automation
3. counselor prioritization
4. admitted student yield and melt management
5. downstream handoff tracking

Strategically:

- Slate owns process and workflow control
- Element451 owns engagement and conversion orchestration
- `crtfy student` can win by owning incomplete-to-complete execution, transcript evaluation, document trust, decision intelligence, and the operator workflows that happen when automation is not enough

The most important adjustment after review is this:

`Incomplete -> Complete` is not just a priority area. It should become the core product story and the daily usage anchor.

## What Exists Today

## Live or Partially Live

- Authenticated, tenant-aware app shell
- Command Center pulling live stats, funnel, and routing mix APIs
- Student 360 list backed by live `/api/v1/students`
- Student 360 profile backed by live `/api/v1/students/{id}`
- Transcript upload with async processing and polling
- Batch transcript upload support
- Parsed transcript results mapped into student context
- Decision Studio list from `/api/v1/decisions`
- Decision packet detail with status, assignment, notes, and timeline endpoints
- Workflow queue page wired to `/api/v1/workflows`
- Trust Center page wired to `/api/v1/trust/cases`

## Still Mostly Prototype / Placeholder

- Prospect Portal
- Integrations
- Most operational workflow logic beyond transcript processing
- Many dashboard panels beyond stats/funnel/routing mix
- Admissions communications and follow-up orchestration
- Checklist operations tied to application completeness
- Deposit, melt, and downstream handoff workflows

## Competitive Context

## Slate vs Element451 vs crtfy student

| Platform | Core strength | Core weakness | Typical operator mindset |
|---|---|---|---|
| Slate | Process control, structured workflow, application operations | Heavy manual work, weaker modern engagement, clunky transcript/decision intelligence | Work the list |
| Element451 | Engagement, SMS/chat automation, behavioral segmentation, yield personalization | Lighter operational depth, weaker complex review and transcript workflow | Work the signals |
| crtfy student today | Transcript-centric student record, trust, explainable decision framing | Missing top-of-funnel engagement layer and missing many day-to-day admissions operations workflows | Work the evidence and next action |

## What This Means

If Slate is the system of process and Element451 is the system of engagement, `crtfy student` should not try to beat both at their own broadest game.

It should own the layer neither competitor handles deeply enough:

- incomplete-to-complete application execution
- transcript evaluation
- document trust
- transfer certainty
- application-completion acceleration where documents are the blocker
- explainable decision packets
- high-confidence handoff into downstream systems

That is a more defensible position than becoming a generic CRM or generic marketing automation platform.

## Workflow Mapping

Status key:

- `Covered`: meaningful support exists now
- `Partial`: framed in product/UI, but not operationally complete
- `Gap`: not meaningfully supported yet

| Admissions workflow step | Current mapping in product | Status | Notes |
|---|---|---|---|
| 1. New prospect comes in | `Prospect Portal` concept only | Gap | No live inquiry intake, source capture, or lead ingestion workflow. |
| 2. Record gets matched and cleaned | Student 360 canonical record concept | Partial | Some record unification thinking exists, but no explicit duplicate detection, merge, source correction, or identity resolution workflow. |
| 3. Student is put into the right population | Student profile shows program/stage/tags | Partial | Tags exist, but no rules-based population assignment for first-year, transfer, grad, international, etc. |
| 4. Source and territory are assigned | Advisor field appears on student and decision packet | Partial | Ownership exists as a field, but there is no routing engine, territory logic, or reassignment workflow. |
| 5. Initial communication flow starts | None beyond conceptual next-best action | Gap | No comm cadence builder, send logic, engagement tracking, or reply monitoring. |
| 6. Inquiry is qualified | Fit score, recommendation, summary | Partial | Academic/program fit is framed, especially for transfer students, but viability review across residency, term, and missing info is not operationalized. |
| 7. Application is started | None directly | Gap | No applicant-status transition, application-source tracking, or app-start workflow. |
| 8. Checklist items are created | Student checklist UI exists | Partial | Checklist is present in the UI, but it is not a real application requirements engine. |
| 9. Missing items are chased | Workflows page conceptually fits this | Gap | No incomplete-app queue, reminder logic, or counselor worklist driven by missing items. |
| 10. Documents are received and indexed | Transcript upload, processing, trust, results | Covered | This is currently the strongest operational area, especially for transcript-centered flows. |
| 11. Application becomes complete | Decision-ready stage exists | Partial | Stage labeling exists, but no reliable completeness rules engine across all required items. |
| 12. Reader or counselor review begins | Decision Studio and Student 360 | Covered | The product already points toward a better review surface than Slate for document-heavy decisions. |
| 13. Special cases are routed | Trust Center and decision assignment exist | Partial | Routing exists conceptually, but not as robust program-specific review lanes like transfer credit, international, athletics, nursing, etc. |
| 14. Decision recommendation is entered | Decision packet creation and rationale | Covered | Strong conceptual support for explainable recommendations. |
| 15. Decision is finalized | Decision status endpoints | Partial | Review state exists, but decision release, letter triggering, and portal communications are not fully built. |
| 16. Admitted student communications begin | None directly | Gap | No yield campaign or admitted-student next-step orchestration yet. |
| 17. Counselor works the admitted pool | Fit and deposit likelihood metrics hint at this | Partial | Prioritization signals exist, but no admitted-pool workbench or outreach queue. |
| 18. Deposit or intent-to-enroll is received | Funnel concept only | Gap | No deposit event model, deposit status, or communications shift logic. |
| 19. Handoff to next offices starts | Integrations page is placeholder | Gap | Connector strategy exists, but no real handoff workflow to SIS, FA, housing, advising, orientation, registrar, or student success. |
| 20. Melt prevention follow-up | None directly | Gap | No post-deposit milestone tracking or melt-risk queue. |

## Element451 Workflow Comparison

Element451 changes the admissions experience in an important way: the workflow becomes conversation-driven and behavior-driven rather than queue-driven.

That means the comparison should not just ask, “Do we have this step?” It should ask, “Are we helping the operator in the same way Element451 helps them?”

## End-to-End Comparison Against Element451

| Element451 workflow step | What Element451 does well | crtfy student current position | Implication |
|---|---|---|---|
| Prospect enters system | Intake from forms, chat, landing pages, events, integrations | Prospect Portal is still conceptual | We do not yet compete at the top-of-funnel entry point. |
| AI chatbot engages immediately | Instant response, qualification, Q&A | No conversational intake layer | Clear gap if fast engagement is a priority. |
| Profile is enriched automatically | Conversation + behavior enriches record | Student record is richer around documents than behavior | We are stronger on evidence, weaker on behavioral context. |
| Student is segmented dynamically | Behavior-based segments and movement | Tags and stages exist, but not dynamic behavioral segmentation | Gap for marketing-style orchestration. |
| Communication flows kick off | SMS/email/chat campaigns triggered by behavior | No communications engine | Major gap vs Element451. |
| Admissions monitors engagement | Staff watch responses and “hot” signals | Dashboard hints at signals, but no engagement monitoring workflow | Partial at best. |
| Application started conversationally | Chat can reduce form friction | No conversational app-start support | Gap. |
| Application progress tracked | Automated nudges on checklist and drop-off | Checklist UI exists, but no real nudge engine | Gap. |
| Admissions intervenes when needed | Staff focus on stuck or high-value students | Decision and trust surfaces align with human intervention moments | Good philosophical fit, but missing signal-driven triggers. |
| Documents are collected | Better mobile/chat collection and reminders | Stronger document processing core once files arrive | We can be better after upload, weaker before upload. |
| Application becomes complete | Completion triggers automation | Stage model exists, but not true completeness orchestration | Partial. |
| Review begins | Standard review and routing | Decision Studio is stronger as a review concept | We can compete well here. |
| Decision entered | Decision triggers campaigns | Decision packet model exists | Competitive in decision intelligence, weak in downstream comms. |
| Admit-phase automation ramps up | Strong personalization and campaign logic | No yield automation engine | Gap. |
| Yield management becomes behavioral | Engagement score + activity + attendance | Fit/deposit likelihood hints exist | Partial, but not behaviorally rich yet. |
| Deposit captured | Status changes and workflow shift | No real deposit capture model | Gap. |
| Post-admit / pre-enrollment workflows | Automated onboarding campaigns | No post-deposit automation | Gap. |
| Handoff to SIS | Usually integration-based but imperfect | Integrations strategy exists, not operationally live | Similar aspiration, not yet productized. |

## What Element451 Changes About the Product Opportunity

Element451 is especially strong in these areas for small schools:

- immediate engagement
- automated nudging
- behavioral segmentation
- inquiry-to-application conversion
- admit-to-deposit personalization

That means `crtfy student` should be careful about where to compete head-on.

It also means `crtfy student` needs one important addition: enough signal-awareness to help staff prioritize work without becoming a campaign platform.

## Where We Should Not Try To Beat Element451 First

- chatbot-first prospect intake
- broad SMS/chat campaign orchestration
- marketing-style segmentation engine
- general engagement dashboarding

Those are meaningful areas, but they are not where the current prototype is strongest or most differentiated.

## Where We Can Be Better Than Element451

### 1. Transcript evaluation and transfer certainty

Element451 still has the same underlying pain around transcripts and supporting documents. It improves collection and reminders, but it does not appear to own transcript evaluation and decision intelligence end-to-end.

This is where `crtfy student` already has a stronger point of view:

- canonical student record with transcript lineage
- parsed transcript results
- trust posture around documents
- explainable fit and credit recommendations

### 2. Decision intelligence for staff

Element451 helps staff know who is engaged. It is less differentiated in helping staff understand whether the academic and document evidence supports a confident decision.

This is a real opening:

- explainable decision packet
- confidence and rationale
- trust evidence tied to decision release
- transfer-specific review support

### 3. Exception-driven admissions operations

Element451 automates the happy path. Small schools still need a strong tool for the cases where automation breaks down:

- transcript mismatch
- missing or bad document
- transfer edge case
- unclear articulation
- program-specific exception
- handoff failure

That exception layer is exactly where a staff-centric operational product can win.

### 4. Downstream confidence and handoff quality

Even in engagement-first systems, the handoff to SIS and downstream offices is often weak or integration-dependent. If `crtfy student` can produce a clean, explainable, high-confidence handoff package, that is valuable beyond top-of-funnel engagement.

## Daily Admissions Rhythm Mapping

| Daily job to be done | Current support | Assessment |
|---|---|---|
| Check dashboards and queues | Dashboard + Workflows pages | Partial. Good skeleton, but incomplete for real operations. |
| Work new inquiries | Prospect Portal only | Gap. |
| Work incomplete applicants | No true incomplete-app queue | Gap. |
| Review newly complete files | Decision Studio + Student 360 | Covered for transcript-heavy review. |
| Release or prepare decisions | Decision Studio detail | Partial to Covered. Strong direction, incomplete release workflow. |
| Send or monitor communications | None | Gap. |
| Call/email high-priority students | Deposit likelihood and fit signals | Partial. Prioritization signal exists without outreach tooling. |
| Clean data and resolve duplicates | Canonical record concept only | Gap. |
| Run reports for leadership | Dashboard basics only | Partial. |
| Coordinate with FA, registrar, departments | Integrations vision only | Gap. |

## Product Completion Reframe

The product is not complete when it has more branded modules.

It is complete when an admissions counselor can:

- log in
- see exactly who to work
- fix incomplete apps quickly
- make confident decisions
- know who is likely to enroll
- prevent melt

without relying on spreadsheets, side notes, or disconnected systems.

## Day-to-Day Comparison: Slate vs Element451 vs crtfy student

| Daily pattern | Slate | Element451 | crtfy student today |
|---|---|---|---|
| Primary daily stance | Work queues | Watch engagement and escalation signals | Review evidence and exceptions |
| New inquiries | Manual/structured intake | Automated conversational engagement | Weak |
| Incomplete apps | Manual chase lists | Automated nudges | Weak |
| Review | Structured but heavier | Lighter | Strong direction |
| Transfer/document complexity | Weak to manual | Better engagement, still not deep ops | Strongest opportunity |
| Yield work | Manual campaigns and lists | Strong behavioral automation | Mostly absent |
| Handoff | Structured but often clunky | Integration-dependent | Vision exists, not live |

## Pain Point Coverage

## Pain Points We Are Addressing Now

### 1. Transcript and document collection

This is the clearest strength.

Why:

- async transcript upload and polling already exist
- transcript results are attached to student context
- batch handling exists
- transcript lineage is visible in Student 360
- trust review is treated as first-class, not hidden

Why this matters for small schools:

- transcript handling is one of the most manual and error-prone parts of the funnel
- staff lose time attaching, validating, and re-checking documents
- transfer-heavy schools feel this pain constantly

### 2. Transfer credit uncertainty

This is partially addressed now and could become a major differentiator.

Why:

- fit score, accepted credits, and recommendation concepts are built into the student record
- decision packets already center academic fit and transfer certainty
- Prospect Portal concept uses transcript-led fit preview

This is one of the strongest reasons to build something better than Slate for admissions employees, especially in transfer, nursing, allied health, and adult learner use cases.

### 3. Trust and document provenance

This is a real differentiator that typical admissions CRMs do not handle well.

Why:

- Trust Center exists as its own surface
- trust signals are attached to students and decisions
- quarantined transcript flows are part of the current model

For small schools, this matters because bad documents and bad indexing create downstream chaos fast.

### 4. Scattered context across records, files, and queues

This is partially addressed through Student 360 and decision packets.

Why:

- student-centric design is stronger than document-centric operations
- one operator can see transcripts, checklist, fit, recommendation, and academic trajectory together

This is better than making staff bounce between records, uploads, and notes.

### 5. The gap between automation and human judgment

This matters more after looking at Element451.

Element451 is built to automate outreach and keep students warm. But when a student becomes complex, document-heavy, or risky, staff still need a better workspace for judgment.

`crtfy student` is already pointed toward that workspace:

- one student context
- one evidence trail
- one decision packet
- trust-linked release logic

This is a credible differentiator if we lean into it.

## Pain Points We Are Not Yet Solving Well

### 1. Incomplete applications that stall out

This is currently the biggest operational gap.

Why it matters:

- for small schools, getting from started application to complete file is usually where daily work piles up
- this is a higher-frequency pain point than formal decision committee complexity

What is missing:

- true checklist rules by student population
- live missing-item queues
- counselor worklists based on “closest to complete”
- reminders tied to specific missing items
- aging/SLA views for incomplete records

### 2. Duplicate records and data cleanup

This is barely addressed today.

Why it matters:

- duplicate records break communication, territory ownership, reporting, and decision accuracy
- small teams feel data hygiene issues immediately because they do not have dedicated ops staff

What is missing:

- duplicate detection queue
- record merge workflow
- source-of-truth controls for email/phone/address/source
- confidence score for automated matches

### 3. Too much manual follow-up

The product talks about next-best action, but it does not yet operationalize outreach.

What is missing:

- counselor task lists
- call queue generation
- personal follow-up suggestions
- engagement-aware prioritization
- outreach logging

This gap matters even more relative to Element451, which already makes automated nudging a core strength.

### 4. Weak understanding of who is most likely to convert

There are hints of this through fit and deposit likelihood, but not enough to drive action.

What is missing:

- conversion propensity tied to behavioral signals
- “work now” lists by segment
- admitted-pool prioritization
- recommended outreach mode and timing

Relative to Element451, this is one of the most obvious weaknesses today.

### 5. Weak handoff to SIS and downstream offices

This is still mostly strategy, not product.

What is missing:

- enrollment-ready handoff bundle
- sync status by student
- office-specific milestone tracking
- exception queue for failed handoffs

### 6. Melt prevention

This is completely open territory and a strong opportunity.

What is missing:

- post-deposit checklist
- summer milestone tracking
- melt-risk scoring
- shared queue across admissions and student services

## Strategic Interpretation

If you try to compete with Slate on total CRM breadth, you will lose time and focus.

If you try to compete with Element451 on conversational engagement breadth, you will also lose focus.

If you compete on the operator moments where Slate is weakest for a small school, there is a sharper path:

- incomplete-to-complete execution
- transcript and document operations
- transfer certainty
- explainable decisioning
- incomplete-applicant acceleration
- admitted-student conversion prioritization
- post-deposit melt prevention

After considering Element451, that list needs one refinement:

- compete on the moments when engagement automation hands off to human judgment
- own the evidence-heavy, risk-heavy, exception-heavy part of the funnel
- add enough signal-awareness to help staff prioritize without trying to become a full engagement suite

## Strategic Corrections

## 1. Make `Incomplete -> Complete` the Core Product Story

This should move from "Priority 1" to the central operating promise.

The admissions employee pain is not:

"I need a better abstract decision engine."

It is:

"I have too many incomplete applications and I do not know who to work next."

That means the product story should become:

- get applications completed faster
- reduce manual follow-up
- convert documents into progress automatically
- show staff which student can move fastest with human attention

Transcript intelligence, trust, and decision packets are still the wedge, but they need to support this larger daily workflow.

## 2. Make `Today's Work` the Primary UX

The current information architecture is product-centric:

- Student 360
- Decision Studio
- Trust Center

The primary operator entry point should be work-centric:

- Needs attention now
- Close to completion
- Ready for decision
- High-yield admits
- At-risk deposits
- Exceptions

Student 360, Decision Studio, Trust Center, and Integrations should become supporting views underneath this operating layer.

## 3. Add Just Enough Signals

Do not build Element451.

Do add enough signals to answer:

"Why should I call this student right now?"

The minimum useful signal layer is:

- missing one item
- stalled for X days
- new document uploaded
- recent engagement spike
- inactivity risk
- unresolved question

This should drive prioritization and intervention, not campaign management.

That combination is not “a smaller Slate.” It is an admissions operating layer built for the staff member who has too many students, too many missing items, and not enough time.

## Recommended Product Positioning

## What We Should Be

An admissions operating system that sits above or beside Slate and Element451 and helps staff move students from incomplete to complete, from complete to decision, and from admit to enroll with less manual thrash.

## What We Should Not Try To Be First

- a full CRM replacement
- a full communications platform
- a full chatbot/engagement suite
- a complete application builder
- a complete SIS

## Working Product Promise

“Give admissions staff one place to know what matters now, what is missing, what can be trusted, which students need human attention, and what should happen next.”

## Recommended Positioning Against Both Competitors

### Against Slate

“We are better at transcript-heavy, trust-heavy, and decision-heavy work than a general workflow CRM.”

### Against Element451

“We are better at the operational and judgment-heavy moments that remain after engagement automation does its job.”

### Strongest strategic framing

`crtfy student` is the system for:

- getting incomplete applications unstuck
- evaluating evidence
- resolving exceptions
- accelerating completion when documents are the blocker
- producing confident decisions
- carrying a high-trust handoff into enrollment operations

## Product Recommendations

## Priority 1: Build the Incomplete-to-Complete Engine

This is the highest-value addition if the target user is a small-school admissions employee.

### Why

- it sits in the middle of the daily workload
- it directly improves application completion rates
- it complements existing transcript/document strengths
- it creates a real operator workflow instead of a presentation layer

### What to build

- checklist templates by population:
  - first-year
  - transfer
  - graduate
  - international
  - readmit
- requirement status model:
  - not started
  - received
  - indexed
  - waived
  - pending review
  - complete
- incomplete-app worklists:
  - started not submitted
  - submitted missing transcript
  - submitted missing residency proof
  - missing FAFSA/scholarship forms
  - nearly complete
- “closest to conversion” sorting
- counselor action suggestions
- automated and manual chase actions from the same screen

### Outcome

This would directly address the most common admissions processing pain that the current product does not yet solve.

It also complements both competitors:

- stronger operational completion support than Element451
- more student-centered and document-aware than Slate

## Priority 2: Turn Document Intake into Checklist Automation

The current transcript work should feed application completeness automatically.

### What to build

- document indexing states tied to checklist items
- confidence-based auto-attachment with human review queue
- “received but not indexed” queue
- document mismatch queue
- transcript/source exception handling
- audit trail from upload to checklist completion

### Outcome

This converts current document strength into real day-to-day admissions value.

## Priority 3: Add Data Hygiene and Duplicate Resolution

### What to build

- duplicate candidate queue
- match confidence and matching reasons
- merge workflow with field-level conflict resolution
- source correction controls
- contact-data validation states

### Outcome

This solves a foundational pain point that admissions employees deal with constantly and that damages every downstream workflow.

## Priority 4: Build the Counselor Workbench

The system should tell staff who needs attention now.

### What to build

- prioritized daily queue by counselor/territory
- segments such as:
  - new inquiries needing first touch
  - incomplete applicants close to complete
  - admits with high yield potential
  - deposited students with melt risk
- reasons-to-act panel:
  - visited campus
  - opened multiple emails
  - started housing
  - missing transcript
  - scholarship eligible
- suggested outreach type:
  - call
  - personal email
  - text
  - advisor referral
- reason-for-priority signals:
  - stalled after transcript upload
  - opened deposit reminder twice
  - asked unresolved question
  - missing one item
  - transfer ambiguity blocking decision

### Outcome

This keeps the product oriented around the admissions employee’s day, not only around backend process states.

This is where we should borrow selectively from Element451:

- signal-aware prioritization
- intervention moments
- behavior-informed worklists

But keep the focus on staff action, not campaign management.

This should become the primary home screen, not a secondary utility page.

## Priority 5: Build Admitted-to-Deposit and Melt Prevention

This is where many small schools win or lose net tuition revenue.

### What to build

- admitted student pipeline
- deposit likelihood scoring
- admitted-pool worklists
- post-admit milestones:
  - housing
  - FAFSA
  - orientation
  - final transcript
  - registration
- melt risk score and intervention queue
- shared handoff view across admissions and next offices

### Outcome

This would expand the product from “decisioning” into “yield and matriculation operations,” which is much closer to what small-school admissions leaders actually need.

This also closes one of the biggest current gaps relative to Element451.

## Priority 6: Make Integrations Operational, Not Just Strategic

### What to build

- student-level sync status
- downstream handoff package
- failed sync exception queue
- last successful handoff by office
- integration health with business impact, not just technical status

### Outcome

This reduces the very common small-school problem where admissions thinks a student is ready but downstream offices do not.

## Recommended Workflow Reframe

Instead of organizing the product primarily around internal feature brands, consider organizing the operator experience around the actual daily work:

1. `New`
2. `Incomplete`
3. `Ready for Review`
4. `Decision Ready`
5. `Admitted / Yield`
6. `Deposited / Melt Watch`
7. `Exceptions`

The current branded surfaces can still exist underneath, but the top-level operator mode should reflect how admissions employees actually work.

One useful variant after considering Element451:

1. `Signals`
2. `Incomplete`
3. `Ready for Review`
4. `Decision`
5. `Admit / Yield`
6. `Deposit / Melt`
7. `Exceptions`

That preserves a signal-aware workflow without turning the product into an engagement platform.

## Recommended Primary Navigation

If the product is optimized for daily use, the top-level navigation should evolve toward:

1. `Today's Work`
2. `Students`
3. `Decision Review`
4. `Admit / Yield`
5. `Melt Watch`
6. `Exceptions`
7. `Integrations`

Supporting branded concepts can remain inside these operating areas rather than acting as the main entry points.

## Suggested Capability Matrix

| Capability | Build now | Build later | Why |
|---|---|---|---|
| Transcript intake and trust | Yes |  | Already differentiated. |
| Incomplete application management | Yes |  | Biggest current gap and daily pain point. |
| Duplicate and data hygiene workflows | Yes |  | Foundational for all downstream work. |
| Counselor prioritization | Yes |  | Turns signals into action. |
| Decision packet review | Yes |  | Already a strength. |
| Admitted-to-deposit workbench | Yes |  | Critical for small-school yield. |
| Melt prevention | Yes |  | Strong competitive whitespace. |
| Signal-aware prioritization fed by behavior and engagement events | Yes |  | Needed to stay relevant against Element451 without copying its whole stack. |
| Full communications automation suite |  | Later | Useful, but expensive and not core differentiation yet. |
| Full chatbot and conversational intake platform |  | Later | Element451 is already strong here; not the best first battleground. |
| Full CRM replacement |  | Later or never | High breadth, low focus, weak early leverage. |
| Full application form builder |  | Later | Better to integrate before replacing. |

## Concrete Near-Term Backlog

## Next 30 Days

- Define applicant populations and checklist templates
- Add checklist item data model and real statuses
- Add incomplete-applicant queue with aging and “closest to complete”
- Add document-to-checklist linkage
- Add duplicate candidate model and review queue
- Add a minimal signal model for operator prioritization:
  - engagement spike
  - inactivity risk
  - unresolved question
  - recent visit / event attendance
- Add `Today's Work` home screen shell with:
  - Needs attention now
  - Close to completion
  - Ready for decision
  - Exceptions

## Next 60 Days

- Add counselor workbench with prioritized action lists
- Add outreach logging and recommended next action reasons
- Add admitted-pool segmentation
- Add deposit status tracking
- Add downstream handoff status model
- Add signal-to-action rules so staff can work behavior without needing a full campaign builder
- Reframe dashboard metrics around work completion and conversion, not just generic funnel stats

## Next 90 Days

- Add melt-risk model and post-deposit milestones
- Add office handoff queue for FA/housing/advising/orientation
- Add integration run visibility at student level
- Add leadership reporting around incomplete reduction, decision speed, deposit conversion, and melt prevention
- Evaluate whether lightweight chatbot/escalation intake should be integrated rather than built

## Proposed Success Metrics

If the product is truly better for admissions employees, it should improve these operational metrics:

- inquiry first-response time
- percent of started applications that become complete
- average days from app start to complete
- average days from complete to decision
- percent of documents auto-indexed without manual correction
- duplicate rate and duplicate resolution time
- admit-to-deposit conversion
- deposit-to-enrolled conversion
- melt rate
- counselor manual touches per completed applicant

## Final Recommendation

Do not reposition this as a better all-purpose CRM.

Do not reposition this as a better Element451 either.

Keep the differentiated core:

- incomplete-to-complete execution
- transcript intelligence
- trust
- explainable decisioning
- student-centered record

Then build the operator workflows that small admissions teams feel every day:

- incomplete-file acceleration
- duplicate cleanup
- signal-aware counselor prioritization
- admitted-pool yield work
- melt prevention
- downstream handoff visibility

That is the path to something better than Slate and complementary to Element451 for an admissions employee at a small school: not broader, but more operationally useful where staff actually struggle and where automation still needs judgment.
