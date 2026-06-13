# RFPilot — Bid & Proposal Response Engine

## Quick Start

### Windows
```powershell
# From the project root
.\start.ps1
```

### macOS / Linux / WSL
```bash
# From the project root
bash start.sh
```

Both scripts will:
1. Copy `backend/.env.example` → `backend/.env` if it doesn't exist yet
2. Create `backend/venv` if it doesn't exist
3. Run `pip install` for Python deps (skips already-installed packages)
4. Run `npm install` for frontend deps if `node_modules` is missing
5. Start the **FastAPI backend** on **http://localhost:8000**
6. Start the **Vite dev server** on **http://localhost:5173**

On Windows each service opens in its own terminal window.  
On macOS/Linux both run in the foreground; press **Ctrl+C** once to stop both.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |

> PostgreSQL, Redis, and ChromaDB must also be running.  
> The easiest way is: `docker compose up postgres redis chromadb -d`

---

## Environment Setup

Copy the example and fill in your API keys:

```bash
cp backend/.env.example backend/.env
```

Key variables to set before first run:

```env
SECRET_KEY=<random 32+ char string>
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql+asyncpg://rfpuser:rfppassword@localhost:5432/rfpdb
```

---

## Services at a Glance

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (FastAPI) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs *(DEBUG=true only)* |
| Health check | http://localhost:8000/health |

---

## Full Docker Stack

To run everything (including Postgres, Redis, ChromaDB, Celery workers) via Docker:

```bash
docker compose up --build
```
