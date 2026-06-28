# Utilities Import CSV Wizard Phased Checklist

## Product Goal

Create a tenant-admin-only Utilities area for operational tools that do not belong in day-to-day counselor workflows. The first utility is a guided CSV import wizard for Student Prospects that helps admins upload messy admissions files, map columns, validate data, deduplicate students, and import clean records with audit history.

## Access Rules

- [x] Add a `Utilities` navigation item.
- [x] Show `Utilities` only to users with `tenant_admin` or `master_tenant_admin`.
- [x] Enforce the same access rule in route protection.
- [x] Enforce the same access rule in backend endpoints used by utilities.
- [x] Hide utilities from counselor, reviewer, processor, and read-only roles.
- [x] Add a reusable frontend helper for checking tenant-admin-or-master-admin access.
- [x] Add backend tests proving non-admin users cannot access utility import endpoints.

## Phase 1: Utilities Shell

Goal: Add a clean Utilities page that can host multiple admin tools over time.

- [x] Create `/utilities` route.
- [x] Add Utilities page title, tenant context, and admin-only explanatory copy.
- [x] Add utility cards or tabs.
- [x] Add first utility card: `Import CSV Wizard`.
- [x] Support future utility cards without redesign:
  - [x] Bulk update students.
  - [x] Import history.
  - [x] Data cleanup.
  - [x] Assignment rule tester.
  - [x] Export reports.
- [x] Add empty/error/loading states.
- [x] Keep the page visually consistent with current white sidebar and dashboard styling.

## Phase 2: Wizard Entry And Upload

Goal: Let an admin start a guided import and upload a CSV, TSV, or Excel-like source file.

- [x] Open wizard from the Utilities page.
- [x] Use a stepper:
  - [x] Upload file.
  - [x] Confirm type.
  - [x] Map columns.
  - [x] Review issues.
  - [x] Import.
- [x] Add drag-and-drop upload area.
- [x] Add browse-file button.
- [x] Support CSV.
- [x] Support TSV.
- [x] Plan XLSX support as a later enhancement.
- [x] Default import type to `Let crtfy detect it`.
- [x] Show supported examples:
  - [x] Student prospects.
  - [x] Inquiries.
  - [x] Applications.
  - [x] Test scores.
  - [x] High school data.
  - [x] Transfer coursework.
  - [x] Counselor assignments.
  - [x] Tags, populations, and campaigns.
- [x] Add friendly helper text: `Upload messy files. crtfy maps, validates, deduplicates, and imports clean student records.`

## Phase 3: File Detection And Preview

Goal: Analyze the uploaded file before asking the admin to make decisions.

- [x] Detect delimiter:
  - [x] Comma.
  - [x] Tab.
  - [x] Pipe.
  - [x] Semicolon.
- [x] Detect header row.
- [x] Detect blank rows.
- [x] Handle quoted values.
- [x] Detect row count.
- [x] Detect column count.
- [x] Detect likely import type.
- [x] Show confidence score for detected import type.
- [x] Show possible duplicate estimate.
- [x] Show rows with issues count.
- [x] Display first 25-50 rows in a preview grid.
- [x] Add `Advanced file settings` drawer:
  - [x] Change delimiter.
  - [x] Change header row.
  - [x] Skip rows before import.
  - [x] Change encoding.
  - [x] Treat blank values as do not update.
  - [x] Trim whitespace.
  - [x] Normalize capitalization.

## Phase 4: Confirm Import Type And Action

Goal: Make the admin confirm what the file represents and how it should affect existing records.

- [x] Show detected import type with confidence.
- [x] Allow import type override:
  - [x] Let crtfy detect it.
  - [x] Students / Prospects.
  - [x] Applications.
  - [x] Test Scores.
  - [x] Coursework / Transcript Lines.
  - [x] Events / Visits.
  - [x] Communications.
  - [x] Custom list.
- [x] Default Phase 1 implementation to `Students / Prospects`.
- [x] Add import actions:
  - [x] Add new students only.
  - [x] Update existing students only.
  - [x] Add new and update existing.
  - [x] Add to existing population or campaign.
  - [x] Import as staging list only.
- [x] Default action to `Add new and update existing`.
- [x] Add matching strategy controls:
  - [x] crtfy Student ID.
  - [x] External/source ID.
  - [x] Email plus date of birth.
  - [x] First name plus last name plus date of birth.
  - [x] Email only.
  - [x] Phone only as weak match.
- [x] Clearly label match confidence:
  - [x] Strong match.
  - [x] Possible match.
  - [x] No match.

## Phase 5: Smart Column Mapping

Goal: Auto-map common admissions columns while giving admins clear control over uncertain fields.

