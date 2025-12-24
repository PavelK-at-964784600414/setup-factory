# Setup-Factory Project Structure

This document provides an overview of the complete project structure.

## Directory Layout

```
setup-factory/
├── README.md                          # Main documentation
├── GETTING_STARTED.md                 # Quick start guide
├── .env.example                       # Environment configuration template
├── .gitignore                         # Git ignore rules
├── docker-compose.yml                 # Docker Compose orchestration
├── Makefile                          # Common commands
├── package.json                       # Root package for scripts
│
├── frontend/                          # Next.js Frontend (TypeScript)
│   ├── app/                          # Next.js 14 app directory
│   │   ├── layout.tsx                # Root layout with navigation
│   │   ├── page.tsx                  # Home page
│   │   ├── providers.tsx             # React Query provider
│   │   ├── globals.css               # Global styles (Tailwind)
│   │   ├── scripts/
│   │   │   ├── page.tsx              # Scripts list page
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Script execution page
│   │   ├── jobs/                     # Job history pages
│   │   ├── dashboard/                # Dashboard page
│   │   └── agents/                   # Agents status page
│   ├── components/
│   │   ├── Navigation.tsx            # Main navigation component
│   │   └── FormRenderer.tsx          # Dynamic form from manifest
│   ├── lib/
│   │   └── api.ts                    # Axios API client
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── next.config.js
│
├── api/                               # Node.js API Server (Fastify + TypeScript)
│   ├── src/
│   │   ├── server.ts                 # Main server entry point
│   │   ├── lib/
│   │   │   ├── database.ts           # Prisma client
│   │   │   └── logger.ts             # Winston logger
│   │   ├── routes/
│   │   │   ├── scripts.ts            # GET /api/scripts
│   │   │   ├── jobs.ts               # POST /api/jobs, logs, bundles
│   │   │   ├── agents.ts             # Agent registration, heartbeat
│   │   │   ├── admin.ts              # Sync, metrics
│   │   │   └── auth.ts               # Login, auth endpoints
│   │   └── services/
│   │       ├── scriptService.ts      # Read manifests, scripts
│   │       ├── jobService.ts         # Job queue, execution
│   │       ├── gitSync.ts            # Bitbucket sync
│   │       ├── jira.ts               # Jira issue creation
│   │       ├── reproBundle.ts        # Create reproduction bundles
│   │       ├── secrets.ts            # Vault, Credential Manager
│   │       └── auth.ts               # Kerberos, OIDC auth
│   ├── prisma/
│   │   └── schema.prisma             # Database schema
│   ├── package.json
│   └── tsconfig.json
│
├── worker/                            # BullMQ Worker (TypeScript)
│   ├── src/
│   │   ├── worker.ts                 # Main worker entry point
│   │   ├── runners/
│   │   │   ├── serverRunner.ts       # Docker container execution
│   │   │   └── agentRunner.ts        # Dispatch to agents
│   │   └── lib/
│   │       └── logger.ts             # Winston logger
│   ├── package.json
│   └── tsconfig.json
│
├── agent/                             # Python Agent for Windows
│   ├── agent.py                      # Main agent application
│   ├── requirements.txt              # Python dependencies
│   ├── config.yaml.example           # Agent configuration template
│   └── README-agent.md               # Windows installation guide
│
├── scripts-repo-example/              # Example Scripts Repository
│   ├── README.md                     # Scripts authoring guide
│   ├── manifests/
│   │   └── repro_deploy_example.yaml # Example manifest
│   └── scripts/
│       ├── repro_deploy_example.ps1  # PowerShell example
│       └── repro_deploy_example.py   # Python example
│
└── infra/                             # Infrastructure & Docker
    ├── Dockerfile.api                # API production image
    ├── Dockerfile.frontend           # Frontend production image
    ├── Dockerfile.worker             # Worker production image
    └── runner-images/
        ├── README.md                 # Runner image documentation
        ├── Dockerfile.runner         # Base runner image
        └── entrypoint.sh             # Runner entry point script
```

## Key Components

### Frontend (Next.js + TypeScript)
- **Technology**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Features**: 
  - Script browser and execution UI
  - Dynamic form rendering from manifests
  - Live log streaming (SSE/WebSocket)
  - Job history and filtering
  - Reproduction bundle download
  - Dashboard with metrics
  - Agent status monitoring

### API Server (Node.js + Fastify)
- **Technology**: Fastify, TypeScript, Prisma, BullMQ
- **Features**:
  - RESTful API for all resources
  - Kerberos/SPNEGO authentication
  - OIDC fallback authentication
  - Bitbucket webhook integration
  - Job queue management
  - Jira integration
  - Vault secrets management

### Worker (BullMQ)
- **Technology**: Node.js, TypeScript, BullMQ, Docker
- **Features**:
  - Processes job queue
  - Server-run mode: Launches Docker containers
  - Agent mode: Dispatches to Windows agents
  - Artifact collection
  - Log streaming

### Agent (Python)
- **Technology**: Python 3.10+
- **Features**:
  - Runs on Windows hosts
  - Uses local credentials (SSH keys, Kerberos, Credential Manager)
  - Environment snapshot capture
  - Job execution and reporting
  - Windows Service support via NSSM

### Database (PostgreSQL)
- **Schema**:
  - Users, Scripts, Jobs, Agents, AuditLog
  - Full audit trail
  - Job metadata and results

## Data Flow

### Script Execution Flow

