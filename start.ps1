# RFPilot - Dev Launcher (Windows PowerShell)
# Run from the project root: .\start.ps1
#
# Starts:
#   FastAPI backend  -> http://localhost:8000
#   Vite dev server  -> http://localhost:5173

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [!!] $msg" -ForegroundColor Yellow }

Write-Step ""
Write-Step "RFPilot Dev Launcher"
Write-Step "====================="

# 1. Ensure backend\.env exists
$envFile = Join-Path $Root "backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Warn "backend\.env not found - copying from .env.example"
    Copy-Item (Join-Path $Root "backend\.env.example") $envFile
    Write-Warn "Edit backend\.env with your API keys before running."
}

# 2. Install Node dependencies for Backend
Write-Step "Checking Backend Node dependencies..."
Push-Location (Join-Path $Root "backend")
& npm install --silent
Pop-Location
Write-Ok "Backend dependencies ready"

# 4. Install Node dependencies if missing
$nodeModules = Join-Path $Root "Frontend\node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Warn "node_modules not found - running npm install..."
    Push-Location (Join-Path $Root "Frontend")
    & npm install --silent
    Pop-Location
    Write-Ok "npm packages installed"
}

# 5. Start backend in a new PowerShell window
Write-Step "Starting Node.js backend  -> http://localhost:8000"
$backendDir = Join-Path $Root "backend"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$backendDir'; node server.js"
)
Write-Ok "Backend window opened"

Start-Sleep -Milliseconds 800

# 6. Start frontend in a new PowerShell window
Write-Step "Starting frontend -> http://localhost:5173"
$frontendDir = Join-Path $Root "Frontend"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$frontendDir'; npm run dev"
)
Write-Ok "Frontend window opened"

Write-Step ""
Write-Step "Both services are starting in separate windows."
Write-Host "  Press Ctrl+C in each window to stop." -ForegroundColor DarkGray
Write-Step ""
