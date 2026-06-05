# Backend Instructions: Phase 2 Inquiry Capture And Prospect Portal

Last updated: 2026-06-04

## Copy/Paste Brief For Backend

Build the Phase 2 prospect-intake backend for crtfyStudent.

The product outcome is:

> A prospective student can be captured before an application exists, optionally upload a transcript, receive a fit/next-step preview, and appear in admissions work without creating duplicate records.

The frontend now calls live Prospect Portal endpoints and falls back to a derived preview if they are unavailable. Production behavior must come from backend endpoints.

## Non-Negotiables

- Every staff-facing protected endpoint requires `Authorization: Bearer <access_token>`.
- Every staff-facing protected endpoint requires `X-Tenant-Id: <tenant_id>`.
- Validate user access to the tenant on every request.
- Do not accept tenant IDs from request bodies for protected endpoints.
- Return `401` for invalid/expired auth.
- Return `403` for valid auth without tenant/permission access.
- Return `404` when a scoped record does not exist.
- Return `422` for invalid payloads or invalid state transitions.
- Errors must return JSON with `detail` or `message`.
- Every write must create an audit event.
- Prospect creation must run duplicate checks before creating a new person/student record.

## Build Order

1. Prospect schema and source attribution.
2. Inquiry creation endpoint.
3. Transcript-first upload endpoint.
4. Fit/transfer signal projection.
5. Prospect-to-student/Application conversion path.
6. Today's Work projection for prospect follow-up.
7. Seed/demo tenant data for QA.

## Required Tables

### `prospects`

- `id`
- `tenant_id`
- `student_id` nullable
- `first_name`
- `last_name`
- `email`
- `phone` nullable
- `population`
- `program_interest` nullable
- `term_interest` nullable
- `prior_institution` nullable
- `lifecycle_stage`
- `status`
- `owner_user_id` nullable
- `source`
- `source_category`
- `campaign` nullable
- `consent_captured`
- `question` nullable
- `created_at`
- `updated_at`

### `prospect_source_references`

- `id`
- `tenant_id`
- `prospect_id`
- `source`
- `source_category`
- `campaign` nullable
- `external_reference_id` nullable
- `metadata_json`
- `captured_at`

### `prospect_transcript_uploads`

- `id`
- `tenant_id`
- `prospect_id` nullable
- `email`
- `filename`
- `content_type`
- `file_size`
- `storage_uri`
- `status`
- `processing_run_id` nullable
- `created_at`
- `updated_at`

### `prospect_fit_results`

- `id`
- `tenant_id`
- `prospect_id`
- `transcript_upload_id` nullable
- `program`
- `fit_score`
- `confidence`
- `transfer_credits` nullable
- `estimated_completion` nullable
- `scholarship_potential` nullable
- `missing_items_json`
- `signals_json`
- `computed_at`

### `prospect_next_actions`

- `id`
- `tenant_id`
- `prospect_id`
- `code`
- `label`
- `url` nullable
- `owner_user_id` nullable
- `status`
- `created_at`
- `completed_at` nullable

## Required State Values

### Prospect lifecycle stage

- `prospect`
- `inquiry`
- `applicant`
- `withdrawn`
- `duplicate_candidate`

### Prospect status

- `new`
- `needs_follow_up`
- `transcript_received`
- `fit_ready`
- `application_started`
- `converted`
- `duplicate_candidate`
- `archived`

### Transcript upload status

- `received`
- `processing`
- `fit_ready`
- `needs_review`
- `failed`

### Next action codes

- `start_application`
- `upload_transcript`
- `schedule_counselor`
- `answer_question`
- `review_transfer_fit`
- `resolve_duplicate`

## Required Endpoints

### `POST /api/v1/prospects/inquiries`

Permission: `view_student_360` or `edit_checklist` for staff-created intake.

Request:

```json
{
  "firstName": "Mira",
  "lastName": "Holloway",
  "email": "mira@example.edu",
  "phone": "555-0100",
  "population": "transfer",
  "programInterest": "BS Nursing Transfer",
  "termInterest": "Fall 2026",
  "priorInstitution": "River County College",
  "source": "manual_entry",
  "sourceCategory": "direct",
  "campaign": "transfer-open-house",
  "consent": true,
  "question": "How many credits will transfer?",
  "transcriptUploadId": "upl_123",
  "transcriptFilename": "mira-transcript.pdf"
}
```

Return:

```json
{
  "prospect": {
    "prospectId": "pro_123",
    "studentId": null,
    "studentName": "Mira Holloway",
    "status": "fit_ready",
    "population": "transfer",
    "programInterest": "BS Nursing Transfer",
    "termInterest": "Fall 2026",
    "source": "manual_entry",
    "programFit": {
      "program": "BS Nursing Transfer",
      "fitScore": 88,
      "confidence": 0.82,
      "transferCredits": 42,
      "estimatedCompletion": "2.1 years",
      "scholarshipPotential": "$8.5k-$11k"
    },
    "nextStep": {
      "code": "start_application",
      "label": "Start application",
      "url": "/apply?prospectId=pro_123"
    },
    "counselor": {
      "id": "usr_42",
      "name": "Elian Brooks",
      "email": "elian@example.edu"
    },
    "transcriptStatus": "fit_ready",
    "missingItems": ["Official transcript", "Application form"],
    "signals": [
      { "label": "Population", "value": "transfer" },
      { "label": "Source", "value": "manual_entry" }
    ]
  }
}
```

Required behavior:

- Validate consent before creating a follow-up-capable prospect.
- Create or update a prospect after duplicate checks by email, phone, name/date of birth if available, and external references.
- Persist source attribution separately from mutable prospect profile fields.
- Attach `transcriptUploadId` if provided and scoped to the same tenant/email.
- Compute or return the best available fit preview.
- Create a next action.
- Create audit events.

### `POST /api/v1/prospects/transcripts/uploads`

Permission: `view_student_360` or `edit_checklist`.

Content type: `multipart/form-data`

Fields:

- `file`
- `email`
- `population`
- `programInterest`
- `termInterest`

Return:

```json
{
  "uploadId": "upl_123",
  "status": "received",
  "filename": "mira-transcript.pdf"
}
```

Required behavior:

- Store the file securely.
- Create a `prospect_transcript_uploads` record.
- Kick off transcript processing when available.
- Return quickly; processing can continue asynchronously.
- Create audit events.

### `GET /api/v1/prospects/transcripts/uploads/{uploadId}/status`

Permission: `view_student_360`.

Return:

```json
{
  "uploadId": "upl_123",
  "status": "fit_ready",
  "processingRunId": "run_123",
  "message": "Fit preview is ready."
}
```

### `GET /api/v1/prospects/{prospectId}/fit`

Permission: `view_student_360`.

Return the `programFit`, `missingItems`, `signals`, and `nextStep` shape used by `POST /api/v1/prospects/inquiries`.

### `POST /api/v1/prospects/{prospectId}/convert-application`

Permission: `edit_checklist`.

Required behavior:

- Convert the prospect into the canonical student/applicant record.
- Preserve source attribution.
- Preserve transcript upload and fit evidence.
- Do not create duplicate student records.
- Return the canonical `studentId`.
- Create audit events.

## Today's Work Projection

Prospects should appear in `GET /api/v1/work/today` when they need action.

Recommended reason-to-act codes:

- `new_inquiry`
- `transcript_first_lead`
- `high_fit_prospect`
- `question_needs_answer`
- `duplicate_candidate`

Recommended work buckets:

- `new_inquiries`
- `no_first_touch`
- `started_not_submitted`
- `duplicate_candidate`

## Seed Data Required For QA

- [ ] One manual inquiry without transcript.
- [ ] One transcript-first prospect with fit-ready results.
- [ ] One prospect with a question needing counselor follow-up.
- [ ] One duplicate-candidate prospect.
- [ ] One prospect converted to applicant/student.

## Backend Acceptance Criteria

- [ ] Inquiry submissions persist as prospects.
- [ ] Source attribution persists separately and survives conversion.
- [ ] Transcript-first uploads create upload records and processing state.
- [ ] Fit preview returns best-fit program, fit score, confidence, credits, missing items, and next step.
- [ ] Prospects requiring action appear in Today's Work.
- [ ] Prospect-to-application conversion does not create duplicates.
- [ ] Every write creates an audit event.
- [ ] All endpoints are tenant-scoped and permission-checked.

## Frontend Compatibility Notes

The current frontend calls:

- `POST /api/v1/prospects/inquiries`
- `POST /api/v1/prospects/transcripts/uploads`

The frontend tolerates missing prospect APIs by showing a derived preview, but production Phase 2 is not complete until live responses drive the Prospect Portal summary.
