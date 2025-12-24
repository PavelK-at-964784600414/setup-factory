#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Reproduction script for deployment issues (PowerShell example)

.DESCRIPTION
    This script demonstrates a reproduction scenario for debugging deployment issues.
    It connects to a remote host via SSH, deploys a configuration, and collects artifacts.

.PARAMETER host
    Target host to connect to

.PARAMETER user
    SSH username

.PARAMETER template
    Path to YAML template file

.PARAMETER repro_id
    Reproduction identifier (optional)

.PARAMETER dry_run
    Run in dry-run mode
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$host,
    
    [Parameter(Mandatory=$true)]
    [string]$user,
    
    [Parameter(Mandatory=$false)]
    [string]$template = "",
    
    [Parameter(Mandatory=$false)]
    [string]$repro_id = "",
    
    [Parameter(Mandatory=$false)]
    [bool]$dry_run = $false
)

# Generate repro_id if not provided
if ([string]::IsNullOrEmpty($repro_id)) {
    $repro_id = "repro-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
}

Write-Host "========================================"
Write-Host "Setup-Factory Reproduction Script"
Write-Host "========================================"
Write-Host "Repro ID: $repro_id"
Write-Host "Target: $user@$host"
Write-Host "Template: $template"
Write-Host "Dry Run: $dry_run"
Write-Host "========================================"
Write-Host ""

# Step 1: Test SSH connectivity
Write-Host "[1/5] Testing SSH connectivity..."
$sshTest = ssh -o ConnectTimeout=5 -o BatchMode=yes "$user@$host" "echo 'Connection successful'"
if ($LASTEXITCODE -ne 0) {
    Write-Error "SSH connection failed to $user@$host"
    exit 1
}
Write-Host "✓ SSH connection successful"
Write-Host ""

# Step 2: Check remote environment
Write-Host "[2/5] Checking remote environment..."
$remoteInfo = ssh "$user@$host" @"
    echo "Hostname: `$(hostname)"
    echo "OS: `$(uname -s)"
    echo "Uptime: `$(uptime)"
    echo "Disk Usage:"
    df -h /
"@
Write-Host $remoteInfo
Write-Host ""

# Step 3: Deploy configuration
Write-Host "[3/5] Deploying configuration..."
if ($dry_run) {
    Write-Host "[DRY RUN] Would deploy configuration from: $template"
    Write-Host "[DRY RUN] Would create deployment in /opt/deployments/$repro_id"
} else {
    # Simulate deployment (in real scenario, would copy files, run setup, etc.)
    $deployCmd = @"
        mkdir -p /tmp/$repro_id
        echo "Deployment timestamp: `$(date)" > /tmp/$repro_id/deployment.log
        echo "Deployed by: $user" >> /tmp/$repro_id/deployment.log
        echo "Template: $template" >> /tmp/$repro_id/deployment.log
"@
    ssh "$user@$host" $deployCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Configuration deployed successfully"
    } else {
        Write-Error "Deployment failed!"
        exit 1
    }
}
Write-Host ""

# Step 4: Simulate a failing step (for demonstration)
Write-Host "[4/5] Running post-deployment checks..."
Write-Host "⚠ Simulating a failure for demonstration..."
Start-Sleep -Seconds 2

# This is where a real issue would be reproduced
Write-Error "Service failed to start after deployment"
Write-Host "Exit code: 137 (SIGKILL - OOM?)"
Write-Host ""

# Step 5: Collect artifacts
Write-Host "[5/5] Collecting artifacts..."
if (-not $dry_run) {
    $artifactsDir = "artifacts/$repro_id"
    New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null
    
    # Copy logs from remote host
    Write-Host "Downloading /tmp/$repro_id/deployment.log..."
    scp "$user@${host}:/tmp/$repro_id/deployment.log" "$artifactsDir/"
    
    # Collect system info
    $sysInfo = ssh "$user@$host" @"
        echo "=== System Information ===" > /tmp/sysinfo.txt
        uname -a >> /tmp/sysinfo.txt
        echo "" >> /tmp/sysinfo.txt
        echo "=== Memory ===" >> /tmp/sysinfo.txt
        free -h >> /tmp/sysinfo.txt
        echo "" >> /tmp/sysinfo.txt
        echo "=== Disk ===" >> /tmp/sysinfo.txt
        df -h >> /tmp/sysinfo.txt
        cat /tmp/sysinfo.txt
"@
    
    $sysInfo | Out-File "$artifactsDir/sysinfo.txt"
    Write-Host "✓ Artifacts collected to $artifactsDir"
}
Write-Host ""

Write-Host "========================================"
Write-Host "Reproduction Complete"
Write-Host "========================================"
Write-Host "Status: FAILED (as expected for reproduction)"
Write-Host "Repro ID: $repro_id"
Write-Host "Artifacts: artifacts/$repro_id"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review artifacts in artifacts/$repro_id"
Write-Host "2. Download reproduction bundle from Setup-Factory UI"
Write-Host "3. Create Jira ticket with bundle attached"
Write-Host "========================================"

# Exit with failure code to indicate issue was reproduced
exit 1
