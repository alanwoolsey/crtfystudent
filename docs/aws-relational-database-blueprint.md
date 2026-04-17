# AWS Relational Database Blueprint for `crtfy student`

## Purpose

This document is the backend handoff for the first production relational database behind `crtfy student`.

The current app shape requires the database to support:

- a canonical Student 360 record
- multiple transcript uploads per student
- transcript lineage and audit history
- parsed demographic, GPA, term, and course detail
- workflow queues and assignments
- trust and authenticity review
- multitenant isolation
- future Cognito integration without using the database as the auth system

This is written for an inexpensive first production deployment on AWS, while keeping a clean path to scale.

---

## Recommended AWS choice

## Primary recommendation

Use **Amazon RDS for PostgreSQL**.

Initial footprint:

- `RDS PostgreSQL 16`
- `Single-AZ`
- instance class: start with `db.t4g.small` or `db.t4g.micro` if usage is very light
- storage: `gp3`, start at `20-100 GB`
- automatic backups enabled
- storage encryption with KMS
- private subnets only
- require TLS from the app/backend

Why:

- relational and inexpensive
- PostgreSQL gives strong JSONB support for parser payloads
- easy fit for multitenant SaaS with tenant-scoped tables
- simpler and cheaper than Aurora for an early-stage workload

## Do not store transcript files in the database

Use **S3** for:

- uploaded transcript files
- derived OCR artifacts if needed
- optional large raw parser payload archives

Use PostgreSQL for:

- metadata
- normalized transcript/course data
- queue/workflow state
- audit trail
- references to S3 object keys

---

## Multitenancy model

## Recommended model

Use **shared database, shared schema, tenant-scoped rows**.

That means:

- one Postgres database
- one main application schema
- every tenant-owned business table includes `tenant_id UUID NOT NULL`
- all reads and writes are tenant-filtered
- all tenant uniqueness rules are composite with `tenant_id`

Example:

- `students(id)`
- `UNIQUE (tenant_id, external_student_id)`
- `INDEX (tenant_id, status, updated_at)`

This is the least expensive model and is appropriate for the product stage implied by the app.

## When to avoid separate databases per tenant

Do **not** start with database-per-tenant unless:

- you already have hard contractual isolation requirements
- tenant data volumes are extremely uneven
- you need tenant-specific maintenance windows or extensions

That would raise cost and operational complexity too early.

## Isolation guardrails

At minimum:

- every service query must include tenant scoping
- every FK between tenant-owned tables should either include tenant-aware validation in code or use composite uniqueness patterns that prevent cross-tenant joins
- every list endpoint should filter by `tenant_id`

Nice next step:

- enable **PostgreSQL Row Level Security** on tenant-owned tables once the service layer is stable

---

## Identity and Cognito

The database should **not** own passwords or login sessions.

Still, the app needs user records for:

- advisor assignment
- evaluator ownership
- queue routing
- audit logs
- role-based behavior inside a tenant

Recommended split:

- **Cognito** handles authentication
- the application database stores **application users and tenant memberships**

Recommended approach:

- store `cognito_sub` on the app user record after login/linking
- store tenant-specific roles in a membership table
- never use Cognito groups as the only source of tenant authorization state

---

## Product domains the database must cover

The current app implies these major domains:

1. Tenant and organization configuration
2. App users, roles, and tenant memberships
3. Students
4. Student identifiers and matching
5. Institutions and destination programs
6. Transcript documents and file storage metadata
7. Parser runs and raw parser output
8. Normalized transcript data:
   - demographics
   - courses
   - term GPA summaries
   - cumulative GPA summaries
9. Workflow queues and work items
10. Trust/fraud review
11. Student notes, tasks, and activity feed
12. Audit/event history

---

## Core design rules

Use these rules consistently:

