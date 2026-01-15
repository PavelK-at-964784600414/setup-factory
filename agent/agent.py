#!/usr/bin/env python3
"""
Setup-Factory Agent for Windows
Runs automation scripts locally using Windows credentials (SSH keys, Kerberos tickets, Credential Manager)
"""

import sys
import os
import subprocess
import json
import time
import platform
import socket
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import requests
import yaml

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SetupFactoryAgent:
    """Windows Agent for Setup-Factory"""

    def __init__(self, config_path: str = 'config.yaml'):
        """Initialize agent with configuration"""
        self.config = self._load_config(config_path)
        self.agent_id: Optional[str] = None
        self.api_url = self.config.get('api_url', 'http://localhost:3001')
        self.heartbeat_interval = self.config.get('heartbeat_interval', 30)
        self.running = True

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            logger.warning(f"Config file {config_path} not found, using defaults")
            return {}

    def register(self) -> bool:
        """Register agent with API server"""
        try:
            hostname = socket.gethostname()
            agent_name = self.config.get('name', hostname)
            
            logger.info(f"Registering agent {agent_name} with {self.api_url}")
            
            response = requests.post(
                f"{self.api_url}/api/agents/register",
                json={
                    'name': agent_name,
                    'hostname': hostname,
                    'secret': self.config.get('registration_secret', '')
                },
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            self.agent_id = data['id']
            
            logger.info(f"Agent registered successfully with ID: {self.agent_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register agent: {e}")
            return False

    def heartbeat(self) -> bool:
        """Send heartbeat to API server"""
        if not self.agent_id:
            logger.warning("Agent not registered, skipping heartbeat")
            return False

        try:
            response = requests.post(
                f"{self.api_url}/api/agents/{self.agent_id}/heartbeat",
                timeout=5
            )
            response.raise_for_status()
            logger.debug("Heartbeat sent successfully")
            return True
            
        except Exception as e:
            logger.error(f"Heartbeat failed: {e}")
            return False

    def execute_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a job locally"""
        job_id = job_data['jobId']
        script_id = job_data['scriptId']
        parameters = job_data['parameters']

        logger.info(f"Executing job {job_id} for script {script_id}")

        try:
            # Get environment snapshot before execution
            env_snapshot = self._capture_environment_snapshot()

            # Build command
            script_path = f"scripts/{script_id}"  # TODO: Get from manifest
            command = self._build_command(script_path, parameters)

            logger.info(f"Running command: {command}")

            # Execute script
            start_time = time.time()
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=int(self.config.get('job_timeout', 3600))
            )
            duration = time.time() - start_time

            # Sanitize output if enabled
            stdout_sanitized = self._sanitize_output(result.stdout)
            stderr_sanitized = self._sanitize_output(result.stderr) if result.stderr else ''
            
            # Stream logs (would use websocket in production)
            self._stream_logs(job_id, stdout_sanitized)
            if stderr_sanitized:
                self._stream_logs(job_id, stderr_sanitized)

            success = result.returncode == 0

            logger.info(f"Job {job_id} {'succeeded' if success else 'failed'} in {duration:.2f}s")

            return {
                'job_id': job_id,
                'status': 'success' if success else 'failed',
                'exit_code': result.returncode,
                'duration': duration,
                'env_snapshot': env_snapshot,
                'stdout': stdout_sanitized,
                'stderr': stderr_sanitized,
            }

        except subprocess.TimeoutExpired:
            logger.error(f"Job {job_id} timed out")
            return {
                'job_id': job_id,
                'status': 'timeout',
                'error': 'Job execution timed out'
            }
        except Exception as e:
            logger.error(f"Job {job_id} failed with error: {e}")
            return {
                'job_id': job_id,
                'status': 'error',
                'error': str(e)
            }

    def _sanitize_output(self, output: str) -> str:
        """Sanitize sensitive information from output"""
        if not output or not self.config.get('sanitize_output', True):
            return output
        
        sanitized = output
        patterns = self.config.get('sanitize_patterns', [])
        
        # Default patterns if none configured
        if not patterns:
            patterns = [
                # Password patterns
                r'password[\s=:\'"]+[^\s\'"]+',
                r'passwd[\s=:\'"]+[^\s\'"]+',
                r'pwd[\s=:\'"]+[^\s\'"]+',
                # API keys and tokens
                r'api[_-]?key[\s=:\'"]+[^\s\'"]+',
                r'api[_-]?token[\s=:\'"]+[^\s\'"]+',
                r'access[_-]?token[\s=:\'"]+[^\s\'"]+',
                r'auth[_-]?token[\s=:\'"]+[^\s\'"]+',
                r'bearer[\s]+[A-Za-z0-9\-._~+/]+=*',
                # AWS credentials
                r'aws[_-]?access[_-]?key[_-]?id[\s=:\'"]+[^\s\'"]+',
                r'aws[_-]?secret[_-]?access[_-]?key[\s=:\'"]+[^\s\'"]+',
                # SSH private keys
                r'-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+PRIVATE KEY-----',
                # Generic secrets
                r'secret[\s=:\'"]+[^\s\'"]+',
                # IP addresses (IPv4)
                r'\b(?:10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.)\d{1,3}\.\d{1,3}\b',
                r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
                # Internal hostnames and FQDNs (common internal patterns)
                r'\b[\w-]+\.(?:local|internal|corp|intranet|lan|priv|private)\b',
                r'\b[\w-]+\.(?:ad|domain)\.[\w-]+\b',
                # File paths (Windows and Unix)
                r'[C-Z]:\\(?:[\w\-\. ]+\\)*[\w\-\. ]+',  # Windows paths
                r'/(?:home|root|opt|var|usr|etc)/(?:[\w\-\.]+/)*[\w\-\.]+',  # Unix paths
                r'\\\\[\w\-\.]+\\[\w\-\$]+(?:\\[\w\-\. ]+)*',  # UNC paths
                # Database connection strings and names
                r'(?:Server|Host|Data Source)[\s]*=[\s]*[^\s;,\'"]+',
                r'(?:Database|Initial Catalog)[\s]*=[\s]*[^\s;,\'"]+',
                r'(?:mongodb|postgresql|mysql|mssql|oracle)://[^\s\'"]+',
                # URLs with internal domains
                r'https?://(?:[\w\-]+\.)?(?:local|internal|corp|intranet|lan|priv|private)[^\s\'"]*',
                r'https?://(?:10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.)[^\s\'"]*',
            ]
        
        # Apply sanitization patterns
        for pattern in patterns:
            try:
                # Replace with masked value, preserving first few characters for debugging
                def mask_match(match):
                    matched_text = match.group(0)
                    # Keep the key name visible but mask the value
                    if '=' in matched_text or ':' in matched_text:
                        parts = re.split(r'[=:]', matched_text, 1)
                        if len(parts) == 2:
                            return f"{parts[0]}=***REDACTED***"
                    return "***REDACTED***"
                
                sanitized = re.sub(pattern, mask_match, sanitized, flags=re.IGNORECASE)
            except Exception as e:
                logger.warning(f"Failed to apply sanitization pattern '{pattern}': {e}")
        
        return sanitized

    def _build_command(self, script_path: str, parameters: Dict[str, Any]) -> str:
        """Build command line from script path and parameters"""
        # Determine script type and interpreter
        if script_path.endswith('.ps1'):
            interpreter = 'pwsh.exe'  # PowerShell 7+
        elif script_path.endswith('.py'):
            interpreter = 'python'
        else:
            interpreter = ''

        # Build parameter string
        param_str = ' '.join([f'-{k} "{v}"' for k, v in parameters.items()])

        if interpreter:
            return f'{interpreter} {script_path} {param_str}'
        else:
            return f'{script_path} {param_str}'

    def _capture_environment_snapshot(self) -> Dict[str, Any]:
        """Capture environment snapshot for reproducibility"""
        snapshot = {
            'timestamp': datetime.utcnow().isoformat(),
            'os': platform.system(),
            'os_version': platform.version(),
            'hostname': socket.gethostname(),
            'python_version': sys.version,
            'env_vars': {},
        }

        # Capture relevant environment variables (redact sensitive ones)
        relevant_vars = ['PATH', 'PYTHONPATH', 'KRB5CCNAME', 'TEMP', 'TMP']
        for var in relevant_vars:
            if var in os.environ:
                snapshot['env_vars'][var] = os.environ[var]

        # PowerShell version
        try:
            ps_version = subprocess.run(
                ['pwsh', '-Command', '$PSVersionTable.PSVersion.ToString()'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if ps_version.returncode == 0:
                snapshot['powershell_version'] = ps_version.stdout.strip()
        except Exception:
            pass

        # Installed Python packages
        try:
            pip_freeze = subprocess.run(
                [sys.executable, '-m', 'pip', 'freeze'],
                capture_output=True,
                text=True,
                timeout=10
            )
            if pip_freeze.returncode == 0:
                snapshot['python_packages'] = pip_freeze.stdout.strip().split('\n')
        except Exception:
            pass

        return snapshot

    def _stream_logs(self, job_id: str, logs: str):
        """Stream logs to API server"""
        # In production, would use websocket or chunked upload
        logger.info(f"Job {job_id} output:\n{logs}")

    def poll_for_jobs(self):
        """Poll API for new jobs"""
        if not self.agent_id:
            logger.warning("Agent not registered, cannot poll for jobs")
            return

        try:
            response = requests.get(
                f"{self.api_url}/api/agents/{self.agent_id}/jobs",
                timeout=5
            )
            if response.status_code == 200:
                jobs = response.json()
                for job in jobs:
                    logger.info(f"Received job {job['id']} for script {job['script_id']}")
                    result = self.execute_job(job['id'], job['script_id'], job['parameters'], job['script'])
                    # Report result back to API
                    self._report_job_result(job['id'], result)
        except Exception as e:
            logger.debug(f"Error polling for jobs: {e}")

    def _report_job_result(self, job_id: str, result: Dict[str, Any]):
        """Report job execution result to API"""
        try:
            requests.post(
                f"{self.api_url}/api/agents/{self.agent_id}/jobs/{job_id}/result",
                json=result,
                timeout=10
            )
            logger.info(f"Reported result for job {job_id}: {result['status']}")
        except Exception as e:
            logger.error(f"Failed to report job result: {e}")

    def run(self):
        """Main agent loop"""
        logger.info("Starting Setup-Factory Agent")

        if not self.register():
            logger.error("Failed to register agent, exiting")
            return 1

        last_heartbeat = 0

        try:
            while self.running:
                current_time = time.time()

                # Send heartbeat
                if current_time - last_heartbeat >= self.heartbeat_interval:
                    self.heartbeat()
                    last_heartbeat = current_time

                # Poll for jobs
                self.poll_for_jobs()

                # Sleep before next poll
                time.sleep(5)

        except KeyboardInterrupt:
            logger.info("Received interrupt signal, shutting down")
        except Exception as e:
            logger.error(f"Agent error: {e}")
            return 1
        finally:
            logger.info("Agent stopped")

        return 0


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Setup-Factory Agent')
    parser.add_argument('--config', default='config.yaml', help='Config file path')
    args = parser.parse_args()

    agent = SetupFactoryAgent(config_path=args.config)
    return agent.run()


if __name__ == '__main__':
    sys.exit(main())
