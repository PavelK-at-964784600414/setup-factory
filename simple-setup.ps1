$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Simple Setup (No Docker)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Setup .env file
Write-Host "[1/5] Setting up environment..." -ForegroundColor Yellow

if (-Not (Test-Path ".env")) {
    Copy-Item ".env.local" ".env"
    Write-Host "Created .env from template" -ForegroundColor Green
    
    # Generate secrets
    Write-Host "  Generating secrets..." -ForegroundColor Cyan
    $jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
    $sessionSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
    $agentSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
    
    # Update .env file with generated secrets
    (Get-Content ".env") -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwtSecret" | Set-Content ".env"
    (Get-Content ".env") -replace 'SESSION_SECRET=.*', "SESSION_SECRET=$sessionSecret" | Set-Content ".env"
    (Get-Content ".env") -replace 'AGENT_REGISTRATION_SECRET=.*', "AGENT_REGISTRATION_SECRET=$agentSecret" | Set-Content ".env"
    
    Write-Host "Generated and configured secrets" -ForegroundColor Green
} else {
    Write-Host ".env file already exists" -ForegroundColor Green
}

Write-Host ""

# Install dependencies
Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow

Write-Host "  Installing API dependencies..." -ForegroundColor Cyan
Set-Location api
npm install
Set-Location ..

Write-Host "  Installing Frontend dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install
Set-Location ..

Write-Host "  Installing Worker dependencies..." -ForegroundColor Cyan
Set-Location worker
npm install
Set-Location ..

Write-Host "Dependencies installed" -ForegroundColor Green
Write-Host ""

# Initialize database
Write-Host "[3/5] Initializing database..." -ForegroundColor Yellow
Set-Location api

Write-Host "  Running Prisma migrations..." -ForegroundColor Cyan
try {
    npx prisma migrate dev --name init 2>&1 | Out-Null
} catch {
    Write-Host "  Migrations already applied" -ForegroundColor Yellow
}

Write-Host "  Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate
Write-Host "Database initialized (SQLite)" -ForegroundColor Green

Set-Location ..
Write-Host ""

# Check scripts directory
Write-Host "[4/5] Checking scripts directory..." -ForegroundColor Yellow

if (Test-Path "scripts-repo-example") {
    Write-Host "Scripts directory found: scripts-repo-example/" -ForegroundColor Green
} else {
    Write-Host "Warning: scripts-repo-example/ not found" -ForegroundColor Yellow
}

Write-Host ""

# Create simple start script
Write-Host "[5/5] Creating start script..." -ForegroundColor Yellow

$startScript = @"
Write-Host "Starting Setup-Factory services..." -ForegroundColor Cyan
Write-Host ""

# Load .env
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if (`$_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            `$name = `$matches[1].Trim()
            `$value = `$matches[2].Trim()
            [Environment]::SetEnvironmentVariable(`$name, `$value, "Process")
        }
    }
}

Write-Host "Starting API (port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '`$PWD'; Get-Content .env | ForEach-Object { if (`$_ -match '^([^#][^=]*)=(.*)$') { [Environment]::SetEnvironmentVariable(`$matches[1].Trim(), `$matches[2].Trim(), 'Process') } }; cd api; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Frontend (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '`$PWD'; Get-Content .env | ForEach-Object { if (`$_ -match '^([^#][^=]*)=(.*)$') { [Environment]::SetEnvironmentVariable(`$matches[1].Trim(), `$matches[2].Trim(), 'Process') } }; cd frontend; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Starting Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '`$PWD'; Get-Content .env | ForEach-Object { if (`$_ -match '^([^#][^=]*)=(.*)$') { [Environment]::SetEnvironmentVariable(`$matches[1].Trim(), `$matches[2].Trim(), 'Process') } }; cd worker; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Open your browser:" -ForegroundColor Yellow
Write-Host "  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Cyan
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@

Set-Content -Path "start-simple.ps1" -Value $startScript
Write-Host "Created start-simple.ps1" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start all services:" -ForegroundColor Yellow
Write-Host "  .\start-simple.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Then open: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting services now..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-File", ".\start-simple.ps1"

Write-Host ""
Write-Host "Services are starting!" -ForegroundColor Green
Write-Host ""