- primary keys: `UUID`
- timestamps: `TIMESTAMPTZ`
- enums: use PostgreSQL enums only for truly stable values; use lookup/reference tables for values likely to evolve
- structured payloads from parsing: `JSONB`
- soft delete only where legally/operationally needed; otherwise prefer immutable event history plus current-state rows
- every tenant-owned table gets:
  - `tenant_id UUID NOT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

---

## Suggested schema

## 1. Tenancy and configuration

### `tenants`

One record per school, partner, or customer organization using the app.

Columns:

- `id UUID PK`
- `name TEXT NOT NULL`
- `slug TEXT NOT NULL UNIQUE`
- `status TEXT NOT NULL`  
  Example: `active`, `trial`, `suspended`
- `primary_region TEXT`
- `data_retention_days INT`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### `tenant_settings`

Tenant-specific feature and workflow settings.

Columns:

- `tenant_id UUID PK FK -> tenants.id`
- `default_document_type TEXT`
- `use_bedrock_default BOOLEAN NOT NULL DEFAULT true`
- `student_match_strategy TEXT`
- `queue_sla_hours INT`
- `settings_json JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

---

## 2. Users and memberships

### `app_users`

Global application user profile, not auth credentials.

Columns:

- `id UUID PK`
- `email CITEXT UNIQUE`
- `display_name TEXT NOT NULL`
- `cognito_sub TEXT UNIQUE NULL`
- `identity_provider TEXT NULL`
- `is_active BOOLEAN NOT NULL DEFAULT true`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### `tenant_user_memberships`

