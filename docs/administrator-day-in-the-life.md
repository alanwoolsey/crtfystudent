# Administrator Day In The Life

## Purpose

This document walks through a realistic day for an administrator using `crtfy student`. It is written from the perspective of an ops-minded admin who oversees access, monitors system health, and steps in when document processing or work-state infrastructure needs attention.

---

## 8:00 AM - Sign In And Check Platform Health

The administrator signs in through the standard authentication screen using their tenant credentials.

On first load, the app restores access context by:

- loading the current authenticated user from `/api/v1/me`
- applying role, permission, and sensitivity-tier checks
- restoring tenant-scoped session state from local storage

The administrator usually starts in one of two places:

- `Today's Work` to get a quick sense of queue pressure
- `Admin` to check whether users and backend projections are healthy

---

## 8:10 AM - Review User Access In Admin

From the `Admin` page, the administrator reviews the user roster for the tenant.

Typical tasks:

- search for a user by name or email
- filter users by status such as `active`, `invited`, or `inactive`
- review assigned roles, sensitivity tiers, and scope boundaries
- confirm whether the right people can see student records, trust cases, or release actions

The admin can:

- create a user
- edit a user
- send an invite
- deactivate a user
- reactivate a user
- remove a user

This is the normal place to resolve issues like:

- a processor who cannot see document queues
- a trust analyst who should only access fraud-related records
- a reviewer who needs decision access but not admin capabilities

---

## 8:30 AM - Verify Work Projection Readiness

Still in `Admin`, the administrator checks the `Work projection` panel.

This panel exists because queue reads now depend on projected `student_work_state` data instead of rebuilding everything on every request.

The administrator reviews:

- `Projected`
- `Total`
- `Remaining`
- `Ready`
- `Last projected`
- current projection job status
- current job error, if one exists

Normal healthy state:

- `ready` is `true`
- `remainingStudents` is `0`
- current job status is `completed`

If the projection is stale or incomplete, the admin can:

- run `Rebuild chunk` for incremental maintenance
- run `Rebuild all` for tenant warm-up or full rebuild

If a job fails, the panel shows the backend error and offers retry behavior.

---

## 9:00 AM - Inspect Projection Job History

If the work projection looks unhealthy, the administrator checks the projection jobs history in `Admin`.

This is the operational audit trail for projection maintenance.

The admin can:

- review recent jobs
- identify failed runs
- open one stable job record for deeper inspection
- retry a failed projection job

This is useful after:

- a deployment
- tenant warm-up
- a database timeout
- a report that work queues are empty or inconsistent

Typical interpretation:

- repeated `failed` jobs suggest backend or data-layer issues
- `queued` or `running` may simply mean the system is still warming up
- a successful retry usually restores queue readiness without user-facing admin changes

---

## 10:00 AM - Review Document Exceptions

The administrator moves to `Documents Queue` when staff report transcript failures, mismatches, or processing issues.

The queue now prefers the enriched exceptions feed and shows operational fields directly in the list:

- `reason`
- `suggestedAction`
- `documentStatus`
- `transcriptStatus`
- `latestRunStatus`

For each exception, the administrator can quickly tell:

- what failed
- whether the failure is still active
- whether the backend recommends rerunning or replacing the file

This is the primary page for coordinating with processors and trust staff when document automation fails.

---

## 10:15 AM - Open Exception Details

For a stubborn or unclear failure, the administrator opens `View exception details`.

This loads the backend exception summary for that document and exposes:

- issue label
- suggested action
- failure code
- failure message
- latest run status
- recent action history

This is the best place to answer questions like:

- Did parsing fail, or did persistence fail?
- Was the last run a stored reprocess or a replacement upload?
- Which backend action actually failed?
- Is this a one-off document problem or a repeatable processing defect?

---

## 10:30 AM - Reprocess A Failed Document

If the same uploaded file should be tried again, the administrator clicks `Reprocess`.

The frontend:

- calls `POST /api/v1/documents/{documentId}/reprocess`
- stores `agentRunId` and `transcriptId`
- polls agent-run status
- polls transcript upload status
- treats the operation as complete only when both are complete

This is the fastest recovery path when the original bytes are still correct and the admin just wants the pipeline rerun.

---

## 10:45 AM - Replace A Bad File

If the original upload was wrong, corrupted, incomplete, or the wrong transcript entirely, the administrator clicks `Replace file`.

The frontend:

- opens a file picker
- uploads the replacement bytes to `POST /api/v1/documents/{documentId}/reprocess-upload`
- stores `agentRunId` and `transcriptId`
- polls the same backend status endpoints used by stored reprocess

During this process, the admin can watch:

- reprocess state
- agent run state
- transcript persistence state
- any returned backend error

This is the normal recovery flow when staff have a corrected transcript in hand.

---

## 11:15 AM - Coordinate With Trust Or Processing Staff

Some document cases are not simple parser retries.

The administrator may also:

- confirm a match
- reject a bad match
- index a resolved document
- quarantine a risky document
- release a previously quarantined item

This is where the admin helps unblock edge cases that normal front-line processing cannot safely resolve alone.

---

## 1:00 PM - Validate Tenant Access After Staff Changes

After lunch, the administrator may return to `Admin` to handle staffing or permission changes.

Common examples:

- a new admissions processor starts today
- a counselor should no longer access trust cases
- a reviewer needs temporary expanded sensitivity access
- a departing staff member must be deactivated immediately

The admin updates the user and then often confirms the change by checking:

- status
- assigned roles
- sensitivity tiers
- scope values

This keeps access policy aligned with actual operational responsibilities.

---

## 2:30 PM - Check Reporting And Downstream Stability

The administrator may spot-check `Reporting` and queue-driven screens to make sure the platform still looks healthy after any earlier projection rebuild or document repair work.

They are usually looking for broad signs that:

- queues are loading
- reporting data is present
- document exceptions have dropped after reprocessing
- no major operational page is stuck in fallback or error state

This is less about analysis and more about confidence that the tenant is operational.

---

## 4:00 PM - Handle A Projection Failure If One Appears

Late in the day, the admin may see a failed projection job in the ops panel.

Typical workflow:

1. Open the failed job from the projection jobs list.
2. Read the backend error.
3. Retry the job from the UI.
4. Watch projection status polling until the system returns to `ready`.

If the retry also fails, the administrator now has a concrete job record and backend error to escalate to engineering.

---

## 5:00 PM - End Of Day Checklist

Before logging off, a careful administrator usually wants:

- no unresolved critical document exceptions without an owner
- no failed projection job without follow-up
- correct user access for tomorrow’s staff
- queue and reporting surfaces loading normally

If those conditions are true, the platform is in good shape for the next operating day.

---

## Summary

An administrator in `crtfy student` is not just managing users. They are also acting as the operational safety net for:

- access control
- document exception recovery
- trust-sensitive interventions
- projection/read-model health
- backend job recovery visibility

That makes the `Admin` page and `Documents Queue` the two most important control surfaces for day-to-day platform stewardship.
