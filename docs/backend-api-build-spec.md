# Backend API Build Spec For Current Frontend

This is the exact backend handoff for the frontend as it exists now.

The goal is twofold:

1. Build the APIs the frontend is already calling so screens stop falling back to local derived state.
2. Build the next operational APIs we need next so the product can move from demo logic to real admissions workflow.

## 1. Global contract

### Base URL

Frontend uses:

- `http://127.0.0.1:8000/api/...` in local unless `VITE_API_URL` overrides it.

### Required headers on protected endpoints

Every protected endpoint must accept:

```http
Authorization: Bearer <access_token>
X-Tenant-Id: <tenant_id>
Content-Type: application/json
```

For multipart upload:

```http
Authorization: Bearer <access_token>
X-Tenant-Id: <tenant_id>
```

Do not require the frontend to send display role names. Auth is based on machine keys returned by `/api/v1/me`.

### Auth bootstrap endpoint

This already exists and should remain the source of truth:

`GET /api/v1/me`

Return:

```json
{
  "userId": "123",
  "email": "test1@test.com",
  "displayName": "Jane Smith",
  "tenantId": "tenant_1",
  "tenantSlug": "demo",
  "tenantName": "Demo University",
  "baseRole": "director",
  "roles": ["admissions_counselor"],
  "permissions": ["view_student_360", "edit_checklist", "view_dashboards"],
  "sensitivityTiers": ["basic_profile", "academic_record"],
  "scopes": {
    "tenants": ["*"],
    "campuses": ["*"],
    "territories": ["*"],
    "programs": ["*"],
    "studentPopulations": ["*"],
    "stages": ["*"]
  },
  "recordExceptions": []
}
```

### Response conventions

Please standardize these across endpoints:

- `200` for success
- `201` for create
- `401` when token invalid or expired
- `403` when tenant or permission forbidden
- `404` when record not found
- `422` for validation errors

Error body:

```json
{
  "message": "Human readable error"
}
```

or

```json
{
  "detail": "Human readable error"
}
```

The frontend already handles either.

### Pagination convention

Where lists can grow, use:

- `page`
- `pageSize`
- `q`
- route-specific filters

