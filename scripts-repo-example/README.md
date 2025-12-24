# Example Scripts Repository

This directory contains example automation scripts and their manifest files for Setup-Factory.

## Structure

```
scripts-repo-example/
├── manifests/           # YAML manifests describing scripts
│   └── repro_deploy_example.yaml
└── scripts/            # Actual automation scripts
    ├── repro_deploy_example.ps1    # PowerShell version
    └── repro_deploy_example.py     # Python version
```

## Manifest Format

Each script must have a corresponding YAML manifest in the `manifests/` directory:

```yaml
id: unique-script-id
name: "Human Readable Name"
description: "What this script does"
repo: "bitbucket.org/yourteam/automation-scripts.git"
path: "scripts/script_file.ps1"
default_runner: "agent"  # or "server"
parameters:
  - name: param_name
    type: string  # string, number, boolean, select
    title: "Parameter Label"
    description: "Help text"
    required: true
capture:
  env_snapshot: true
  collect_files:
    - "/path/to/log/file.log"
```

## Adding New Scripts

1. Create your automation script (PowerShell, Python, or shell)
2. Place it in the `scripts/` directory
3. Create a corresponding manifest in `manifests/`
4. Commit and push to Bitbucket
5. Setup-Factory will automatically sync via webhook or manual trigger

## Example Scripts

### repro_deploy_example

Demonstrates reproducing a deployment issue:
- Connects to remote host via SSH
- Deploys configuration
- Simulates a failure
- Collects artifacts (logs, system info)

Available in both PowerShell (.ps1) and Python (.py) versions.

## Testing Scripts Locally

Before committing, test your scripts locally:

```powershell
# PowerShell
.\scripts\repro_deploy_example.ps1 -host server.example.com -user myuser

# Python
python scripts/repro_deploy_example.py -host server.example.com -user myuser
```

## Best Practices

1. **Idempotent**: Scripts should be safe to run multiple times
2. **Logging**: Output detailed logs for debugging
3. **Artifacts**: Collect relevant files/logs for reproduction bundles
4. **Parameters**: Use clear parameter names and descriptions
5. **Error Handling**: Proper exit codes and error messages
6. **Documentation**: Comment your scripts well
7. **Credentials**: Never hardcode credentials - use agent's local credentials

## Syncing with Setup-Factory

### Manual Sync

Trigger sync from the Setup-Factory UI or API:
```bash
curl -X POST http://setup-factory:3001/api/admin/sync-scripts
```

### Automatic Sync (Webhook)

Configure Bitbucket webhook:
- URL: `http://setup-factory:3001/api/webhooks/bitbucket`
- Events: Push, Pull Request Merged
- Secret: Set `BITBUCKET_WEBHOOK_SECRET` in `.env`
