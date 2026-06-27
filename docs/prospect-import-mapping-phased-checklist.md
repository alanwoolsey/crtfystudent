# crtfy Student Prospect Import And Mapping Phased Checklist

## Product Goal

Give institutions a source-based way to bring prospect lists into crtfy Student from CSV files, fairs, search vendors, partner lists, website inquiries, legacy CRM exports, scheduled drops, APIs, and crtfy Content forms.

The end state is not just "upload students." The end state is:

Raw file or submission -> validated import -> mapped student fields -> matched or deduped person -> source attribution -> lifecycle stage -> counselor assignment -> work queue -> campaign or follow-up.

## Guiding Product Decisions

- [x] Treat `Prospect Sources` as the first-class admin object, not one-off uploads.
- [x] Keep every imported record traceable to source, source detail, and import batch.
- [x] Default import behavior to create new records and update blank fields only.
- [x] Keep required fields light enough for real admissions lists.
- [ ] Route import issues into queues instead of silently dropping records.
- [ ] Make counselor output simple: assigned students, source context, and recommended next actions.

## Phase 1: Manual CSV Import MVP

Goal: Let a school upload a CSV and turn it into clean prospect/student records.

- [x] Add `Prospect Sources` admin area.
- [x] Add create-source flow with source name and source type.
- [x] Support manual CSV upload for a source.
- [x] Detect header row and delimiter.
- [x] Show file preview with file name, row count, column count, and possible student count.
- [x] Build field mapping UI from uploaded columns to crtfy Student fields.
- [ ] Support required, recommended, optional, and ignored field groups.
- [x] Support reusable saved mapping name during import.
- [x] Validate minimum acceptable prospect record:
  - [x] First name.
  - [x] Last name.
  - [x] At least one contact or identifying field.
- [x] Validate email and phone format.
- [x] Show import preview counts:
  - [x] Total rows.
  - [x] New prospects.
  - [x] Matched existing students.
  - [x] Possible duplicates.
  - [x] Missing contact method.
  - [x] Invalid emails.
  - [x] Invalid phone numbers.
  - [x] Missing academic interest.
- [x] Let admin import valid records.
- [x] Let admin download an error file.
- [x] Create import history records.
- [x] Store file name, uploaded by, uploaded date, source, mapping used, row counts, created/updated counts, duplicate count, error count, and import batch ID.

## Phase 2: Admissions-Specific Normalization

Goal: Convert messy imported source values into consistent crtfy Student values.

- [x] Normalize lifecycle stage by source type.
- [x] Default search lists to `Prospect`.
- [x] Default RFI and event registrations to `Inquiry`.
- [x] Default application-start data to `Applicant Started`.
- [x] Normalize student type values:
  - [x] First-Time Freshman.
  - [x] Transfer.
  - [x] Graduate.
  - [x] Adult.
  - [ ] Online.
  - [ ] International.
  - [x] Dual Credit.
  - [ ] Non-Degree.
  - [ ] Certificate.
  - [ ] Readmit.
- [x] Normalize entry terms such as `FA26`, `2026FA`, and `Fall 26` to `Fall 2026`.
- [x] Map academic interests to institution-configured programs.
- [x] Store academic interest, program code, and college/school when mapping is known.
- [x] Preserve imported raw value alongside normalized value.
- [x] Store `source`, `sourceDetail`, and `sourceBatchId` on every imported record.
- [x] Surface normalization issues before import confirmation.

## Phase 3: Matching And Dedupe Engine

Goal: Prevent duplicate student records when the same person arrives from multiple sources.

- [x] Implement confidence-based match scoring.
- [x] Auto-match high-confidence records.
- [ ] Flag medium-confidence records for duplicate review.
- [ ] Create low-confidence records with possible-match hints.
- [x] Score external source ID exact match.
- [x] Score email exact match.
- [x] Score mobile phone exact match.
- [ ] Score application ID exact match.
- [ ] Score first name and last name match.
- [ ] Score DOB match.
- [ ] Score high school and grad year match.
- [ ] Score address match.
- [x] Configure default thresholds:
  - [x] `90+` auto-match.
  - [ ] `60-89` possible duplicate review.
  - [x] Below `60` create new record.
- [x] Add `Import Exceptions` queue.
- [x] Add exception types:
  - [x] Possible duplicate.
  - [x] Missing required field.
  - [x] Invalid contact info.
  - [ ] Conflicting lifecycle stage.
  - [x] Program mapping unknown.
  - [ ] Counselor assignment failed.
  - [ ] Consent/contact issue.
- [x] Add duplicate review actions:
  - [ ] Merge.
  - [ ] Create separate record.
  - [x] Ignore.
  - [ ] Edit imported data.
  - [ ] Assign to data steward.

