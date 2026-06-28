# Utilities Import CSV Wizard Phased Checklist

## Product Goal

Create a tenant-admin-only Utilities area for operational tools that do not belong in day-to-day counselor workflows. The first utility is a guided CSV import wizard for Student Prospects that helps admins upload messy admissions files, map columns, validate data, deduplicate students, and import clean records with audit history.

## Access Rules

- [x] Add a `Utilities` navigation item.
- [x] Show `Utilities` only to users with `tenant_admin` or `master_tenant_admin`.
- [x] Enforce the same access rule in route protection.
- [ ] Enforce the same access rule in backend endpoints used by utilities.
- [x] Hide utilities from counselor, reviewer, processor, and read-only roles.
- [ ] Add a reusable frontend helper for checking tenant-admin-or-master-admin access.
- [ ] Add backend tests proving non-admin users cannot access utility import endpoints.

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

- [ ] Show detected import type with confidence.
- [ ] Allow import type override:
  - [ ] Let crtfy detect it.
  - [ ] Students / Prospects.
  - [ ] Applications.
  - [ ] Test Scores.
  - [ ] Coursework / Transcript Lines.
  - [ ] Events / Visits.
  - [ ] Communications.
  - [ ] Custom list.
- [ ] Default Phase 1 implementation to `Students / Prospects`.
- [ ] Add import actions:
  - [ ] Add new students only.
  - [ ] Update existing students only.
  - [ ] Add new and update existing.
  - [ ] Add to existing population or campaign.
  - [ ] Import as staging list only.
- [ ] Default action to `Add new and update existing`.
- [ ] Add matching strategy controls:
  - [ ] crtfy Student ID.
  - [ ] External/source ID.
  - [ ] Email plus date of birth.
  - [ ] First name plus last name plus date of birth.
  - [ ] Email only.
  - [ ] Phone only as weak match.
- [ ] Clearly label match confidence:
  - [ ] Strong match.
  - [ ] Possible match.
  - [ ] No match.

## Phase 5: Smart Column Mapping

Goal: Auto-map common admissions columns while giving admins clear control over uncertain fields.

- [ ] Build three-zone mapping layout:
  - [ ] Imported columns and sample values.
  - [ ] crtfy field dropdown mapping.
  - [ ] Assistant suggestions and warnings.
- [ ] Auto-map common fields:
  - [ ] First name.
  - [ ] Last name.
  - [ ] Email.
  - [ ] Mobile phone.
  - [ ] Intended program.
  - [ ] Entry term.
  - [ ] Student type.
  - [ ] High school name.
  - [ ] High school CEEB.
  - [ ] Source.
  - [ ] Campaign.
  - [ ] Counselor / recruiter.
- [ ] Show mapping confidence per column.
- [ ] Mark columns as:
  - [ ] Matched.
  - [ ] Needs review.
  - [ ] Optional.
  - [ ] Ignored.
- [ ] Add `Accept all confident matches`.
- [ ] Add `Review uncertain matches`.
- [ ] Add `Save this as a template`.
- [ ] Let user choose for each source column:
  - [ ] Map to existing field.
  - [ ] Do not import.
  - [ ] Create custom field.
  - [ ] Transform value.
  - [ ] Split column.
  - [ ] Combine columns.
- [ ] Add common transformations:
  - [ ] Split full name into first and last.
  - [ ] Combine address fields.
  - [ ] Convert Y/N to true/false.
  - [ ] Normalize terms like `FA26` to `Fall 2026`.
  - [ ] Normalize student types like `FR` to `First Time Freshman`.

## Phase 6: Validation And Cleaning

Goal: Let admins fix import problems in the app instead of returning to Excel.

- [ ] Show validation summary:
  - [ ] Ready to import.
  - [ ] Will update existing student.
  - [ ] Needs review.
  - [ ] Cannot import.
- [ ] Add row filters:
  - [ ] Show all rows.
  - [ ] Show only errors.
  - [ ] Show possible duplicates.
  - [ ] Show unmapped required fields.
  - [ ] Show invalid values.
  - [ ] Show rows that will update existing students.
- [ ] Validate required fields for new prospect:
  - [ ] First name.
  - [ ] Last name.
  - [ ] At least one contact or identifying field.
- [ ] Validate email.
- [ ] Validate phone.
- [ ] Validate active program match.
- [ ] Validate entry term.
- [ ] Validate duplicate candidates.
- [ ] Provide row-level resolutions:
  - [ ] Map another column.
  - [ ] Import as incomplete prospect.
  - [ ] Skip row.
  - [ ] Download errors.
  - [ ] Update existing student.
  - [ ] Create new student.
  - [ ] Review manually.
  - [ ] Map invalid program to active program.
  - [ ] Create program alias for future imports.
  - [ ] Accept safe transformation.
  - [ ] Apply fix to all similar values.
- [ ] Add inline row editing for common fields.
- [ ] Track all validation warnings and errors in import row records.

## Phase 7: Final Review And Import

Goal: Make consequences clear before the admin commits.

- [ ] Show final summary:
  - [ ] New students to create.
  - [ ] Existing students to update.
  - [ ] Rows skipped for review.
  - [ ] Rows blocked.
  - [ ] Mapped fields.
  - [ ] Ignored columns.
  - [ ] Template name.
- [ ] Show consequences:
  - [ ] Create new student prospect records.
  - [ ] Add imported students to population.
  - [ ] Assign counselors using territory rules.
  - [ ] Apply source.
  - [ ] Preserve existing values unless import behavior allows update.
  - [ ] Create import audit record.
- [ ] Add buttons:
  - [ ] Import now.
  - [ ] Save as draft.
  - [ ] Download validation report.
  - [ ] Back to mapping.
