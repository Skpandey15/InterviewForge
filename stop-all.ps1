<#
.SYNOPSIS
  Stops all AI Interview Platform processes started by start-all.ps1.
.EXAMPLE
  .\stop-all.ps1               # stop app processes, leave containers running
  .\stop-all.ps1 -Containers   # also stop the Docker containers
#>
[CmdletBinding()]
param(
    [switch]$Containers
)

$stopped = 0

Get-CimInstance Win32_Process -Filter "Name='java.exe'" |
    Where-Object { $_.CommandLine -like '*1.0.0-SNAPSHOT.jar*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -Confirm:$false -ErrorAction SilentlyContinue; $stopped++ }

Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { $_.CommandLine -like '*uvicorn*app.main*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -Confirm:$false -ErrorAction SilentlyContinue; $stopped++ }

Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match 'vite|concurrently' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -Confirm:$false -ErrorAction SilentlyContinue; $stopped++ }

Write-Host "Stopped $stopped app processes." -ForegroundColor Green

if ($Containers) {
    docker compose -f (Join-Path $PSScriptRoot 'infrastructure\docker-compose.yml') stop
    Write-Host "Containers stopped." -ForegroundColor Green
} else {
    Write-Host "Containers left running (use -Containers to stop them)." -ForegroundColor DarkGray
}