## Phase 4: Assignment Rules

Goal: Automatically assign imported prospects to the right counselor, territory, or team.

- [x] Add source-level assignment rule builder.
- [x] Support rules in the format: when field/operator/value, assign to owner/team/territory.
- [x] Support state-based assignment.
- [ ] Support county/territory assignment.
- [x] Support academic-interest assignment.
- [x] Support student-type assignment.
- [ ] Support athletics/international/online special routing.
- [x] Store assignment output:
  - [x] `ownerUserId`.
  - [x] `ownerTeamId`.
  - [x] `territory`.
  - [x] `assignmentReason`.
  - [x] `assignedAt`.
  - [x] `assignedByRuleId`.
- [x] Show assignment preview before import confirmation.
- [ ] Show assignment reason on student/work cards.

## Phase 5: Work Queues And Next Actions

Goal: Imports should create admissions work, not just records.

- [x] Generate work items after import.
- [x] Add source filter to Student 360 and Today's Work.
- [x] Add queue for new prospects from source.
- [ ] Add queue for no contact method.
- [ ] Add queue for high-fit prospects.
- [ ] Add queue for recently engaged inquiries.
- [ ] Add queue for application not started.
- [ ] Add queue for started application not submitted.
- [ ] Add queue for one step away.
- [ ] Add queue for missing transcript.
- [x] Add queue for duplicate review.
- [x] Generate recommended next action for imported prospects.
- [ ] Support source-level first-touch defaults:
  - [ ] Do nothing.
  - [ ] Create counselor task.
  - [ ] Add to campaign.
  - [ ] Notify owner.
- [ ] Show imported source, assignment reason, and recommended action on work cards.

## Phase 6: Saved Import Templates

Goal: Make repeat imports fast and consistent.

- [x] Persist mapping templates.
- [x] Include field mappings in template.
- [x] Include default source and source detail.
- [x] Include default lifecycle stage.
- [x] Include normalization rules.
- [x] Include dedupe strategy.
- [x] Include assignment rules.
- [x] Include campaign rules.
- [x] Include validation rules.
- [ ] Add template examples:
  - [ ] College Board Search.
  - [ ] ACT Search.
  - [ ] College Fair Upload.
  - [ ] High School Visit.
  - [ ] Athletic Recruits.
  - [ ] Transfer Partner.
  - [ ] Legacy CRM Import.
  - [ ] Generic Prospect CSV.
- [x] Detect similar headers on upload.
- [x] Suggest saved template before mapping.
- [x] Let admin confirm or change suggested template.

## Phase 7: Scheduled Imports And SFTP/S3

Goal: Support regular automated prospect imports.

- [x] Add delivery method setting for SFTP/S3.
- [x] Configure inbound folder per source.
- [x] Configure mapping template per scheduled source.
- [x] Configure schedule.
- [x] Configure import mode.
- [x] Configure failure notification email.
- [ ] Detect new files automatically.
- [x] Apply saved source template.
- [x] Validate and import scheduled file.
- [ ] Send import summary email.
- [x] Store scheduled import history.
- [x] Surface scheduled import failures in admin.

## Phase 8: API Imports

Goal: Let other systems push prospects and inquiries into crtfy Student.

- [x] Define authenticated prospect import endpoint.
- [x] Define prospect upsert endpoint.
- [x] Define inquiry endpoint.
- [x] Define event registration endpoint.
- [x] Support source, source detail, lifecycle stage, person, interest, and tracking payloads.
- [x] Apply the same validation, normalization, dedupe, assignment, and work generation as CSV imports.
- [x] Return created/updated/matched/exception result payload.
- [x] Add API import source type.
- [x] Add API key or integration credential management.
- [x] Add webhook/event logs for API imports.

## Phase 9: crtfy Content Form Handoff

Goal: Make crtfy Content forms feed crtfy Student natively.

- [x] Add source type `crtfy Content Form`.
- [x] Support mapping from form fields to crtfy Student inquiry fields.
- [x] Map first name, last name, email, phone, program interest, entry term, and student type.
- [x] Let crtfy Content send structured submission data without admissions-specific logic.
- [x] Apply crtfy Student admissions meaning through source configuration.
- [x] Create or update student record from form submission.
- [x] Assign counselor or team.
- [x] Create task or campaign follow-up.
- [x] Record form submission in student source timeline.

## Phase 10: Conversion And Source Reporting

Goal: Help schools understand which sources are working.

