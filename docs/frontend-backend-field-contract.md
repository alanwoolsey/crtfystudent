# Frontend / Backend Field Contract

Last updated: 2026-06-04

## Purpose

This document tags the fields currently used by the frontend so backend can prioritize the API contract without reverse-engineering React components.

Use these tags:

- `backend contract`: must be returned by backend for production behavior.
- `keep`: useful frontend display field; backend should return when available.
- `rename`: current frontend field should map to a cleaner backend name over time.
- `remove`: prototype-only field that should not drive backend schema.
- `later`: valid product field, but not required for Phase 1.

## Phase 1 Priority

Backend should prioritize these contracts first:

- `StudentRecord`
- `Checklist`
- `Readiness`
- `TodayWorkItem`
- `TodayWorkBoardGroup`
- `DocumentChecklistLink`

Do not let Prospect Portal, Integrations, Yield, Melt, or Handoff fields slow down Phase 1.

## `StudentRecord`

Used by:

- `StudentsPage`
- `StudentCard`
- `StudentProfilePage`
- fallback work item derivation in `studentWorkflow.js`
- Incomplete, Ready for Review, Exceptions fallback queues

| Field | Tag | Notes |
|---|---|---|
| `id` | backend contract | Stable student identifier. |
| `name` | backend contract | Display name. |
| `preferredName` | keep | Used in Student 360 header. |
| `email` | backend contract | Student 360 contact detail and search. |
| `phone` | keep | Student 360 contact detail. |
| `program` | backend contract | String or `{ id, name }`; object preferred. |
| `institutionGoal` | rename | Current UI uses this as campus/institution goal; prefer `campus` or `institutionGoal` consistently. |
| `stage` | backend contract | Human-readable lifecycle stage. |
| `risk` | backend contract | Current UI expects `Low`, `Medium`, `High`; can later move to structured risk object. |
| `advisor` | rename | Current owner field; prefer `owner: { id, name }`, but frontend currently normalizes `advisor`. |
| `city` | keep | Display-only location. |
| `gpa` | keep | Hidden unless user has academic sensitivity. |
| `creditsAccepted` | keep | Hidden unless user has academic sensitivity. |
| `transcriptsCount` | keep | Used on student card metrics. |
| `fitScore` | keep | Used for filters and cards; Phase 1 can return null. |
| `depositLikelihood` | later | Yield signal; not required for Phase 1. |
| `lastActivity` | backend contract | Can be ISO timestamp or display string. Prefer ISO. |
| `tags` | keep | Used for filters; can be derived later. |
| `summary` | keep | Display text for Student 360 and card. |
| `nextBestAction` | backend contract | Used when recommendation is absent. |
| `checklist` | backend contract | Can be included in student response or loaded separately. |
| `transcripts` | keep | Student 360 document tab. |
| `termGpa` | later | Academic visualization; not required for Phase 1. |
| `recommendation` | later | Decision Studio source; Phase 1 can return minimal next action. |
| `yield` | later | Yield tab. |
| `handoff` | later | Handoff tab. |
| `decisionSummary` | later | Decision tab. |
| `trustSummary` | later | Trust tab. |

Recommended minimum:

```json
{
  "id": "STU-10482",
  "name": "Mira Holloway",
  "preferredName": "Mira",
  "email": "mira.holloway@example.edu",
  "phone": "(414) 555-0134",
  "program": {
    "id": "prog_nursing_transfer",
    "name": "BS Nursing Transfer"
  },
  "population": "transfer",
  "stage": "Incomplete applicant",
  "risk": "Medium",
  "owner": {
    "id": "usr_42",
    "name": "Elian Brooks"
  },
  "advisor": "Elian Brooks",
  "lastActivity": "2026-06-04T15:30:00Z",
  "summary": "Application submitted. Official transcript needs review.",
  "nextBestAction": "Review official transcript"
}
```

## `Checklist`

Used by:

- `ChecklistProgress`
- `StudentProfilePage`
- `WorkItemRow`
- fallback work item derivation

