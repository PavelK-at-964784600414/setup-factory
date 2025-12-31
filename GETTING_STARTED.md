# Setup-Factory Quick Start Guide

This guide will help you get Setup-Factory running on ANY computer from scratch.

## Fresh Installation on New Computer

### 1. Install Prerequisites

**On macOS:**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@18

# Install Python
brew install python@3.11

# Install Docker Desktop
brew install --cask docker
# OR download from: https://www.docker.com/products/docker-desktop

# Verify installations
node --version    # Should be 18+
npm --version
python3 --version # Should be 3.10+
docker --version
docker-compose --version
```

**On Windows:**
```powershell
# Install via winget (Windows 10/11)
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.11
winget install Docker.DockerDesktop

# OR download manually:
# Node.js: https://nodejs.org/
# Python: https://www.python.org/downloads/
# Docker Desktop: https://www.docker.com/products/docker-desktop

# Verify installations
node --version
npm --version
python --version
docker --version
```

**On Linux (Ubuntu/Debian):**
```bash
# Update package list
sudo apt update

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python
sudo apt install -y python3 python3-pip

# Install Docker
sudo apt install -y docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installations
node --version
npm --version
python3 --version
docker --version
```

### 2. Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/PavelK-at-964784600414/setup-factory.git
cd setup-factory
```

### 3. Install ALL Dependencies

```bash
# Option A: Use Makefile (recommended)
make install

# Option B: Manual installation
npm install                          # Root dependencies
cd api && npm install && cd ..       # API dependencies
cd frontend && npm install && cd ..  # Frontend dependencies
cd worker && npm install && cd ..    # Worker dependencies
cd agent && pip3 install -r requirements.txt && cd ..  # Agent dependencies
```

This will take a few minutes as it downloads all packages.

## Prerequisites (Quick Reference)

- **Node.js 18+** and npm
- **Python 3.10+**
- **Docker** and **Docker Compose**
- **Git**
- **PostgreSQL 14+** (or use Docker - recommended)
- **Redis 7+** (or use Docker - recommended)

For Windows development, also install:
- **PowerShell 7+**
- **Windows Terminal** (recommended)

### 4. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your favorite editor
nano .env
# OR
code .env
# OR
vim .env
```

**Minimum required changes for local testing:**

```bash
# Generate secrets (on macOS/Linux)
openssl rand -hex 32  # Copy output for JWT_SECRET
openssl rand -hex 32  # Copy output for SESSION_SECRET
openssl rand -hex 32  # Copy output for AGENT_REGISTRATION_SECRET

# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Edit your `.env` file:
```env
# REQUIRED - Change these!
JWT_SECRET=paste-your-generated-secret-here
SESSION_SECRET=paste-your-generated-secret-here
AGENT_REGISTRATION_SECRET=paste-your-generated-secret-here

# Database (can use Docker defaults)
DATABASE_URL=postgresql://setupfactory:setupfactory@localhost:5432/setupfactory

# Redis (can use Docker defaults)
REDIS_URL=redis://localhost:6379

# Bitbucket - UPDATE WITH YOUR REPO!
BITBUCKET_URL=https://bitbucket.org/yourteam/automation-scripts.git
BITBUCKET_USERNAME=your-username
BITBUCKET_APP_PASSWORD=your-app-password

# Jira - UPDATE IF YOU WANT JIRA INTEGRATION
JIRA_URL=https://yourcompany.atlassian.net
JIRA_USERNAME=youruser@yourcompany.com
JIRA_API_TOKEN=your-jira-api-token

# For testing, you can leave Vault and Kerberos commented out
```

### 5. Start Infrastructure (PostgreSQL & Redis)

```bash
# Start database and cache
docker-compose up -d postgres redis

# Wait a few seconds for services to start
sleep 5

# Check they're running
docker-compose ps
```

### 6. Initialize Database

```bash
# Option A: Use Makefile
make db-setup

# Option B: Manual
cd api
npm install  # If not done already
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### 7. Prepare Test Scripts Directory

**IMPORTANT: Where to put your test scripts!**

```bash
# Create scripts directory
mkdir -p /var/lib/setup-factory/scripts

# Copy example scripts to test location
cp -r scripts-repo-example/manifests /var/lib/setup-factory/scripts/
cp -r scripts-repo-example/scripts /var/lib/setup-factory/scripts/

# Verify structure
ls -la /var/lib/setup-factory/scripts/
# Should see:
# manifests/
# scripts/
```

**Alternative (if /var/lib needs sudo):**

```bash
# Use local directory
mkdir -p $HOME/setup-factory-data/scripts
cp -r scripts-repo-example/manifests $HOME/setup-factory-data/scripts/
cp -r scripts-repo-example/scripts $HOME/setup-factory-data/scripts/

