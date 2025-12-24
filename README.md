# Setup-Factory

**One-line:** Setup-Factory helps engineers reproduce automation and customer-facing bugs quickly — run existing scripts with the exact parameters, capture environment and artifacts, and create reproducible traces for debugging and Jira tickets.

## Purpose

Setup-Factory is a centralized automation platform and web UI designed to help engineers and support teams **quickly reproduce bugs** observed in automation or reported by customers. It provides:

- **Fast Reproduction**: Pick a script, fill parameters, choose execution target (agent/server), capture logs/artifacts, and produce an exportable reproducible bundle (scripts + parameters + environment metadata + logs).
- **Secure Credentials**: Prefers agent execution mode which uses local SSH keys/Kerberos tickets; server-run mode only when safe and using Vault/short-lived credentials.
- **Version Control**: Syncs scripts from Bitbucket; always know which commit was used to reproduce issues.
- **Audit & Integration**: Provides reporting, audit trails, and Jira hooks to create issues with attachments from failed reproductions.

## Goals

1. **Make reproduction fast**: Select a script, configure parameters, run on target (agent or server), capture logs/artifacts, and produce an exportable reproducible bundle
2. **Keep credentials safe**: Prefer agent execution (uses local SSH keys/Kerberos tickets); server-run only when safe and when using Vault/short-lived credentials
3. **Centralize versions**: Sync scripts from Bitbucket; always know which commit was used to reproduce
4. **Provide audit/reporting**: Jira hooks to create issues with attachments from failed reproductions

## Architecture Summary

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Frontend   │────▶│   API        │────▶│  Worker     │
│  (Next.js)  │     │  (Node.js)   │     │  (BullMQ)   │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                    │
                            ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  PostgreSQL  │     │   Redis     │
                    └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  Bitbucket   │     │   Agent     │
                    │  (Scripts)   │     │  (Windows)  │
                    └──────────────┘     └─────────────┘
```

### Components

- **Frontend** (Next.js + TypeScript): Script browser, job execution UI, live logs, history, dashboard, reproduction bundle download
- **API** (Node.js + Fastify): REST API for scripts, jobs, auth (Kerberos/OIDC), Bitbucket sync, Jira integration
- **Worker** (BullMQ + Redis): Job queue processor, triggers server-run containers or dispatches to agents
- **Agent** (Python): Runs on Windows hosts, uses local credentials (SSH keys, Kerberos tickets, Windows Credential Manager), executes jobs, streams logs
- **Scripts Repository**: Bitbucket repo containing automation scripts (PowerShell, Python, shell) and their manifest files

## How to Reproduce a Bug (Quick Walkthrough)

1. **Browse Scripts**: Navigate to the Scripts page, find the relevant automation script (e.g., "Repro: Deploy Example")
2. **Configure Parameters**: Fill in required parameters (host, user, template path, etc.)
3. **Choose Execution Mode**:
   - **Agent**: Uses your local credentials (recommended for sensitive operations)
   - **Server**: Runs in isolated container with Vault-injected credentials
4. **Preview Command**: Review the dry-run CLI preview before execution
5. **Execute**: Click "Run" to start the job
6. **Monitor**: Watch live logs in real-time via WebSocket/SSE
7. **Collect Artifacts**: Job automatically captures logs, artifacts, and environment snapshot
8. **Download Bundle**: Get a complete reproduction bundle (zip) containing:
   - Script source + manifest
   - Input parameters
   - Environment snapshot (OS, versions, libs, env vars)
   - Execution logs
   - Collected artifacts
9. **Create Jira Issue**: Optionally create a Jira ticket with the reproduction bundle attached

## Operator Checklist

### Initial Setup

- [ ] Clone repository
- [ ] Copy `.env.example` to `.env` and configure:
  - Bitbucket credentials (app password or OAuth)
  - Jira credentials
  - Vault endpoint (if using server-run mode)
  - Kerberos realm and KDC
  - PostgreSQL and Redis credentials
- [ ] Run `docker-compose up -d` to start services
- [ ] Configure Bitbucket webhook to notify API on script updates
- [ ] Deploy agents to Windows hosts (see `agent/README-agent.md`)

### Script Repository Setup

- [ ] Ensure scripts repo has proper structure:
  ```
  scripts-repo/
  ├── manifests/
  │   └── script_name.yaml
  └── scripts/
      └── script_name.ps1
  ```
- [ ] Each script has a corresponding manifest in YAML format
- [ ] Manifests define parameters, runner preferences, and artifact capture rules

### Security Configuration

- [ ] Configure Kerberos/SPNEGO for API authentication
- [ ] Set up OIDC provider as fallback (Azure AD, Okta, etc.)
- [ ] Configure Vault for server-run credentials
- [ ] Ensure agents use Windows Credential Manager for local secrets
- [ ] Review and lock down API CORS settings
- [ ] Enable audit logging

### Monitoring & Maintenance

- [ ] Monitor job queue depth (BullMQ dashboard)
- [ ] Review failed jobs and reproduction bundles
- [ ] Keep Bitbucket sync healthy (check webhook deliveries)
- [ ] Rotate Vault credentials regularly
- [ ] Update agent versions across Windows hosts
- [ ] Archive old job logs and artifacts

## Development Setup

### Prerequisites

- Node.js 18+ (for API, frontend, worker)
- Python 3.10+ (for agent)
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 7+

### Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd setup-factory

# Copy and configure environment
cp .env.example .env
# Edit .env with your configuration

# Start infrastructure services
docker-compose up -d postgres redis

# Install dependencies
cd frontend && npm install && cd ..
cd api && npm install && cd ..
cd worker && npm install && cd ..
cd agent && pip install -r requirements.txt && cd ..

# Run in development mode
# Terminal 1: API
cd api && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Worker
cd worker && npm run dev

# Terminal 4: Agent (on Windows host)
cd agent && python agent.py --config config.yaml
```

