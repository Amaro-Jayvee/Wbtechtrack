#!/usr/bin/env python
import os
import subprocess
import sys

# Change to backend directory
os.chdir('backend/djangomonitor')

print("[STARTUP] Running migrations...")
subprocess.run([sys.executable, 'manage.py', 'migrate', '--noinput'])

print("[STARTUP] Starting gunicorn...")
port = os.environ.get('PORT', '8080')
subprocess.run([
    sys.executable, '-m', 'gunicorn',
    'djangomonitor.wsgi:application',
    '--bind', f'0.0.0.0:{port}',
    '--workers', '3',
    '--timeout', '120'
])