1. **User selects script** in Frontend
2. **Frontend fetches manifest** from API (`GET /api/scripts/:id/schema`)
3. **User fills parameters** in dynamic form
4. **User clicks Execute**
5. **Frontend creates job** (`POST /api/jobs`)
6. **API adds job to queue** (BullMQ/Redis)
7. **Worker picks up job**
8. **Worker routes to runner**:
   - **Server mode**: Launches Docker container
   - **Agent mode**: Sends task to Windows agent
9. **Execution happens** with local/Vault credentials
10. **Logs stream** back to API and Frontend
11. **Artifacts collected** and stored
12. **Job completes** with status
13. **User downloads bundle** or creates Jira ticket

### Script Sync Flow

1. **Manual trigger** or **Bitbucket webhook** fires
2. **API calls gitSync service**
3. **Service clones/pulls** from Bitbucket
4. **Manifests parsed** from YAML files
5. **Database updated** with script metadata
6. **Frontend refreshes** script list

## Authentication Flow

### Kerberos/SPNEGO (Primary)
1. User's browser has Kerberos ticket (SSO)
2. Browser sends `Negotiate` header with ticket
3. API validates ticket against KDC
4. User authenticated, JWT issued
5. JWT used for subsequent requests

### OIDC (Fallback)
1. User redirects to OIDC provider (Azure AD, Okta)
2. User authenticates with provider
3. Provider redirects back with token
4. API validates token
5. User authenticated, JWT issued

### Agent Registration
1. Agent starts with `registration_secret`
2. Agent calls `POST /api/agents/register`
3. API verifies secret
4. Agent ID issued
5. Agent sends periodic heartbeats

## Security Model

### Agent Mode (Recommended)
- **Credentials**: Local to agent host (SSH keys, Kerberos tickets, Windows Credential Manager)
- **Network**: Agent connects outbound to API
- **Isolation**: Each agent runs in its own context
- **Benefits**: No credentials leave the host, uses existing SSO

### Server Mode
- **Credentials**: Vault-injected ephemeral credentials
- **Network**: Isolated Docker network
- **Isolation**: Ephemeral containers, auto-removed
- **Benefits**: Centralized execution, consistent environment

## Configuration

### Environment Variables (.env)
- **Application**: Ports, concurrency, timeouts
- **Database**: PostgreSQL connection string
- **Redis**: Queue and cache connection
- **Bitbucket**: Repository URL, credentials, webhook secret
- **Jira**: API URL, credentials, project key
- **Vault**: Address, token, secret path
- **Kerberos**: Realm, KDC, keytab
- **OIDC**: Issuer, client ID/secret
- **Security**: JWT secret, session secret, CORS origins

### Script Manifests (YAML)
- **Metadata**: ID, name, description, repo, path
- **Parameters**: Name, type, title, description, required
- **Runner**: Default agent or server
- **Capture**: Environment snapshot, artifact files

## Deployment Options

### Development
- Docker Compose for infrastructure (PostgreSQL, Redis)
- Services run directly with `npm run dev`
- Hot reload for all services

### Production
- Full Docker Compose deployment
- Or Kubernetes with Helm charts
- External managed database and Redis
- Multiple worker instances for scaling
- Reverse proxy with TLS (nginx, Traefik)

## Extension Points

### Add New Authentication Provider
- Implement in `api/src/services/auth.ts`
- Add to authentication chain in `authenticateRequest()`

### Add New Secret Source
- Implement in `api/src/services/secrets.ts`
- Extend `getSecret()` with new source type

### Add Custom Runner Images
- Create Dockerfile in `infra/runner-images/`
- Build and tag: `docker build -t setup-factory/runner-custom:latest .`
- Configure in manifest: `runner_image: setup-factory/runner-custom:latest`

### Add Custom Artifact Collectors
- Extend manifest `capture` section
- Implement collection in runner or agent
- Bundle in reproduction package

### Add Notifications
- Create service in `api/src/services/notifications.ts`
- Hook into job status changes
- Support email, Slack, Teams, etc.

## Monitoring & Observability

### Logs
- **Structured JSON logs** from all services
- **Winston logger** with configurable levels
- **Docker logs**: `docker-compose logs -f`
- **Production**: Forward to ELK, Splunk, CloudWatch

### Metrics
- **BullMQ Dashboard**: Queue depth, job stats
- **Health endpoints**: `/health` for all services
- **Custom metrics**: Prometheus (optional)

### Audit Trail
- All actions logged to `AuditLog` table
- User, action, resource, timestamp, details
- File audit log: `AUDIT_LOG_PATH`

## Testing

### Unit Tests
- TODO: Add Jest/Vitest tests for services
- TODO: Add React Testing Library for components

### Integration Tests
- TODO: Add API integration tests
- TODO: Add end-to-end tests with Playwright

### Manual Testing
- Use example scripts in `scripts-repo-example/`
- Test both agent and server modes
- Verify reproduction bundles
- Test Jira integration

## Future Enhancements

- [ ] Real-time WebSocket for logs (currently SSE)
- [ ] Script versioning and rollback
- [ ] Job scheduling and cron
- [ ] Multi-tenancy and RBAC
- [ ] API rate limiting
- [ ] Script template library
- [ ] Diff viewer for environment changes
- [ ] Historical reproduction comparison
- [ ] Custom dashboard widgets
- [ ] Plugin system for extensions

## Support & Contributing

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Contributions**: PRs welcome, follow existing code style
- **Documentation**: Keep README and inline docs updated
- **Testing**: Add tests for new features

## License

MIT License - See LICENSE file for details