- [x] Report prospects by source.
- [x] Report inquiries by source.
- [x] Report applications by source.
- [x] Report admits by source.
- [x] Report deposits by source.
- [x] Report conversion rate by source.
- [x] Report conversion by counselor.
- [x] Report conversion by academic interest.
- [x] Report conversion by territory.
- [x] Add source funnel view.
- [x] Add import performance dashboard.
- [x] Add duplicate and error trend reporting.
- [ ] Add cost per inquiry/applicant fields for later use.

## Data Model Checklist

- [ ] `StudentPerson`
  - [ ] Tenant ID.
  - [ ] Name fields.
  - [ ] Birth date.
  - [ ] Email and mobile phone.
  - [ ] Address.
  - [ ] High school and grad year.
  - [ ] Created/updated timestamps.
- [ ] `StudentLifecycle`
  - [ ] Current stage.
  - [ ] Stage reason.
  - [ ] Stage updated timestamp.
  - [ ] Entry term.
  - [ ] Student type.
  - [ ] Academic interest.
  - [ ] Application ID.
- [ ] `StudentSource`
  - [ ] Student ID.
  - [ ] Source name.
  - [ ] Source type.
  - [ ] Source detail.
  - [ ] Source batch ID.
  - [ ] First seen / last seen.
  - [ ] Primary source flag.
  - [ ] Raw source payload.
- [ ] `ProspectImportBatch`
  - [ ] Tenant ID.
  - [ ] Source ID.
  - [ ] File name.
  - [ ] Status.
  - [ ] Uploaded by / uploaded at.
  - [ ] Mapping template ID.
  - [ ] Row and result counts.
  - [ ] Completed timestamp.
- [ ] `ProspectImportRow`
  - [ ] Batch ID.
  - [ ] Row number.
  - [ ] Raw JSON.
  - [ ] Normalized JSON.
  - [ ] Status.
  - [ ] Matched student ID.
  - [ ] Match confidence.
  - [ ] Error messages.
- [ ] `MappingTemplate`
  - [ ] Tenant ID.
  - [ ] Name.
  - [ ] Source type.
  - [ ] Field mappings JSON.
  - [ ] Normalization rules JSON.
  - [ ] Dedupe rules JSON.
  - [ ] Assignment rules JSON.
  - [ ] Created by / updated at.
- [ ] `StudentAssignment`
  - [ ] Student ID.
  - [ ] Owner user ID.
  - [ ] Owner team ID.
  - [ ] Territory.
  - [ ] Assignment reason.
  - [ ] Assigned timestamp.
  - [ ] Assigned by rule ID.

## Import Mode Checklist

- [ ] Create only.
- [ ] Update only.
- [ ] Create and update.
- [ ] Preview only.
- [ ] Do not overwrite existing values.
- [ ] Overwrite blank values only.
- [ ] Overwrite all mapped fields.
- [ ] Overwrite selected fields only.
- [ ] Default to create new records and update blank fields only.

## Permission And Contact Rules Checklist

- [ ] Track `canEmail`.
- [ ] Track `canText`.
- [ ] Track `canCall`.
- [ ] Track `doNotContact`.
- [ ] Track source consent.
- [ ] Allow admin to map permission fields from import.
- [ ] Allow admin to set source-level contact defaults.
- [ ] Prevent contact tasks/campaigns when permission rules disallow outreach.

## Recommended Build Order

### MVP 1: Manual Prospect Import

- [x] Prospect Sources.
- [x] CSV upload.
- [x] Field mapping.
- [x] Basic validation.
- [x] Basic dedupe by email/phone/external ID.
- [x] Create/update student records.
- [x] Import history.
- [ ] Submission/error report.

### MVP 2: Saved Mappings And Source Rules

- [ ] Reusable import templates.
- [x] Default lifecycle stage.
- [x] Default source detail.
- [x] Basic normalization.
- [ ] Assignment rules.
- [x] Import preview.
- [ ] Exception queue.

### MVP 3: Counselor Workflow

- [ ] New prospect queue.
- [ ] Imported source filter.
- [ ] Owner assignment.
- [ ] Recommended next action.
- [ ] Campaign/task trigger.
- [ ] Student source timeline.

### MVP 4: Automation

- [ ] Scheduled SFTP/S3 import.
- [ ] Import summary notifications.
- [ ] Advanced dedupe.
- [ ] Auto-normalization.
- [ ] Saved source templates.

### MVP 5: Ecosystem Integration

- [ ] crtfy Content form to crtfy Student inquiry.
- [ ] API imports.
- [ ] Webhook ingestion.
- [ ] Application-start integration.
- [ ] Documents/transcript upload mapping.

### MVP 6: Reporting

- [ ] Source funnel reporting.
- [ ] Import performance.
- [ ] Counselor assignment reporting.
- [ ] Conversion by source.
- [ ] Duplicate/error trends.