Preferred list wrapper:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 25,
  "total": 142
}
```

The frontend also tolerates raw arrays for some current screens, but use the wrapped format going forward.

## 2. Build these first: currently called by the frontend

These are the live blockers. If these exist with the shapes below, the current UI works cleanly.

### 2.1 Auth

#### `POST /api/auth/login`

Used by sign-in form.

Request:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Response:

```json
{
  "access_token": "jwt",
  "refresh_token": "optional",
  "tenant_id": "tenant_1",
  "user_id": "123",
  "challenge": null
}
```

If password change required:

```json
{
  "challenge": "NEW_PASSWORD_REQUIRED",
  "session": "challenge-session-token",
  "tenant_id": "tenant_1"
}
```

#### `POST /api/auth/complete-new-password`

Request:

```json
{
  "email": "user@example.com",
  "newPassword": "new-secret",
  "session": "challenge-session-token"
}
```

Response should match login success payload.

#### `POST /api/auth/change-password`

Request:

```json
{
  "oldPassword": "old-secret",
  "newPassword": "new-secret"
}
```

Response:

```json
{
  "success": true
}
```

### 2.2 Students list

#### `GET /api/v1/students`

#### `GET /api/v1/students?q=...`

This feeds:

- Students page
- Student search
- local fallback logic for Today's Work, Incomplete, Ready for Review, Yield, Melt

Current frontend expects an array. Each object should include at least:

```json
[
  {
    "id": "stu_1001",
    "name": "Maya Johnson",
    "preferredName": "Maya",
    "email": "maya@example.com",
    "phone": "555-111-2222",
    "program": {
      "id": "prog_nursing",
      "name": "Nursing BSN"
    },
    "studentType": "transfer",
    "institutionGoal": "Main Campus",
    "stage": "Incomplete",
    "risk": "Medium",
    "advisor": "J. Smith",
    "city": "Chicago, IL",
    "gpa": 3.42,
    "creditsAccepted": 27,
    "transcriptsCount": 2,
    "fitScore": 84,
    "depositLikelihood": 61,
    "lastActivity": "2026-04-20T13:15:00Z",
    "tags": ["Missing transcript", "Transfer"],
    "summary": "Application submitted. Waiting on final transcript.",
    "nextBestAction": "Request final transcript",
    "checklist": [
      {
        "id": "item_transcript",
        "label": "Official transcript",
        "status": "missing",
        "done": false,
        "required": true,
        "category": "documents"
      }
    ],
    "transcripts": [
      {
        "id": "tr_001",
        "source": "City College transcript.pdf",
        "institution": "City College",
        "type": "Official transcript",
        "uploadedAt": "2026-04-20T12:00:00Z",
        "status": "Certified draft",
        "confidence": 93.1,
        "credits": 27,
        "pages": 4,
        "owner": "Transcript parser",
        "notes": "Parsed and attached.",
        "steps": [
          {
            "label": "Upload received",
            "time": "12:01 PM"
          }
        ]
      }
    ],
    "termGpa": [
      { "term": "Fall 2024", "gpa": 3.3, "credits": 12 }
    ],
    "recommendation": {
      "summary": "Ready for review after transcript lands.",
      "fitNarrative": "Strong academic fit for nursing prerequisites.",
      "nextBestAction": "Request final transcript"
    }
  }
]
```

Notes:

- `program` may be string or object. Object is preferred.
- `lastActivity` can be ISO timestamp; frontend can render it.
- `checklist` should be included here if easy. If not, Student 360 will load it separately.

Minimum permissions:

- `view_student_360`

### 2.3 Student detail

#### `GET /api/v1/students/{studentId}`

This powers Student 360.

Response can match the student list shape, but should be richer. Include at minimum:

- all student fields above
- full `checklist`
- full `transcripts`
- `recommendation`
- optional `yield`, `handoff`, `trustSummary`, `decisionSummary`

Recommended additions:

```json
{
  "yield": {
    "admitStatus": "Admitted",
    "depositStatus": "Not deposited",
    "yieldScore": 72,
    "meltRisk": 18
  },
  "handoff": {
    "sisStatus": "pending",
    "financialAidStatus": "ready",
    "orientationStatus": "blocked"
  },
  "decisionSummary": {
    "decisionId": "dec_101",
    "status": "Ready for review",
    "released": false
  }
}
```

Permissions:

- `view_student_360`

### 2.4 Checklist

#### `GET /api/v1/students/{studentId}/checklist`

Return either raw array or wrapper with `items`. Array is simplest.

```json
[
  {
    "id": "item_application",
    "label": "Application form",
    "status": "complete",
    "done": true,
    "required": true,
    "category": "application",
    "updatedAt": "2026-04-20T09:30:00Z",
    "updatedBy": {
      "id": "123",
      "name": "Jane Smith"
    }
  },
  {
    "id": "item_transcript",
    "label": "Official transcript",
    "status": "missing",
    "done": false,
    "required": true,
    "category": "documents"
  },
  {
    "id": "item_residency",
    "label": "Residency proof",
    "status": "needs_review",
    "done": false,
    "required": true,
    "category": "verification"
  }
]
```

Valid statuses the frontend already understands:

- `missing`
- `needs_review`
- `complete`

#### `POST /api/v1/students/{studentId}/checklist/items/{itemId}/status`

Request:

```json
{
  "status": "complete"
}
```

Return the updated checklist array, not just one item. That lets all checklist views stay in sync.

Permissions:

- `edit_checklist`

### 2.5 Readiness

#### `GET /api/v1/students/{studentId}/readiness`

Used by Student 360 for readiness chip.

Return:

```json
{
  "state": "ready_for_decision",
  "label": "Ready for decision",
  "reason": "All required items received and reviewed",
  "updatedAt": "2026-04-20T13:00:00Z"
}
```

Supported states for current UI:

- `ready_for_decision`
- `blocked_by_trust`
- `blocked_by_review`
- `in_progress`

The frontend also tolerates `readinessState` and `reasonLabel`, but standardize on:

- `state`
- `label`
- `reason`

Permissions:

- `view_student_360`

### 2.6 Today's Work summary

#### `GET /api/v1/work/summary`

This powers the stat cards on the home screen.

Response:

```json
{
  "summary": {
    "needsAttention": 42,
    "closeToCompletion": 18,
    "readyForDecision": 12,
    "exceptions": 6
  }
}
```

Or raw object with those fields is fine.

Permissions:

- `view_student_360` for general users
- further filtering by role/scope on backend

### 2.7 Today's Work items

#### `GET /api/v1/work/items`

#### `GET /api/v1/work/items?section=exceptions`

This is the most important list endpoint right now.

Response:

```json
{
  "items": [
    {
      "id": "work_1001",
      "studentId": "stu_1001",
      "studentName": "Maya Johnson",
      "program": "Nursing BSN",
      "population": "transfer",
      "section": "attention",
      "priority": "urgent",
      "priorityScore": 92,
      "institutionGoal": "Main Campus",
      "owner": {
        "id": "123",
        "name": "Jane Smith"
      },
      "reasonToAct": {
        "label": "Missing transcript"
      },
      "suggestedAction": {
        "label": "Request official transcript"
      },
      "readiness": {
        "state": "blocked_by_review",
        "label": "Blocked by review",
        "tone": "medium"
      },
      "blockingItems": [
        {
          "id": "item_transcript",
          "label": "Official transcript",
          "status": "missing"
        }
      ],
      "updatedAt": "2026-04-20T13:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 25,
  "total": 1
}
```

Supported `section` values already used by UI:

- `attention`
- `close`
- `ready`
- `exceptions`

Supported `priority` values:

- `urgent`
- `today`
- `soon`

Recommended query params to build now:

- `section`
- `q`
- `priority`
- `population`
- `ownerId`

Permissions:

- `view_student_360`

### 2.8 Trust cases

#### `GET /api/v1/trust/cases`

Powers current Exceptions and Trust screens.

Response:

```json
{
  "items": [
    {
      "id": "trust_2001",
      "studentId": "stu_1001",
      "student": "Maya Johnson",
      "documentId": "doc_778",
      "document": "Official transcript",
      "signal": "Metadata mismatch",
      "evidence": "Institution code does not match declared source",
      "severity": "high",
      "status": "open",
      "owner": {
        "id": "501",
        "name": "Trust Analyst"
      },
      "openedAt": "2026-04-19T10:00:00Z"
    }
  ]
}
```

Permissions:

- `manage_trust_cases` for full results
- if you also support `view_trust_flags`, return limited metadata only

### 2.9 Decisions list

#### `GET /api/v1/decisions`

Powers Decision Studio list.

Response:

```json
{
  "items": [
    {
      "id": "dec_101",
      "student": "Maya Johnson",
      "program": "Nursing BSN",
      "fit": 0.84,
      "creditEstimate": 27,
      "readiness": "Ready for review",
      "reason": "All required documents received. Nursing prerequisites mostly satisfied.",
      "status": "Draft",
      "queue": "Nursing review",
      "updatedAt": "2026-04-20T13:00:00Z"
    }
  ]
}
```

The frontend currently searches these fields:

- `student`
- `program`
- `readiness`
- `reason`
- `fit`
- `creditEstimate`

Permissions:

- recommend `view_decision_packet`

### 2.10 Create decision packet

#### `POST /api/v1/decisions`

Current request body:

```json
{
  "student": "Maya Johnson",
  "program": "Nursing BSN",
  "fit": 84,
  "creditEstimate": 27,
  "readiness": "Draft",
  "reason": "Manual draft"
}
```

This is still UI-driven and not ideal. Backend should support this for now, but the better long-term shape is:

```json
{
  "studentId": "stu_1001",
  "programId": "prog_nursing",
  "fit": 0.84,
  "creditEstimate": 27,
  "readiness": "Draft",
  "reason": "Manual draft"
}
```

Response:

```json
{
  "id": "dec_101",
  "student": "Maya Johnson",
  "program": "Nursing BSN",
  "fit": 0.84,
  "creditEstimate": 27,
  "readiness": "Draft",
  "reason": "Manual draft",
  "status": "Draft"
}
```

### 2.11 Decision detail

#### `GET /api/v1/decisions/{decisionId}`

This powers the packet page.

Response:

```json
{
  "id": "dec_101",
  "status": "Draft",
  "readiness": "Ready for review",
  "queue": "Nursing review",
  "createdAt": "2026-04-19T16:00:00Z",
  "updatedAt": "2026-04-20T13:00:00Z",
  "assignedTo": {
    "id": "123",
    "name": "Jane Smith"
  },
  "student": {
    "id": "stu_1001",
    "externalId": "A0019921",
    "name": "Maya Johnson",
    "email": "maya@example.com"
  },
  "program": {
    "id": "prog_nursing",
    "name": "Nursing BSN"
  },
  "recommendation": {
    "fit": 0.84,
    "creditEstimate": 27,
    "reason": "All required documents received. Nursing prerequisites mostly satisfied."
  },
  "evidence": {
    "institution": "City College",
    "gpa": 3.42,
    "creditsEarned": 36,
    "parserConfidence": 0.93,
    "documentCount": 2
  },
  "trust": {
    "status": "clear",
    "signals": ["No active trust flags"]
  },
  "notes": [
    {
      "id": "note_1",
      "body": "Packet reviewed by evaluator.",
      "createdAt": "2026-04-20T11:00:00Z",
      "authorName": "Jane Smith"
    }
  ],
  "timelinePreview": [
    {
      "id": "evt_1",
      "label": "Decision created",
      "detail": "Initial packet drafted",
      "type": "created",
      "at": "2026-04-19T16:00:00Z",
      "actorName": "Jane Smith"
    }
  ]
}
```

Permissions:

- recommend `view_decision_packet`

### 2.12 Decision timeline

#### `GET /api/v1/decisions/{decisionId}/timeline`

Response:

```json
{
  "items": [
    {
      "id": "evt_1",
      "label": "Decision created",
      "detail": "Initial packet drafted",
      "type": "created",
      "at": "2026-04-19T16:00:00Z",
      "actorName": "Jane Smith"
    }
  ]
}
```

### 2.13 Decision status update

#### `POST /api/v1/decisions/{decisionId}/status`

Request:

```json
{
  "status": "Ready for review"
}
```

Current UI uses this status set:

- `Draft`
- `Ready for review`
- `Needs evidence`
- `Approved`
- `Released`

Return updated decision detail or at least:

```json
{
  "success": true,
  "status": "Ready for review"
}
```

Permissions:

- recommend `edit_decision_packet`
- `release_decision` if status moves to `Released`

### 2.14 Decision note add

#### `POST /api/v1/decisions/{decisionId}/notes`

Request:

```json
{
  "body": "Packet reviewed by evaluator."
}
```

Return created note or updated notes collection.

### 2.15 Decision assignment

#### `POST /api/v1/decisions/{decisionId}/assign`

Request:

```json
{
  "assignee_user_id": "123",
  "queue": "Nursing review"
}
```

Return updated decision detail or simple success payload.

### 2.16 Transcript upload and processing

These are already wired into transcript intake and parser flow.

#### `POST /api/v1/transcripts/uploads`

Accept `multipart/form-data` with:

- `file`
- `document_type`
- `use_bedrock`

Single-file response:

```json
{
  "transcriptId": "tr_001"
}
```

Batch response:

```json
{
  "batchId": "batch_001",
  "status": "processing",
  "totalFiles": 12,
  "completedFiles": 0,
  "failedFiles": 0,
  "activeFiles": 12,
  "items": [
    {
      "transcriptId": "tr_001",
      "filename": "student1.pdf",
      "status": "processing",
      "completed": false
    }
  ]
}
```

#### `GET /api/v1/transcripts/uploads/{transcriptId}/status`

Response:

```json
{
  "transcriptId": "tr_001",
  "status": "completed",
  "completed": true
}
```

Or on failure:

```json
{
  "transcriptId": "tr_001",
  "status": "failed",
  "completed": false,
  "error": "Parser failed"
}
```

#### `GET /api/v1/transcripts/uploads/batches/{batchId}/status`

Response:

```json
{
  "batchId": "batch_001",
  "status": "processing",
  "totalFiles": 12,
  "completedFiles": 9,
  "failedFiles": 1,
  "activeFiles": 2,
  "items": [
    {
      "transcriptId": "tr_001",
      "filename": "student1.pdf",
      "status": "completed",
      "completed": true
    }
  ]
}
```

#### `GET /api/v1/transcripts/{transcriptId}/results`

This must return the parser result shape the frontend already maps directly.

Required fields:

```json
{
  "documentId": "doc_100",
  "studentId": "stu_1001",
  "isFraudulent": false,
  "isOfficial": true,
  "demographic": {
    "studentId": "stu_1001",
    "firstName": "Maya",
    "lastName": "Johnson",
    "institutionName": "City College",
    "studentState": "IL",
    "institutionState": "IL",
    "cumulativeGpa": 3.42,
    "totalCreditsEarned": 36
  },
  "grandGPA": {
    "cumulativeGPA": 3.42,
    "unitsEarned": 36
  },
  "termGPAs": [
    {
      "term": "Fall",
      "year": 2024,
      "simpleGPA": 3.3,
      "simpleUnitsEarned": 12
    }
  ],
  "courses": [
    {
      "institution": "City College",
      "pageNumber": 1,
      "confidenceScore": 0.93,
      "courseCode": "ENG101",
      "courseTitle": "English Composition",
      "grade": "A",
      "credits": 3
    }
  ],
  "metadata": {
    "document_type": "official_transcript",
    "parser_confidence": 0.93,
    "bedrock_used": true
  },
  "audit": [
    {
      "action": "Upload received",
      "occurredOnUtc": "2026-04-20T12:00:00Z"
    }
  ]
}
```

This endpoint is important because the frontend currently synthesizes Student 360 records from it.

## 3. Build next: needed so we can stop deriving product state in the frontend

These are not all live blockers today, but they are the next backend slice the frontend needs.

### 3.1 Incomplete queue API

#### `GET /api/v1/incomplete`

Purpose:

- dedicated operational queue instead of deriving from `/students`

Query params:

- `view=started_not_submitted|submitted_missing_items|nearly_complete|aging|missing_transcript|missing_residency|missing_fafsa`
- `q`
- `ownerId`
- `territory`
- `program`
- `population`
- `page`
- `pageSize`

Response item shape:

```json
{
  "id": "inc_1",
  "studentId": "stu_1001",
  "studentName": "Maya Johnson",
  "stage": "Submitted missing items",
  "missingItemsCount": 2,
  "missingItems": ["Official transcript", "Residency proof"],
  "lastActivityAt": "2026-04-18T15:00:00Z",
  "daysStalled": 2,
  "closestToComplete": true,
  "assignedOwner": {
    "id": "123",
    "name": "Jane Smith"
  },
  "suggestedNextAction": "Request official transcript",
  "readinessState": "in_progress",
  "priorityScore": 88
}
```

### 3.2 Ready for review queue API

#### `GET /api/v1/review-ready`

Response:

```json
{
  "items": [
    {
      "id": "rr_1",
      "studentId": "stu_1001",
      "studentName": "Maya Johnson",
      "program": "Nursing BSN",
      "fitScore": 84,
      "transferCredits": 27,
      "trustStatus": "clear",
      "assignedReviewer": {
        "id": "900",
        "name": "A. Reviewer"
      },
      "daysWaiting": 1,
      "reviewSlaHours": 24
    }
  ]
}
```

### 3.3 Documents queue API

#### `GET /api/v1/documents/queue`

Query params:

- `view=received_not_indexed|auto_matched|needs_human_review|processing_failed|duplicate_uploads|quarantined`

Response:

```json
{
  "items": [
    {
      "id": "doc_778",
      "documentType": "Official transcript",
      "studentMatch": {
        "studentId": "stu_1001",
        "studentName": "Maya Johnson"
      },
      "confidence": 0.93,
      "uploadSource": "Portal upload",
      "status": "needs_human_review",
      "trustFlag": true,
      "receivedAt": "2026-04-20T12:00:00Z"
    }
  ]
}
```

Follow-up actions to build:

- `POST /api/v1/documents/{documentId}/confirm-match`
- `POST /api/v1/documents/{documentId}/reject-match`
- `POST /api/v1/documents/{documentId}/reprocess`
- `POST /api/v1/documents/{documentId}/index`
- `POST /api/v1/documents/{documentId}/quarantine`
- `POST /api/v1/documents/{documentId}/release`

### 3.4 Admitted / yield queue API

#### `GET /api/v1/yield`

Query params:

- `view=newly_admitted|high_likelihood|high_value_transfer|no_recent_activity|scholarship_sensitive|missing_next_step`

Response:

```json
{
  "items": [
    {
      "studentId": "stu_1001",
      "studentName": "Maya Johnson",
      "admitDate": "2026-04-15T00:00:00Z",
      "depositStatus": "not_deposited",
      "yieldScore": 72,
      "lastActivityAt": "2026-04-20T10:00:00Z",
      "milestoneCompletion": 0.4,
      "assignedCounselor": {
        "id": "123",
        "name": "Jane Smith"
      }
    }
  ]
}
```

### 3.5 Deposit / melt API

#### `GET /api/v1/melt`

Query params:

- `view=all_clear|at_risk|missing_fafsa|missing_orientation|missing_final_transcript|registration_incomplete`

Response:

```json
{
  "items": [
    {
      "studentId": "stu_1001",
      "studentName": "Maya Johnson",
      "depositDate": "2026-04-10T00:00:00Z",
      "meltRisk": 31,
      "missingMilestones": ["Orientation registration"],
      "lastOutreachAt": "2026-04-18T14:00:00Z",
      "owner": {
        "id": "123",
        "name": "Jane Smith"
      }
    }
  ]
}
```

### 3.6 Handoff / integrations API

#### `GET /api/v1/integrations/handoff`

Purpose:

- business-facing sync status by student and office

Response:

```json
{
  "summary": {
    "healthy": 182,
    "failed": 9,
    "blocked": 14
  },
  "items": [
    {
      "studentId": "stu_1001",
      "studentName": "Maya Johnson",
      "office": "SIS",
      "status": "failed",
      "lastAttemptAt": "2026-04-20T12:30:00Z",
      "error": "Missing campus code"
    }
  ]
}
```

Actions:

- `POST /api/v1/integrations/handoff/{studentId}/retry`
- `POST /api/v1/integrations/handoff/{studentId}/acknowledge`

### 3.7 Reporting API

#### `GET /api/v1/reporting/overview`

Response:

```json
{
  "incompleteToCompleteConversion": 0.62,
  "averageDaysToComplete": 11.4,
  "averageDaysCompleteToDecision": 3.2,
  "autoIndexSuccessRate": 0.71,
  "admitToDepositConversion": 0.38,
  "meltRate": 0.09
}
```

### 3.8 Admin APIs

These are not yet wired, but the page is ready for them.

Recommended endpoints:

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/roles`
- `GET /api/v1/admin/checklist-templates`
- `POST /api/v1/admin/checklist-templates`
- `GET /api/v1/admin/routing-rules`
- `POST /api/v1/admin/routing-rules`
- `GET /api/v1/admin/decision-rules`
- `POST /api/v1/admin/decision-rules`
- `GET /api/v1/admin/sensitivity-settings`
- `POST /api/v1/admin/sensitivity-settings`

## 4. Permissions the backend should expose or map

The frontend is already using or prepared to use these permissions:

- `view_student_360`
- `edit_checklist`
- `view_decision_packet`
- `release_decision`
- `view_trust_flags`
- `manage_trust_cases`
- `view_sensitive_docs`
- `manage_integrations`
- `view_dashboards`

If some do not exist yet, either:

1. add them exactly as named, or
2. map existing backend permissions to these names in `/api/v1/me`

That is better than forcing the frontend to guess backend authorization semantics.

## 5. Sensitivity tiers the backend should keep honoring

Frontend is already gating sections with:

- `basic_profile`
- `academic_record`
- `transcript_images`
- `trust_fraud_flags`
- `notes`
- `released_decisions`

Specific expectations:

- no `academic_record` -> hide fit score, credits accepted, academic evaluation
- no `trust_fraud_flags` -> hide trust tab and trust detail
- no `transcript_images` or `view_sensitive_docs` -> metadata only, no sensitive file preview
- no `released_decisions` -> hide released decision content if policy requires

## 6. Recommended build order for backend

This is the shortest path to making the current frontend feel real.

### Phase 1: unblock existing frontend calls

Build or finish:

1. `GET /api/v1/me`
2. `GET /api/v1/students`
3. `GET /api/v1/students/{studentId}`
4. `GET /api/v1/students/{studentId}/checklist`
5. `POST /api/v1/students/{studentId}/checklist/items/{itemId}/status`
6. `GET /api/v1/students/{studentId}/readiness`
7. `GET /api/v1/work/summary`
8. `GET /api/v1/work/items`
9. `GET /api/v1/trust/cases`
10. `GET /api/v1/decisions`
11. `GET /api/v1/decisions/{decisionId}`
12. `GET /api/v1/decisions/{decisionId}/timeline`
13. `POST /api/v1/decisions/{decisionId}/status`
14. `POST /api/v1/decisions/{decisionId}/notes`
15. `POST /api/v1/decisions/{decisionId}/assign`
16. transcript upload/status/results endpoints

### Phase 2: replace frontend-derived operational queues

Build:

1. `GET /api/v1/incomplete`
2. `GET /api/v1/review-ready`
3. `GET /api/v1/documents/queue`
4. document action endpoints
5. `GET /api/v1/yield`
6. `GET /api/v1/melt`

### Phase 3: close the loop across offices and leadership

Build:

1. `GET /api/v1/integrations/handoff`
2. handoff retry/ack endpoints
3. `GET /api/v1/reporting/overview`
4. admin endpoints

## 7. Important backend notes

### Do backend filtering by tenant, scope, and permission

Do not return everything and expect the frontend to hide restricted data.

Enforce:

- tenant
- campus
- territory
- program
- student population
- stage
- sensitivity tier
- record exception policy

### Include audit metadata wherever possible

For trust-heavy and decision-heavy workflows, add these fields to mutable objects:

- `updatedAt`
- `updatedBy`
- `createdAt`
- `createdBy`

Especially on:

- checklist items
- documents
- decisions
- trust cases
- handoff events

### Prefer stable machine values

Use stable machine values for:

- roles
- permissions
- statuses
- queue names where possible
- view filters

Frontend can map them to friendly labels for display.

## 8. Legacy endpoints

These are still referenced in old code paths but are not the main path anymore:

- `GET /api/v1/dashboard/stats`
- `GET /api/v1/dashboard/funnel`
- `GET /api/v1/dashboard/routing-mix`

You can either:

1. leave them in place for compatibility, or
2. deprecate them after the frontend is moved fully to the new reporting and work APIs

## 9. Short version to send backend

If you need a one-paragraph backend brief:

Build the current frontend contract first: `/api/v1/me`, students list/detail, checklist get/update, readiness, work summary/items, trust cases, decisions list/detail/timeline/status/notes/assign, and transcript upload/status/results. All protected routes must accept `Authorization: Bearer <token>` and `X-Tenant-Id: <tenant_id>`, enforce tenant/scope/permission server-side, and return machine-key auth values. After that, build first-class operational queue endpoints for incomplete, review-ready, documents, yield, melt, handoff, and reporting so the frontend can stop deriving admissions workflow state locally.