| Field | Tag | Notes |
|---|---|---|
| `studentId` | backend contract | Required in wrapper response. |
| `population` | backend contract | Used for template context. |
| `completionPercent` | backend contract | Required for progress bar and work priority. |
| `oneItemAway` | backend contract | Required for work bucket and priority. |
| `status` | backend contract | Checklist-level status. |
| `items` | backend contract | Required. |
| `items[].id` | backend contract | Used for checklist status update. |
| `items[].code` | backend contract | Stable machine code. |
| `items[].label` | backend contract | Display label. |
| `items[].required` | backend contract | Completion math uses required items only. |
| `items[].status` | backend contract | See supported statuses. |
| `items[].done` | rename | Legacy frontend convenience; backend can omit if status is provided. |
| `items[].receivedAt` | keep | Useful for audit/context. |
| `items[].completedAt` | keep | Useful for audit/context. |
| `items[].dueAt` | later | Needed for SLA/aging. |
| `items[].sourceDocumentId` | backend contract | Needed for document-to-checklist evidence. |
| `items[].sourceConfidence` | backend contract | Needed for document-to-checklist evidence. |

Supported statuses:

- `not_started`
- `requested`
- `received`
- `needs_review`
- `waived`
- `complete`
- `blocked`
- `rejected`
- `expired`

Frontend also tolerates `missing`, but backend should prefer `not_started`.

## `Readiness`

Used by:

- `ReadinessChip`
- `StudentProfilePage`
- `WorkItemRow`
- Ready for Review and Today's Work flows

| Field | Tag | Notes |
|---|---|---|
| `studentId` | backend contract | Required for traceability. |
| `state` | backend contract | Preferred response field. |
| `readinessState` | rename | Frontend tolerates this alias, but prefer `state`. |
| `label` | backend contract | Display label. |
| `reason` | backend contract | Human-readable explanation. |
| `reasonCode` | backend contract | Machine-readable reason. |
| `tone` | backend contract | `low`, `medium`, `high`, or `neutral`. |
| `blockingItemCount` | backend contract | Used for work explanations. |
| `trustBlocked` | backend contract | Required for decision gates. |
| `blockers` | backend contract | Array of checklist/trust/document blockers. |
| `computedAt` | keep | Shows freshness and supports audit. |

Preferred states:

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

Frontend fallback aliases:

- `blocked_by_missing_item`
- `blocked_by_review`

## `TodayWorkItem`

Used by:

- `TodaysWorkPage`
- `IncompletePage`
- `ReadyForReviewPage`
- `ExceptionsPage`
- `QueuePage`

| Field | Tag | Notes |
|---|---|---|
| `id` | backend contract | Stable work item id. |
| `studentId` | backend contract | Links to Student 360. |
| `studentName` | backend contract | Display name. |
| `population` | backend contract | Filtering and display. |
| `stage` | backend contract | Lifecycle/work stage. |
| `completionPercent` | backend contract | Progress and priority. |
| `priority` | backend contract | `urgent`, `today`, `soon`. |
| `priorityScore` | keep | Useful for explainability and sorting. |
| `section` | backend contract | `attention`, `close`, `ready`, `exceptions`. |
| `owner` | backend contract | `{ id, name }`; can be unassigned. |
| `reasonToAct.code` | backend contract | Machine reason. |
| `reasonToAct.label` | backend contract | Human reason. |
| `suggestedAction.code` | backend contract | Machine action. |
| `suggestedAction.label` | backend contract | Human action. |
| `readiness` | backend contract | Readiness object. |
| `blockingItems` | backend contract | Array of current blockers. |
| `checklistSummary` | backend contract | Required for progress UI. |
| `program` | backend contract | Display/search. |
| `institutionGoal` | rename | Prefer consistent campus/program destination naming. |
| `risk` | keep | Display. |
| `lastActivity` | backend contract | Prefer ISO timestamp. |
| `updatedAt` | keep | Freshness. |
| `currentOwnerAgent` | later | Agent routing. |
| `recommendedAgent` | later | Agent routing. |
| `queueGroup` | later | Backend board grouping. |
| `documentAgent` | later | Agent orchestration detail. |
| `trustAgent` | later | Agent orchestration detail. |
| `decisionAgent` | later | Agent orchestration detail. |