# Update .env to point to this location
# Add this line to your .env:
SCRIPTS_REPO_PATH=$HOME/setup-factory-data/scripts
```

### 8. Start the Application

**Option A: All services with Docker Compose**
```bash
docker-compose up -d
docker-compose logs -f  # Watch logs
```

**Option B: Development mode (recommended for testing)**
```bash
# Keep infrastructure running in Docker
docker-compose up -d postgres redis

# In separate terminals (or use make dev):

# Terminal 1 - API
cd api
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Worker
cd worker
npm run dev

# OR use one command (requires 'concurrently' package):
make dev
```

### 9. Access the Application

Open your browser:

- **Frontend (Main UI)**: http://localhost:3000
- **API (Health Check)**: http://localhost:3001/health
- **BullMQ Dashboard**: http://localhost:3002

You should see the Setup-Factory home page!

### 10. Test with Example Scripts

**Sync scripts from your directory:**

```bash
# Trigger script sync (or wait for auto-sync on startup)
curl -X POST http://localhost:3001/api/scripts/sync
```

**Run your first test:**

1. **Open the UI**: http://localhost:3000
2. **Navigate to Scripts**: You should see `repro_deploy_example` in the list
3. **Click the script** to open the execution form
4. **Fill parameters**:
   - `target_server`: test-server.example.com
   - `app_version`: 1.2.3
   - `environment`: staging
5. **Click "Execute Script"** button
6. **Monitor execution**: Go to Jobs page to see progress
7. **Download results**: Once complete, download the reproduction bundle (ZIP with logs, screenshots, environment snapshot)

**View in BullMQ Dashboard:**
- Navigate to http://localhost:3002
- Watch job progress in real-time
- See completed/failed jobs

### 11. Adding Your Own Scripts

**To add new test scripts:**

```bash
# Navigate to scripts directory
cd /var/lib/setup-factory/scripts
# (or wherever you configured SCRIPTS_REPO_PATH)

# Create manifest file
nano manifests/my_test_script.yaml
```

**Manifest example:**
```yaml
id: my_test_script
name: "My Test Automation"
description: "Tests my functionality"
category: deployment
runner: powershell  # or: python, bash

parameters:
  - id: server
    label: "Target Server"
    type: string
    required: true
    placeholder: "server.example.com"

capture:
  screenshots: true
  logs: true
  artifacts:
    - "C:\\Logs\\*.log"
    - "C:\\Temp\\output.txt"

script_path: "scripts/my_test_script.ps1"
estimated_duration: "5m"
```

**Create the script:**
```bash
nano scripts/my_test_script.ps1
```

**PowerShell example:**
```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$server
)

Write-Host "Testing connection to $server..."
Test-Connection -ComputerName $server -Count 2

# Your automation logic here
Write-Host "Test completed successfully!"
```

**Sync to load new script:**
```bash
curl -X POST http://localhost:3001/api/scripts/sync
# Refresh browser - your new script appears!
```

### 12. Setting Up Windows Agent (Optional)

For running scripts with **local Windows credentials** (preferred for corporate environments):

**On Windows machine:**
```powershell
# Clone repo (or just copy agent/ folder)
cd setup-factory\agent

# Install Python dependencies
pip install -r requirements.txt

# Configure
copy config.yaml.example config.yaml
notepad config.yaml
```

**Edit config.yaml:**
```yaml
api:
  url: http://your-server-ip:3001
  registration_secret: paste-AGENT_REGISTRATION_SECRET-from-env

agent:
  name: win-agent-01
  tags:
    - windows
    - production
```

**Run agent:**
```powershell
python agent.py --config config.yaml

# Should see:
# Agent 'win-agent-01' registered successfully
# Agent started, polling for jobs...
```

**Back in UI**: Agent now appears in Agents page and can be selected as execution target!

---

## Testing Checklist

After setup, verify everything works:

- [ ] Frontend loads at http://localhost:3000
- [ ] API health check returns `{"status":"healthy"}` at http://localhost:3001/health
- [ ] Database contains `Script`, `Job`, `User` tables: `make db-studio`
- [ ] Example scripts appear in UI after sync
- [ ] Can execute `repro_deploy_example` script successfully
- [ ] Job appears in Jobs page with status updates
- [ ] Can download reproduction bundle (ZIP file)
- [ ] BullMQ dashboard shows job history at http://localhost:3002
- [ ] (Optional) Windows agent registers and accepts jobs

---

## Development Workflow

### Run in Development Mode

```bash
# Each service in its own terminal
# API
cd api
npm run dev

