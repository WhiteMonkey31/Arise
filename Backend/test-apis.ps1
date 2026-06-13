#!/usr/bin/env pwsh
# API Test Suite -- RFP Bid Management Backend
$BASE = "http://localhost:8000"
$PASS = 0
$FAIL = 0

function Test-API {
    param(
        [string]$Label,
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectStatus = 200
    )
    try {
        $params = @{ Uri=$Url; Method=$Method; Headers=$Headers; UseBasicParsing=$true; ErrorAction="Stop" }
        if ($Body) { $params.Body=$Body; $params.ContentType="application/json" }
        $r = Invoke-WebRequest @params
        $status = $r.StatusCode
        $content = $r.Content
    } catch {
        $status = [int]$_.Exception.Response.StatusCode
        try { $content = $_.ErrorDetails.Message } catch { $content = $_.Exception.Message }
    }

    $ok = $status -eq $ExpectStatus
    if ($ok) {
        $script:PASS++
        $preview = if ($content.Length -gt 110) { $content.Substring(0,110) + "..." } else { $content }
        Write-Host "PASS [$status] $Label" -ForegroundColor Green
        Write-Host "     $preview" -ForegroundColor DarkGray
    } else {
        $script:FAIL++
        Write-Host "FAIL [$status] $Label (expected $ExpectStatus)" -ForegroundColor Red
        Write-Host "     $content" -ForegroundColor Yellow
    }
    return $content
}

Write-Host ""
Write-Host "======================================" -ForegroundColor White
Write-Host " RFP Backend API Tests" -ForegroundColor White
Write-Host "======================================" -ForegroundColor White

# 1. HEALTH
Write-Host "`n-- Health --" -ForegroundColor Cyan
Test-API -Label "GET /health" -Url "$BASE/health" | Out-Null

# 2. AUTH
Write-Host "`n-- Auth --" -ForegroundColor Cyan
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "tester_$ts@example.com"
$regBody = "{""email"":""$email"",""password"":""Test1234!"",""org_name"":""Test Org $ts"",""role"":""BID_MANAGER""}"

$regResp = Test-API -Label "POST /api/auth/register" -Method POST -Url "$BASE/api/auth/register" -Body $regBody -ExpectStatus 201
Test-API -Label "POST /api/auth/register (duplicate -> 400)" -Method POST -Url "$BASE/api/auth/register" -Body $regBody -ExpectStatus 400 | Out-Null

$loginEmail = "{""email"":""$email"",""password"":""Test1234!""}"
$loginUser  = "{""username"":""$email"",""password"":""Test1234!""}"
$loginWrong = "{""email"":""$email"",""password"":""WRONG""}"

$loginResp = Test-API -Label "POST /api/auth/token (email field)" -Method POST -Url "$BASE/api/auth/token" -Body $loginEmail
Test-API -Label "POST /api/auth/token (username field)" -Method POST -Url "$BASE/api/auth/token" -Body $loginUser | Out-Null
Test-API -Label "POST /api/auth/token (wrong password -> 401)" -Method POST -Url "$BASE/api/auth/token" -Body $loginWrong -ExpectStatus 401 | Out-Null

$token = ($loginResp | ConvertFrom-Json).access_token
$auth  = @{ Authorization = "Bearer $token" }

Test-API -Label "GET /api/auth/me (authed)" -Url "$BASE/api/auth/me" -Headers $auth | Out-Null
Test-API -Label "GET /api/auth/me (no token -> 401)" -Url "$BASE/api/auth/me" -ExpectStatus 401 | Out-Null

# 3. WORKSPACES
Write-Host "`n-- Workspaces --" -ForegroundColor Cyan
Test-API -Label "GET /api/workspaces (empty list)" -Url "$BASE/api/workspaces" -Headers $auth | Out-Null

$wsBody = '{"name":"RFP Hackathon 2026","sector":"Government IT"}'
$wsResp = Test-API -Label "POST /api/workspaces" -Method POST -Url "$BASE/api/workspaces" -Body $wsBody -Headers $auth -ExpectStatus 201
$wsId = ($wsResp | ConvertFrom-Json).id
Write-Host "     Workspace ID: $wsId" -ForegroundColor DarkGray

Test-API -Label "GET /api/workspaces/:id" -Url "$BASE/api/workspaces/$wsId" -Headers $auth | Out-Null
Test-API -Label "GET /api/workspaces/nonexistent (-> 404)" -Url "$BASE/api/workspaces/nonexistent-id" -Headers $auth -ExpectStatus 404 | Out-Null
Test-API -Label "GET /api/workspaces (no auth -> 401)" -Url "$BASE/api/workspaces" -ExpectStatus 401 | Out-Null