Role and status of a user inside a tenant.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL FK -> tenants.id`
- `user_id UUID NOT NULL FK -> app_users.id`
- `role TEXT NOT NULL`  
  Example: `tenant_admin`, `advisor`, `evaluator`, `ops`, `trust_safety`, `reader`
- `status TEXT NOT NULL DEFAULT 'active'`
- `is_default BOOLEAN NOT NULL DEFAULT false`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Constraints:

- `UNIQUE (tenant_id, user_id)`

---

## 3. Institutions and programs

### `institutions`

Sending or destination institutions.

Columns:

- `id UUID PK`
- `tenant_id UUID NULL`
- `name TEXT NOT NULL`
- `external_code TEXT NULL`
- `ceeb_code TEXT NULL`
- `city TEXT`
- `state TEXT`
- `country TEXT`
- `institution_type TEXT`  
  Example: `high_school`, `college`, `university`, `other`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Notes:

- if institution records are fully tenant-specific, make `tenant_id NOT NULL`
- if you want a shared institution reference catalog later, support `tenant_id NULL` for global rows plus tenant overrides

### `programs`

Destination programs a student is targeting.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `institution_id UUID NULL FK -> institutions.id`
- `name TEXT NOT NULL`
- `program_code TEXT NULL`
- `degree_type TEXT NULL`
- `is_active BOOLEAN NOT NULL DEFAULT true`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Constraints:

- `UNIQUE (tenant_id, institution_id, name)`

---

## 4. Students

### `students`

Canonical student record shown in Student 360.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL FK -> tenants.id`
- `external_student_id TEXT NULL`
- `first_name TEXT`
- `middle_name TEXT`
- `last_name TEXT`
- `preferred_name TEXT`
- `date_of_birth DATE NULL`
- `email TEXT NULL`
- `phone TEXT NULL`
- `city TEXT NULL`
- `state TEXT NULL`
- `country TEXT NULL`
- `target_program_id UUID NULL FK -> programs.id`
- `target_institution_id UUID NULL FK -> institutions.id`
- `advisor_user_id UUID NULL FK -> app_users.id`
- `current_stage TEXT NOT NULL`
- `risk_level TEXT NOT NULL DEFAULT 'low'`
- `summary TEXT NULL`
- `latest_cumulative_gpa NUMERIC(5,2) NULL`
- `accepted_credits NUMERIC(8,2) NULL`
- `latest_activity_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Constraints:

- `UNIQUE (tenant_id, external_student_id)` where `external_student_id IS NOT NULL`

Indexes:

- `(tenant_id, last_name, first_name)`
- `(tenant_id, current_stage)`
- `(tenant_id, advisor_user_id, current_stage)`
- `(tenant_id, latest_activity_at DESC)`

### `student_identifiers`

Holds identifiers used for matching transcripts to a canonical student.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `student_id UUID NOT NULL FK -> students.id`
- `identifier_type TEXT NOT NULL`  
  Example: `school_student_id`, `ssn_last4`, `application_id`, `email`, `institution_student_id`
- `identifier_value TEXT NOT NULL`
- `source TEXT NULL`
- `is_verified BOOLEAN NOT NULL DEFAULT false`
- `created_at TIMESTAMPTZ`

Constraints:

- `UNIQUE (tenant_id, identifier_type, identifier_value)`

---

## 5. Transcript files and documents

### `document_uploads`

One row per uploaded file.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `uploaded_by_user_id UUID NULL FK -> app_users.id`
- `original_filename TEXT NOT NULL`
- `mime_type TEXT NOT NULL`
- `file_size_bytes BIGINT NOT NULL`
- `storage_bucket TEXT NOT NULL`
- `storage_key TEXT NOT NULL`
- `storage_version_id TEXT NULL`
- `checksum_sha256 TEXT NULL`
- `upload_status TEXT NOT NULL`  
  Example: `uploaded`, `processing`, `processed`, `failed`, `quarantined`
- `uploaded_at TIMESTAMPTZ NOT NULL`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Constraints:

- `UNIQUE (tenant_id, storage_bucket, storage_key)`

### `transcripts`

Business record for a transcript document.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `document_upload_id UUID NOT NULL FK -> document_uploads.id`
- `student_id UUID NULL FK -> students.id`
- `source_institution_id UUID NULL FK -> institutions.id`
- `document_type TEXT NOT NULL`  
  Example: `college_transcript`, `high_school_transcript`, `unknown`
- `status TEXT NOT NULL`  
  Example: `uploaded`, `parsed`, `matched`, `ready_for_evaluation`, `mapped`, `archived`, `quarantined`
- `is_official BOOLEAN NOT NULL DEFAULT false`
- `is_finalized BOOLEAN NOT NULL DEFAULT false`
- `finalized_at TIMESTAMPTZ NULL`
- `finalized_by_user_id UUID NULL FK -> app_users.id`
- `is_fraudulent BOOLEAN NOT NULL DEFAULT false`
- `fraud_flagged_at TIMESTAMPTZ NULL`
- `matched_at TIMESTAMPTZ NULL`
- `matched_by TEXT NULL`  
  Example: `system`, `manual`
- `parser_confidence NUMERIC(5,2) NULL`
- `page_count INT NULL`
- `notes TEXT NULL`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Indexes:

- `(tenant_id, student_id, created_at DESC)`
- `(tenant_id, status, created_at DESC)`
- `(tenant_id, is_fraudulent, status)`

---

## 6. Parser runs and raw output

### `transcript_parse_runs`

Each call to the parsing pipeline.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `transcript_id UUID NOT NULL FK -> transcripts.id`
- `parser_name TEXT NOT NULL`  
  Example: `bedrock`, `heuristic`, `hybrid`
- `parser_version TEXT NULL`
- `request_json JSONB NULL`
- `response_json JSONB NULL`
- `raw_text_excerpt TEXT NULL`
- `warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb`
- `confidence_score NUMERIC(5,4) NULL`
- `started_at TIMESTAMPTZ NOT NULL`
- `completed_at TIMESTAMPTZ NULL`
- `status TEXT NOT NULL`  
  Example: `started`, `completed`, `failed`
- `error_message TEXT NULL`
- `created_at TIMESTAMPTZ`

Indexes:

- `(tenant_id, transcript_id, started_at DESC)`

Notes:

- keep normalized data in separate tables for querying
- keep raw parser output here for traceability and reprocessing

---

## 7. Parsed transcript detail

### `transcript_demographics`

Normalized top-level student/institution info extracted from a transcript.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `transcript_id UUID NOT NULL UNIQUE FK -> transcripts.id`
- `student_first_name TEXT`
- `student_middle_name TEXT`
- `student_last_name TEXT`
- `student_external_id TEXT`
- `date_of_birth DATE NULL`
- `institution_name TEXT`
- `institution_city TEXT`
- `institution_state TEXT`
- `institution_postal_code TEXT`
- `institution_country TEXT`
- `cumulative_gpa NUMERIC(5,2) NULL`
- `weighted_gpa NUMERIC(5,2) NULL`
- `unweighted_gpa NUMERIC(5,2) NULL`
- `total_credits_attempted NUMERIC(8,2) NULL`
- `total_credits_earned NUMERIC(8,2) NULL`
- `total_grade_points NUMERIC(10,2) NULL`
- `degree_awarded TEXT NULL`
- `graduation_date DATE NULL`
- `is_official BOOLEAN NOT NULL DEFAULT false`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### `transcript_terms`

Term-level GPA/credit summaries.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `transcript_id UUID NOT NULL FK -> transcripts.id`
- `term_name TEXT NOT NULL`
- `academic_year TEXT NULL`
- `units_earned NUMERIC(8,2) NULL`
- `grade_points NUMERIC(10,2) NULL`
- `term_gpa NUMERIC(5,4) NULL`
- `display_order INT NOT NULL`
- `created_at TIMESTAMPTZ`

Constraints:

- `UNIQUE (transcript_id, display_order)`

### `transcript_courses`

Course-level data used by lineage modal and articulation workflows.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `transcript_id UUID NOT NULL FK -> transcripts.id`
- `term_id UUID NULL FK -> transcript_terms.id`
- `source_institution_id UUID NULL FK -> institutions.id`
- `subject_code TEXT NULL`
- `course_code TEXT NULL`
- `course_level TEXT NULL`
- `course_title TEXT NOT NULL`
- `credits_attempted NUMERIC(8,2) NULL`
- `credits_earned NUMERIC(8,2) NULL`
- `grade_alpha TEXT NULL`
- `grade_points NUMERIC(6,2) NULL`
- `course_gpa NUMERIC(5,2) NULL`
- `term_name TEXT NULL`
- `academic_year TEXT NULL`
- `page_number INT NULL`
- `mapping_status TEXT NULL`
- `transfer_status TEXT NULL`
- `repeat_flag BOOLEAN NOT NULL DEFAULT false`
- `raw_course_json JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ`

Indexes:

- `(tenant_id, transcript_id)`
- `(tenant_id, course_code)`
- `(tenant_id, source_institution_id, course_code)`

### `transcript_gpa_summaries`

One row for transcript-level GPA totals.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `transcript_id UUID NOT NULL UNIQUE FK -> transcripts.id`
- `units_earned NUMERIC(8,2) NULL`
- `simple_gpa_points NUMERIC(10,2) NULL`
- `cumulative_gpa NUMERIC(5,2) NULL`
- `weighted_gpa NUMERIC(5,2) NULL`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

---

## 8. Matching and lineage

### `transcript_student_matches`

This makes matching explicit and auditable instead of assuming the current `transcripts.student_id` is the whole story.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `transcript_id UUID NOT NULL FK -> transcripts.id`
- `student_id UUID NOT NULL FK -> students.id`
- `match_status TEXT NOT NULL`  
  Example: `auto_matched`, `manually_confirmed`, `rejected`, `reassigned`
- `match_score NUMERIC(5,2) NULL`
- `match_reason JSONB NOT NULL DEFAULT '{}'::jsonb`
- `decided_by_user_id UUID NULL FK -> app_users.id`
- `decided_at TIMESTAMPTZ NOT NULL`
- `is_current BOOLEAN NOT NULL DEFAULT true`
- `created_at TIMESTAMPTZ`

Indexes:

- `(tenant_id, student_id, is_current)`
- `(tenant_id, transcript_id, is_current)`

Notes:

- keep `transcripts.student_id` as the current resolved owner for fast reads
- keep this table for lineage, rematching, and auditability

---

## 9. Workflow and queueing

### `workflow_cases`

Current operational case around a student or transcript.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `student_id UUID NULL FK -> students.id`
- `transcript_id UUID NULL FK -> transcripts.id`
- `case_type TEXT NOT NULL`  
  Example: `evaluation`, `trust_review`, `student_followup`, `mapping_exception`
- `status TEXT NOT NULL`
- `priority TEXT NOT NULL DEFAULT 'medium'`
- `owner_user_id UUID NULL FK -> app_users.id`
- `queue_name TEXT NOT NULL`
- `reason TEXT NULL`
- `opened_at TIMESTAMPTZ NOT NULL`
- `due_at TIMESTAMPTZ NULL`
- `closed_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Indexes:

- `(tenant_id, queue_name, status, priority)`
- `(tenant_id, owner_user_id, status)`
- `(tenant_id, opened_at)`

### `workflow_events`

Immutable event history feeding activity feeds and timeline step displays.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `workflow_case_id UUID NULL FK -> workflow_cases.id`
- `student_id UUID NULL FK -> students.id`
- `transcript_id UUID NULL FK -> transcripts.id`
- `event_category TEXT NOT NULL`  
  Example: `upload`, `matching`, `parsing`, `review`, `trust`, `advisor`
- `event_action TEXT NOT NULL`
- `event_time TIMESTAMPTZ NOT NULL`
- `actor_user_id UUID NULL FK -> app_users.id`
- `payload_json JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ`

Indexes:

- `(tenant_id, student_id, event_time DESC)`
- `(tenant_id, transcript_id, event_time DESC)`

---

## 10. Trust and fraud

### `trust_flags`

Supports the trust workspace and quarantined transcript scenarios.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `transcript_id UUID NOT NULL FK -> transcripts.id`
- `student_id UUID NULL FK -> students.id`
- `flag_type TEXT NOT NULL`  
  Example: `synthetic_marker`, `institution_mismatch`, `metadata_repeat`, `manual_hold`
- `severity TEXT NOT NULL`  
  Example: `low`, `medium`, `high`