# Frontend
cd frontend  
npm run dev

# Worker
cd worker
npm run dev
```

### Watch Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
```

### Database Operations

```bash
# Create migration
cd api
npx prisma migrate dev --name your_migration_name

# View database
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Sync Scripts

Manually trigger script sync:
```bash
curl -X POST http://localhost:3001/api/admin/sync-scripts
```

## Testing the Platform

### 1. Browse Scripts

- Navigate to http://localhost:3000
- Click "Scripts" in the navigation
- Click "Sync from Bitbucket" if scripts list is empty

### 2. Run a Script

- Click on "Repro: Deploy Example (SSH)"
- Fill in parameters:
  - **host**: your-test-server.example.com
  - **user**: your-username
  - **template**: (optional)
- Choose execution target:
  - **Agent**: Uses local SSH keys (requires agent running)
  - **Server**: Uses Vault credentials (requires Vault configured)
- Click "Continue" to preview
- Click "Execute Job"

### 3. Monitor Execution

- Watch live logs streaming
- View job status updates
- Check artifacts collected

### 4. Download Reproduction Bundle

- Click "Download Bundle" after job completes
- Bundle includes:
  - Script source
  - Manifest
  - Parameters used
  - Execution logs
  - Environment snapshot
  - Collected artifacts

### 5. Create Jira Issue

- Click "Create Jira Issue"
- Bundle is automatically attached
- Issue link is displayed

## Troubleshooting

### Services won't start

```bash
# Check Docker status
docker-compose ps

# View detailed logs
docker-compose logs api
docker-compose logs worker

# Restart services
docker-compose restart
```

### Database connection errors

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection string in .env
echo $DATABASE_URL

# Restart PostgreSQL
docker-compose restart postgres
```

### Scripts not syncing

- Verify `BITBUCKET_URL`, `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD` in `.env`
- Check API logs: `docker-compose logs api | grep sync`
- Manually trigger: `curl -X POST http://localhost:3001/api/admin/sync-scripts`
- Verify network connectivity to Bitbucket

### Agent won't register

- Check `AGENT_REGISTRATION_SECRET` matches in agent config and .env
- Verify API URL is accessible from agent host
- Check agent logs: `cat agent/agent.log`
- Test connectivity: `curl http://api-host:3001/health`

### Jobs fail to execute

**Agent mode:**
- Verify agent is registered: check `/agents` page
- Check agent logs for errors
- Verify SSH keys are configured on agent host
- Test SSH manually: `ssh user@target-host`

**Server mode:**
- Check Docker socket is mounted: `/var/run/docker.sock`
- Verify runner image exists: `docker images | grep setup-factory/runner`
- Build runner image: `cd infra/runner-images && docker build -f Dockerfile.runner -t setup-factory/runner:latest .`
- Check worker logs: `docker-compose logs worker`

### TypeScript/Build Errors

```bash
# Reinstall dependencies
cd api && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install  
cd ../worker && rm -rf node_modules && npm install

# Regenerate Prisma client
cd api && npx prisma generate

# Type check
npm run type-check
```

## Production Deployment

For production deployment:

1. **Security**: Change all secrets in `.env` (JWT_SECRET, SESSION_SECRET, etc.)
2. **HTTPS**: Configure reverse proxy (nginx, Traefik) with TLS certificates
3. **Database**: Use managed PostgreSQL (AWS RDS, Azure Database, etc.)
4. **Redis**: Use managed Redis (ElastiCache, Azure Cache, etc.)
5. **Secrets**: Use Vault for credential management
6. **Authentication**: Configure Kerberos/SPNEGO or OIDC properly
7. **Monitoring**: Set up logging aggregation and metrics
8. **Backups**: Regular database backups
9. **Scaling**: Run multiple worker instances for higher throughput

See [README.md](README.md) for detailed production deployment guidance.

## Next Steps

- Read the full [README.md](README.md)
- Review [agent/README-agent.md](agent/README-agent.md) for Windows agent setup
- Check [scripts-repo-example/README.md](scripts-repo-example/README.md) for script authoring
- Explore the example scripts in `scripts-repo-example/`
- Customize the runner images in `infra/runner-images/`

## Getting Help

- Check logs first: `docker-compose logs -f`
- Review error messages in the UI
- Check the API health endpoint: `curl http://localhost:3001/health`
- Verify environment configuration in `.env`

## Clean Up

To stop and remove all containers:

```bash
# Stop services
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```