# 4. DOCUMENTS
Write-Host "`n-- Documents / Upload --" -ForegroundColor Cyan
Test-API -Label "GET /api/workspaces/:id/documents" -Url "$BASE/api/workspaces/$wsId/documents" -Headers $auth | Out-Null

# File upload via multipart
$tmpFile = [System.IO.Path]::GetTempFileName()
Rename-Item $tmpFile "$tmpFile.txt" -ErrorAction SilentlyContinue
$tmpFile = "$tmpFile.txt"
"Test RFP. Vendor MUST have 5 years experience. Solution SHALL support 10000 users. Vendor MUST comply with NIST standards." | Out-File -FilePath $tmpFile -Encoding utf8

$boundary = "----FormBoundary" + [System.Guid]::NewGuid().ToString("N")
$fileName = [System.IO.Path]::GetFileName($tmpFile)
$fileContent = [System.IO.File]::ReadAllText($tmpFile)
$multiBody = "--$boundary`r`nContent-Disposition: form-data; name=""file""; filename=""$fileName""`r`nContent-Type: text/plain`r`n`r`n$fileContent`r`n--$boundary--"
$multiBytes = [System.Text.Encoding]::UTF8.GetBytes($multiBody)

$jobId = $null
try {
    $uploadHeaders = @{ Authorization = "Bearer $token"; "Content-Type" = "multipart/form-data; boundary=$boundary" }
    $r = Invoke-WebRequest -Uri "$BASE/api/workspaces/$wsId/upload" -Method POST -Headers $uploadHeaders -Body $multiBytes -UseBasicParsing -ErrorAction Stop
    $script:PASS++
    $jobId = ($r.Content | ConvertFrom-Json).job_id
    Write-Host "PASS [$($r.StatusCode)] POST /api/workspaces/:id/upload" -ForegroundColor Green
    Write-Host "     Job ID: $jobId" -ForegroundColor DarkGray
} catch {
    $script:FAIL++
    Write-Host "FAIL POST /api/workspaces/:id/upload" -ForegroundColor Red
    Write-Host "     $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}
Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue

# 5. JOBS
Write-Host "`n-- Jobs --" -ForegroundColor Cyan
if ($jobId) {
    Test-API -Label "GET /api/jobs/:id (upload job)" -Url "$BASE/api/jobs/$jobId" -Headers $auth | Out-Null
    Start-Sleep -Seconds 2
    $jobStatus = (Test-API -Label "GET /api/jobs/:id (after 2s)" -Url "$BASE/api/jobs/$jobId" -Headers $auth | ConvertFrom-Json)
    Write-Host "     Job status: $($jobStatus.status) ($($jobStatus.progress_pct)%)" -ForegroundColor DarkGray
}
Test-API -Label "GET /api/jobs/nonexistent (-> 404)" -Url "$BASE/api/jobs/job-nonexistent-xyz" -Headers $auth -ExpectStatus 404 | Out-Null

# 6. SCORING
Write-Host "`n-- Scoring --" -ForegroundColor Cyan
Test-API -Label "GET /api/workspaces/:id/win-score" -Url "$BASE/api/workspaces/$wsId/win-score" -Headers $auth | Out-Null
Test-API -Label "GET /api/workspaces/:id/go-no-go" -Url "$BASE/api/workspaces/$wsId/go-no-go" -Headers $auth | Out-Null

# 7. PROPOSALS
Write-Host "`n-- Proposals --" -ForegroundColor Cyan
Test-API -Label "GET /api/workspaces/:id/proposals" -Url "$BASE/api/workspaces/$wsId/proposals" -Headers $auth | Out-Null

$genResp = Test-API -Label "POST /api/workspaces/:id/proposals/generate" -Method POST -Url "$BASE/api/workspaces/$wsId/proposals/generate" -Body '{}' -Headers $auth
try {
    $genJobId = ($genResp | ConvertFrom-Json).job_id
    if ($genJobId) {
        Write-Host "     Generation Job ID: $genJobId" -ForegroundColor DarkGray
        Start-Sleep -Seconds 1
        Test-API -Label "GET /api/jobs/:id (proposal gen job)" -Url "$BASE/api/jobs/$genJobId" -Headers $auth | Out-Null
    }
} catch {}

# 8. CAPABILITIES
Write-Host "`n-- Capabilities --" -ForegroundColor Cyan
Test-API -Label "GET /api/capabilities" -Url "$BASE/api/capabilities" -Headers $auth | Out-Null

# SUMMARY
Write-Host ""
Write-Host "======================================" -ForegroundColor White
$total = $PASS + $FAIL
$color = if ($FAIL -eq 0) { "Green" } else { "Yellow" }
Write-Host " RESULTS: $PASS / $total passed" -ForegroundColor $color
if ($FAIL -gt 0) { Write-Host " $FAIL test(s) FAILED" -ForegroundColor Red }
Write-Host "======================================" -ForegroundColor White
Write-Host ""
