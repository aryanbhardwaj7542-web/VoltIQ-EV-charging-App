# Windows Production Launch Script for VoltIQ Platform
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  VoltIQ: India EV Charging Intelligence & Trust Platform " -ForegroundColor Green
Write-Host "  Launching Production Distribution Mode                  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$workspaceRoot = $PSScriptRoot

# 1. Build Client Distribution
Write-Host "`n[1/3] Compiling Client Production Distribution (Vite + Chunks)..." -ForegroundColor Yellow
Set-Location "$workspaceRoot\client"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Client build failed. Aborting." -ForegroundColor Red
    exit 1
}

# 2. Build Server Distribution
Write-Host "`n[2/3] Compiling Server Production TypeScript (dist)..." -ForegroundColor Yellow
Set-Location "$workspaceRoot\server"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Server build failed. Aborting." -ForegroundColor Red
    exit 1
}

# 3. Start Production Server
Write-Host "`n[3/3] Launching Unified Production Server on http://localhost:3001..." -ForegroundColor Green
Write-Host "Serving pre-compiled React 19 client with Express SPA fallback." -ForegroundColor Green
Write-Host "WebSocket hub active on ws://localhost:3001/ws" -ForegroundColor Green
$env:NODE_ENV = "production"
node dist/server/src/index.js
