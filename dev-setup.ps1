$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup-Factory Development Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "[1/8] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Host "Docker detected: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Setup .env file
Write-Host "[2/8] Setting up environment configuration..." -ForegroundColor Yellow

if (-Not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
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
Write-Host "[3/8] Installing dependencies..." -ForegroundColor Yellow

Write-Host "  Installing API dependencies..." -ForegroundColor Cyan
Set-Location api
npm install
Set-Location ..
Write-Host "API dependencies installed" -ForegroundColor Green

Write-Host "  Installing Frontend dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install
Set-Location ..
Write-Host "Frontend dependencies installed" -ForegroundColor Green

Write-Host "  Installing Worker dependencies..." -ForegroundColor Cyan
Set-Location worker
npm install
Set-Location ..
Write-Host "Worker dependencies installed" -ForegroundColor Green

Write-Host ""

# Start Docker services
Write-Host "[4/8] Starting infrastructure services (PostgreSQL and Redis)..." -ForegroundColor Yellow
docker-compose up -d postgres redis

Write-Host "  Waiting for services to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

# Check if Redis is ready
Write-Host "  Checking Redis connection..." -ForegroundColor Cyan
$retries = 0
while ($retries -lt 10) {
    try {
        docker exec setup-factory-redis redis-cli ping | Out-Null
        Write-Host "Infrastructure services started" -ForegroundColor Green
        break
    } catch {
        $retries++
        if ($retries -eq 10) {
            Write-Host "Warning: Redis might not be ready. Continuing anyway..." -ForegroundColor Yellow
        }
        Start-Sleep -Seconds 1
    }
}
Write-Host ""

# Initialize database
Write-Host "[5/8] Initializing database..." -ForegroundColor Yellow
Set-Location api

Write-Host "  Running Prisma migrations..." -ForegroundColor Cyan
try {
    npx prisma migrate dev --name init 2>&1 | Out-Null
} catch {
    Write-Host "  Migrations already applied" -ForegroundColor Yellow
}

Write-Host "  Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate
Write-Host "Database initialized" -ForegroundColor Green

Set-Location ..
Write-Host ""

# Check if scripts directory exists
Write-Host "[6/8] Checking scripts directory..." -ForegroundColor Yellow

$scriptsPath = $env:SCRIPTS_REPO_PATH
if (-Not $scriptsPath) {
    $scriptsPath = ".\scripts-repo-example"
}

if (Test-Path $scriptsPath) {
    Write-Host "Scripts directory found at: $scriptsPath" -ForegroundColor Green
} else {
    Write-Host "Scripts directory not found. Using example scripts." -ForegroundColor Yellow
    Write-Host "  You can set SCRIPTS_REPO_PATH in .env to point to your scripts" -ForegroundColor Cyan
}

Write-Host ""

# Create batch file to run all services
Write-Host "[7/8] Creating start script..." -ForegroundColor Yellow

$startScript = @"
@echo off
echo ========================================
echo   Starting Setup-Factory Services
echo ========================================
echo.

echo Starting API on port 3001...
start "Setup-Factory API" cmd /k "cd /d %~dp0api & npm run dev"
timeout /t 2 /nobreak >nul

echo Starting Frontend on port 3000...
start "Setup-Factory Frontend" cmd /k "cd /d %~dp0frontend & npm run dev"
timeout /t 2 /nobreak >nul

echo Starting Worker...
start "Setup-Factory Worker" cmd /k "cd /d %~dp0worker & npm run dev"

echo.
echo ========================================
echo   All services are starting!
echo ========================================
echo.
echo Services will be available at:
echo   Frontend: http://localhost:3000
echo   API:      http://localhost:3001
echo   BullMQ:   http://localhost:3002
echo.
echo Press any key to exit this window (services will keep running)...
pause >nul
"@

Set-Content -Path "start-dev.bat" -Value $startScript
Write-Host "Created start-dev.bat" -ForegroundColor Green

$stopScript = @"
@echo off
echo Stopping Setup-Factory services...

taskkill /FI "WindowTitle eq Setup-Factory API*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq Setup-Factory Frontend*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq Setup-Factory Worker*" /T /F >nul 2>&1

echo Services stopped.
echo.
echo To stop Docker services, run: docker-compose down
pause
"@

Set-Content -Path "stop-dev.bat" -Value $stopScript
Write-Host "Created stop-dev.bat" -ForegroundColor Green

Write-Host ""

# All done!
Write-Host "[8/8] Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ready to start development!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start all services, run:" -ForegroundColor Yellow
Write-Host "  .\start-dev.bat" -ForegroundColor White
Write-Host ""
Write-Host "To stop all services, run:" -ForegroundColor Yellow
Write-Host "  .\stop-dev.bat" -ForegroundColor White
Write-Host ""
Write-Host "Access the application at:" -ForegroundColor Yellow
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  API:       http://localhost:3001/health" -ForegroundColor White
Write-Host "  BullMQ:    http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "Starting services now..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Start the services
Start-Process -FilePath ".\start-dev.bat"

Write-Host ""
Write-Host "All services are starting in separate windows!" -ForegroundColor Green
Write-Host "You can close this window now." -ForegroundColor Cyan
Write-Host ""
