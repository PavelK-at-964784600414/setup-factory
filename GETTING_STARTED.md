# Setup-Factory Quick Start Guide

This guide will help you get Setup-Factory running locally for development and testing.

## Prerequisites

Ensure you have the following installed:

- **Node.js 18+** and npm
- **Python 3.10+**
- **Docker** and **Docker Compose**
- **Git**
- **PostgreSQL 14+** (or use Docker)
- **Redis 7+** (or use Docker)

For Windows development, also install:
- **PowerShell 7+**
- **Windows Terminal** (recommended)

## Quick Start with Docker Compose

### 1. Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd setup-factory

# Copy environment template
cp .env.example .env

# Edit .env with your settings (at minimum, set secrets)
# Required changes:
# - JWT_SECRET (generate with: openssl rand -hex 32)
# - SESSION_SECRET
# - BITBUCKET_URL and credentials
# - JIRA_URL and credentials
# - AGENT_REGISTRATION_SECRET
```

### 2. Start Infrastructure Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be healthy
docker-compose ps
```

### 3. Initialize Database

```bash
cd api
npm install
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### 4. Start All Services

```bash
# Start all services (API, Frontend, Worker)
docker-compose up -d

# View logs
docker-compose logs -f

# Or start individually for development:
# Terminal 1 - API
cd api && npm install && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm install && npm run dev

# Terminal 3 - Worker
cd worker && npm install && npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **BullMQ Dashboard**: http://localhost:3002 (queue monitoring)

### 6. Set Up Scripts Repository

```bash
# Option A: Use the example scripts
cp -r scripts-repo-example /var/lib/setup-factory/scripts

# Option B: Clone from Bitbucket (configured in .env)
# The API will auto-sync on startup if configured correctly
```

### 7. Register an Agent (Optional)

For agent-based execution (uses local Windows credentials):

```bash
# On Windows host
cd agent
pip install -r requirements.txt

# Configure agent
cp config.yaml.example config.yaml
# Edit config.yaml with API URL and registration secret

# Run agent
python agent.py --config config.yaml
```

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
