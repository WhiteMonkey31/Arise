# RFPilot — Testing Guide

## Quick Start (3 steps)

### Step 1 — Start infrastructure
```bash
# Start Postgres, Redis, ChromaDB (Docker required)
docker compose up postgres redis chromadb -d
```

### Step 2 — Start both services
```powershell
# Windows
.\start.ps1
```
```bash
# macOS / Linux
bash start.sh
```

### Step 3 — Seed test data
```bash
cd backend
python scripts/seed_test_data.py    # creates demo user + workspaces + capabilities
python scripts/seed_bid_history.py  # populates analytics with 40 bid history rows
```

---

## Demo Login (no backend needed)

Open **http://localhost:5173/login** and click **"Demo Login (no backend)"**.

This injects a mock JWT token and pre-fills the auth store with a fake user profile
(Sarah Jenkins / Acme Consulting Group). All React Query hooks will fire but 401
back — which is expected. Use this to test UI layout and animations without the backend.

---

## Test Credentials (real backend)

| Field    | Value                   |
|----------|-------------------------|
| Email    | `demo@rfpilot.dev`      |
| Password | `Demo1234!`             |

Or click **"Fill seed credentials"** on the login page to auto-fill.

---

## API Test Dashboard

Navigate to **http://localhost:5173/dev/api-test** (dev mode only).

Hits every backend route sequentially and shows:
- HTTP method + endpoint
- Pass / Fail badge
- Response time in ms
- A live run log

### What each test group covers

| Group        | Endpoints tested |
|---|---|
| Auth         | GET /api/auth/me |
| Workspaces   | GET, POST, GET by id, PUT |
| Capabilities | GET, POST, PUT, DELETE |
| Analytics    | bid-history, win-rate-by-sector, score-vs-outcome, compliance-vs-win-rate |
| Documents    | GET /documents |
| Compliance   | GET /compliance |
| Proposals    | GET /proposals |
| Win Score    | GET /win-score, GET /go-no-go (404 is expected before RFP upload) |
| Export       | POST /export |
| System       | GET /health, GET /ready |

---

## Manual Testing Checklist

### Auth flow
- [ ] Register new org + user at `/register`
- [ ] Login at `/login` with real credentials
- [ ] Verify JWT stored in `localStorage` under `auth_token`
- [ ] Verify `/api/auth/me` returns correct user data
- [ ] Logout clears token, redirects to `/`
- [ ] 401 on any protected route without token

### Dashboard
- [ ] Workspace cards appear after login
- [ ] KPI counters reflect actual workspace count
- [ ] "New RFP Workspace" modal creates workspace and redirects to upload

### Upload flow
- [ ] Upload a real PDF/DOCX at `/workspace/:id/upload`
- [ ] Job poller shows progress as Celery processes the file
- [ ] On completion, redirects to overview
- [ ] `/compliance` shows extracted requirements

### Compliance page
- [ ] Requirements appear in table
- [ ] Click row → evidence panel updates
- [ ] Status override dropdown POATCHes `/compliance/:item_id`
- [ ] Filter pills (PASS / GAP / PARTIAL) filter correctly

### Proposal page
- [ ] "Generate All Sections" queues a draft job and shows progress
- [ ] Sections appear with AI text
- [ ] Editing text + clicking "Save" PUTs to backend
- [ ] Approve / Reject changes status badge
- [ ] "Export DOCX" downloads a `.docx` file

### Win Score page
- [ ] Radar chart renders 6 axes
- [ ] Score breakdown table shows delta badges
- [ ] GO / NO-GO card shows AI reasoning
- [ ] GO button updates workspace status to `submitted`

### Capabilities
- [ ] List loads from `/api/capabilities`
- [ ] Search + certification filter work
- [ ] Add capability form posts to backend
- [ ] Edit pre-fills form with existing data
- [ ] Delete shows confirm dialog, calls DELETE endpoint

### Analytics
- [ ] Win rate bars render after `seed_bid_history.py`
- [ ] Scatter plot shows dots for each scored bid
- [ ] KPI cards reflect real aggregate counts

### Portfolio (Kanban)
- [ ] Workspaces appear in correct columns by status
- [ ] Drag-and-drop updates status via PUT
- [ ] Urgent deadline cards show amber "Soon" badge

---

## Common Issues

| Symptom | Fix |
|---|---|
| All API calls return 401 | Run `seed_test_data.py` or use Demo Login |
| Win Score returns 404 | Normal — no requirements yet. Upload an RFP first |
| Analytics charts empty | Run `seed_bid_history.py` |
| Workspace status columns empty | Check that backend enum now uses lowercase values |
| CORS error | Add `http://localhost:5173` to `ALLOWED_ORIGINS` in `backend/.env` |
| ChromaDB error on capability create | Ensure ChromaDB is running: `docker compose up chromadb -d` |
| Celery jobs stuck at PENDING | Start Celery workers: `celery -A app.tasks.celery_app.celery_app worker --loglevel=info` |