- `status TEXT NOT NULL`  
  Example: `open`, `confirmed`, `dismissed`
- `reason TEXT NOT NULL`
- `detected_by TEXT NOT NULL`  
  Example: `system`, `user`
- `detected_at TIMESTAMPTZ NOT NULL`
- `resolved_by_user_id UUID NULL FK -> app_users.id`
- `resolved_at TIMESTAMPTZ NULL`
- `resolution_notes TEXT NULL`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Indexes:

- `(tenant_id, status, severity, detected_at DESC)`
- `(tenant_id, transcript_id, status)`

---

## 11. Notes and tasks

### `student_notes`

Advisor and operator notes.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `student_id UUID NOT NULL FK -> students.id`
- `transcript_id UUID NULL FK -> transcripts.id`
- `author_user_id UUID NOT NULL FK -> app_users.id`
- `note_type TEXT NOT NULL`  
  Example: `advisor_note`, `ops_note`, `trust_note`
- `body TEXT NOT NULL`
- `is_internal BOOLEAN NOT NULL DEFAULT true`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### `student_tasks`

Checklist and follow-up items.

Columns:

- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `student_id UUID NOT NULL FK -> students.id`
- `transcript_id UUID NULL FK -> transcripts.id`
- `task_type TEXT NOT NULL`
- `label TEXT NOT NULL`
- `status TEXT NOT NULL`  
  Example: `open`, `done`, `blocked`
