<#
.SYNOPSIS
  Brings up the entire AI Interview Platform locally with one command.

.DESCRIPTION
  Idempotent: already-healthy services are left alone. Order:
    1. Infra containers (Postgres, Redis, Kafka, MinIO, Jaeger, Prometheus, Grafana)
    2. Backend jars (built if missing; -Rebuild to force)
    3. ai-gateway (venv created + deps installed if missing)
    4. Frontend in real mode on :3000 (skip with -NoFrontend)
  Service output goes to .\logs\<service>.log.

.EXAMPLE
  .\start-all.ps1              # start everything
  .\start-all.ps1 -Rebuild     # rebuild jars first
  .\start-all.ps1 -NoFrontend  # backend + infra only
#>
[CmdletBinding()]
param(
    [switch]$Rebuild,
    [switch]$NoFrontend
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$logs = Join-Path $root 'logs'
New-Item -ItemType Directory -Force $logs | Out-Null

function Test-Endpoint($url) {
    try { Invoke-WebRequest -Uri $url -TimeoutSec 2 -UseBasicParsing | Out-Null; return $true } catch { return $false }
}

function Wait-Endpoints($map, $timeoutSec) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    $pending = @($map.Keys)
    while ($pending.Count -gt 0 -and (Get-Date) -lt $deadline) {
        $pending = @($pending | Where-Object { -not (Test-Endpoint $map[$_]) })
        if ($pending.Count -gt 0) { Start-Sleep -Seconds 3 }
    }
    return $pending
}

# ---------- 1. Infra containers ----------
Write-Host "[1/4] Infra containers..." -ForegroundColor Cyan
$dockerProbe = Start-Job { docker version --format '{{.Server.Version}}' 2>$null }
$engineUp = (Wait-Job $dockerProbe -Timeout 15) -and (Receive-Job $dockerProbe)
Remove-Job $dockerProbe -Force
if (-not $engineUp) {
    Write-Host @"
Docker engine is not responding. Recovery (Rancher Desktop on this machine):
  1. Kill stuck docker CLI processes
  2. wsl --shutdown
  3. Start 'C:\Program Files\Rancher Desktop\Rancher Desktop.exe' and wait ~2 min
Then re-run this script.
"@ -ForegroundColor Red
    exit 1
}
docker compose -f (Join-Path $root 'infrastructure\docker-compose.yml') up -d | Out-Null
$deadline = (Get-Date).AddSeconds(90)
do {
    Start-Sleep -Seconds 3
    $healthy = @(docker ps --filter 'name=aip-postgres' --filter 'health=healthy' --format '{{.Names}}') +
               @(docker ps --filter 'name=aip-kafka' --filter 'health=healthy' --format '{{.Names}}')
} until ($healthy.Count -ge 2 -or (Get-Date) -gt $deadline)
if ($healthy.Count -lt 2) { Write-Host "Postgres/Kafka not healthy in time - check 'docker ps'" -ForegroundColor Red; exit 1 }
Write-Host "  containers ready (postgres + kafka healthy)" -ForegroundColor Green

# ---------- 2. Backend jars ----------
Write-Host "[2/4] Backend services..." -ForegroundColor Cyan
$services = @(
    @{ name = 'auth-service';         port = 8083; health = 'http://127.0.0.1:8083/actuator/health'; args = @('--spring.profiles.active=local') },
    @{ name = 'interview-platform';   port = 8082; health = 'http://127.0.0.1:8082/actuator/health'; args = @() },
    @{ name = 'gateway-service';      port = 8080; health = 'http://127.0.0.1:8080/actuator/health'; args = @() },
    @{ name = 'notification-service'; port = 8084; health = 'http://127.0.0.1:8084/actuator/health'; args = @() }
)

$needBuild = $Rebuild
foreach ($svc in $services) {
    if (-not (Test-Path (Join-Path $root "backend\$($svc.name)\target\$($svc.name)-1.0.0-SNAPSHOT.jar"))) { $needBuild = $true }
}
if ($needBuild) {
    Write-Host "  building jars..." -ForegroundColor Yellow
    $mvn = 'mvn'
    if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) { $mvn = Join-Path $root '.tools\apache-maven-3.9.9\bin\mvn.cmd' }
    Push-Location (Join-Path $root 'backend')
    & $mvn -q -DskipTests package
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host "Maven build failed" -ForegroundColor Red; exit 1 }
    Pop-Location
}

