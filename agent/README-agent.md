# Setup-Factory Agent - Windows Installation Guide

The Setup-Factory Agent runs on Windows hosts and executes automation scripts using local credentials (SSH keys, Windows Credential Manager, Kerberos tickets).

## Prerequisites

- **Windows 10/11** or **Windows Server 2019+**
- **Python 3.10+** (from python.org, not Microsoft Store)
- **PowerShell 7+** (for .ps1 script execution)
- **Network access** to Setup-Factory API server

## Installation Steps

### 1. Install Python

Download and install Python from [python.org](https://www.python.org/downloads/):

```powershell
# Verify installation
python --version
```

### 2. Install PowerShell 7+

```powershell
# Install via winget (Windows 10+)
winget install Microsoft.PowerShell

# Or download from https://github.com/PowerShell/PowerShell/releases
```

### 3. Clone or Download Agent

```powershell
# Navigate to installation directory
cd C:\setup-factory

# Copy agent files
# - agent.py
# - requirements.txt
# - config.yaml.example
```

### 4. Install Dependencies

```powershell
# Create virtual environment (optional but recommended)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### 5. Configure Agent

```powershell
# Copy example config
Copy-Item config.yaml.example config.yaml

# Edit config.yaml with your settings
notepad config.yaml
```

Required configuration:
```yaml
api_url: http://your-setup-factory-server:3001
name: my-windows-agent
registration_secret: your-agent-secret-here  # Get from admin
heartbeat_interval: 30
job_timeout: 3600

# Output sanitization - removes sensitive data from logs
sanitize_output: true  # Set to false to disable sanitization
sanitize_patterns: []  # Custom regex patterns (optional)
```

### 6. Register Agent

Run the agent once to register with the server:

```powershell
python agent.py --config config.yaml
```

The agent will:
1. Register with the API server
2. Send periodic heartbeats
3. Poll for jobs
4. Execute scripts using local credentials
5. Report results back to the server

## Running as Windows Service

To run the agent as a Windows Service, use NSSM (Non-Sucking Service Manager):

### Install NSSM

```powershell
# Via winget
winget install nssm

# Or download from https://nssm.cc/download
```

### Create Service

```powershell
# Install service
nssm install SetupFactoryAgent "C:\setup-factory\venv\Scripts\python.exe" "C:\setup-factory\agent.py --config C:\setup-factory\config.yaml"

# Set working directory
nssm set SetupFactoryAgent AppDirectory "C:\setup-factory"

# Set service to auto-start
nssm set SetupFactoryAgent Start SERVICE_AUTO_START

# Start service
nssm start SetupFactoryAgent

# Check status
nssm status SetupFactoryAgent
```

## Credentials Setup

The agent uses **local Windows credentials** for SSH and remote connections:

### SSH Keys

Ensure SSH keys are available in the standard location:
```
%USERPROFILE%\.ssh\id_rsa
%USERPROFILE%\.ssh\id_rsa.pub
```

### Kerberos Tickets

For Kerberos authentication:
1. Configure `krb5.conf` (or `krb5.ini` on Windows)
2. Obtain ticket: `kinit username@REALM`
3. Agent will use `KRB5CCNAME` environment variable

### Windows Credential Manager

Store credentials in Windows Credential Manager:
```powershell
# Add credential
cmdkey /generic:target-server /user:username /pass:password

# Agent scripts can retrieve using PowerShell:
# $cred = Get-StoredCredential -Target "target-server"
```

## Testing

Test the agent manually before running as a service:

```powershell
# Run in foreground
python agent.py --config config.yaml

# Check logs
Get-Content agent.log -Tail 20 -Wait
```

## Troubleshooting

### Agent won't register
- Check `api_url` is correct and accessible
- Verify `registration_secret` matches server configuration
- Check firewall rules allow outbound HTTP/HTTPS

### Scripts fail to execute
- Ensure PowerShell 7+ is installed and in PATH
- Check script permissions
- Verify SSH keys/Kerberos tickets are valid
- Review `agent.log` for detailed errors

### Service won't start
- Verify Python path in NSSM configuration
- Check working directory is correct
- Review Windows Event Viewer for service errors
- Ensure service account has necessary permissions

## Environment Snapshot

The agent automatically captures environment information for reproducibility:
- OS version
- Python version
- PowerShell version
- Installed Python packages
- Relevant environment variables (PATH, KRB5CCNAME, etc.)

This snapshot is included in reproduction bundles for debugging.

## Output Sanitization

The agent can automatically sanitize sensitive information from script output before logging or sending to the server:

### Default Behavior

When `sanitize_output: true` (default), the agent automatically redacts:
- **Credentials**: Passwords (password, passwd, pwd)
- **Authentication**: API keys, tokens, Bearer tokens
- **Cloud**: AWS credentials
- **Keys**: SSH private keys
- **Secrets**: Generic secrets
- **Network**: IP addresses (including private ranges), internal hostnames/FQDNs
- **Paths**: Windows file paths (C:\...), Unix paths (/home/..., /var/...), UNC paths (\\\\server\...)
- **Databases**: Connection strings, database names, server names
- **URLs**: Internal URLs with private domains or IPs

### Configuration

```yaml
# Disable sanitization (not recommended for production)
sanitize_output: false

# Add custom patterns (regex)
sanitize_patterns:
  - 'database_connection_string=.*'
  - 'custom_secret_key=.*'
  - 'organization_name=.*'
```

### Example

Input:
```
Connecting with password=MySecret123
Server IP: 192.168.1.100
Database: Server=sql-prod.internal;Database=CustomerDB
Accessing C:\Program Files\MyApp\config.ini
API_KEY=abc123xyz789
```

Sanitized output:
```
Connecting with password=***REDACTED***
Server IP: ***REDACTED***
Database: Server=***REDACTED***;Database=***REDACTED***
Accessing ***REDACTED***
API_KEY=***REDACTED***
```

**Note:** Sanitization helps prevent accidental credential and infrastructure information leakage in logs and reproduction bundles.

## Logs

Agent logs are written to:
- **Console**: Standard output (when running manually)
- **File**: `agent.log` in agent directory
- **API**: Execution logs are streamed to the API server

## Uninstall

```powershell
# Stop and remove service
nssm stop SetupFactoryAgent
nssm remove SetupFactoryAgent confirm

# Remove agent files
Remove-Item -Recurse -Force C:\setup-factory
```

## Security Notes

- Agent uses **local credentials only** - no credentials are sent to the server
- All job parameters and results are transmitted over HTTP (use HTTPS in production)
- Agent registration requires a shared secret
- Consider running agent service under a dedicated service account
- Regularly rotate SSH keys and Kerberos tickets
- Review and audit agent logs regularly

## Support

For issues or questions:
- Check `agent.log` for detailed error messages
- Review Setup-Factory API server logs
- Consult the main README.md
- Contact your DevOps team
