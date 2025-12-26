# Windows Development Setup Guide

Quick guide to get Setup-Factory running on Windows in development mode.

## Prerequisites

Ensure you have installed:
- ✅ Node.js 18+ ([Download](https://nodejs.org/))
- ✅ Docker Desktop ([Download](https://www.docker.com/products/docker-desktop/))
- ✅ Git ([Download](https://git-scm.com/download/win))

## One-Command Setup

Open PowerShell in the project directory and run:

```powershell
.\dev-setup.ps1
```

This script will:
1. ✓ Check prerequisites (Node.js, Docker)
2. ✓ Create `.env` file with generated secrets
3. ✓ Install all npm dependencies (api, frontend, worker)
4. ✓ Start PostgreSQL and Redis via Docker
5. ✓ Initialize the database with Prisma
6. ✓ Create helper scripts (`start-dev.bat`, `stop-dev.bat`)
7. ✓ Start all services in separate terminal windows

## Manual Setup (Alternative)

If you prefer to do it manually:

### 1. Install Dependencies

```powershell
cd api
npm install
cd ..\frontend
npm install
cd ..\worker
npm install
cd ..
```

### 2. Configure Environment

```powershell
# Copy template
copy .env.example .env

# Generate secrets and edit .env
notepad .env
```

### 3. Start Infrastructure

```powershell
docker-compose up -d postgres redis
```

### 4. Initialize Database

```powershell
cd api
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### 5. Start Services

Open 3 separate PowerShell/CMD windows:

**Terminal 1 - API:**
```powershell
cd api
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

**Terminal 3 - Worker:**
```powershell
cd worker
npm run dev
```

## Daily Usage

After initial setup, you only need to run:

```powershell
# Start all services
.\start-dev.bat

# Stop all services (when done)
.\stop-dev.bat
```

## Access Points

Once running:
- **Frontend (Main UI)**: http://localhost:3000
- **API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health
- **BullMQ Dashboard**: http://localhost:3002

## Scripts Directory

Your automation scripts should be in one of these locations:

**Option 1: Use example scripts (default)**
```
setup-factory\scripts-repo-example\
  ├── manifests\
  │   └── repro_deploy_example.yaml
  └── scripts\
      ├── repro_deploy_example.ps1
      └── repro_deploy_example.py
```

**Option 2: Point to your scripts folder**

Edit `.env` and set:
```env
SCRIPTS_REPO_PATH=C:\path\to\your\automation-scripts
```

Your scripts folder should have this structure:
```
your-scripts\
  ├── manifests\        # YAML manifest files
  │   └── my_script.yaml
  └── scripts\          # Actual scripts
      └── my_script.ps1
```

## Testing the Setup

1. **Sync Scripts**
   ```powershell
   curl http://localhost:3001/api/scripts/sync -Method POST
   ```

2. **Open UI**
   - Navigate to http://localhost:3000
   - You should see your scripts listed

3. **Run Example Script**
   - Click on "Repro Deploy Example"
   - Fill in the parameters
   - Click "Execute Script"
   - Monitor in Jobs page or BullMQ dashboard

## Troubleshooting

### PowerShell Execution Policy

If you get "cannot be loaded because running scripts is disabled":

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Port Already in Use

If ports 3000, 3001, or 3002 are taken:

```powershell
# Find what's using the port
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Docker Not Running

Ensure Docker Desktop is running:
- Check system tray for Docker icon
- Right-click → "Open Docker Desktop"
- Wait for "Docker Desktop is running" status

### Database Connection Issues

```powershell
# Reset database
docker-compose down -v
docker-compose up -d postgres redis
cd api
npx prisma migrate dev --name init
```

## Next Steps

- Read [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed documentation
- Read [README.md](./README.md) for architecture overview
- Add your own scripts to the scripts directory
- Configure Bitbucket/Jira integration in `.env`

## Quick Command Reference

```powershell
# Setup (first time only)
.\dev-setup.ps1

# Start services
.\start-dev.bat

# Stop services
.\stop-dev.bat

# View Docker logs
docker-compose logs -f postgres redis

# Stop Docker services
docker-compose down

# Restart everything
.\stop-dev.bat
docker-compose down
docker-compose up -d postgres redis
.\start-dev.bat

# Database management
cd api
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Create new migration
npx prisma generate        # Regenerate Prisma client
```

---

**Happy coding! 🚀**