- [x] Build three-zone mapping layout:
  - [x] Imported columns and sample values.
  - [x] crtfy field dropdown mapping.
  - [x] Assistant suggestions and warnings.
- [x] Auto-map common fields:
  - [x] First name.
  - [x] Last name.
  - [x] Email.
  - [x] Mobile phone.
  - [x] Intended program.
  - [x] Entry term.
  - [x] Student type.
  - [x] High school name.
  - [x] High school CEEB.
  - [x] Source.
  - [x] Campaign.
  - [x] Counselor / recruiter.
- [x] Show mapping confidence per column.
- [x] Mark columns as:
  - [x] Matched.
  - [x] Needs review.
  - [x] Optional.
  - [x] Ignored.
- [x] Add `Accept all confident matches`.
- [x] Add `Review uncertain matches`.
- [x] Add `Save this as a template`.
- [x] Let user choose for each source column:
  - [x] Map to existing field.
  - [x] Do not import.
  - [x] Create custom field.
  - [x] Transform value.
  - [x] Split column.
  - [x] Combine columns.
- [x] Add common transformations:
  - [x] Split full name into first and last.
  - [x] Combine address fields.
  - [x] Convert Y/N to true/false.
  - [x] Normalize terms like `FA26` to `Fall 2026`.
  - [x] Normalize student types like `FR` to `First Time Freshman`.

## Phase 6: Validation And Cleaning

Goal: Let admins fix import problems in the app instead of returning to Excel.

- [x] Show validation summary:
  - [x] Ready to import.
  - [x] Will update existing student.
  - [x] Needs review.
  - [x] Cannot import.
- [x] Add row filters:
  - [x] Show all rows.
  - [x] Show only errors.
  - [x] Show possible duplicates.
  - [x] Show unmapped required fields.
  - [x] Show invalid values.
  - [x] Show rows that will update existing students.
- [x] Validate required fields for new prospect:
  - [x] First name.
  - [x] Last name.
  - [x] At least one contact or identifying field.
- [x] Validate email.
- [x] Validate phone.
- [x] Validate active program match.
- [x] Validate entry term.
- [x] Validate duplicate candidates.
- [x] Provide row-level resolutions:
  - [x] Map another column.
  - [x] Import as incomplete prospect.
  - [x] Skip row.
  - [x] Download errors.
  - [x] Update existing student.
  - [x] Create new student.
  - [x] Review manually.
  - [x] Map invalid program to active program.
  - [x] Create program alias for future imports.
  - [x] Accept safe transformation.
  - [x] Apply fix to all similar values.
- [x] Add inline row editing for common fields.
- [x] Track all validation warnings and errors in import row records.

## Phase 7: Final Review And Import

Goal: Make consequences clear before the admin commits.

- [x] Show final summary:
  - [x] New students to create.
  - [x] Existing students to update.
  - [x] Rows skipped for review.
  - [x] Rows blocked.
  - [x] Mapped fields.
  - [x] Ignored columns.
  - [x] Template name.
- [x] Show consequences:
  - [x] Create new student prospect records.
  - [x] Add imported students to population.
  - [x] Assign counselors using territory rules.
  - [x] Apply source.
  - [x] Preserve existing values unless import behavior allows update.
  - [x] Create import audit record.
- [x] Add buttons:
  - [x] Import now.
  - [x] Save as draft.
  - [x] Download validation report.
  - [x] Back to mapping.
- [x] After import, show completion summary:
  - [x] Created.
  - [x] Updated.
  - [x] Skipped.
  - [x] Failed.
- [x] Add post-import links:
  - [x] View imported students.
  - [x] View skipped rows.
  - [x] Download import report.
  - [x] Undo import.
  - [x] Save mapping as template.

## Phase 8: Import Job History And Audit

Goal: Make every import traceable and reversible where safe.

- [x] Create import job record.
- [x] Store uploaded file metadata.
- [x] Store user who approved import.
- [x] Store tenant.
- [x] Store detected delimiter and header row.
- [x] Store import type.
- [x] Store action mode.
- [x] Store created count.
- [x] Store updated count.
- [x] Store failed count.
- [x] Store skipped count.
- [x] Store started and completed timestamps.
- [x] Store row-level raw data.
- [x] Store row-level normalized data.
- [x] Store row-level status.
- [x] Store matched student ID.
- [x] Store field mappings and confidence.
- [x] Store before/after values for updates.
- [x] Add import report download.
- [x] Add error report download.
- [x] Add safe undo for records created by import.

## Phase 9: Templates And Remembered Mappings

Goal: Make repeat vendor imports fast.

