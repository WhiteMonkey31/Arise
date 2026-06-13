#!/usr/bin/env bash
# ============================================================
# RFPilot — Dev Launcher (macOS / Linux / WSL)
# Run from the project root:  bash start.sh
# ============================================================
#
# Starts:
#   • FastAPI backend  →  http://localhost:8000
#   • Vite dev server  →  http://localhost:5173
#
# Both processes run in the foreground (side-by-side).
# Press Ctrl+C once to stop both.
# ============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colour helpers ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}  $*${NC}"; }
ok()    { echo -e "${GREEN}  [OK] $*${NC}"; }
warn()  { echo -e "${YELLOW}  [!!] $*${NC}"; }
err()   { echo -e "${RED}  [ERR] $*${NC}"; exit 1; }

# ── Cleanup on Ctrl+C ─────────────────────────────────────────────────────────
cleanup() {
    echo ""
    warn "Shutting down both services..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    ok "Done."
}
trap cleanup INT TERM

# ── Pre-flight checks ─────────────────────────────────────────────────────────
info "RFPilot Dev Launcher"

# 1. backend/.env
if [ ! -f "$ROOT/backend/.env" ]; then
    warn "backend/.env not found — copying from .env.example"
    cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
    warn "Edit backend/.env with your API keys before the backend can fully function."
fi

# 2. Python venv
VENV_PYTHON="$ROOT/backend/venv/bin/python"
if [ ! -f "$VENV_PYTHON" ]; then
    warn "Virtual environment not found at backend/venv — creating..."
    python3 -m venv "$ROOT/backend/venv"
    ok "venv created"
fi

# 3. pip install
info "Checking Python dependencies..."
"$VENV_PYTHON" -m pip install -q -r "$ROOT/backend/requirements.txt"
ok "Python dependencies ready"

# 4. npm install
if [ ! -d "$ROOT/Frontend/node_modules" ]; then
    warn "node_modules not found — running npm install..."
    (cd "$ROOT/Frontend" && npm install --silent)
    ok "npm packages installed"
fi

# ── Start services ─────────────────────────────────────────────────────────────
info "Starting backend  →  http://localhost:8000"
(cd "$ROOT/backend" && "$VENV_PYTHON" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

sleep 0.5   # let uvicorn bind the port before Vite starts

info "Starting frontend →  http://localhost:5173"
(cd "$ROOT/Frontend" && npm run dev) &
FRONTEND_PID=$!

ok "Both services running — press Ctrl+C to stop."
echo ""

# Wait until one of them exits (or Ctrl+C fires)
wait -n "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || wait