- `assigned_to_user_id UUID NULL FK -> app_users.id`
- `due_at TIMESTAMPTZ NULL`
- `completed_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Indexes:

- `(tenant_id, student_id, status)`
- `(tenant_id, assigned_to_user_id, status)`

---

## 12. Audit trail

### `audit_events`

Global immutable audit trail for compliance, support, and debugging.

Columns:

- `id UUID PK`
- `tenant_id UUID NULL`
- `actor_user_id UUID NULL FK -> app_users.id`
- `entity_type TEXT NOT NULL`
- `entity_id UUID NULL`
- `category TEXT NOT NULL`
- `action TEXT NOT NULL`
- `success BOOLEAN NOT NULL`
- `error_message TEXT NULL`
- `payload_json JSONB NOT NULL DEFAULT '{}'::jsonb`
- `correlation_id TEXT NULL`
- `source TEXT NULL`
- `occurred_at TIMESTAMPTZ NOT NULL`
- `created_at TIMESTAMPTZ`

Indexes:

- `(tenant_id, entity_type, entity_id, occurred_at DESC)`
- `(tenant_id, occurred_at DESC)`
- `(correlation_id)`

---

## Views the app will likely want

These do not need to exist on day one, but they will simplify APIs:

### `student_360_view`

Denormalized current snapshot with:

- student basics
- current stage
- advisor
- latest GPA
- credits accepted
- transcript count
- latest activity
- latest trust state

### `queue_worklist_view`

Joins:

- workflow case
- student
- transcript
- owner
- latest trust flag

### `dashboard_daily_metrics`

Pre-aggregated counts by tenant/day:

- uploads
- parsed
- matched
- quarantined
- completed reviews

This can be a materialized view later if live queries get expensive.

---

## Query patterns to optimize for

The current app will frequently do these reads:

1. List students by tenant with search/filter/sort
2. Load a Student 360 page by `student_id`
3. Load transcript lineage for a student ordered newest-first
4. Load courses for a selected transcript
5. Load queue items filtered by status, owner, age, and priority
6. Load activity feed for a student or tenant
7. Build dashboard counts and trend charts

Design indexes around those patterns before adding exotic tables.

---

## Search strategy

For the first version:

- use PostgreSQL `ILIKE` for simple filters
- add trigram indexes (`pg_trgm`) for:
  - student names
  - institution names
  - filenames

Suggested future addition:

- Postgres full-text search or OpenSearch only after you confirm search pain

---

## Data retention and compliance notes

This product handles education records and likely PII.

Backend should assume:

- encryption at rest
- TLS in transit
- strict tenant scoping
- immutable audit trail for meaningful state changes
- S3 bucket policies locked to the backend only
- presigned URLs for controlled file access
- no public transcript objects

Do not duplicate raw transcript files into multiple places without a strong reason.

---

## Suggested implementation phases

## Phase 1: Must-have

Build these first:

- `tenants`
- `tenant_settings`
- `app_users`
- `tenant_user_memberships`
- `institutions`
- `programs`
- `students`
- `student_identifiers`
- `document_uploads`
- `transcripts`
- `transcript_parse_runs`
- `transcript_demographics`
- `transcript_terms`
- `transcript_courses`
- `transcript_gpa_summaries`
- `transcript_student_matches`
- `workflow_cases`
- `workflow_events`
- `trust_flags`
- `audit_events`

This supports the current UI and near-term backend needs.

## Phase 2: Strongly recommended soon after

- `student_notes`
- `student_tasks`
- materialized metrics views
- optional reference tables for statuses and roles

## Phase 3: When articulation/evaluation deepens

Add tables for:

- transfer equivalencies
- degree requirement mapping
- manual course decisions
- evaluation snapshots
- document versioning/reprocessing history

---

## Opinions the backend should follow

1. Keep transcript file blobs in S3, not Postgres.
2. Use shared-schema multitenancy with `tenant_id` everywhere.
3. Make transcript matching explicit and auditable.
4. Store raw parser payloads, but also normalize the fields the UI queries often.
5. Treat workflow history as append-only events plus a current-state case row.
6. Keep auth outside the database, but keep app users and tenant roles inside it.
7. Prefer PostgreSQL JSONB for parser flexibility instead of over-modeling every parser field on day one.

---

## Minimal starter DDL checklist

If the backend team wants a practical first pass, implement in this order:

1. tenancy tables
2. user and membership tables
3. institution and program tables
4. student tables
5. upload/document/transcript tables
6. parser run and normalized transcript detail tables
7. workflow and trust tables
8. audit table
9. indexes for student list, student 360, and queue views

---

## Final recommendation

Start with **RDS PostgreSQL + S3**.

Use **shared-schema multitenancy** with strict `tenant_id` discipline.

Model the system around these truths:

- the student is the canonical record
- each student can have many transcripts
- each transcript can be parsed multiple times
- parsed output must exist both as raw JSON and normalized queryable rows
- queue, trust, and audit history are first-class parts of the product, not side tables

That design will support the current app cleanly and leaves room for Cognito, articulation, and more advanced workflow later without forcing a database rewrite.