## `TodayWorkBoardGroup`

Used by:

- `TodaysWorkPage`

| Field | Tag | Notes |
|---|---|---|
| `key` | backend contract | Work bucket key. |
| `label` | backend contract | Display label. |
| `total` | backend contract | Count for tab. |
| `items` | backend contract | Array of `TodayWorkItem`. |
| `routeHint.nextAgent` | later | Useful for agent routing. |
| `routeHint.reason` | later | Useful for agent routing. |
| `routeHint.actionLabel` | later | Useful for agent routing. |

Preferred group keys:

- `new_inquiries`
- `no_first_touch`
- `started_not_submitted`
- `incomplete_applicants`
- `one_item_away`
- `stalled_applicants`
- `document_blocked`
- `trust_blocked`
- `ready_for_review`
- `decision_waiting`
- `admitted_no_recent_touch`
- `deposit_risk`
- `melt_risk`
- `handoff_risk`

## `Transcript`

Used by:

- `StudentProfilePage`
- `TranscriptTimeline`
- upload result fallback mapping

| Field | Tag | Notes |
|---|---|---|
| `id` | backend contract | Document/transcript id. |
| `source` | keep | Original file/source label. |
| `institution` | backend contract | Transcript institution. |
| `type` | keep | Official/unofficial/high school/college. |
| `uploadedAt` | backend contract | Timeline. |
| `status` | backend contract | Document status. |
| `confidence` | backend contract | Parser/match confidence. |
| `credits` | keep | Academic display. |
| `pages` | keep | Document display. |
| `owner` | keep | Processor/agent owner display. |
| `notes` | keep | Timeline/context. |
| `steps` | keep | Timeline entries. |
| `courses` | later | Sensitive transcript detail. |
| `rawDocument` | remove | Do not return raw parser payload to general frontend. |

## `ProspectExperience`

Used by:

- `ProspectPortalPage`

Current direct mock import: `prospectExperiences`.

| Field | Tag | Notes |
|---|---|---|
| `title` | remove | Static marketing/prototype content. |
| `description` | remove | Static marketing/prototype content. |

Phase 1 does not require backend work for this screen.

## `ConnectorCard`

Used by:

- `ConnectorsPage`

Current direct mock import: `connectorCards`.

| Field | Tag | Notes |
|---|---|---|
| `name` | later | Integration console. |
| `status` | later | Integration console. |
| `direction` | later | Integration console. |
| `latency` | later | Integration console. |
| `coverage` | later | Integration console. |

Phase 1 does not require backend work for this screen.

## Yield And Melt Fields

Used by:

- `AdmittedYieldPage`
- `DepositMeltPage`

These are real product fields, but not Phase 1 blockers.

### Yield

| Field | Tag |
|---|---|
| `studentId` | later |
| `studentName` | later |
| `admitDate` | later |
| `depositStatus` | later |
| `yieldScore` | later |
| `lastActivityAt` | later |
| `milestoneCompletion` | later |
| `assignedCounselor` | later |
| `program` | later |
| `nextStep` | later |

### Melt

| Field | Tag |
|---|---|
| `studentId` | later |
| `studentName` | later |
| `depositDate` | later |
| `meltRisk` | later |
| `missingMilestones` | later |
| `lastOutreachAt` | later |
| `owner` | later |
| `program` | later |

## Immediate Backend Ask

For the first backend delivery, implement these fields only:

- `StudentRecord.id`
- `StudentRecord.name`
- `StudentRecord.email`
- `StudentRecord.program`
- `StudentRecord.population`
- `StudentRecord.stage`
- `StudentRecord.risk`
- `StudentRecord.owner`
- `StudentRecord.advisor`
- `StudentRecord.lastActivity`
- `StudentRecord.summary`
- `StudentRecord.nextBestAction`
- `Checklist`
- `Readiness`
- `TodayWorkItem`
- `TodayWorkBoardGroup`
- `DocumentChecklistLink`

Everything else can remain null, omitted, or later-phase.