- [ ] After import, show completion summary:
  - [ ] Created.
  - [ ] Updated.
  - [ ] Skipped.
  - [ ] Failed.
- [ ] Add post-import links:
  - [ ] View imported students.
  - [ ] View skipped rows.
  - [ ] Download import report.
  - [ ] Undo import.
  - [ ] Save mapping as template.

## Phase 8: Import Job History And Audit

Goal: Make every import traceable and reversible where safe.

- [ ] Create import job record.
- [ ] Store uploaded file metadata.
- [ ] Store user who approved import.
- [ ] Store tenant.
- [ ] Store detected delimiter and header row.
- [ ] Store import type.
- [ ] Store action mode.
- [ ] Store created count.
- [ ] Store updated count.
- [ ] Store failed count.
- [ ] Store skipped count.
- [ ] Store started and completed timestamps.
- [ ] Store row-level raw data.
- [ ] Store row-level normalized data.
- [ ] Store row-level status.
- [ ] Store matched student ID.
- [ ] Store field mappings and confidence.
- [ ] Store before/after values for updates.
- [ ] Add import report download.
- [ ] Add error report download.
- [ ] Add safe undo for records created by import.

## Phase 9: Templates And Remembered Mappings

Goal: Make repeat vendor imports fast.

- [ ] Save import template by tenant.
- [ ] Store source/vendor.
- [ ] Store import type.
- [ ] Store column mappings.
- [ ] Store transform rules.
- [ ] Store validation rules.
- [ ] Store matching strategy.
- [ ] Store update behavior.
- [ ] Suggest matching template on upload.
- [ ] Add template examples:
  - [ ] College Board Search Import.
  - [ ] ACT Score Import.
  - [ ] Common App Export.
  - [ ] Slate Export.
  - [ ] Element451 Export.
  - [ ] Manual Inquiry Upload.
  - [ ] High School Visit Sheet.
  - [ ] Transfer Course Upload.
- [ ] Let admin apply suggested template.
- [ ] Let admin change suggested template.
- [ ] Let admin update an existing template after a successful import.

## Phase 10: Admissions Normalization

Goal: Normalize common admissions values before import.

- [ ] Normalize terms:
  - [ ] `FA26` to `Fall 2026`.
  - [ ] `Fall 26` to `Fall 2026`.
  - [ ] `2026FA` to `Fall 2026`.
- [ ] Normalize student types:
  - [ ] `FR` to `First Time Freshman`.
  - [ ] `TR` to `Transfer`.
  - [ ] `GR` to `Graduate`.
  - [ ] `Intl` to `International`.
- [ ] Normalize programs:
  - [ ] `BSN` to `Bachelor of Science in Nursing`.
  - [ ] `MBA` to `Master of Business Administration`.
- [ ] Normalize sources:
  - [ ] `CB` to `College Board`.
  - [ ] `HS Visit` to `High School Visit`.
  - [ ] `Fair` to `College Fair`.
- [ ] Preserve raw imported values.
- [ ] Store normalized values.
- [ ] Store transform confidence.
- [ ] Allow admin to approve transformations.

## Phase 11: Duplicate Matching

Goal: Avoid duplicate student records without overclaiming uncertain matches.

- [ ] Score duplicate candidates using:
  - [ ] crtfy student ID exact match.
  - [ ] External source ID exact match.
  - [ ] Email plus DOB.
  - [ ] Name plus DOB plus phone.
  - [ ] Name plus high school plus grad year.
  - [ ] Email only.
  - [ ] Phone only.
- [ ] Use labels:
  - [ ] Existing student found.
  - [ ] Possible match.
  - [ ] Needs review.
- [ ] Avoid using the word duplicate unless confidence is high.
- [ ] Add duplicate review actions:
  - [ ] Update existing.
  - [ ] Create new.
  - [ ] Skip.
  - [ ] Review manually.
- [ ] Store match confidence and reasons.

## Phase 12: Update Behavior Controls

Goal: Give admins control over how imports affect existing records.

- [ ] Add whole-import update behavior:
  - [ ] Do not overwrite existing values.
  - [ ] Overwrite only blank values.
  - [ ] Always overwrite.
  - [ ] Append to existing values.
  - [ ] Add as historical/source value.
- [ ] Add per-field update behavior.
- [ ] Default phone to keep existing unless blank.
- [ ] Default source to append, not overwrite.
- [ ] Default program to update only when current value is blank.
- [ ] Default application status to never overwrite unless explicitly enabled.
- [ ] Show overwrite consequences in final review.

## Phase 13: Import Assistant

Goal: Add practical assistant support without making the wizard feel magical or opaque.

- [ ] Add assistant panel to mapping and validation steps.
- [ ] Show top issues to review.
- [ ] Add `Fix all safe issues`.
- [ ] Add `Review one by one`.
- [ ] Add `Explain this import`.
- [ ] Add `Create reusable template`.
- [ ] Support questions:
  - [ ] Why is this row blocked?
  - [ ] What will happen if I import this?
  - [ ] Which fields will overwrite existing student data?
  - [ ] Can you map program names to closest active programs?
  - [ ] Show only students that might already exist.

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

- [ ] Utilities tab visible only to tenant admin and master tenant admin.
- [ ] CSV upload.
- [ ] Auto-detect delimiter and header.
- [ ] Confirm import type as Students / Prospects only.
- [ ] Auto-map common student fields.
- [ ] Manual column mapping.
- [ ] Required field validation.
- [ ] Duplicate detection by email and external ID.
- [ ] Preview create/update/skip counts.
- [ ] Import job history.
- [ ] Download error report.
- [ ] Save mapping template.
