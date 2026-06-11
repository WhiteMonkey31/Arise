# System Requirements Specification (SRS)

Version: 1.0
Date: 2026-06-11
Project: Cust — RFP / Proposal Engine (Frontend + API + Worker)

---

## 1. Purpose

This document specifies the system-level requirements, data models, API contracts, data flows, event shapes, and integration points for the Cust proposal engine project. It is intended for frontend and backend engineers, integration partners, and DevOps.

## 2. Scope

Covers the full product surface implemented in this repository: frontend (React + Vite), frontend state (Zustand), upload/extraction flow, long-running job tracking (SSE), proposal editing and versioning, scoring/analytics, export generation, capability catalog, and integration with AI & worker services.

## 3. Actors

- End User (proposal author / analyst)
- System Admin
- AI Extraction/Generation Service (third-party or internal worker)
- Docx/PDF Export Service
- Background Worker / Job Queue
- Authentication Provider (internal or third-party)

## 4. High-level Components

- Frontend: React, Vite, Tailwind, Zustand stores, custom hooks
- Backend API: REST endpoints (Auth, Workspaces, Uploads, Jobs, Proposal, Export, Capabilities, Analytics)
- Worker / AI Service: processes uploads, performs extraction and generation
- Storage: relational/NoSQL DB for metadata, object store for uploaded files and generated exports
- Streaming: SSE (text/event-stream) or WebSocket for job progress
- Queue: persistent job queue (Redis/RabbitMQ/Cloud Tasks)

## 5. Core JSON Data Models (examples)

Workspace
```
{
  "id": "ws-1",
  "name": "string",
  "sector": "string",
  "budget": "string",
  "deadline": "YYYY-MM-DD",
  "status": "Draft|Analysing|In Review|Submitted",
  "winProbability": 0,
  "pageCount": 0,
  "requirementsCount": 0,
  "gapCount": 0,
  "complianceRate": 0,
  "creationDate": "ISO-8601",
  "riskScore": 0,
  "requirements": [ /* Requirement */ ],
  "proposalSections": [ /* ProposalSection */ ]
}
```

Requirement
```
{
  "id":"REQ-01",
  "text":"string",
  "category":"string",
  "mandatory": true,
  "matchScore": 0,
  "status":"PASS|GAP|REVIEW",
  "evidence": [ { "id","title","description","match" } ]
}
```

ProposalSection
```
{
  "id":"SEC-01",
  "requirementId":"REQ-01",
  "heading":"string",
  "text":"string",
  "wordCount": 0,
  "targetWordCount": 0,
  "approved":"Approved|Draft|Pending",
  "versionHistory": [ { "timestamp","editor","text" } ]
}
```

User/Auth
```
{ "user": { "id","name","email","org" }, "token": "jwt", "expiresAt": "ISO" }
```

Job (background)
```
{
  "jobId": "string",
  "type": "extract|export|generate",
  "workspaceId": "ws-1",
  "status": "queued|running|done|error",
  "progress": 0,
  "startedAt": "ISO",
  "finishedAt": "ISO",
  "result": { /* job-specific */ },
  "logs": "string"
}
```

## 6. API Endpoints (recommended canonical contracts)

All request/response bodies use application/json unless noted.

Auth
- POST /api/auth/login
  - Body: { email, password }
  - Response: { user, token, expiresAt }

- POST /api/auth/register
  - Body: { orgName, name, email, password }
  - Response: { user, token }

Workspaces
- GET /api/workspaces
  - Response: [ Workspace ]
- POST /api/workspaces
  - Body: { name, sector, budget, deadline }
  - Response: Workspace
- GET /api/workspaces/:id
  - Response: Workspace
- PUT /api/workspaces/:id
  - Body: partial Workspace
  - Response: Workspace
- DELETE /api/workspaces/:id
  - Response: 204

Uploads & Jobs
- POST /api/workspaces/:id/upload
  - multipart/form-data (file field name: `file`)
  - Response: { jobId }
- GET /api/jobs/:jobId
  - Response: Job
- GET /api/jobs/subscribe?jobId=... (SSE)
  - text/event-stream with events: progress/done/error

Requirements
- GET /api/workspaces/:id/requirements
  - Response: [ Requirement ]
- PATCH /api/workspaces/:id/requirements/:reqId
  - Body: { status, notes }
  - Response: Requirement

Proposal & Versioning
- GET /api/workspaces/:id/proposal
  - Response: [ ProposalSection ]
- PUT /api/workspaces/:id/proposal/sections/:sectionId
  - Body: { text, approved }
  - Response: ProposalSection
