#!/usr/bin/env python3
"""
Reproduction script for deployment issues (Python example)

This demonstrates reproducing a bug using SSH connections to remote hosts.
"""

import sys
import argparse
import subprocess
import datetime
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description='Reproduce deployment issues'
    )
    parser.add_argument('-host', required=True, help='Target host')
    parser.add_argument('-user', required=True, help='SSH username')
    parser.add_argument('-template', default='', help='Template path')
    parser.add_argument('-repro_id', default='', help='Repro ID')
    parser.add_argument('-dry_run', action='store_true', help='Dry run mode')
    
    args = parser.parse_args()
    
    # Generate repro_id if not provided
    repro_id = args.repro_id or f"repro-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    print("=" * 60)
    print("Setup-Factory Reproduction Script (Python)")
    print("=" * 60)
    print(f"Repro ID: {repro_id}")
    print(f"Target: {args.user}@{args.host}")
    print(f"Template: {args.template}")
    print(f"Dry Run: {args.dry_run}")
    print("=" * 60)
    print()
    
    # Step 1: Test SSH connectivity
    print("[1/5] Testing SSH connectivity...")
    result = subprocess.run(
        ['ssh', '-o', 'ConnectTimeout=5', '-o', 'BatchMode=yes',
         f'{args.user}@{args.host}', 'echo "Connection successful"'],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"✗ SSH connection failed: {result.stderr}")
        return 1
    
    print("✓ SSH connection successful")
    print()
    
    # Step 2: Check remote environment
    print("[2/5] Checking remote environment...")
    env_cmd = '''
        echo "Hostname: $(hostname)"
        echo "OS: $(uname -s)"
        echo "Python: $(python3 --version 2>&1)"
        echo "Uptime: $(uptime)"
    '''
    result = subprocess.run(
        ['ssh', f'{args.user}@{args.host}', env_cmd],
        capture_output=True,
        text=True
    )
    print(result.stdout)
    print()
    
    # Step 3: Deploy configuration
    print("[3/5] Deploying configuration...")
    if args.dry_run:
        print(f"[DRY RUN] Would deploy: {args.template}")
    else:
        deploy_cmd = f'''
            mkdir -p /tmp/{repro_id}
            cat > /tmp/{repro_id}/deployment.log << EOF
Deployment timestamp: $(date)
Deployed by: {args.user}
Template: {args.template}
Repro ID: {repro_id}
EOF
        '''
        result = subprocess.run(
            ['ssh', f'{args.user}@{args.host}', deploy_cmd],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✓ Configuration deployed")
        else:
            print(f"✗ Deployment failed: {result.stderr}")
            return 1
    print()
    
    # Step 4: Simulate failure
    print("[4/5] Running post-deployment validation...")
    print("⚠ Simulating a failure for demonstration...")
    print("Error: Service failed to start - Connection refused on port 8080")
    print()
    
    # Step 5: Collect artifacts
    print("[5/5] Collecting artifacts...")
    if not args.dry_run:
        artifacts_dir = Path(f"artifacts/{repro_id}")
        artifacts_dir.mkdir(parents=True, exist_ok=True)
        
        # Download deployment log
        print(f"Downloading logs...")
        subprocess.run([
            'scp',
            f'{args.user}@{args.host}:/tmp/{repro_id}/deployment.log',
            str(artifacts_dir)
        ])
        
        # Save metadata
        metadata = {
            'repro_id': repro_id,
            'host': args.host,
            'user': args.user,
            'template': args.template,
            'timestamp': datetime.datetime.now().isoformat(),
            'status': 'failed',
            'error': 'Service failed to start'
        }
        
        with open(artifacts_dir / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✓ Artifacts saved to {artifacts_dir}")
    print()
    
    print("=" * 60)
    print("Reproduction Complete")
    print("=" * 60)
    print(f"Status: FAILED (reproduced issue)")
    print(f"Repro ID: {repro_id}")
    print()
    print("Next steps:")
    print("1. Review artifacts")
    print("2. Download reproduction bundle from UI")
    print("3. Create Jira ticket")
    print("=" * 60)
    
    # Exit with failure to indicate issue was reproduced
    return 1


if __name__ == '__main__':
    sys.exit(main())