foreach ($svc in $services) {
    if (Test-Endpoint $svc.health) {
        Write-Host "  $($svc.name) already up on :$($svc.port)" -ForegroundColor DarkGray
        continue
    }
    $jar = Join-Path $root "backend\$($svc.name)\target\$($svc.name)-1.0.0-SNAPSHOT.jar"
    Start-Process -WindowStyle Hidden java `
        -ArgumentList (@('-jar', $jar) + $svc.args) `
        -RedirectStandardOutput (Join-Path $logs "$($svc.name).log") `
        -RedirectStandardError (Join-Path $logs "$($svc.name).err.log") `
        -WorkingDirectory $root
    Write-Host "  $($svc.name) starting on :$($svc.port)"
}

# ---------- 3. ai-gateway ----------
Write-Host "[3/4] ai-gateway..." -ForegroundColor Cyan
$gwDir = Join-Path $root 'ai\ai-gateway'
$python = Join-Path $gwDir '.venv\Scripts\python.exe'
if (-not (Test-Path $python)) {
    Write-Host "  creating venv + installing deps..." -ForegroundColor Yellow
    python -m venv (Join-Path $gwDir '.venv')
    & (Join-Path $gwDir '.venv\Scripts\pip.exe') install -q -r (Join-Path $gwDir 'requirements.txt')
}
if (Test-Endpoint 'http://127.0.0.1:8090/healthz') {
    Write-Host "  ai-gateway already up on :8090" -ForegroundColor DarkGray
} else {
    Start-Process -WindowStyle Hidden $python `
        -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--port', '8090') `
        -RedirectStandardOutput (Join-Path $logs 'ai-gateway.log') `
        -RedirectStandardError (Join-Path $logs 'ai-gateway.err.log') `
        -WorkingDirectory $gwDir
    Write-Host "  ai-gateway starting on :8090"
}

# ---------- 4. Frontend ----------
if (-not $NoFrontend) {
    Write-Host "[4/4] Frontend (real mode)..." -ForegroundColor Cyan
    # 'localhost', not 127.0.0.1: the Vite dev server binds IPv6 ::1 on this host.
    if (Test-Endpoint 'http://localhost:3000') {
        Write-Host "  frontend already up on :3000" -ForegroundColor DarkGray
    } else {
        if (-not (Test-Path (Join-Path $root 'node_modules'))) {
            Write-Host "  npm install..." -ForegroundColor Yellow
            Push-Location $root; npm install --no-audit --no-fund | Out-Null; Pop-Location
        }
        Start-Process -WindowStyle Hidden cmd `
            -ArgumentList @('/c', 'npm run dev:real > logs\frontend.log 2>&1') `
            -WorkingDirectory $root
        Write-Host "  frontend starting on :3000"
    }
} else {
    Write-Host "[4/4] Frontend skipped (-NoFrontend)" -ForegroundColor DarkGray
}

# ---------- Wait + report ----------
Write-Host "`nWaiting for services to become healthy..." -ForegroundColor Cyan
$expected = @{}
foreach ($svc in $services) { $expected[$svc.name] = $svc.health }
$expected['ai-gateway'] = 'http://127.0.0.1:8090/healthz'
if (-not $NoFrontend) { $expected['frontend'] = 'http://localhost:3000' }

$failed = Wait-Endpoints $expected 150
foreach ($name in ($expected.Keys | Sort-Object)) {
    if ($failed -contains $name) {
        Write-Host ("  {0,-22} DOWN  (see logs\{0}*.log)" -f $name) -ForegroundColor Red
    } else {
        Write-Host ("  {0,-22} UP" -f $name) -ForegroundColor Green
    }
}

Write-Host @"

URLs
  App (real mode)   http://localhost:3000     (candidate: sunil@demo.com / Demo@123, admin: admin@demo.com / Admin@123)
  API gateway       http://localhost:8080
  Grafana           http://localhost:3300     (dashboard: AIP - Platform & AI Quality)
  Jaeger            http://localhost:16686
  Prometheus        http://localhost:9090

Stop everything:    .\stop-all.ps1  (add -Containers to also stop Docker containers)
"@
if ($failed.Count -gt 0) { exit 1 }