- POST /api/workspaces/:id/proposal/sections/:sectionId/versions
  - Body: { text, editor }
  - Response: version object

Export
- POST /api/workspaces/:id/export
  - Body: { format: "docx"|"pdf", includeSections: [ids] }
  - Response: { fileId } or direct stream
- GET /api/export/:fileId
  - Response: file stream (Content-Disposition)

Scoring
- GET /api/workspaces/:id/score
  - Response: { scoreBreakdown: [...], overall: number }

Capabilities Catalog
- GET /api/capabilities
  - Response: [ capability ]

## 7. Data Flow Details

1) Upload -> Extract -> Populate
- Frontend POSTs file to /api/workspaces/:id/upload.
- Backend enqueues job and returns jobId.
- Frontend subscribes to SSE or polls job endpoint.
- Worker extracts requirements & evidence and writes them to DB.
- Backend emits SSE done event; frontend fetches /requirements and updates local store via `populateRequirementsAfterUpload` action.

2) Proposal Editing
- Frontend renders proposalSections from store / GET API.
- Edits are persisted via PUT; versions saved via POST to versions.
- Frontend updates `ProposalSection.versionHistory` when version created.

3) Export
- Export request triggers server-side composition (DOCX/PDF) using templates and selected sections; on completion returns a download stream or fileId.

4) Scoring & Analytics
- Frontend requests scoring endpoint; backend computes from workspace metrics, historical capability matches, and returns breakdown.

## 8. Event / SSE Shapes

- progress
  - data: { jobId, progress: number, message: string, step: string }
- done
  - data: { jobId, status: "success", workspaceId, summary: { requirementsCount: int }, resultUrl?: string }
- error
  - data: { jobId, status: "error", error: { code, message } }

## 9. Frontend Store Shapes (Zustand)

`workspaceStore` (example keys)
- workspaces: Workspace[]
- activeWorkspaceId: string | null
- selectedRequirementId: string | null
- setActiveWorkspace(id)
- createWorkspace(data)
- deleteWorkspace(id)
- populateRequirementsAfterUpload(workspaceId)
- updateProposalSection(workspaceId, sectionId, patch)
- updateWorkspaceStatus(id, status)

`authStore`
- token, user, login(), logout(), register()
- token persistence: stored in `localStorage` key `token`

## 10. Formats, Constraints & Validation

- IDs: prefer UUID v4 or consistent string prefix (e.g., ws-1)
- Dates & timestamps: ISO 8601
- Upload size limit: define server limit (e.g., 25MB); client must validate and show error before uploading
- Text limits: Max section length (recommend 20k chars); enforce server-side truncation or reject
- Response times: synchronous APIs < 2s for metadata calls; long jobs async with SSE

## 11. Security

- All protected endpoints require `Authorization: Bearer <token>` header.
- Token storage on client: localStorage (current repo uses localStorage; consider switching to secure http-only cookie for production).
- Validate and sanitize user input server-side.
- Scan uploaded files for malware and store objects with private ACLs.

## 12. Error Handling & Retry

- Use standard HTTP status codes.
- For transient job failures, worker should retry with exponential backoff and emit SSE progress/error events.
- Frontend should display toast notifications and allow manual retry for failed uploads and generation tasks.

## 13. Integrations

- AI extraction/generation: input - file bytes or extracted text; output - array of Requirements with evidence (JSON).
- DOCX generator: input - workspace + selected sections; output - binary stream
- Optional: OAuth / SSO provider for authentication

## 14. Observability

- Persist job logs and expose admin endpoints for job listing and logs.
- Emit metrics for: upload rate, extraction time, average job duration, export generation time, error rates.

## 15. Deployment Notes

- Worker tier separated from API.
- Use persistent queue (Redis/RabbitMQ) for jobs.
- Use object store for files (S3/GCS/Azure Blob).
- Use CDN for exports if necessary.

## 16. Glossary

- RFP: Request for Proposal
- DOCX: Microsoft Word document format
- SSE: Server Sent Events
- DB: Database

## 17. Next Steps

- Convert this SRS to an OpenAPI spec for the REST endpoints.
- Add small developer comments in critical frontend files: `src/store/workspaceStore.js`, `src/hooks/useSSE.js`, `src/services/uploadService.js`, `src/pages/workspace/UploadRFP.jsx`, and `src/router.jsx`.
- Implement SSE subscription retry logic in `useSSE` hook.

---

*Document generated by development assistant — edit as needed to reflect backend design choices.*
