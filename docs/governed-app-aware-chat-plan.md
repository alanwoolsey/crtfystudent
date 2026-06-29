# Governed App-Aware Chat Plan

## Goal

Keep crtfy.ai as the governed assistant layer, but give it the minimum relevant crtfy Student application context needed to answer user questions accurately. The chat should infer what application data is needed from the user message, retrieve only that data, compress it aggressively, and send a governed request to crtfy.ai with citations and audit metadata.

## Current State

- `WorkspaceAssistant` sends user text directly to `VITE_CHAT_URL /api/agent/run`.
- crtfy.ai governs the request and response.
- The request does not include application data beyond the user message, attachment metadata, and auth token.
- The application already has useful tenant-scoped data behind APIs: students, documents, checklist, timeline, decisions, trust flags, workflows, imports, tenants/admin, and reporting.

## Core Design

Add a backend `chat context broker` in `transcriptapi`.

The frontend should call crtfy Student backend first:

```text
WorkspaceAssistant
  -> transcriptapi /api/v1/assistant/chat
    -> classify intent
    -> select allowed data tools
    -> retrieve tenant-scoped data
    -> compress context
    -> call crtfy.ai /api/agent/run
    -> return governed response + citations + audit id
```

crtfy.ai remains the only generation/governance layer. transcriptapi acts as a retrieval, authorization, minimization, and audit-prep layer.

## Non-Negotiables

- Always enforce Cognito bearer token and `X-Tenant-Id`.
- Never send broad raw database dumps to crtfy.ai.
- Only retrieve data the user is authorized to see.
- Only send the smallest useful context package.
- Include source citations for every retrieved object.
- Preserve crtfy.ai governance result, guardrails, approvals, and audit ID.
- Log what data categories were retrieved, not sensitive raw content unless required by audit policy.

## Request Flow

1. Frontend sends:
   - user message
   - current route
   - current entity hints, such as `studentId`, active tab, visible filters
   - recent assistant conversation summary, not full transcript
   - optional attachment metadata/base64

2. transcriptapi validates auth and tenant.

3. transcriptapi runs a fast intent and scope classifier.

4. transcriptapi retrieves only needed data using internal tools.

5. transcriptapi compresses retrieved data into a bounded context packet.

6. transcriptapi calls crtfy.ai with:
   - original user message
   - governed system/application instructions
   - compact context packet
   - data classification
   - citations
   - tenant/user/workspace metadata

7. transcriptapi returns crtfy.ai response unchanged except for adding app-side retrieval metadata.

## Frontend Contract

Replace direct calls from `WorkspaceAssistant` to `VITE_CHAT_URL` with `VITE_API_URL /api/v1/assistant/chat`.

Example request:

```json
{
  "message": "Which students are missing transcripts this week?",
  "route": "/students",
  "activeEntity": {
    "type": "student",
    "id": "student-123"
  },
  "uiState": {
    "activeTab": "documents",
    "filters": {
      "stage": "prospect"
    }
  },
  "conversationSummary": "User is reviewing student documents and checklist readiness.",
  "attachments": []
}
```

Example response:

```json
{
  "response": "Three students are missing transcripts...",
  "policyStatus": "allowed",
  "guardrails": ["tenant_scoped", "student_data_minimized"],
  "citations": [
    {
      "id": "student-123:checklist",
      "label": "Checklist for Emily Johnson",
      "type": "student_checklist"
    }
  ],
  "auditId": "crtfy-ai-audit-123",
  "retrieval": {
    "intent": "student_checklist_question",
    "toolsUsed": ["student_search", "checklist_summary"],
    "inputContextTokens": 1180,
    "cacheHit": false
  }
}
```

## Intent Router

Use a cheap deterministic router first. Only use a small model/classifier if rules are ambiguous.

Recommended intent categories:

- `student_lookup`
- `student_profile_question`
- `student_documents_question`
- `student_checklist_question`
- `student_timeline_question`
- `student_decision_question`
- `student_trust_question`
- `workflow_queue_question`
- `reporting_question`
- `import_utility_question`
- `admin_tenant_question`
- `how_to_use_app`
- `general_governed_chat`

Routing signals:

- Current route: `/students/:id`, `/documents`, `/utilities`, `/admin`
- Entity IDs in UI state
- Keywords: transcript, document, checklist, missing, decision, trust, import, tenant, user, role
- User scope: permissions and sensitivity tiers from `/api/v1/me`
- Query shape:
  - “this student” means active student context
  - “which students” means search/list context
  - “why” often needs timeline/checklist/document evidence
  - “draft email” needs student + communication context

## Data Tools

