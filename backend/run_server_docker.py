#!/usr/bin/env python
"""
Server startup script for Docker - runs migrations and gunicorn
Called from WORKDIR /app which contains djangomonitor/
No shell commands needed - pure Python
"""
import os
import sys
import subprocess

# Get port from environment or use default
port = os.environ.get('PORT', '8080')

print(f"[run_server_docker.py] Current directory: {os.getcwd()}")
print(f"[run_server_docker.py] PORT: {port}")

# Run migrations from current directory (which is /app with djangomonitor/)
print("[run_server_docker.py] Running migrations...")
try:
    result = subprocess.run([
        sys.executable, 'manage.py', 'migrate', '--noinput'
    ], check=True, capture_output=True, text=True)
    print("[run_server_docker.py] ✅ Migrations completed")
    print(result.stdout)
except subprocess.CalledProcessError as e:
    print(f"[run_server_docker.py] ⚠️ Migration error (non-fatal): {e}")
    print(f"STDERR: {e.stderr}")
    # Don't exit - let gunicorn start anyway

# Collect static files
print("[run_server_docker.py] Collecting static files...")
try:
    result = subprocess.run([
        sys.executable, 'manage.py', 'collectstatic', '--noinput'
    ], check=True, capture_output=True, text=True)
    print("[run_server_docker.py] ✅ Static files collected")
except subprocess.CalledProcessError as e:
    print(f"[run_server_docker.py] ⚠️ Static files error (non-fatal): {e}")
    # Don't exit - let gunicorn start anyway

# Start gunicorn using os.execvp to replace this process
print(f"[run_server_docker.py] Starting gunicorn on 0.0.0.0:{port}...")
os.execvp('gunicorn', [
    'gunicorn',
    'djangomonitor.wsgi:application',
    '-b', f'0.0.0.0:{port}',
    '--workers', '3',
    '--timeout', '120',
    '--access-logfile', '-',
    '--error-logfile', '-'
])
