# Backend Instructions: Phase 3 Student 360 As Admissions Record

Last updated: 2026-06-04

## Copy/Paste Brief For Backend

Build the Phase 3 Student 360 backend contract for crtfyStudent.

The product outcome is:

> Staff can open one canonical admissions record and understand identity, source, owner, stage, checklist, documents, transcript evidence, trust posture, decisions, yield, handoff, and history without opening a separate CRM.

The frontend can derive a temporary timeline from loaded student data, but production Student 360 must be backed by canonical student detail and timeline endpoints.

## Non-Negotiables

- Every protected endpoint requires `Authorization: Bearer <access_token>`.
- Every protected endpoint requires `X-Tenant-Id: <tenant_id>`.
- Validate user access to the tenant on every request.
- Do not accept tenant IDs from request bodies for protected endpoints.
- Return `401` for invalid/expired auth.
- Return `403` for valid auth without tenant/permission access.
- Return `404` when a scoped record does not exist.
- Return `422` for invalid payloads or invalid state transitions.
- Errors must return JSON with `detail` or `message`.
- Every write must create an audit event.
- Academic, transcript-image, and trust/fraud-sensitive data must respect sensitivity tiers.

## Build Order

1. Canonical student detail response.
2. Student search support.
3. Student timeline event service.
4. Timeline event ingestion from source, application, checklist, documents, transcripts, trust, decisions, yield, handoff, sync, and interactions.
5. Student 360 section endpoints or embedded summaries.
6. QA seed records with complete timelines.

## Required Endpoint: `GET /api/v1/students/{studentId}`

Permission: `view_student_360`.

Return:

```json
{
  "student": {
    "id": "STU-10482",
    "studentId": "STU-10482",
    "name": "Mira Holloway",
    "preferredName": "Mira",
    "email": "mira@example.edu",
    "phone": "555-0100",
    "city": "Chicago, IL",
    "population": "transfer",
    "source": "transcript_first",
    "sourceCategory": "direct",
    "campaign": "transfer-open-house",
    "program": {
      "id": "prog_nursing_transfer",
      "name": "BS Nursing Transfer"
    },
    "termInterest": "Fall 2026",
    "institutionGoal": "Harbor Gate University",
    "stage": "incomplete",
    "risk": "Low",
    "owner": {
      "id": "usr_42",
      "name": "Elian Brooks",
      "email": "elian@example.edu"
    },
    "readiness": {
      "state": "nearly_complete",
      "label": "Nearly complete",
      "reason": "One required item remains.",
      "tone": "medium"
    },
    "nextBestAction": "Review official transcript",
    "lastActivity": "2026-06-04T15:30:00Z",
    "updatedAt": "2026-06-04T15:30:00Z",
    "summary": "One item away from completion.",
    "fitScore": 88,
    "creditsAccepted": 42,
    "depositLikelihood": 61,
    "transcriptsCount": 2,
    "tags": ["Transfer", "One item away"]
  }
}
```

The frontend accepts `owner`, `advisor`, `assignedOwner`, `studentId`, `population`, and wrapped `{ "student": ... }` responses, but backend should prefer the canonical shape above.

## Required Endpoint: `GET /api/v1/students`

Permission: `view_student_360`.

Query params:

- `q`
- `stage`
- `population`
- `owner`
- `source`
- `program`
- `limit`
- `offset`

Search `q` across:

- name
- preferred name
- email
- phone
- student ID
- source
- campaign
- program
- lifecycle stage
- prior institution

Return:

```json
{
  "students": [],
  "total": 42
}
```

## Required Endpoint: `GET /api/v1/students/{studentId}/timeline`

Permission: `view_student_360`.

Return:

```json
{
  "events": [
    {
      "id": "evt_123",
      "type": "checklist",
      "title": "Official transcript marked complete",
      "description": "Elian Brooks completed Official transcript using document DOC-778.",
      "occurredAt": "2026-06-04T15:30:00Z",
      "actor": {
        "id": "usr_42",
        "name": "Elian Brooks",
        "type": "user"
      },
      "source": "checklist",
      "status": "complete",
      "entity": {
        "type": "student_checklist_item",
        "id": "chk_2"
      },
      "sensitivityTier": "standard"
    }
  ]
}
```

## Timeline Event Types

Support these now:

- `inquiry`
- `source`
- `application`
- `stage`
- `owner`
- `interaction`
- `checklist`
- `document`
- `transcript`
- `trust`
- `readiness`
- `decision`
- `yield`
- `deposit`
- `handoff`
- `sync`
- `audit`

## Timeline Sources

Create events from:

- prospect/inquiry creation
- source and campaign capture
- application start/submission
- lifecycle stage changes
- owner assignment changes
- counselor interactions
- checklist item status changes
- document upload/link/reprocess/replace
- transcript parsing and persistence
- trust case block/clear/escalate
- readiness computation changes
- decision packet review/release/hold
- admit/yield/deposit events
- handoff readiness and SIS/CRM sync errors

## Sensitivity Rules

- Users without academic sensitivity can see that academic evidence exists, but not course-level or GPA detail.
- Users without transcript-image sensitivity can see document metadata, but not transcript image/course details.
- Users without trust/fraud sensitivity can see only high-level trust-block status, not fraud rationale or evidence.
- Timeline events should either omit restricted detail or return redacted descriptions.

## Optional Section Endpoints

These can be embedded in `GET /api/v1/students/{studentId}` or exposed separately:

- `GET /api/v1/students/{studentId}/documents`
- `GET /api/v1/students/{studentId}/interactions`
- `GET /api/v1/students/{studentId}/decisions`
- `GET /api/v1/students/{studentId}/trust`
- `GET /api/v1/students/{studentId}/yield`
- `GET /api/v1/students/{studentId}/handoff`

## Backend Acceptance Criteria

- [ ] `GET /api/v1/students/{studentId}` returns canonical Student 360 identity, source, owner, stage, readiness, risk, next action, and summary.
- [ ] `GET /api/v1/students?q=...` searches name, email, student ID, source, program, and stage.
- [ ] `GET /api/v1/students/{studentId}/timeline` returns normalized timeline events.
- [ ] Timeline includes inquiry, application, checklist, documents, transcripts, trust, outreach/interactions, decisions, deposit/yield, handoff, and sync errors when present.
- [ ] Restricted academic/trust details are redacted based on permissions and sensitivity tiers.
- [ ] Every stage, owner, checklist, trust, decision, handoff, and sync write creates an audit/timeline event.

## Frontend Compatibility Notes

The current frontend calls:

- `GET /api/v1/students`
- `GET /api/v1/students?q=...`
- `GET /api/v1/students/{studentId}`
- `GET /api/v1/students/{studentId}/timeline`
- `GET /api/v1/students/{studentId}/checklist`
- `GET /api/v1/students/{studentId}/readiness`

If the timeline endpoint is unavailable, the frontend displays a derived timeline from student, checklist, readiness, transcript, and recommendation data. Production Phase 3 is not complete until the live timeline endpoint provides the canonical event history.