Implement internal backend tools. These are not exposed to crtfy.ai directly; transcriptapi calls them and sends summarized results.

### Student Tools

- `get_active_student_summary(studentId)`
- `get_student_checklist_summary(studentId)`
- `get_student_documents_summary(studentId)`
- `get_student_timeline_summary(studentId, limit)`
- `get_student_decision_summary(studentId)`
- `get_student_trust_summary(studentId)` gated by trust permission and sensitivity tier
- `search_students(query, filters, limit)`

### Operational Tools

- `get_documents_queue_summary(filters, limit)`
- `get_work_queue_summary(filters, limit)`
- `get_reporting_snapshot(metric, filters)`
- `get_import_jobs_summary(limit)`
- `get_admin_tenant_summary()` gated by admin/platform permissions

### App Help Tools

- `get_feature_help(topic)`
- `get_route_capabilities(route)`
- `get_user_permissions_summary()`

## Context Packet Format

Send structured context, not prose blobs.

```json
{
  "contextVersion": 1,
  "tenant": {
    "id": "uuid",
    "name": "CRTFY"
  },
  "user": {
    "role": "tenant_admin",
    "permissions": ["view_student_360"]
  },
  "activeEntity": {
    "type": "student",
    "id": "student-123",
    "summary": {
      "name": "Emily Johnson",
      "stage": "Prospect",
      "program": "BS Nursing",
      "owner": "Alan Woolsey"
    }
  },
  "retrieved": [
    {
      "sourceId": "student-123:checklist",
      "type": "checklist_summary",
      "summary": {
        "complete": 4,
        "missing": ["High school transcript", "ACT/SAT scores"],
        "blocked": []
      }
    }
  ],
  "citations": [
    {
      "sourceId": "student-123:checklist",
      "label": "Student checklist",
      "route": "/students/student-123?tab=checklist"
    }
  ]
}
```

## Token Budget Strategy

Set hard context budgets by answer type.

Recommended defaults:

- Route/current student question: 800-1,500 context tokens
- List/search question: 1,500-2,500 context tokens
- Reporting summary: 1,000-2,000 context tokens
- Draft communication: 1,200-2,000 context tokens
- Trust/decision explanation: 1,500-3,000 context tokens
- General app help: 300-900 context tokens

Compression rules:

- Prefer counts, statuses, labels, dates, and IDs.
- Include only top 5-10 records by relevance.
- Include only latest 5-10 timeline events unless user asks for history.
- Summarize documents by type/status/date/document ID, not full text.
- Do not include full transcript/course data unless asked.
- Do not include document content by default.
- Include raw values only when user asks to inspect a field.
- Use stable source IDs so crtfy.ai can cite without copying full records.

## Fast Retrieval Strategy

Use a two-stage retrieval pattern:

1. Fast route/keyword planner under 20 ms.
2. Parallel data fetches for selected tools.

Examples:

- On `/students/:id`, prefetch/cache:
  - student summary
  - checklist summary
  - document summary
  - latest timeline summary

- On `/documents`, prefetch/cache:
  - queue counts
  - top exception types
  - recent uploads

- On `/utilities`, prefetch/cache:
  - recent import jobs
  - saved templates

Use short TTL cache:

- Per-user, per-tenant, per-route
- TTL 30-90 seconds
- Invalidate after upload, checklist update, student update, import completion

## Cost Controls

- Do not call crtfy.ai until context retrieval is complete and minimized.
- Skip retrieval for pure general questions.
- Use deterministic routing for most messages.
- Cache route context summaries.
- Cache generated app-help answers where safe.
- Store rolling conversation summaries instead of resending full history.
- Cap retrieved rows and timeline events.
- Return “I need to narrow this down” when a broad request would require too much data.
- Track estimated context tokens before calling crtfy.ai.

## Governance Boundary

transcriptapi should not bypass crtfy.ai governance.

Allowed in transcriptapi:

- Auth checks
- Permission checks
- Data retrieval
- Data minimization
- Context formatting
- Retrieval audit
- Citation construction

Not allowed in transcriptapi:

- Final natural-language answer generation for governed assistant responses
- Policy override
- Hidden sensitive-data expansion
- Ungoverned summarization of restricted data

crtfy.ai receives:

- user message
- compact authorized context packet
- data classification
- citations
- tenant/user metadata

crtfy.ai returns:

- response
- policy status
- guardrails
- approval requirement
- audit ID
- model/token metadata

## Security And Permissions

Every data tool must check:

- tenant ID
- Cognito user
- permissions
- sensitivity tiers
- record-level scopes when available

Examples:

- Trust details require `view_trust_flags` or `manage_trust_cases` and `trust_fraud_flags`.
- Transcript images require `view_sensitive_docs` and `transcript_images`.
- Admin tenant/user details require admin/platform permissions.
- Student 360 details require `view_student_360`.

If the user asks for inaccessible data:

- retrieve nothing restricted
- tell crtfy.ai the restriction reason in the context packet
- allow crtfy.ai to produce the governed refusal/explanation

## Audit Model

Create an app-side assistant retrieval audit record:

- tenant ID
- user ID
- route
- intent
- tools selected
- source IDs retrieved
- permissions used
- context token estimate
- crtfy.ai audit ID
- policy status
- latency
- cache hit/miss

Do not store full context payload by default. Store source IDs and hashes. Store raw context only for explicit regulated audit modes.

## MVP Implementation Phases

### Phase 1: Backend Chat Broker

- Add `POST /api/v1/assistant/chat`.
- Accept message, route, active entity, UI state, conversation summary, attachments.
- Validate tenant auth.
- Forward to crtfy.ai with no app context first.
- Preserve current response shape used by `WorkspaceAssistant`.

### Phase 2: Intent Router

- Add deterministic keyword + route-based intent router.
- Return intent, confidence, and selected tool names.
- Add tests for common prompts:
  - “What is missing for this student?”
  - “Show recent documents.”
  - “Which students need transcripts?”
  - “Draft an email asking for FAFSA.”
  - “Why is this decision blocked?”

### Phase 3: Current Student Context

- Support active student questions on `/students/:id`.
- Tools:
  - student summary
  - checklist summary
  - document summary
  - timeline summary
- Keep context under 1,500 tokens.
- Add citations back to student tabs.

### Phase 4: Queue And Search Context

- Add student search and queue summaries.
- Support questions about students missing documents, checklist blockers, document queue, and ready-for-review work.
- Limit result sets to top 10.

### Phase 5: Communication Draft Context

- Add communication-safe context packet for drafting emails/texts.
- Include student name, missing items, program, owner, recent communication status.
- Avoid sensitive trust/decision details unless needed and allowed.

### Phase 6: Reporting Context

- Add reporting snapshots and aggregate metrics.
- Support “how many”, “which group”, “trend”, and “owner workload” questions.
- Prefer aggregate summaries over row data.

### Phase 7: Trust, Decision, And Sensitive Context

- Add gated tools for trust and decisions.
- Enforce sensitivity tiers.
- Add explicit restricted-context markers when data is unavailable.

### Phase 8: Caching And Token Controls

- Add route-context cache.
- Add token estimator.
- Add max context size enforcement.
- Add fallback narrowing questions for broad requests.

### Phase 9: Audit And Observability

- Store retrieval audit record.
- Link app-side audit ID to crtfy.ai audit ID.
- Add logs/metrics for latency, selected tools, token estimates, cache hit rate.

## MVP Acceptance Criteria

- Existing governance remains intact.
- The assistant can answer “this student” questions using active Student 360 context.
- The assistant can answer checklist/document status questions without sending full student records.
- Non-authorized users cannot retrieve restricted data through chat.
- Average context packet stays under 2,000 tokens for common prompts.
- P95 backend retrieval time stays under 500 ms excluding crtfy.ai generation.
- Responses include citations/source labels.
- App-side audit records show what data was retrieved.

## Example Prompt Handling

### “What is missing for this student?”

Intent: `student_checklist_question`

Tools:

- `get_active_student_summary`
- `get_student_checklist_summary`
- `get_student_documents_summary`

Context:

- student name, stage, program
- missing checklist items
- recent document types and statuses

Do not send:

- full transcript courses
- full document text
- unrelated timeline

### “Draft a text asking Emily for her transcript.”

Intent: `student_communication_draft`

Tools:

- `get_active_student_summary`
- `get_student_checklist_summary`
- `get_recent_communication_summary`

Context:

- first name
- missing transcript item
- program/term
- last outreach date/outcome

### “Which students need financial aid follow-up?”

Intent: `workflow_queue_question`

Tools:

- `search_students`
- `get_work_queue_summary`
- `get_reporting_snapshot`

Context:

- aggregate count
- top 10 student summaries with missing aid items
- owners and next follow-up dates

## Open Decisions

- Whether to store app-side assistant audits in transcriptapi database tables or JSON during MVP. -YES
- Whether route context should be proactively prefetched by frontend or lazily fetched by backend. - YES
- Whether crtfy.ai needs a dedicated `context` field or should receive context as structured text inside `message`. - Not sure do what you think is best
- Whether attachments should be governed before or after app context retrieval. - After but only if used in the chat, upload no governance yet.
- Whether document content extraction should be searchable by the chat broker in MVP or later. - In MVP

