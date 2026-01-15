# Start Setup-Factory Agent
Write-Host "========================================"
Write-Host "  Starting Setup-Factory Agent"
Write-Host "========================================"
Write-Host ""

# Check if agent config exists
if (-not (Test-Path "agent\config.yaml")) {
    Write-Host "ERROR: agent\config.yaml not found!" -ForegroundColor Red
    Write-Host "Please create agent\config.yaml from agent\config.yaml.example"
    Write-Host ""
    pause
    exit 1
}

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python detected: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python not found!" -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from python.org"
    Write-Host ""
    pause
    exit 1
}

# Check if requirements are installed
$requirementsCheck = python -c "import requests, yaml" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    Set-Location agent
    pip install -r requirements.txt
    Set-Location ..
}

Write-Host ""
Write-Host "Starting agent..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop"
Write-Host ""

Set-Location agent
python agent.py