- [x] Save import template by tenant.
- [x] Store source/vendor.
- [x] Store import type.
- [x] Store column mappings.
- [x] Store transform rules.
- [x] Store validation rules.
- [x] Store matching strategy.
- [x] Store update behavior.
- [x] Suggest matching template on upload.
- [x] Add template examples:
  - [x] College Board Search Import.
  - [x] ACT Score Import.
  - [x] Common App Export.
  - [x] Slate Export.
  - [x] Element451 Export.
  - [x] Manual Inquiry Upload.
  - [x] High School Visit Sheet.
  - [x] Transfer Course Upload.
- [x] Let admin apply suggested template.
- [x] Let admin change suggested template.
- [x] Let admin update an existing template after a successful import.

## Phase 10: Admissions Normalization

Goal: Normalize common admissions values before import.

- [x] Normalize terms:
  - [x] `FA26` to `Fall 2026`.
  - [x] `Fall 26` to `Fall 2026`.
  - [x] `2026FA` to `Fall 2026`.
- [x] Normalize student types:
  - [x] `FR` to `First Time Freshman`.
  - [x] `TR` to `Transfer`.
  - [x] `GR` to `Graduate`.
  - [x] `Intl` to `International`.
- [x] Normalize programs:
  - [x] `BSN` to `Bachelor of Science in Nursing`.
  - [x] `MBA` to `Master of Business Administration`.
- [x] Normalize sources:
  - [x] `CB` to `College Board`.
  - [x] `HS Visit` to `High School Visit`.
  - [x] `Fair` to `College Fair`.
- [x] Preserve raw imported values.
- [x] Store normalized values.
- [x] Store transform confidence.
- [x] Allow admin to approve transformations.

## Phase 11: Duplicate Matching

Goal: Avoid duplicate student records without overclaiming uncertain matches.

- [x] Score duplicate candidates using:
  - [x] crtfy student ID exact match.
  - [x] External source ID exact match.
  - [x] Email plus DOB.
  - [x] Name plus DOB plus phone.
  - [x] Name plus high school plus grad year.
  - [x] Email only.
  - [x] Phone only.
- [x] Use labels:
  - [x] Existing student found.
  - [x] Possible match.
  - [x] Needs review.
- [x] Avoid using the word duplicate unless confidence is high.
- [x] Add duplicate review actions:
  - [x] Update existing.
  - [x] Create new.
  - [x] Skip.
  - [x] Review manually.
- [x] Store match confidence and reasons.

## Phase 12: Update Behavior Controls

Goal: Give admins control over how imports affect existing records.

- [x] Add whole-import update behavior:
  - [x] Do not overwrite existing values.
  - [x] Overwrite only blank values.
  - [x] Always overwrite.
  - [x] Append to existing values.
  - [x] Add as historical/source value.
- [x] Add per-field update behavior.
- [x] Default phone to keep existing unless blank.
- [x] Default source to append, not overwrite.
- [x] Default program to update only when current value is blank.
- [x] Default application status to never overwrite unless explicitly enabled.
- [x] Show overwrite consequences in final review.

## Phase 13: Import Assistant

Goal: Add practical assistant support without making the wizard feel magical or opaque.

- [x] Add assistant panel to mapping and validation steps.
- [x] Show top issues to review.
- [x] Add `Fix all safe issues`.
- [x] Add `Review one by one`.
- [x] Add `Explain this import`.
- [x] Add `Create reusable template`.
- [x] Support questions:
  - [x] Why is this row blocked?
  - [x] What will happen if I import this?
  - [x] Which fields will overwrite existing student data?
  - [x] Can you map program names to closest active programs?
  - [x] Show only students that might already exist.

## Phase 14: Later Import Types

Goal: Expand beyond Student Prospects after the first wizard is stable.

- [ ] Applications.
- [ ] Test scores.
- [ ] Transfer coursework.
- [ ] Event attendance.
- [ ] Communications.
- [ ] Counselor assignments.
- [ ] Tags.
- [ ] Populations.
- [ ] Campaigns.
- [ ] Parent/guardian matching.
- [ ] High school matching by CEEB/name.
- [ ] Multi-object imports.
- [ ] Scheduled SFTP imports.
- [ ] Import APIs.
- [ ] Vendor-specific connectors.
- [ ] Background validation jobs.
- [ ] Approval workflow for risky imports.

## MVP Cut

- [x] Utilities tab visible only to tenant admin and master tenant admin.
- [x] CSV upload.
- [x] Auto-detect delimiter and header.
- [x] Confirm import type as Students / Prospects only.
- [x] Auto-map common student fields.
- [x] Manual column mapping.
- [x] Required field validation.
- [x] Duplicate detection by email and external ID.
- [x] Preview create/update/skip counts.
- [x] Import job history.
- [x] Download error report.
- [x] Save mapping template.
