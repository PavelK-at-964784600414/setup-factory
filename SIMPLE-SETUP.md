# Simple Setup - No Docker Required!

Quick setup for local development using SQLite and npm only.

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- That's it! No Docker needed for basic testing.

## Quick Start (5 minutes)

### 1. Clone and Install

```powershell
git clone <your-repo-url>
cd setup-factory

# Install all dependencies at once
npm install
cd api && npm install && cd ..
cd frontend && npm install && cd ..
cd worker && npm install && cd ..
```

### 2. Setup Environment

```powershell
# Copy the simple config
copy .env.local .env

# Edit .env and set the secrets
notepad .env
```

Generate secrets in PowerShell:
```powershell
# Run this 3 times to get 3 different secrets
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Paste the secrets into `.env` for:
- `JWT_SECRET`
- `SESSION_SECRET`
- `AGENT_REGISTRATION_SECRET`

### 3. Initialize Database

```powershell
cd api
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

This creates a `dev.db` file in the api folder - no PostgreSQL needed!

### 4. Start Services

Open 3 separate PowerShell windows:

**Window 1 - API:**
```powershell
cd api
npm run dev
```

**Window 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

**Window 3 - Worker:**
```powershell
cd worker
npm run dev
```

### 5. Test It!

Open browser: http://localhost:3000

The example scripts should be visible and ready to run!

## Troubleshooting

### Prisma errors

```powershell
cd api
rm -rf node_modules/.prisma
npx prisma generate
```

### Port already in use

```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

### Reset database

```powershell
cd api
rm dev.db
npx prisma migrate dev --name init
```

## What's Different?

**Simple Setup (this guide):**
- ✅ SQLite database (file-based)
- ✅ In-memory job queue
- ✅ Just npm, no Docker
- ✅ Perfect for testing/development

**Full Setup (README.md):**
- PostgreSQL in Docker
- Redis for job queue
- Production-like setup
- Use this when deploying

## Adding Scripts

Your scripts go in: `scripts-repo-example/`

Structure:
```
scripts-repo-example/
  manifests/
    my_script.yaml
  scripts/
    my_script.ps1
```

The API automatically loads scripts from this folder on startup!

---

**Need the full Docker setup?** See [GETTING_STARTED.md](GETTING_STARTED.md)
