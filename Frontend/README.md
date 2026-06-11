# AI-Powered Bid & Proposal Response Engine
## Frontend File Reference — React

> **Stack:** Vite · React · React Router · Zustand · TailwindCSS · React Query · Tiptap · Recharts
> **Total files:** 68 · **Folders:** 17 · **Phases covered:** P1 → P4

---

## Table of Contents

1. [Config & Entry](#1-config--entry)
2. [Store — Zustand State](#2-store--zustand-state)
3. [Services — API Layer](#3-services--api-layer)
4. [Hooks](#4-hooks)
5. [Layout Components](#5-layout-components)
6. [Pages](#6-pages)
7. [Workspace Pages (Nested)](#7-workspace-pages-nested)
8. [Feature Components — Workspace](#8-feature-components--workspace)
9. [Feature Components — Upload](#9-feature-components--upload)
10. [Feature Components — Compliance](#10-feature-components--compliance)
11. [Feature Components — Proposal](#11-feature-components--proposal)
12. [Feature Components — Scoring](#12-feature-components--scoring)
13. [Feature Components — Capability Library](#13-feature-components--capability-library)
14. [Feature Components — Analytics](#14-feature-components--analytics)
15. [Shared UI Components](#15-shared-ui-components)
16. [Utilities](#16-utilities)

---

## 1. Config & Entry

**Path:** `src/`

| Ticket | File | Description |
|--------|------|-------------|
| `P1-FE-01` | `main.jsx` | App entry point. Mounts React root, wraps app in QueryClientProvider (React Query), Router, and global Zustand context. |
| `P1-FE-01` | `router.jsx` | React Router route tree. Defines all top-level and nested routes, lazy-loads page components, and wraps protected routes in AuthGuard. |
| `P1-FE-01` | `App.jsx` | Root app component. Provides layout shell wrapper and global toast notifications via react-hot-toast. |

---

## 2. Store — Zustand State

**Path:** `src/store/`

| Ticket | File | Description |
|--------|------|-------------|
| `P2-FE-01` | `workspaceStore.js` | Zustand slice for active workspace state — current RFP, extraction job status, selected requirement, and proposal section approvals. |
| `P1-FE-02` | `uiStore.js` | Global UI state: sidebar open/closed, active modal, dark mode preference, toast queue. |
| `P4-INFRA-01` | `authStore.js` | Auth state: current user, org info, JWT token, and role (Admin / Bid Manager / Reviewer). Persisted to localStorage. |

---

## 3. Services — API Layer

**Path:** `src/services/`

All service files are thin Axios wrappers. They never handle caching or loading state — that lives in the corresponding hook file.

| Ticket | File | Description |
|--------|------|-------------|
| `P1-FE-01` | `api.js` | Axios instance with base URL, JWT interceptor, and global 401 redirect. All API modules import from here. |
| `P2-FE-01` | `workspaceService.js` | API calls: list workspaces, create workspace, get workspace by ID, update status, delete. |
| `P2-FE-02` | `uploadService.js` | Multipart file upload to `/api/workspaces/{id}/upload`. Returns `job_id` for polling. Tracks upload progress via `onUploadProgress`. |
| `P2-FE-03` | `complianceService.js` | Fetch compliance checklist per workspace. Patch individual item status (override PASS/FAIL/GAP). Fetch matched capability evidence for a requirement. |
| `P2-FE-04` | `proposalService.js` | Fetch draft sections, approve/reject/regenerate a section, save edited text, stream AI regeneration via SSE EventSource. |
| `P2-FE-05` | `scoringService.js` | Fetch win probability breakdown (6-axis radar data) and GO/NO-GO recommendation for a workspace. |
| `P3-FE-03` | `capabilityService.js` | CRUD for capability library records. Batch import from XLSX. Fetch capabilities linked to a specific proposal section. |
| `P3-FE-04` | `analyticsService.js` | Fetch aggregated bid history stats: win rate by sector, score vs outcome scatter data, compliance vs win rate trend. |
| `P3-BE-02` | `jobService.js` | Poll Celery job status by `job_id`. Returns `{status, progress, result}`. Used by ExtractionProgress component. |
| `P4-INFRA-01` | `authService.js` | Login, logout, register, refresh token, get current user profile. |
| `P2-BE-04` | `exportService.js` | Trigger DOCX export for a workspace. Downloads the returned blob as a `.docx` file. |
| `P4-FE-02` | `versionService.js` | Fetch version history for a proposal section. Restore a specific version by ID. |

---

## 4. Hooks

**Path:** `src/hooks/`

Hooks wrap services with React Query for caching, loading states, and mutations. Components never call services directly.

| Ticket | File | Description |
|--------|------|-------------|
| `P2-FE-01` | `useWorkspace.js` | React Query hook wrapping workspaceService. Returns workspace data, loading/error state, and mutation functions (create, update, delete). |
| `P2-FE-03` | `useCompliance.js` | React Query hook for compliance checklist. Includes optimistic update for manual status overrides. |
| `P2-FE-04` | `useProposal.js` | React Query hook for proposal sections. Exposes `approveMutation`, `rejectMutation`, `regenerateMutation`, and `saveEditMutation`. |
| `P3-BE-02` | `useJobPoller.js` | Custom hook that polls `jobService` every 2 seconds until job reaches `done` or `failed`. Returns `{status, progress}`. Stops polling automatically on completion. |
| `P2-FE-02` | `useSSE.js` | Generic SSE hook. Opens EventSource on a given URL, handles incoming message events, cleans up on unmount. Used for streaming AI text and extraction progress. |
| `P1-FE-01` | `useDebounce.js` | Standard debounce hook used in search inputs across capability library, workspace search, and analytics filters. |
| `P2-BE-04` | `useExport.js` | Wraps exportService to trigger DOCX download. Manages loading/error state and shows toast on success/failure. |
| `P4-INFRA-01` | `useAuth.js` | Exposes auth state from authStore and login/logout mutations from authService. Used across all protected pages. |

---

## 5. Layout Components

**Path:** `src/components/layout/`

| Ticket | File | Description |
|--------|------|-------------|
| `P1-FE-02` | `AppLayout.jsx` | Root layout with sidebar and main content area. Controls sidebar collapse state. Renders `<Sidebar>`, `<TopBar>`, and `<Outlet>` for nested routes. |
| `P1-FE-02` | `Sidebar.jsx` | Left navigation: logo, workspace list (scrollable), main nav links (Portfolio, Library, Analytics), and user profile at the bottom. |
| `P1-FE-02` | `TopBar.jsx` | Top bar with current workspace name, breadcrumb, notifications bell, and user avatar dropdown (logout, settings). |
| `P2-FE-01` | `WorkspaceLayout.jsx` | Nested layout for workspace pages. Renders workspace-level tab nav (Overview, Compliance, Proposal, Win Score) and wraps child routes. |
| `P4-INFRA-01` | `AuthLayout.jsx` | Minimal layout for login/register pages. Centered card, no sidebar. |
| `P4-INFRA-01` | `AuthGuard.jsx` | Route wrapper that checks auth token. Redirects unauthenticated users to `/login`. Checks RBAC role for restricted routes. |

---

## 6. Pages

**Path:** `src/pages/` and `src/pages/auth/`

Top-level pages registered in `router.jsx`.

| Ticket | File | Description |
|--------|------|-------------|
| `P2-FE-01` | `Dashboard.jsx` | Home page. Grid of workspace cards each showing RFP name, sector, deadline countdown, win probability mini-gauge, status badge, and quick-action menu. |
| `P4-FE-01` | `Portfolio.jsx` | Kanban board view of all RFPs. Columns: Draft / Analysing / In Review / Submitted. Drag-and-drop cards via dnd-kit. Deadline badges turn red when under 48 hours remaining. |
| `P3-FE-03` | `CapabilityLibrary.jsx` | Full-page capability library table. Search and filter by domain, certification, year, and client type. Add/edit capability drawer. Shows which proposals cited each record. |
| `P3-FE-04` | `Analytics.jsx` | Bid history analytics. Charts: win rate by sector (bar), score vs outcome (scatter), compliance % vs win rate (line). Date range and sector filters. Summary KPI cards at top. |
| `P4-INFRA-01` | `auth/Login.jsx` | Login page. Email and password form. Submits to `authService.login`, stores token in `authStore`, redirects to Dashboard. |
| `P4-INFRA-01` | `auth/Register.jsx` | Registration page for new org admins. Fields: org name, name, email, password. Creates org and user in one API call. |

---

## 7. Workspace Pages (Nested)

**Path:** `src/pages/workspace/`

These are nested routes rendered inside `WorkspaceLayout.jsx`, accessed via the per-RFP tab navigation.

| Ticket | File | Description |
|--------|------|-------------|
| `P2-FE-01` | `WorkspaceOverview.jsx` | Overview tab. RFP metadata summary (deadline, budget, sector, page count), extraction status, quick-stat chips (requirements count, gaps, score), and entry points to other tabs. |
| `P2-FE-02` | `UploadRFP.jsx` | RFP upload page shown as the first step for a new workspace. Drag-and-drop zone, file type validation (PDF/DOCX only), upload progress bar, then hands off to ExtractionProgress. |
| `P2-FE-03` | `CompliancePage.jsx` | Compliance tab. Wraps `ComplianceTable` and `EvidencePanel` in a split-pane layout. Includes filter bar (All / PASS / FAIL / GAP) and summary chips. |
| `P2-FE-04` | `ProposalPage.jsx` | Proposal editor tab. Renders list of `ProposalSection` cards. Top bar: completeness %, Export DOCX button, and AI-Regenerate All button. |
| `P2-FE-05` | `WinScorePage.jsx` | Win score tab. Renders `WinRadarChart`, `ScoreBreakdownTable`, and `GoNoGoCard`. Houses the final GO/NO-GO decision flow. |

---

## 8. Feature Components — Workspace

**Path:** `src/components/workspace/`

| Ticket | File | Description |
|--------|------|-------------|
| `P2-FE-01` | `WorkspaceCard.jsx` | Card shown on Dashboard and Portfolio. Props: workspace object. Renders name, sector badge, deadline countdown, mini win-probability bar, status chip, and action menu (open, delete, duplicate). |
| `P2-FE-01` | `CreateWorkspaceModal.jsx` | Modal to create a new workspace. Fields: RFP name, sector, description. On submit calls `workspaceService.create` then navigates to UploadRFP. |

---

## 9. Feature Components — Upload

**Path:** `src/components/upload/`

| Ticket | File | Description |
|--------|------|-------------|
| `P2-FE-02` | `DropZone.jsx` | Drag-and-drop file upload zone. Accepts PDF and DOCX. Validates file type and size (max 50 MB). Passes file to parent via `onFileSelect` callback. |
| `P3-FE-02` | `ExtractionProgress.jsx` | Step-by-step progress tracker shown after RFP upload. Steps animate through: Uploading → Extracting text → Identifying requirements → Matching capabilities → Scoring → Ready. Uses `useJobPoller`. |

---

## 10. Feature Components — Compliance

**Path:** `src/components/compliance/`

| Ticket | File | Description |
|--------|------|-------------|
| `P2-FE-03` | `ComplianceTable.jsx` | Table of all requirements. Columns: ID, requirement text, category tag, mandatory flag, match score bar, status badge (PASS/FAIL/GAP). Row click selects it and opens EvidencePanel. |
| `P2-FE-03` | `EvidencePanel.jsx` | Side panel shown when a requirement row is selected. Displays top 3 matched capability records with match scores, domain tags, and project summaries. Manual status override dropdown. |
| `P2-FE-03` | `StatusBadge.jsx` | Small badge component. Props: `status = "PASS" \| "FAIL" \| "GAP" \| "PARTIAL"`. Renders coloured chip. Used across compliance table and checklist exports. |

---

## 11. Feature Components — Proposal

**Path:** `src/components/proposal/`

| Ticket | File | Description |
|--------|------|-------------|
| `P2-FE-04` | `ProposalSection.jsx` | Card for a single proposal section. Shows requirement heading, AI-drafted text in a Tiptap rich-text editor (editable), evidence references, word count, and action bar: Approve / Reject / Regenerate. |
| `P2-FE-04` | `RegenerateButton.jsx` | Button that triggers section regeneration. Opens a small popover to optionally add instructions (e.g. "make it more concise"). Streams AI response token-by-token via `useSSE`. |
| `P2-FE-04` | `WordCountBar.jsx` | Inline bar showing current vs target word count for a section. Turns amber when more than 20% over or under target. |
| `P4-FE-02` | `VersionHistory.jsx` | Slide-over panel listing all saved versions of a proposal section. Each entry shows timestamp, editor name, and short diff preview. Restore version button with confirmation. |

---

## 12. Feature Components — Scoring

**Path:** `src/components/scoring/`

| Ticket | File | Description |
|--------|------|-------------|
| `P2-FE-05` | `WinRadarChart.jsx` | Recharts RadarChart with 6 axes: Budget Fit, Compliance %, Past Win Rate, Response Time, Sector Match, Gap Count. Renders filled polygon. Animated on mount. |
| `P2-FE-05` | `ScoreBreakdownTable.jsx` | Table of all 6 score axes with: axis name, raw score, benchmark (average from bid history), and delta chip (↑ above / ↓ below benchmark). |
| `P3-FE-01` | `GoNoGoCard.jsx` | Full decision card. Shows overall score gauge (0–100), top 3 risks (red), top 3 strengths (green), AI-generated 3-sentence reasoning, and GO / NO-GO action buttons with confirmation dialog. |
| `P2-FE-01` | `WinProbabilityGauge.jsx` | Mini arc gauge (SVG-based). Props: score 0–100. Used on workspace cards on the Dashboard. Color: red below 40, amber 40–65, green above 65. |

---

## 13. Feature Components — Capability Library

**Path:** `src/components/capability/`

| Ticket | File | Description |
|--------|------|-------------|
| `P3-FE-03` | `CapabilityTable.jsx` | Full data table for capability library. Columns: ID, domain, certification, year, contract value, duration, client type. Sortable columns, search filter, and row actions (edit, delete). |
| `P3-FE-03` | `CapabilityDrawer.jsx` | Slide-over drawer for add/edit capability. Fields: domain, project summary (textarea), certification, year completed, contract value, duration, client type. On save calls `capabilityService` and re-embeds the record into ChromaDB. |

---

## 14. Feature Components — Analytics

**Path:** `src/components/analytics/`

| Ticket | File | Description |
|--------|------|-------------|
| `P3-FE-04` | `WinRateBarChart.jsx` | Recharts BarChart showing win rate per sector. X-axis: sector names. Y-axis: win %. Tooltip shows win/total bids. Clicking a bar filters the rest of the analytics page. |
| `P3-FE-04` | `ScoreScatterPlot.jsx` | Recharts ScatterChart of bid score vs outcome (Win/Loss). Dots coloured by outcome. Hover tooltip shows bid ID, client, sector, and score. |
| `P3-FE-04` | `ComplianceTrendLine.jsx` | Recharts LineChart of compliance % over time, segmented by win vs loss bids. Shows the threshold compliance % above which win rates increase. |

---

## 15. Shared UI Components

**Path:** `src/components/ui/`

Generic, reusable UI primitives used across the entire app.

| Ticket | File | Description |
|--------|------|-------------|
| `P1-FE-02` | `Modal.jsx` | Generic accessible modal wrapper. Uses shadcn/ui Dialog under the hood. Accepts title, children, footer actions, and onClose. |
| `P1-FE-02` | `Drawer.jsx` | Slide-over drawer panel (from right). shadcn/ui Sheet. Used for EvidencePanel, CapabilityDrawer, and VersionHistory. |
| `P1-FE-02` | `ConfirmDialog.jsx` | Generic confirmation dialog. Props: title, message, confirmLabel, onConfirm. Used for delete workspace, restore version, and GO/NO-GO submission. |
| `P1-FE-02` | `EmptyState.jsx` | Empty state placeholder with icon, heading, and CTA button. Used in Dashboard (no workspaces), ComplianceTable (no items), and Analytics (no data). |
| `P1-FE-02` | `LoadingSpinner.jsx` | Animated spinner and skeleton loader variants. Used during React Query loading states throughout the app. |
| `P2-FE-01` | `SectorBadge.jsx` | Coloured pill badge for RFP sectors (IT Services, Construction, Logistics, etc.). Each sector maps to a fixed colour. |
| `P2-FE-01` | `DeadlineChip.jsx` | Shows days remaining until submission deadline. Color: green above 14 days, amber 7–14, red below 7. Used on workspace cards and Kanban board. |
| `P1-FE-01` | `ToastProvider.jsx` | Global toast notification provider using react-hot-toast. Exports helper functions: `toastSuccess`, `toastError`, `toastLoading` used across services and hooks. |
| `P2-FE-04` | `AIStreamText.jsx` | Renders streaming text token-by-token from an SSE stream. Shows a blinking cursor while streaming. Used in ProposalSection regeneration and any other streamed AI output. |

---

## 16. Utilities

**Path:** `src/utils/`

Pure helper functions with no React dependencies.

| Ticket | File | Description |
|--------|------|-------------|
| `P1-FE-01` | `formatters.js` | Date formatting (deadline countdowns, relative timestamps), currency formatting for contract values, score rounding, and percentage display helpers. |
| `P1-FE-01` | `constants.js` | App-wide constants: sector list, RFP status enum, compliance status enum, score axis labels, max file size, API base URL env var. |
| `P2-FE-02` | `validators.js` | File upload validators (type check, size check), form validators for workspace creation and capability forms. |
| `P2-FE-05` | `chartHelpers.js` | Transforms raw API scoring data into Recharts-compatible series format for radar, bar, scatter, and line charts. |
| `P4-FE-02` | `diffHelper.js` | Computes character-level diff between two strings for VersionHistory. Returns array of `{type: add \| remove \| equal, value}` segments. |

---

## Summary

| Category | Files |
|----------|-------|
| Config & Entry | 3 |
| Store (Zustand) | 3 |
| Services (API) | 12 |
| Hooks | 8 |
| Layout Components | 6 |
| Pages | 6 |
| Workspace Pages | 5 |
| Workspace Components | 2 |
| Upload Components | 2 |
| Compliance Components | 3 |
| Proposal Components | 4 |
| Scoring Components | 4 |
| Capability Components | 2 |
| Analytics Components | 3 |
| Shared UI Components | 9 |
| Utilities | 5 |
| **Total** | **77** |

---

*TEKROWE · Hackathon Problem 1 · AI-Powered Bid & Proposal Response Engine*