### Windows Development Notes

- Install PowerShell 7+
- Ensure Kerberos client is configured (`krb5.conf`)
- Install Python from python.org (not Microsoft Store)
- Use Windows Credential Manager for storing secrets
- Agent requires elevated privileges for some operations

## API Endpoints

### Scripts
- `GET /api/scripts` - List all scripts
- `GET /api/scripts/:id` - Get script details
- `GET /api/scripts/:id/schema` - Get parameter schema from manifest

### Jobs
- `POST /api/jobs` - Create new job
- `GET /api/jobs` - List jobs (with filters)
- `GET /api/jobs/:id` - Get job details
- `GET /api/jobs/:id/logs` - Stream logs (SSE)
- `GET /api/jobs/:id/bundle` - Download reproduction bundle
- `POST /api/jobs/:id/create-jira` - Create Jira issue from job

### Admin
- `POST /api/admin/sync-scripts` - Trigger Bitbucket sync
- `GET /api/admin/agents` - List registered agents
- `GET /api/admin/metrics` - Get platform metrics

## Manifest Format

Scripts must have a corresponding YAML manifest in the `manifests/` directory:

```yaml
id: repro-deploy-example
name: "Repro: Deploy Example (SSH)"
description: "Demo script to reproduce deployment issues"
repo: "bitbucket.org/yourteam/automation-scripts.git"
path: "scripts/repro_deploy_example.ps1"
default_runner: "agent"  # or "server"
parameters:
  - name: host
    type: string
    title: "Target host"
    required: true
  - name: user
    type: string
    title: "Remote user"
    required: true
  - name: template
    type: string
    title: "YAML template path"
  - name: repro_id
    type: string
    title: "Repro id (autogenerated if blank)"
    required: false
capture:
  - env_snapshot: true
  - collect_files: ["/var/log/myapp.log", "/tmp/output.tar"]
```

## Environment Variables

See `.env.example` for complete configuration. Key variables:

- `BITBUCKET_URL`, `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD`
- `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN`
- `VAULT_ADDR`, `VAULT_TOKEN`
- `KRB5_REALM`, `KRB5_KDC`
- `DATABASE_URL`, `REDIS_URL`
- `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_ISSUER`

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions, please create an issue in the repository or contact the DevOps team.
