#!/usr/bin/env python
"""
Server startup script for Docker - runs migrations and gunicorn
Called from WORKDIR /app which contains manage.py and djangomonitor module
No shell commands needed - pure Python
"""
import os
import sys
import subprocess

# Get port from environment or use default
port = os.environ.get('PORT', '8080')

current_dir = os.getcwd()
print(f"[run_server_docker.py] Current directory: {current_dir}")
print(f"[run_server_docker.py] PORT: {port}")
print(f"[run_server_docker.py] Python executable: {sys.executable}")

# List directory contents for debugging
print(f"[run_server_docker.py] Directory contents:")
for item in os.listdir(current_dir):
    print(f"  - {item}")

# Run Django migrations using Django's call_command to avoid subprocess issues
print("[run_server_docker.py] Running migrations via Django API...")
try:
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
    django.setup()
    from django.core.management import call_command
    call_command('migrate', '--noinput', verbosity=1)
    print("[run_server_docker.py] ✅ Migrations completed")
except Exception as e:
    print(f"[run_server_docker.py] ⚠️ Migration error (non-fatal): {e}")
    import traceback
    traceback.print_exc()

# Collect static files using Django API
print("[run_server_docker.py] Collecting static files...")
try:
    from django.core.management import call_command
    call_command('collectstatic', '--noinput', verbosity=1)
    print("[run_server_docker.py] ✅ Static files collected")
except Exception as e:
    print(f"[run_server_docker.py] ⚠️ Static files error (non-fatal): {e}")

# Start gunicorn using os.execvp to replace this process
print(f"[run_server_docker.py] Starting gunicorn on 0.0.0.0:{port}...")
sys.stdout.flush()
sys.stderr.flush()

os.execvp('gunicorn', [
    'gunicorn',
    'djangomonitor.wsgi:application',
    '-b', f'0.0.0.0:{port}',
    '--workers', '3',
    '--timeout', '120',
    '--access-logfile', '-',
    '--error-logfile', '-'
])
])
