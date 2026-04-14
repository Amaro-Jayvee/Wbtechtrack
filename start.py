#!/usr/bin/env python
"""
Railway startup script - runs migrations then starts gunicorn
Works on free tier (no shell needed, pure Python execution)
"""
import os
import sys
import subprocess

# Change to backend directory
os.chdir('backend/djangomonitor')

# Add backend to Python path
sys.path.insert(0, os.getcwd())

print("[STARTUP] Running Django migrations...")
# Run migrations
result = subprocess.run(
    [sys.executable, 'manage.py', 'migrate', '--noinput'],
    capture_output=False
)

if result.returncode != 0:
    print("[STARTUP] ⚠️  Migrations returned non-zero code, but continuing...")

print("[STARTUP] Starting gunicorn server...")

# Start gunicorn using os.execvp (replaces this process)
port = os.environ.get('PORT', '8080')
workers = os.environ.get('WEB_CONCURRENCY', '3')

os.execvp(sys.executable, [
    sys.executable, '-m', 'gunicorn',
    'djangomonitor.wsgi:application',
    '--bind', f'0.0.0.0:{port}',
    '--workers', str(workers),
    '--timeout', '120',
    '--access-logfile', '-',
    '--error-logfile', '-',
])
