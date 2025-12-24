# Runner Images for Server-Run Mode

This directory contains Docker images used for executing jobs in server-run mode.

## Base Runner Image

The base runner image should include:

- **Operating System**: Ubuntu/Debian or your preferred base
- **Python 3.10+**: For Python scripts
- **PowerShell 7+**: For PowerShell scripts (`pwsh`)
- **SSH Client**: For remote connections
- **Common Tools**: `curl`, `wget`, `git`, `jq`, etc.
- **OpenStack/OpenShift CLIs**: If needed for your automation

## Building Runner Images

### Basic Runner (example)

```dockerfile
# Dockerfile.runner
FROM ubuntu:22.04

# Install base packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    openssh-client \
    curl \
    wget \
    git \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install PowerShell
RUN wget -q https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y powershell \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip3 install --no-cache-dir \
    paramiko \
    pyyaml \
    requests

# Create working directory
WORKDIR /workspace

# Entry point script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

### Build and Tag

```bash
cd runner-images
docker build -f Dockerfile.runner -t setup-factory/runner:latest .
docker tag setup-factory/runner:latest setup-factory/runner:1.0
```

### Push to Registry (if using private registry)

```bash
docker tag setup-factory/runner:latest your-registry.com/setup-factory/runner:latest
docker push your-registry.com/setup-factory/runner:latest
```

## Entry Point Script

The entry point should:
1. Read job parameters from environment variables
2. Clone/fetch the script from the scripts repository
3. Execute the script with parameters
4. Capture output and artifacts
5. Report results

Example `entrypoint.sh`:

```bash
#!/bin/bash
set -e

echo "Setup-Factory Runner"
echo "===================="
echo "Job ID: ${JOB_ID}"
echo "Script ID: ${SCRIPT_ID}"
echo "Parameters: ${PARAMETERS}"
echo ""

# Parse parameters from JSON
PARAMS=$(echo "${PARAMETERS}" | jq -r 'to_entries | map("-\(.key) \"\(.value)\"") | join(" ")')

# Execute script (simplified - would fetch from git in production)
SCRIPT_PATH="/workspace/scripts/${SCRIPT_ID}"

if [[ -f "${SCRIPT_PATH}.ps1" ]]; then
    echo "Executing PowerShell script..."
    pwsh "${SCRIPT_PATH}.ps1" ${PARAMS}
elif [[ -f "${SCRIPT_PATH}.py" ]]; then
    echo "Executing Python script..."
    python3 "${SCRIPT_PATH}.py" ${PARAMS}
else
    echo "Error: Script not found: ${SCRIPT_PATH}"
    exit 1
fi
```

## Specialized Runners

You may want different runner images for different use cases:

### Python-Heavy Runner

```dockerfile
FROM python:3.11-slim
# Install OpenStack clients, Ansible, etc.
RUN pip install python-openstackclient ansible
```

### PowerShell-Heavy Runner

```dockerfile
FROM mcr.microsoft.com/powershell:lts-ubuntu-22.04
# Install additional PowerShell modules
RUN pwsh -Command "Install-Module -Name Pester -Force"
```

### OpenShift/Kubernetes Runner

```dockerfile
FROM alpine:latest
RUN apk add --no-cache curl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
RUN install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

## Security Considerations

1. **Minimal Base**: Use slim/alpine base images when possible
2. **No Secrets**: Never bake secrets into images
3. **Vault Integration**: Use Vault for dynamic secrets injection
4. **Ephemeral**: Containers should be short-lived and destroyed after execution
5. **Network Isolation**: Run in isolated network namespace
6. **Resource Limits**: Set CPU/memory limits in docker-compose.yml
7. **Read-Only**: Mount scripts as read-only
8. **User**: Run as non-root user when possible

## Testing Runner Images

Test your runner image locally:

```bash
docker run --rm \
  -e JOB_ID=test-123 \
  -e SCRIPT_ID=repro-deploy-example \
  -e PARAMETERS='{"host":"server.example.com","user":"testuser"}' \
  setup-factory/runner:latest
```

## Image Versioning

- Use semantic versioning: `major.minor.patch`
- Tag `latest` for current stable
- Keep old versions for rollback
- Document changes in CHANGELOG

## Registry Setup

For production, use a private Docker registry:

1. **Docker Hub** (private repos)
2. **AWS ECR**
3. **Azure Container Registry**
4. **Harbor** (self-hosted)
5. **GitLab Container Registry**

Update `RUNNER_IMAGE` in `.env` to point to your registry:
```
RUNNER_IMAGE=your-registry.com/setup-factory/runner:latest
```
